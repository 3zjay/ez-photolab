import Stripe from 'stripe';
import { authenticated, cors, httpError, returnUrl, sendError, services } from './_lib/server.js';

export function configuredPrice(tier, period) {
  if (!['pro', 'team'].includes(tier) || !['monthly', 'annual'].includes(period)) throw httpError(400, 'Choose a valid plan and billing period.');
  const price = process.env[`STRIPE_PRICE_${tier.toUpperCase()}${period === 'annual' ? '_ANNUAL' : ''}`];
  if (!price) throw httpError(400, 'This plan is not configured. Please contact support.');
  return price;
}
export default async function handler(req, res) {
  try {
    cors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') throw httpError(405, 'Method not allowed.');
    const user = await authenticated(req);
    const { tier, billingPeriod = 'monthly', successUrl, cancelUrl, priceId: requestedPrice } = req.body || {};
    const price = configuredPrice(tier, billingPeriod);
    if (requestedPrice && requestedPrice !== price) throw httpError(400, 'The selected price is not valid for this plan.');
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.');
    const profile = await services().db.collection('users').doc(user.uid).get();
    if (profile.data()?.stripeSubscriptionId && ['pro', 'team'].includes(profile.data()?.tier)) throw httpError(409, 'Manage your existing subscription from Account to change plans.');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = profile.data()?.stripeCustomerId;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: returnUrl(successUrl, '?checkout=success'), cancel_url: returnUrl(cancelUrl, '?checkout=canceled'),
      client_reference_id: user.uid, metadata: { userId: user.uid, tier, billingPeriod },
      ...(customer ? { customer } : user.email ? { customer_email: user.email } : {}),
    });
    return res.status(200).json({ url: session.url });
  } catch (error) { return sendError(res, error); }
}
