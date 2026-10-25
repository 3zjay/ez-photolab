const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');

function validName(name) {
  if (typeof name !== 'string' || !name || name.length > 240 || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
    throw new Error('Use a valid Windows filename without slashes or reserved characters.');
  }
  return name;
}
const hash = data => createHash('sha256').update(data).digest('hex');
const key = filename => path.resolve(filename).toLowerCase();

async function atomicWrite(filename, bytes, { replace = false, expectedHash } = {}) {
  const temporary = path.join(path.dirname(filename), `.photolab-${randomUUID()}.tmp`);
  let backup = null;
  try {
    const handle = await fs.open(temporary, 'wx');
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    if (replace) {
      const current = await fs.readFile(filename);
      if (expectedHash && hash(current) !== expectedHash) throw new Error('This file changed during editing. Read it again before saving.');
      backup = `${filename}.${randomUUID()}.bak`;
      await fs.copyFile(filename, backup, fs.constants.COPYFILE_EXCL);
      await fs.rename(temporary, filename);
    } else {
      // An exclusive publish never replaces another application's file.
      try { await fs.link(temporary, filename); }
      catch (error) {
        if (!['EPERM', 'ENOTSUP', 'ENOSYS', 'EXDEV'].includes(error.code)) throw error;
        await fs.copyFile(temporary, filename, fs.constants.COPYFILE_EXCL);
      }
    }
    return { filename, backup };
  } finally {
    await fs.unlink(temporary).catch(() => {});
  }
}

class FileService {
  constructor() { this.handles = new Map(); this.protectedFiles = new Set(); }
  add(entry) {
    const id = randomUUID();
    this.handles.set(id, entry);
    const name = path.basename(entry.path) || entry.path;
    const res = { id, kind: entry.kind, name };
    if (entry.size !== undefined) res.size = entry.size;
    if (entry.lastModified !== undefined) res.lastModified = entry.lastModified;
    return res;
  }
  async grantDirectory(filename, writable = false) {
    const real = await fs.realpath(filename).catch(() => path.resolve(filename));
    const stat = await fs.stat(real).catch(() => null);
    if (!stat || !stat.isDirectory()) throw new Error('Choose a folder.');
    return this.add({ path: real, root: real, kind: 'directory', writable });
  }
  async grantFile(filename) {
    const real = await fs.realpath(filename).catch(() => path.resolve(filename));
    const stat = await fs.stat(real).catch(() => null);
    this.protectedFiles.add(key(real));
    return this.add({ path: real, root: path.dirname(real), kind: 'file', writable: false, size: stat?.size || 0, lastModified: stat?.mtimeMs || Date.now() });
  }
  async get(id, kind) {
    const entry = this.handles.get(id);
    if (!entry || (kind && entry.kind !== kind)) throw new Error('File access has expired. Select the folder again.');
    const parent = await fs.realpath(entry.kind === 'directory' ? entry.path : path.dirname(entry.path)).catch(() => entry.kind === 'directory' ? entry.path : path.dirname(entry.path));
    const rootNorm = path.resolve(entry.root).toLowerCase();
    const parentNorm = path.resolve(parent).toLowerCase();
    const relative = path.relative(rootNorm, parentNorm);
    if (relative.startsWith('..') || (path.isAbsolute(relative) && path.parse(relative).root !== '')) {
      throw new Error('Folder links outside the selected folder are not allowed.');
    }
    const stat = await fs.lstat(entry.path).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (stat?.isSymbolicLink()) throw new Error('Linked files are not supported. Select the original location.');
    return entry;
  }
  async list(id) {
    const directory = await this.get(id, 'directory');
    const entries = await fs.readdir(directory.path, { withFileTypes: true });
    const items = entries.filter(item => !item.isSymbolicLink() && (item.isFile() || item.isDirectory()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return Promise.all(items.map(async item => {
      const fullPath = path.join(directory.path, item.name);
      let size = 0, lastModified = Date.now();
      if (item.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          size = stat.size;
          lastModified = stat.mtimeMs;
        } catch {}
      }
      return this.add({ ...directory, path: fullPath, kind: item.isDirectory() ? 'directory' : 'file', size, lastModified });
    }));
  }
  async child(id, name, kind, create = false) {
    validName(name);
    if (!['file', 'directory'].includes(kind)) throw new Error('Invalid file type.');
    const parent = await this.get(id, 'directory');
    if (create && !parent.writable) throw new Error('This folder is read only.');
    const filename = path.join(parent.path, name);
    if (create && kind === 'directory') await fs.mkdir(filename, { recursive: false }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const stat = await fs.lstat(filename).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (!stat && !create) { const error = new Error('File does not exist.'); error.code = 'ENOENT'; throw error; }
    if (stat?.isSymbolicLink() || (stat && (kind === 'directory' ? !stat.isDirectory() : !stat.isFile()))) throw new Error('Unsupported file or folder link.');
    return this.add({ ...parent, path: filename, kind, size: stat?.size || 0, lastModified: stat?.mtimeMs || Date.now() });
  }
  async read(id) {
    const entry = await this.get(id, 'file');
    const stat = await fs.stat(entry.path);
    if (stat.size > 512 * 1024 * 1024) throw new Error('Files over 512 MB are not supported in this preview.');
    const data = await fs.readFile(entry.path);
    entry.readHash = hash(data);
    if (!entry.writable) this.protectedFiles.add(key(entry.path));
    return { bytes: data, name: path.basename(entry.path), lastModified: stat.mtimeMs };
  }
  async write(id, bytes, options = {}) {
    const entry = await this.get(id, 'file');
    if (!entry.writable) throw new Error('This file is read only.');
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > 512 * 1024 * 1024) throw new Error('Invalid or oversized file data.');
    if (this.protectedFiles.has(key(entry.path))) throw new Error('Original photos are protected. Choose a different filename or output folder.');
    let filename = entry.path;
    if (options.mergeXmp) {
      if (path.extname(filename).toLowerCase() !== '.xmp' || !entry.readHash) throw new Error('Read the existing XMP metadata before updating it.');
      return atomicWrite(filename, bytes, { replace: true, expectedHash: entry.readHash });
    }
    const parsed = path.parse(filename);
    for (let suffix = 0; suffix < 10000; suffix++) {
      try { return await atomicWrite(filename, bytes); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        filename = path.join(parsed.dir, `${parsed.name} (${suffix + 1})${parsed.ext}`);
      }
    }
    throw new Error('Too many existing files with this name.');
  }
  async copy(sourceId, targetDirId, newName) {
    validName(newName);
    const sourceEntry = await this.get(sourceId, 'file');
    const targetDir = await this.get(targetDirId, 'directory');
    if (!targetDir.writable) throw new Error('This destination folder is read only.');
    let destPath = path.join(targetDir.path, newName);
    if (key(destPath) === key(sourceEntry.path)) {
      return { ok: true, path: destPath, skipped: true };
    }
    const parsed = path.parse(destPath);
    for (let suffix = 0; suffix < 10000; suffix++) {
      try {
        await fs.copyFile(sourceEntry.path, destPath, fs.constants.COPYFILE_EXCL);
        return { ok: true, path: destPath };
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
        destPath = path.join(parsed.dir, `${parsed.name} (${suffix + 1})${parsed.ext}`);
      }
    }
    throw new Error('Too many existing files with this name.');
  }
  async move(sourceId, targetDirId, newName) {
    validName(newName);
    const sourceEntry = await this.get(sourceId, 'file');
    const targetDir = await this.get(targetDirId, 'directory');
    if (!targetDir.writable) throw new Error('This destination folder is read only.');
    let destPath = path.join(targetDir.path, newName);
    if (key(destPath) === key(sourceEntry.path)) {
      return { ok: true, path: destPath, skipped: true };
    }
    const parsed = path.parse(destPath);
    for (let suffix = 0; suffix < 10000; suffix++) {
      try {
        try {
          await fs.rename(sourceEntry.path, destPath);
        } catch (renameErr) {
          await fs.copyFile(sourceEntry.path, destPath, fs.constants.COPYFILE_EXCL);
          await fs.unlink(sourceEntry.path);
        }
        return { ok: true, path: destPath };
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
        destPath = path.join(parsed.dir, `${parsed.name} (${suffix + 1})${parsed.ext}`);
      }
    }
    throw new Error('Too many existing files with this name.');
  }
}
module.exports = { FileService, validName, atomicWrite, hash };
