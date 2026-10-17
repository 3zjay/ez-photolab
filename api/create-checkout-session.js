import Stripe from 'stripe';

export default async function handler(req, res) {
  // Enable CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
  const { priceId: explicitPriceId, tier, billingPeriod = 'monthly', userId, customerEmail, successUrl, cancelUrl } = req.body || {};

  const resolveServerPriceId = () => {
    if (explicitPriceId) return explicitPriceId;
    const isAnnual = billingPeriod === 'annual';
    if (tier === 'team') {
      return isAnnual
        ? (process.env.STRIPE_PRICE_TEAM_ANNUAL || process.env.STRIPE_PRICE_TEAM)
        : process.env.STRIPE_PRICE_TEAM;
    }
    if (tier === 'pro') {
      return isAnnual
        ? (process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.STRIPE_PRICE_PRO)
        : process.env.STRIPE_PRICE_PRO;
    }
    return null;
  };

  const priceId = resolveServerPriceId();

  if (!priceId || !userId) {
    return res.status(400).json({
      error: !userId
        ? 'Missing userId parameter. Please sign in before starting checkout.'
        : 'Missing Stripe priceId configuration for the selected plan (check STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM env vars).'
    });
  }

  try {
    const appOrigin = req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://ez-photolab.vercel.app';
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${appOrigin}/?checkout=success`,
      cancel_url: cancelUrl || `${appOrigin}/?checkout=canceled`,
      client_reference_id: userId,
      metadata: {
        userId,
        tier: tier || 'pro',
        billingPeriod,
      },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe Checkout session:', error);
    return res.status(500).json({ error: error.message });
  }
}
