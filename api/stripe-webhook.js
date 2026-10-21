import Stripe from 'stripe';
import admin from 'firebase-admin';

function getDb() {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase Admin environment variables are incomplete.');
    }
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase Admin init error:', error);
      throw error;
    }
  }
  return admin.firestore();
}

// We must disable bodyParser to read the raw body for Stripe signature validation
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe environment variables (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET) are missing.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const resolveTierFromPrice = (price) => {
    const priceId = price?.id;
    if (!priceId) return 'pro';
    const teamIds = [process.env.STRIPE_PRICE_TEAM, process.env.STRIPE_PRICE_TEAM_ANNUAL].filter(Boolean);
    const proIds = [process.env.STRIPE_PRICE_PRO, process.env.STRIPE_PRICE_PRO_ANNUAL].filter(Boolean);
    if (teamIds.includes(priceId)) return 'team';
    if (proIds.includes(priceId)) return 'pro';
    return 'pro';
  };

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const db = getDb();
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (!userId) {
          console.warn('No client_reference_id found on checkout session.');
          break;
        }

        // Fetch session line items to resolve price ID
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceObj = lineItems.data[0]?.price;
        const tier = resolveTierFromPrice(priceObj);
        const isAnnual = priceObj?.recurring?.interval === 'year';

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (isAnnual ? 365 : 30));

        await db.collection('users').doc(userId).set({
          tier,
          billingCycle: isAnnual ? 'annual' : 'monthly',
          stripeCustomerId,
          stripeSubscriptionId,
          offlineLeaseExpires: expiry.toISOString(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`User ${userId} upgraded to ${tier} via Stripe.`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;

        // Query user doc by customer ID
        const userQuery = await db.collection('users')
          .where('stripeCustomerId', '==', stripeCustomerId)
          .limit(1)
          .get();

        if (userQuery.empty) {
          console.warn(`No user found for customer ID ${stripeCustomerId}`);
          break;
        }

        const userDoc = userQuery.docs[0];
        const userId = userDoc.id;

        // Check if subscription status is active/trialing
        const status = subscription.status;
        if (status === 'active' || status === 'trialing') {
          const priceObj = subscription.items.data[0]?.price;
          const tier = resolveTierFromPrice(priceObj);
          const isAnnual = priceObj?.recurring?.interval === 'year';

          const expiry = new Date();
          expiry.setDate(expiry.getDate() + (isAnnual ? 365 : 30));

          await userDoc.ref.set({
            tier,
            billingCycle: isAnnual ? 'annual' : 'monthly',
            offlineLeaseExpires: expiry.toISOString(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          console.log(`Subscription updated for ${userId} to ${tier}.`);
        } else {
          // Unpaid or canceled subscription
          await userDoc.ref.set({
            tier: 'free',
            offlineLeaseExpires: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          console.log(`Subscription status for ${userId} is ${status}. Downgrading to free.`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;

        const userQuery = await db.collection('users')
          .where('stripeCustomerId', '==', stripeCustomerId)
          .limit(1)
          .get();

        if (userQuery.empty) {
          console.warn(`No user found for customer ID ${stripeCustomerId}`);
          break;
        }

        const userDoc = userQuery.docs[0];
        await userDoc.ref.set({
          tier: 'free',
          offlineLeaseExpires: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`Subscription deleted. User ${userDoc.id} downgraded to free.`);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return res.status(500).json({ error: error.message });
  }
}
