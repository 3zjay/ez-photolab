const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { FileService, validName } = require('../electron/file-service.cjs');
const { saveProjectAt, readProject } = require('../electron/project-service.cjs');
async function folder(t) {
  const base = path.resolve('.desktop-test'); await fs.mkdir(base, { recursive: true });
  const root = await fs.mkdtemp(path.join(base, 'files-'));
  t.after(async () => { if (root.startsWith(base + path.sep)) await fs.rm(root, { recursive: true, force: true }); });
  return root;
}
test('Windows names reject traversal, device names, alternate streams and separators', () => {
  for (const name of ['..', '../secret', '..\\secret', 'file:stream', 'NUL.jpg', 'com1', 'foo.', 'foo ', '', 'a/b', 'a\0b']) assert.throws(() => validName(name), name);
  assert.equal(validName('DSC_1001 edited.jpg'), 'DSC_1001 edited.jpg');
});
test('read-only input capabilities cannot create or write', async t => {
  const root = await folder(t); await fs.writeFile(path.join(root, 'original.jpg'), 'original');
  const service = new FileService(); const input = await service.grantDirectory(root);
  await assert.rejects(service.child(input.id, 'output.jpg', 'file', true), /read only/);
  const file = await service.child(input.id, 'original.jpg', 'file');
  await assert.rejects(service.write(file.id, Buffer.from('changed')), /read only/);
});
test('colliding exports preserve existing bytes and choose another filename', async t => {
  const root = await folder(t); await fs.writeFile(path.join(root, 'export.jpg'), 'existing');
  const service = new FileService(); const dir = await service.grantDirectory(root, true);
  const file = await service.child(dir.id, 'export.jpg', 'file', true);
  const results = await Promise.all([service.write(file.id, Buffer.from('one')), service.write(file.id, Buffer.from('two'))]);
  assert.equal(new Set(results.map(r => r.filename)).size, 2);
  assert.equal(await fs.readFile(path.join(root, 'export.jpg'), 'utf8'), 'existing');
  assert.deepEqual((await fs.readdir(root)).sort(), ['export (1).jpg', 'export (2).jpg', 'export.jpg']);
});
test('an opened original remains protected even through a writable folder', async t => {
  const root = await folder(t); const original = path.join(root, 'original.jpg'); await fs.writeFile(original, 'original');
  const service = new FileService(); await service.grantFile(original);
  const dir = await service.grantDirectory(root, true); const file = await service.child(dir.id, 'original.jpg', 'file', true);
  await assert.rejects(service.write(file.id, Buffer.from('changed')), /protected/);
  assert.equal(await fs.readFile(original, 'utf8'), 'original');
});
test('XMP replacement requires a read, retains a backup, and detects changed files', async t => {
  const root = await folder(t); const filename = path.join(root, 'photo.xmp'); await fs.writeFile(filename, '<original/>');
  const service = new FileService(); const dir = await service.grantDirectory(root, true); const file = await service.child(dir.id, 'photo.xmp', 'file');
  await assert.rejects(service.write(file.id, Buffer.from('bad'), { mergeXmp: true }), /Read the existing/);
  await service.read(file.id);
  const result = await service.write(file.id, Buffer.from('<merged/>'), { mergeXmp: true });
  assert.equal(await fs.readFile(result.backup, 'utf8'), '<original/>');
  assert.equal(await fs.readFile(filename, 'utf8'), '<merged/>');
  await assert.rejects(service.write(file.id, Buffer.from('stale'), { mergeXmp: true }), /changed/);
  assert.equal(await fs.readFile(filename, 'utf8'), '<merged/>');
});
test('unknown handles and out-of-folder junctions are rejected', async t => {
  const root = await folder(t); const outside = await folder(t);
  const service = new FileService(); const dir = await service.grantDirectory(root, true);
  await assert.rejects(service.read('unknown'), /expired/);
  await fs.symlink(outside, path.join(root, 'link'), 'junction');
  await assert.rejects(service.child(dir.id, 'link', 'directory'), /link/);
  assert.equal((await service.list(dir.id)).length, 0);
});
test('project recovery keeps the previous version and rejects non-project replacements', async t => {
  const root = await folder(t); const filename = path.join(root, 'recovery.photolab');
  const data = n => JSON.stringify({ format: 'photolab-project', version: 1, document: { image: `image-${n}` } });
  await saveProjectAt(filename, data(1)); await saveProjectAt(filename, data(2)); await saveProjectAt(filename, data(3));
  assert.equal(await readProject(filename), data(3)); assert.equal(await readProject(filename + '.previous'), data(2));
  assert.deepEqual((await fs.readdir(root)).sort(), ['recovery.photolab', 'recovery.photolab.previous']);
  await assert.rejects(saveProjectAt(path.join(root, 'original.jpg'), data(3)), /must end/);
});
