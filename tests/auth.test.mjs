import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createHandler, matchesChallenge } from '../api/desktop-auth.js';
import { configuredPrice } from '../api/create-checkout-session.js';
import checkout from '../api/create-checkout-session.js';
import portal from '../api/create-portal-session.js';
const require = createRequire(import.meta.url);
const { signIn, validExternalUrl } = require('../electron/auth-service.cjs');
const verifier = 'a'.repeat(43), state = 'b'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const response = () => ({ code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() {} });
const request = body => ({ method: 'POST', headers: { authorization: 'Bearer valid-token', origin: 'photolab://app' }, body });
function mockServices() {
  const records = new Map();
  const db = { collection: () => ({ doc: id => ({ id, set: async data => records.set(id, data) }) }), runTransaction: async run => run({ get: async ref => ({ exists: records.has(ref.id), data: () => records.get(ref.id) }), delete: ref => records.delete(ref.id) }) };
  return { records, db, auth: { verifyIdToken: async token => { assert.equal(token, 'valid-token'); return { uid: 'existing-user', email: 'user@example.test' }; }, createCustomToken: async uid => { assert.equal(uid, 'existing-user'); return 'single-use-firebase-token'; } } };
}
test('desktop authorization requires authentication and exchanges a PKCE-bound code once', async () => {
  const services = mockServices(), handler = createHandler(() => services);
  const unauthorized = response(); await handler({ ...request({ action: 'authorize', state, challenge }), headers: {} }, unauthorized); assert.equal(unauthorized.code, 401);
  const authorized = response(); await handler(request({ action: 'authorize', state, challenge }), authorized); assert.equal(authorized.code, 200);
  const code = authorized.body.code; assert.equal(code.length, 43);
  assert.equal(JSON.stringify([...services.records.values()]).includes(code), false);
  const wrong = response(); await handler(request({ action: 'exchange', state, code, verifier: 'z'.repeat(43) }), wrong); assert.equal(wrong.code, 401);
  const exchanged = response(); await handler(request({ action: 'exchange', state, code, verifier }), exchanged); assert.equal(exchanged.body.customToken, 'single-use-firebase-token');
  const replayed = response(); await handler(request({ action: 'exchange', state, code, verifier }), replayed); assert.equal(replayed.code, 401);
});
test('expired codes, wrong state, hostile origins and malformed challenges are rejected', async () => {
  const services = mockServices(), handler = createHandler(() => services);
  const authorized = response(); await handler(request({ action: 'authorize', state, challenge }), authorized);
  const code = authorized.body.code;
  const wrong = response(); await handler(request({ action: 'exchange', state: 'x'.repeat(43), verifier, code }), wrong); assert.equal(wrong.code, 401);
  for (const data of services.records.values()) data.expiresAt = 0;
  const expired = response(); await handler(request({ action: 'exchange', state, verifier, code }), expired); assert.equal(expired.code, 401);
  const hostile = response(); await handler({ ...request({ action: 'authorize', state, challenge }), headers: { origin: 'https://evil.example' } }, hostile); assert.equal(hostile.code, 403);
  assert.equal(matchesChallenge(verifier, challenge), true); assert.equal(matchesChallenge('bad', challenge), false);
});
test('both billing APIs deny unauthenticated callers before reading customer records', async () => {
  for (const handler of [checkout, portal]) { const res = response(); await handler({ method: 'POST', headers: {}, body: { userId: 'victim', stripeCustomerId: 'cus_victim' } }, res); assert.equal(res.code, 401); }
});
test('billing prices are selected from server configuration and reject unknown plans', () => {
  const previous = process.env.STRIPE_PRICE_PRO; process.env.STRIPE_PRICE_PRO = 'price_server_pro';
  try { assert.equal(configuredPrice('pro', 'monthly'), 'price_server_pro'); assert.throws(() => configuredPrice('admin', 'monthly')); assert.throws(() => configuredPrice('pro', 'forever')); }
  finally { if (previous === undefined) delete process.env.STRIPE_PRICE_PRO; else process.env.STRIPE_PRICE_PRO = previous; }
});
test('system-browser handoff binds to loopback and sends the private verifier only to the backend', async () => {
  let browser, received;
  const result = await signIn(async value => {
    browser = new URL(value);
    const callback = new URL(browser.searchParams.get('redirect'));
    assert.equal(callback.hostname, '127.0.0.1'); assert.equal(browser.origin, 'https://ez-photolab.vercel.app'); assert.equal(browser.searchParams.has('verifier'), false);
    callback.searchParams.set('state', browser.searchParams.get('state')); callback.searchParams.set('code', 'c'.repeat(43));
    const completed = await fetch(callback); assert.equal(completed.status, 200);
  }, async (url, options) => {
    assert.equal(url, 'https://ez-photolab.vercel.app/api/desktop-auth'); received = JSON.parse(options.body);
    assert.equal(matchesChallenge(received.verifier, browser.searchParams.get('challenge')), true);
    return { ok: true, json: async () => ({ customToken: 'verified-token' }) };
  });
  assert.equal(result.customToken, 'verified-token'); assert.equal(received.action, 'exchange');
  assert.equal(validExternalUrl('https://checkout.stripe.com/c/pay/test'), true);
  for (const value of ['file:///C:/private', 'https://checkout.stripe.com.evil.test/a', 'https://user@billing.stripe.com/a', 'https://evil.test']) assert.equal(validExternalUrl(value), false);
});
