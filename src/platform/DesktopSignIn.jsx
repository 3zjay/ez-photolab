import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { apiRequest } from './services';

export function DesktopSignIn() {
  const [user, setUser] = useState(null), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const params = new URLSearchParams(window.location.search);
  let callback;
  try {
    callback = new URL(params.get('redirect'));
    if (callback.protocol !== 'http:' || callback.hostname !== '127.0.0.1' || !callback.port || callback.pathname !== '/callback' || callback.username || callback.password || callback.search || callback.hash) callback = null;
  } catch { callback = null; }
  const state = params.get('state'), challenge = params.get('challenge');
  const valid = callback && [state, challenge].every(value => /^[A-Za-z0-9_-]{43}$/.test(value || ''));
  const connect = async () => {
    setBusy(true); setStatus('');
    try {
      if (!auth.currentUser) await signInWithPopup(auth, googleProvider);
      const response = await apiRequest('/api/desktop-auth', { action: 'authorize', state, challenge });
      const data = await response.json();
      if (!response.ok || !data.code) throw new Error(data.error || 'Desktop sign-in is unavailable.');
      callback.searchParams.set('state', state); callback.searchParams.set('code', data.code);
      window.location.assign(callback.href);
    } catch (error) { setStatus(error.message); setBusy(false); }
  };
  return <main style={{ maxWidth: 520, margin: '12vh auto', padding: 32, color: '#eee', background: '#181923', borderRadius: 16, fontFamily: 'system-ui' }}>
    <h1>Sign in to PHOTOlab Desktop</h1>
    <p>Use the same Google account and subscription as PHOTOlab on the web. Your photographs stay on your computer.</p>
    {user && <p>Continue as {user.email}</p>}
    <button disabled={!valid || busy} onClick={connect} style={{ padding: 12, marginTop: 16 }}>{busy ? 'Connecting…' : user ? 'Continue to Desktop' : 'Sign in with Google'}</button>
    <p role="status">{valid ? status : 'This sign-in link is invalid. Start sign-in from the desktop app.'}</p>
  </main>;
}
