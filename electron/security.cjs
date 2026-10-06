const path = require('node:path');
const APP_ORIGIN = 'photolab://app';
function bundlePath(root, url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'photolab:' || parsed.hostname !== 'app') throw new Error('Invalid application origin.');
  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname.includes('\\') || pathname.includes('\0')) throw new Error('Invalid asset path.');
  const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  const relative = path.relative(root, filename);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Invalid asset path.');
  return filename;
}
function allowPreviewRequest(url, method = 'GET') {
  try {
    const parsed = new URL(url);
    if (['data:', 'blob:', 'devtools:'].includes(parsed.protocol)) return true;
    if (parsed.protocol === 'photolab:') return parsed.hostname === 'app';
    if (parsed.protocol !== 'https:' || !['GET', 'HEAD'].includes(method)) return false;
    if (parsed.hostname === 'storage.googleapis.com') return parsed.pathname.startsWith('/mediapipe-models/');
    return ['huggingface.co', 'cdn-lfs.huggingface.co', 'cdn-lfs-us-1.huggingface.co', 'cdn-lfs.hf.co', 'cdn-lfs-us-1.hf.co', 'cas-bridge.xethub.hf.co', 'cdn.jsdelivr.net', 'staticimgly.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(parsed.hostname);
  } catch { return false; }
}
function trustedSender(event) {
  return event.senderFrame === event.sender.mainFrame && event.senderFrame.url.startsWith(`${APP_ORIGIN}/`);
}
module.exports = { APP_ORIGIN, bundlePath, allowPreviewRequest, trustedSender };
