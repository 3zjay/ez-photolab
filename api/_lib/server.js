import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const webOrigin = () => new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ez-photolab.vercel.app').origin;
export function services() {
  if (!admin.apps.length) {
    const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: privateKey } = process.env;
    if (!projectId || !clientEmail || !privateKey) throw httpError(503, 'Account services are not configured on the server. Please contact support.');
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) });
  }
  const databaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID;
  return { auth: admin.auth(), db: databaseId ? getFirestore(admin.app(), databaseId) : getFirestore(admin.app()) };
}
export function httpError(status, message) { return Object.assign(new Error(message), { status }); }
export function cors(req, res) {
  const origin = req.headers.origin;
  const allowed = new Set([webOrigin(), 'photolab://app', ...(process.env.APP_ALLOWED_ORIGINS || '').split(',').filter(Boolean)]);
  if (origin && !allowed.has(origin)) throw httpError(403, 'This application origin is not allowed.');
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}
export async function authenticated(req, getServices = services) {
  const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw httpError(401, 'Sign in before using this service.');
  try { return await getServices().auth.verifyIdToken(token, true); }
  catch (error) {
    if (error.status === 503) throw error;
    if (['auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token', 'auth/argument-error', 'auth/user-not-found'].includes(error.code)) {
      throw httpError(401, 'Your sign-in needs to be refreshed. Sign in again.');
    }
    if (error.code === 'auth/user-disabled') throw httpError(403, 'This account is disabled. Please contact support.');
    // Log only a bounded diagnostic code, never tokens or credential contents.
    console.error('Account verification unavailable:', /^[a-z/-]{1,100}$/i.test(error.code || '') ? error.code : 'server-configuration-or-network');
    throw httpError(503, 'Account verification is temporarily unavailable on the server. Please try again later.');
  }
}
export function returnUrl(candidate, fallback) {
  if (!candidate) return `${webOrigin()}/${fallback}`;
  const url = new URL(candidate);
  if (url.origin !== webOrigin() || url.username || url.password) throw httpError(400, 'Invalid return address.');
  return url.href;
}
export function sendError(res, error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'The service is temporarily unavailable. Please try again.' }); }
