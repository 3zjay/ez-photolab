import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const webOrigin = () => new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ez-photolab.vercel.app').origin;
export function services() {
  if (!admin.apps.length) {
    const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: privateKey } = process.env;
    if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin is not configured on the server.');
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
  catch { throw httpError(401, 'Your sign-in has expired. Sign in again.'); }
}
export function returnUrl(candidate, fallback) {
  if (!candidate) return `${webOrigin()}/${fallback}`;
  const url = new URL(candidate);
  if (url.origin !== webOrigin() || url.username || url.password) throw httpError(400, 'Invalid return address.');
  return url.href;
}
export function sendError(res, error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'The service is temporarily unavailable. Please try again.' }); }
