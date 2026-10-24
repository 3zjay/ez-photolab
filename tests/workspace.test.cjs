const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { FileService } = require('../electron/file-service.cjs');
const { saveWorkspace, recoverWorkspace } = require('../electron/workspace-service.cjs');
test('shoot recovery restores authorized native sources, manual decisions and batch settings after restart', async () => {
  const root = await fs.mkdtemp(path.join(path.resolve('.desktop-test'), 'workspace-'));
  const source = path.join(root, 'photo.jpg'); await fs.writeFile(source, 'source-bytes');
  const files = new FileService(), input = await files.grantFile(source), output = await files.grantDirectory(root, true);
  const session = { cullImages: [{ name: 'photo.jpg', file: { $nativeFile: input.id } }], cullResults: [{ rating: 5, label: 'green', manualSelection: true }], batchOutputQ: 93, outputHandle: { $nativeHandle: output } };
  const filename = path.join(root, 'recovery.photolab');
  await saveWorkspace(filename, JSON.stringify({ format: 'photolab-workspace', version: 1, document: null, session }), files);
  const restarted = new FileService();
  const restored = JSON.parse(await recoverWorkspace(filename, restarted));
  assert.equal(restored.session.batchOutputQ, 93); assert.equal(restored.session.cullResults[0].manualSelection, true);
  assert.equal((await restarted.read(input.id)).bytes.toString(), 'source-bytes');
  const protectedFile = await restarted.child(output.id, 'photo.jpg', 'file', true);
  await assert.rejects(restarted.write(protectedFile.id, Buffer.from('changed')), /protected/);
});
test('renderer-supplied filesystem grants are not trusted by workspace recovery', async () => {
  const root = await fs.mkdtemp(path.join(path.resolve('.desktop-test'), 'workspace-untrusted-'));
  const filename = path.join(root, 'recovery.photolab'), files = new FileService();
  await saveWorkspace(filename, JSON.stringify({ format: 'photolab-workspace', version: 1, session: {}, grants: [['forged', { path: 'C:\\', writable: true }]] }), files);
  const restarted = new FileService(); await recoverWorkspace(filename, restarted);
  await assert.rejects(restarted.read('forged'), /expired/);
  await assert.rejects(saveWorkspace(filename, '{}', files), /Invalid/);
});
