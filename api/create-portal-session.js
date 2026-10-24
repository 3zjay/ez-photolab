import Stripe from 'stripe';
import { authenticated, cors, httpError, returnUrl, sendError, services } from './_lib/server.js';

export default async function handler(req, res) {
  try {
    cors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') throw httpError(405, 'Method not allowed.');
    const user = await authenticated(req);
    const profile = await services().db.collection('users').doc(user.uid).get();
    const customer = profile.data()?.stripeCustomerId;
    if (!customer) throw httpError(400, 'No billing account was found for your signed-in account.');
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl(req.body?.returnUrl, '?portal=returned') });
    return res.status(200).json({ url: session.url });
  } catch (error) { return sendError(res, error); }
}
