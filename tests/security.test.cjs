const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { allowPreviewRequest, bundlePath, trustedSender } = require('../electron/security.cjs');
test('only configured account APIs and local model downloads are permitted', () => {
  for (const url of ['https://ez-photolab.vercel.app/', 'https://api.stripe.com/', 'https://api.claid.ai/', 'http://huggingface.co/a', 'file:///C:/secret', 'https://huggingface.co.evil.test/a']) assert.equal(allowPreviewRequest(url), false, url);
  assert.equal(allowPreviewRequest('https://ez-photolab.vercel.app/api/desktop-auth', 'POST'), true);
  assert.equal(allowPreviewRequest('https://ez-photolab.vercel.app/api/test', 'POST'), false);
  assert.equal(allowPreviewRequest('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken', 'POST'), true);
  assert.equal(allowPreviewRequest('https://firestore.googleapis.com/v1/projects/x', 'DELETE'), false);
  assert.equal(allowPreviewRequest('https://huggingface.co/model'), true);
  assert.equal(allowPreviewRequest('https://huggingface.co/model', 'POST'), false);
  assert.equal(allowPreviewRequest('https://storage.googleapis.com/mediapipe-models/face.task'), true);
  assert.equal(allowPreviewRequest('https://storage.googleapis.com/private-bucket/photo.jpg'), false);
});
test('packaged assets cannot escape the application directory', () => {
  const root = path.resolve('dist-desktop');
  assert.equal(bundlePath(root, 'photolab://app/'), path.join(root, 'index.html'));
  for (const url of ['photolab://app/%2e%2e%2fsecret', 'photolab://app/%5c..%5csecret', 'photolab://evil/a', 'https://app/a', 'photolab://app/%00']) assert.throws(() => bundlePath(root, url), url);
});
test('only the main trusted frame receives native file privileges', () => {
  const frame = { url: 'photolab://app/' };
  assert.equal(trustedSender({ senderFrame: frame, sender: { mainFrame: frame } }), true);
  assert.equal(trustedSender({ senderFrame: { url: frame.url }, sender: { mainFrame: frame } }), false);
  frame.url = 'photolab://app.evil/';
  assert.equal(trustedSender({ senderFrame: frame, sender: { mainFrame: frame } }), false);
});
