import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { authenticated, cors, httpError, sendError, services } from './_lib/server.js';

const digest = value => createHash('sha256').update(value).digest('base64url');
const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(value);
export function matchesChallenge(verifier, challenge) {
  if (!valid(verifier) || !valid(challenge)) return false;
  const actual = digest(verifier), expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), expected);
}
export function createHandler(getServices = services) {
  return async (req, res) => {
    try {
      cors(req, res);
      if (req.method === 'OPTIONS') return res.status(204).end();
      if (req.method !== 'POST') throw httpError(405, 'Method not allowed.');
      const { action, state, challenge, code, verifier } = req.body || {};
      if (!valid(state)) throw httpError(400, 'Invalid sign-in state.');
      if (action === 'authorize') {
        const user = await authenticated(req, getServices);
        if (!valid(challenge)) throw httpError(400, 'Invalid sign-in challenge.');
        const authorizationCode = randomBytes(32).toString('base64url');
        await getServices().db.collection('desktopAuthCodes').doc(digest(authorizationCode)).set({ uid: user.uid, state, challenge, expiresAt: Date.now() + 5 * 60_000 });
        return res.status(200).json({ code: authorizationCode });
      }
      if (action !== 'exchange' || !valid(code) || !valid(verifier)) throw httpError(400, 'Invalid authorization request.');
      const { auth, db } = getServices();
      const ref = db.collection('desktopAuthCodes').doc(digest(code));
      const uid = await db.runTransaction(async transaction => {
        const record = await transaction.get(ref);
        const data = record.data();
        if (!record.exists || data.expiresAt <= Date.now() || data.state !== state || !matchesChallenge(verifier, data.challenge)) throw httpError(401, 'Sign-in link expired or already used. Start sign-in again.');
        transaction.delete(ref);
        return data.uid;
      });
      return res.status(200).json({ customToken: await auth.createCustomToken(uid) });
    } catch (error) { return sendError(res, error); }
  };
}
export default createHandler();
