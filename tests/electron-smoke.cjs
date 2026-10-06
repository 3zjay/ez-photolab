const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
exports.run = async window => {
  let state;
  for (let i = 0; i < 30; i++) {
    state = await window.webContents.executeJavaScript('({ text: document.body.innerText, bridge: Boolean(window.photoLab), isolated: crossOriginIsolated, node: typeof window.require })');
    if (state.text.includes('Open project')) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(state.text.includes('Open project'), `Editor failed to mount: ${state.text}`);
  assert.equal(state.bridge, true); assert.equal(state.isolated, true); assert.equal(state.node, 'undefined');
  assert.equal(window.webContents.getLastWebPreferences().sandbox, true);
  assert.equal(window.webContents.getLastWebPreferences().contextIsolation, true);
  const dirty = await window.webContents.executeJavaScript('window.photoLab.setDirty(false)'); assert.equal(dirty.ok, true);
  const blocked = await window.webContents.executeJavaScript("fetch('https://ez-photolab.vercel.app/api/test').then(() => false).catch(() => true)"); assert.equal(blocked, true);
  await window.loadURL('photolab://app/tests/renderer.html');
  let results;
  for (let i = 0; i < 150; i++) {
    results = await window.webContents.executeJavaScript('window.photoLabTestResults || null');
    if (results) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(results, 'Renderer test timed out');
  const report = { app: { mounted: true, bridge: true, isolated: true, sandbox: true, productionBlocked: true }, renderer: results };
  await fs.writeFile('.desktop-test/smoke-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert.equal(results.failed.length, 0, JSON.stringify(results.failed));
};
