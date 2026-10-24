const http = require('node:http');
const { randomBytes, createHash } = require('node:crypto');
const WEB_ORIGIN = 'https://ez-photolab.vercel.app';

function validExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && ['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname);
  } catch { return false; }
}
let pending = null;
function signIn(openExternal, request = fetch) {
  if (pending) return pending;
  const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  pending = new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer); server.close();
      error ? reject(error) : resolve(value);
    };
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method !== 'GET' || url.pathname !== '/callback' || url.searchParams.get('state') !== state || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code') || '')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Invalid sign-in response.'); return;
      }
      if (settled) { res.writeHead(409); res.end('Sign-in already completed.'); return; }
      try {
        const response = await request(`${WEB_ORIGIN}/api/desktop-auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'exchange', code: url.searchParams.get('code'), verifier, state }), signal: AbortSignal.timeout(30_000) });
        const data = await response.json();
        if (!response.ok || !data.customToken) throw new Error(data.error || 'Could not complete desktop sign-in.');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" });
        res.end('<title>PHOTOlab sign-in complete</title><h1>Signed in to PHOTOlab</h1><p>You can close this tab and return to the desktop app.</p>');
        finish(null, data);
      } catch (error) { res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end('Sign-in failed. Return to PHOTOlab and try again.'); finish(error); }
    });
    const timer = setTimeout(() => finish(new Error('Sign-in timed out. Please try again.')), 5 * 60_000);
    server.on('error', error => finish(error));
    server.listen(0, '127.0.0.1', () => {
      const redirect = `http://127.0.0.1:${server.address().port}/callback`;
      const url = new URL(WEB_ORIGIN);
      for (const [key, value] of Object.entries({ desktopAuth: '1', redirect, state, challenge })) url.searchParams.set(key, value);
      Promise.resolve(openExternal(url.href)).catch(error => finish(error));
    });
  }).finally(() => { pending = null; });
  return pending;
}
module.exports = { WEB_ORIGIN, validExternalUrl, signIn };
