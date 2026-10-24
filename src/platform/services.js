import { auth } from '../firebase';
import { isDesktop, unwrap } from './desktop';
export const WEB_ORIGIN = 'https://ez-photolab.vercel.app';
export const serviceOrigin = () => isDesktop ? WEB_ORIGIN : window.location.origin;
export async function apiRequest(path, body, { forceRefresh = false } = {}) {
  const token = await auth.currentUser?.getIdToken(forceRefresh);
  if (!token) throw new Error('Please sign in first.');
  return fetch(`${serviceOrigin()}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
export async function openBilling(url) {
  if (isDesktop) return unwrap(window.photoLab.openBilling(url));
  window.location.assign(url);
}
