const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { FileService } = require('../electron/file-service.cjs');

async function createTempFolder(t) {
  const base = path.resolve('.desktop-test');
  await fs.mkdir(base, { recursive: true });
  const root = await fs.mkdtemp(path.join(base, 'folder-test-'));
  t.after(async () => {
    if (root.startsWith(base + path.sep)) {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  return root;
}

test('folder access: grantDirectory, listing subdirectories, and emoji folder creation', async t => {
  const root = await createTempFolder(t);
  const photosDir = path.join(root, 'Photos');
  await fs.mkdir(photosDir);
  await fs.writeFile(path.join(photosDir, 'DSC_0001.JPG'), 'fake-jpg-content-1');
  await fs.writeFile(path.join(photosDir, 'DSC_0002.JPG'), 'fake-jpg-content-2');
  await fs.writeFile(path.join(photosDir, 'RAW_0001.NEF'), 'fake-raw-content-1');
  
  const subDir = path.join(photosDir, 'SubAlbum');
  await fs.mkdir(subDir);
  await fs.writeFile(path.join(subDir, 'DSC_0003.JPG'), 'fake-jpg-content-3');

  const service = new FileService();
  const dirHandle = await service.grantDirectory(photosDir, true);
  assert.equal(dirHandle.kind, 'directory');
  assert.equal(dirHandle.name, 'Photos');

  // List directory entries
  const list = await service.list(dirHandle.id);
  const names = list.map(item => item.name);
  assert.ok(names.includes('DSC_0001.JPG'), 'Missing DSC_0001.JPG');
  assert.ok(names.includes('DSC_0002.JPG'), 'Missing DSC_0002.JPG');
  assert.ok(names.includes('RAW_0001.NEF'), 'Missing RAW_0001.NEF');
  assert.ok(names.includes('SubAlbum'), 'Missing SubAlbum');

  // Create emoji category subdirectories (as used by Cull and Batch)
  const keepers = await service.child(dirHandle.id, '📗 Keepers', 'directory', true);
  assert.equal(keepers.name, '📗 Keepers');

  // Write a file into the emoji subdirectory
  const keeperFile = await service.child(keepers.id, 'DSC_0001.JPG', 'file', true);
  await service.write(keeperFile.id, Buffer.from('keeper-exported-bytes'));

  const savedKeeper = await fs.readFile(path.join(photosDir, '📗 Keepers', 'DSC_0001.JPG'), 'utf8');
  assert.equal(savedKeeper, 'keeper-exported-bytes');
});

test('folder access: root drive naming fallback', async t => {
  const service = new FileService();
  // On Windows, granting 'C:\\' should not result in an empty string name
  const dirHandle = await service.grantDirectory('C:\\', false);
  assert.ok(dirHandle.name, 'Folder name should not be empty for root directory');
  assert.equal(dirHandle.kind, 'directory');
});

test('folder access: nested directory creation and deep access', async t => {
  const root = await createTempFolder(t);
  const service = new FileService();
  const dirHandle = await service.grantDirectory(root, true);

  const level1 = await service.child(dirHandle.id, 'Level1', 'directory', true);
  const level2 = await service.child(level1.id, 'Level2', 'directory', true);
  const deepFile = await service.child(level2.id, 'deep.txt', 'file', true);
  await service.write(deepFile.id, Buffer.from('deep-content'));

  const content = await fs.readFile(path.join(root, 'Level1', 'Level2', 'deep.txt'), 'utf8');
  assert.equal(content, 'deep-content');
});


test('folder access: native fast copy into sorted emoji folders', async t => {
  const root = await createTempFolder(t);
  const shootDir = path.join(root, 'Shoot');
  await fs.mkdir(shootDir, { recursive: true });
  await fs.writeFile(path.join(shootDir, 'DSC_0001.JPG'), 'original-photo-bytes');

  const service = new FileService();
  const shootHandle = await service.grantDirectory(shootDir, true);
  const list = await service.list(shootHandle.id);
  const sourceFile = list.find(x => x.name === 'DSC_0001.JPG');
  assert.ok(sourceFile, 'Missing source photo');

  // Create 4-folder sort target
  const keepersDir = await service.child(shootHandle.id, '📗 Keepers', 'directory', true);
  const copyResult = await service.copy(sourceFile.id, keepersDir.id, 'DSC_0001.JPG');
  assert.equal(copyResult.ok, true);

  const copiedBytes = await fs.readFile(path.join(shootDir, '📗 Keepers', 'DSC_0001.JPG'), 'utf8');
  assert.equal(copiedBytes, 'original-photo-bytes');

  // Test collision handling
  const duplicateCopy = await service.copy(sourceFile.id, keepersDir.id, 'DSC_0001.JPG');
  assert.equal(duplicateCopy.ok, true);
  assert.ok(duplicateCopy.path.includes('DSC_0001 (1).JPG'));
});
