const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { atomicWrite, hash } = require('./file-service.cjs');
const MAX_PROJECT_BYTES = 192 * 1024 * 1024;
function validateProject(data) {
  if (typeof data !== 'string' || Buffer.byteLength(data) > MAX_PROJECT_BYTES) throw new Error('Project exceeds the 192 MB preview limit.');
  const project = JSON.parse(data);
  if (project.format !== 'photolab-project' || project.version !== 1 || !project.document || Array.isArray(project.document) || typeof project.document !== 'object') throw new Error('Unsupported PHOTOlab project.');
  return data;
}
async function readProject(filename) {
  const stat = await fs.lstat(filename);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Choose a regular project file.');
  if (stat.size > MAX_PROJECT_BYTES) throw new Error('Project is too large.');
  return validateProject(await fs.readFile(filename, 'utf8'));
}
async function saveProjectAt(filename, data) {
  validateProject(data);
  if (path.extname(filename).toLowerCase() !== '.photolab') throw new Error('Project filenames must end in .photolab.');
  const current = await readProject(filename).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (current === null) return atomicWrite(filename, Buffer.from(data));
  const temporary = path.join(path.dirname(filename), `.photolab-${randomUUID()}.tmp`);
  const previous = path.join(path.dirname(filename), `.photolab-${randomUUID()}.tmp`);
  try {
    for (const [target, contents] of [[temporary, data], [previous, current]]) {
      const handle = await fs.open(target, 'wx');
      try { await handle.writeFile(contents); await handle.sync(); } finally { await handle.close(); }
    }
    if (hash(await readProject(filename)) !== hash(current)) throw new Error('Project changed while saving. Save it under a new name.');
    await fs.rename(previous, `${filename}.previous`);
    await fs.rename(temporary, filename);
  } finally {
    await Promise.all([temporary, previous].map(file => fs.unlink(file).catch(() => {})));
  }
}
module.exports = { validateProject, readProject, saveProjectAt };
