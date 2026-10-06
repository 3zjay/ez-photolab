export const isDesktop = import.meta.env.MODE === 'desktop';
export const previewUser = Object.freeze({ loggedIn: false, email: '', tier: 'team', billingPeriod: 'preview', offlineLeaseExpires: null });
export async function unwrap(result) {
  const response = await result;
  if (!response?.ok) {
    const error = new Error(response?.error || 'Desktop service is unavailable.');
    error.name = response?.code === 'ENOENT' ? 'NotFoundError' : 'Error';
    throw error;
  }
  return response.value;
}
const mimeType = name => ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', xmp: 'application/xml' })[name.split('.').pop().toLowerCase()] || 'application/octet-stream';
export function nativeHandle(descriptor) {
  if (!descriptor) throw new DOMException('Selection cancelled', 'AbortError');
  const handle = {
    ...descriptor,
    photoLabNative: true,
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getFile: async () => {
      const data = await unwrap(window.photoLab.read(descriptor.id));
      const file = new File([data.bytes], data.name, { type: mimeType(data.name), lastModified: data.lastModified });
      Object.defineProperty(file, 'photoLabId', { value: descriptor.id });
      return file;
    },
    getFileHandle: async (name, options = {}) => nativeHandle(await unwrap(window.photoLab.child(descriptor.id, name, 'file', Boolean(options.create)))),
    getDirectoryHandle: async (name, options = {}) => nativeHandle(await unwrap(window.photoLab.child(descriptor.id, name, 'directory', Boolean(options.create)))),
    async *values() { for (const item of await unwrap(window.photoLab.list(descriptor.id))) yield nativeHandle(item); },
    createWritable: async (options = {}) => {
      let data = null;
      return {
        write: async value => { data = value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value); },
        close: async () => { if (!data) throw new Error('Nothing to write.'); return unwrap(window.photoLab.write(descriptor.id, data, { mergeXmp: Boolean(options.mergeXmp) })); },
        abort: async () => { data = null; },
      };
    },
  };
  return handle;
}
export async function pickDirectory(options = {}) {
  if (!isDesktop) return window.showDirectoryPicker(options);
  const descriptor = await unwrap(window.photoLab.pickFolder({ writable: options.mode === 'readwrite' }));
  if (!descriptor) throw new DOMException('Folder selection cancelled.', 'AbortError');
  return nativeHandle(descriptor);
}
export async function openDesktopPhoto() {
  const descriptor = await unwrap(window.photoLab.openPhoto());
  return descriptor ? nativeHandle(descriptor).getFile() : null;
}
