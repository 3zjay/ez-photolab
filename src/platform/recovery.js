import { isDesktop, nativeHandle, unwrap } from './desktop';

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('photolab-workspace', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('recovery');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function browserStore(value, write = false) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('recovery', write ? 'readwrite' : 'readonly');
      const request = write ? transaction.objectStore('recovery').put(value, 'latest') : transaction.objectStore('recovery').get('latest');
      transaction.oncomplete = () => resolve(write ? true : request.result || null);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Recovery could not be saved.'));
    });
  } finally { db.close(); }
}
async function encode(value) {
  if (value == null || ['number', 'boolean', 'string'].includes(typeof value)) return typeof value === 'string' && value.startsWith('blob:') ? null : value;
  if (value.photoLabNative) return { $nativeHandle: { id: value.id, name: value.name, kind: value.kind } };
  if (value instanceof File) {
    if (value.photoLabId) return { $nativeFile: value.photoLabId };
    return { $file: { name: value.name, type: value.type, lastModified: value.lastModified, data: await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(value); }) } };
  }
  if (value instanceof HTMLImageElement) return { $image: value.src };
  if (value instanceof Float32Array) return { $float32: Array.from(value) };
  if (Array.isArray(value)) return Promise.all(value.map(encode));
  return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await encode(item)])));
}
async function decode(value) {
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Blob || value instanceof Float32Array || (value.kind && typeof value.queryPermission === 'function')) return value;
  if (value.$nativeHandle) return nativeHandle(value.$nativeHandle);
  if (value.$nativeFile) return nativeHandle({ id: value.$nativeFile, kind: 'file' }).getFile();
  if (value.$file) { const file = value.$file; return new File([await (await fetch(file.data)).blob()], file.name, { type: file.type, lastModified: file.lastModified }); }
  if (value.$image) { const image = new Image(); image.src = value.$image; await image.decode(); return image; }
  if (value.$float32) return new Float32Array(value.$float32);
  if (Array.isArray(value)) return Promise.all(value.map(decode));
  return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await decode(item)])));
}
export async function saveRecovery(document, session) {
  if (isDesktop) return unwrap(window.photoLab.saveWorkspace(JSON.stringify({ format: 'photolab-workspace', version: 1, document, session: await encode(session) })));
  // Browser storage preserves File objects and user-selected directory handles.
  const prepare = value => {
    if (!value || typeof value !== 'object' || value instanceof Blob || value instanceof Float32Array || (value.kind && typeof value.queryPermission === 'function')) return value;
    if (value instanceof HTMLImageElement) return { $image: value.src };
    if (Array.isArray(value)) return value.map(prepare);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === 'string' && item.startsWith('blob:') ? null : prepare(item)]));
  };
  return browserStore({ document, session: prepare(session) }, true);
}
export async function readRecovery() {
  if (!isDesktop) { const saved = await browserStore(); return saved ? { document: saved.document, session: await decode(saved.session) } : null; }
  const data = await unwrap(window.photoLab.recoverWorkspace());
  if (data) { const value = JSON.parse(data); return { document: value.document, session: await decode(value.session) }; }
  const legacy = await unwrap(window.photoLab.recovery());
  return legacy ? { document: legacy, session: null } : null;
}
export function sessionHasWork(session) { return Boolean(session && ['batchImages', 'batchRawFiles', 'cullImages', 'cullResults'].some(key => session[key]?.length)); }
