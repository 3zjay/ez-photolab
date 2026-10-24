import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const accountServicesConfigured = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'].every(key => Boolean(process.env[key]?.trim()));
  return res.status(200).json({ version, desktopSignIn: true, sharedSubscriptions: true, accountServicesConfigured });
}
