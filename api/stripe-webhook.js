import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

const db = admin.firestore();

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

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
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
        const priceId = lineItems.data[0]?.price?.id;

        let tier = 'pro'; // default fallback
        if (priceId === process.env.STRIPE_PRICE_TEAM) {
          tier = 'team';
        } else if (priceId === process.env.STRIPE_PRICE_PRO) {
          tier = 'pro';
        }

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);

        await db.collection('users').doc(userId).set({
          tier,
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
          const priceId = subscription.items.data[0]?.price?.id;
          let tier = 'pro';
          if (priceId === process.env.STRIPE_PRICE_TEAM) {
            tier = 'team';
          } else if (priceId === process.env.STRIPE_PRICE_PRO) {
            tier = 'pro';
          }

          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 30);

          await userDoc.ref.set({
            tier,
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
