const fs = require('node:fs/promises');
const { saveProjectAt, readProject } = require('./project-service.cjs');

// Grants are captured only from the main-process FileService, never accepted
// from a project file or supplied by renderer data. This file stays in userData.
async function saveWorkspace(filename, data, files) {
  if (typeof data !== 'string' || Buffer.byteLength(data) > 192 * 1024 * 1024) throw new Error('Workspace recovery exceeds 192 MB.');
  const value = JSON.parse(data);
  if (value.format !== 'photolab-workspace' || value.version !== 1 || !value.session || typeof value.session !== 'object') throw new Error('Invalid workspace recovery.');
  const document = { recovery: value, grants: [...files.handles.entries()], protectedFiles: [...files.protectedFiles] };
  return saveProjectAt(filename, JSON.stringify({ format: 'photolab-project', version: 1, document }));
}
async function recoverWorkspace(filename, files) {
  for (const target of [filename, `${filename}.previous`]) {
    try {
      const value = JSON.parse(await readProject(target)).document;
      if (!value.recovery || !Array.isArray(value.grants)) continue;
      for (const [id, entry] of value.grants) files.handles.set(id, entry);
      for (const filename of value.protectedFiles || []) files.protectedFiles.add(filename);
      return JSON.stringify(value.recovery);
    } catch (error) { if (error.code !== 'ENOENT') console.warn('Workspace recovery could not be read.'); }
  }
  return null;
}
module.exports = { saveWorkspace, recoverWorkspace };
