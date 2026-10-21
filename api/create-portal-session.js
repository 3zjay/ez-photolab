import Stripe from 'stripe';

export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY environment variable is not configured.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { stripeCustomerId, customerEmail, returnUrl } = req.body || {};

  try {
    let customerId = stripeCustomerId;

    // Fallback: look up Stripe customer by email if stripeCustomerId was not cached on user doc
    if (!customerId && customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      }
    }

    if (!customerId) {
      return res.status(400).json({ error: 'No active Stripe customer record found for this account.' });
    }

    const appOrigin = req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://ez-photolab.vercel.app';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${appOrigin}/?portal=returned`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating Stripe Billing Portal session:', error);
    return res.status(500).json({ error: error.message });
  }
}
