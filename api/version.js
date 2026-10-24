import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ version, desktopSignIn: true, sharedSubscriptions: true });
}
