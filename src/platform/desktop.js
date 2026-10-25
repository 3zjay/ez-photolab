export const isDesktop = import.meta.env.MODE === 'desktop' || (typeof window !== 'undefined' && Boolean(window.photoLab?.desktop));
export async function unwrap(result) {
  const response = await result;
  if (!response?.ok) {
    const error = new Error(response?.error || 'Desktop service is unavailable.');
    error.name = response?.code === 'ENOENT' ? 'NotFoundError' : 'Error';
    throw error;
  }
  return response.value;
}
const mimeType = name => {
  if (!name || typeof name !== 'string') return 'application/octet-stream';
  const ext = name.split('.').pop()?.toLowerCase();
  return ({
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    xmp: 'application/xml',
    nef: 'image/x-nikon-nef',
    nrw: 'image/x-nikon-nrw',
    cr2: 'image/x-canon-cr2',
    cr3: 'image/x-canon-cr3',
    crw: 'image/x-canon-crw',
    arw: 'image/x-sony-arw',
    srf: 'image/x-sony-srf',
    sr2: 'image/x-sony-sr2',
    dng: 'image/x-adobe-dng',
    orf: 'image/x-olympus-orf',
    raf: 'image/x-fuji-raf',
    rw2: 'image/x-panasonic-rw2',
    pef: 'image/x-pentax-pef'
  })[ext] || 'application/octet-stream';
};

export function nativeHandle(descriptor) {
  if (!descriptor) throw new DOMException('Selection cancelled', 'AbortError');
  const handle = {
    ...descriptor,
    photoLabNative: true,
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getFile: async () => {
      let cachedBytes = null;
      const getBytes = async () => {
        if (!cachedBytes) {
          const data = await unwrap(window.photoLab.read(descriptor.id));
          cachedBytes = data.bytes;
        }
        return cachedBytes;
      };
      const fileName = descriptor.name || 'image.jpg';
      const file = new File([], fileName, {
        type: mimeType(fileName),
        lastModified: descriptor.lastModified || Date.now()
      });
      Object.defineProperty(file, 'size', { value: descriptor.size || 0, configurable: true });
      Object.defineProperty(file, 'photoLabId', { value: descriptor.id });
      file.arrayBuffer = async () => {
        const bytes = await getBytes();
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      };
      file.text = async () => new TextDecoder().decode(await getBytes());
      file.slice = (start = 0, end, contentType) => {
        if (cachedBytes) {
          const sliceBytes = cachedBytes.slice(start, end !== undefined ? end : cachedBytes.length);
          return new Blob([sliceBytes], { type: contentType || mimeType(fileName) });
        }
        return new Blob([], { type: contentType || mimeType(fileName) });
      };
      file.stream = () => {
        return new ReadableStream({
          async start(controller) {
            const bytes = await getBytes();
            controller.enqueue(bytes);
            controller.close();
          }
        });
      };
      return file;
    },
    getFileHandle: async (name, options = {}) => nativeHandle(await unwrap(window.photoLab.child(descriptor.id, name, 'file', Boolean(options.create)))),
    getDirectoryHandle: async (name, options = {}) => nativeHandle(await unwrap(window.photoLab.child(descriptor.id, name, 'directory', Boolean(options.create)))),
    async *values() { for (const item of await unwrap(window.photoLab.list(descriptor.id))) yield nativeHandle(item); },
    async *entries() { for (const item of await unwrap(window.photoLab.list(descriptor.id))) yield [item.name, nativeHandle(item)]; },
    async *keys() { for (const item of await unwrap(window.photoLab.list(descriptor.id))) yield item.name; },
    [Symbol.asyncIterator]() { return this.values(); },
    createWritable: async (options = {}) => {
      let chunks = [];
      return {
        write: async value => {
          const chunk = value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
          chunks.push(chunk);
        },
        close: async () => {
          let data;
          if (chunks.length === 1) data = chunks[0];
          else if (chunks.length === 0) data = new Uint8Array(0);
          else {
            const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
            data = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) {
              data.set(chunk, offset);
              offset += chunk.byteLength;
            }
          }
          chunks = [];
          return unwrap(window.photoLab.write(descriptor.id, data, { mergeXmp: Boolean(options.mergeXmp) }));
        },
        abort: async () => { chunks = []; },
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
  if (!descriptor) return null;
  const data = await unwrap(window.photoLab.read(descriptor.id));
  const file = new File([data.bytes], data.name, { type: mimeType(data.name), lastModified: data.lastModified });
  Object.defineProperty(file, 'photoLabId', { value: descriptor.id });
  return file;
}
export async function copyDesktopFile(sourceId, targetDirId, newName) {
  if (!isDesktop || !window.photoLab?.copyFile) return null;
  return unwrap(window.photoLab.copyFile(sourceId, targetDirId, newName));
}
