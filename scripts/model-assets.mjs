import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Pin data to the installed IMG.LY release and its matching ONNX runtime.
export async function bundleCutout(output) {
  const { version } = JSON.parse(await readFile(new URL('../node_modules/@imgly/background-removal/package.json', import.meta.url)));
  const origin = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist/`;
  const cache = resolve('.model-assets', version), target = resolve(output, 'cutout');
  await mkdir(cache, { recursive: true }); await mkdir(target, { recursive: true });
  async function asset(name, size) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('Invalid model asset filename.');
    const filename = resolve(cache, name);
    let bytes;
    try { bytes = await readFile(filename); if (size && bytes.length !== size) throw new Error('Incomplete asset'); }
    catch {
      const response = await fetch(new URL(name, origin), { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`Model asset download failed: ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (size && bytes.length !== size) throw new Error('Incomplete model asset download.');
      await writeFile(filename, bytes);
    }
    await copyFile(filename, resolve(target, name));
    return bytes;
  }
  const manifest = JSON.parse(await asset('resources.json'));
  const keys = ['/models/isnet_fp16', '/onnxruntime-web/ort-wasm-simd-threaded.wasm', '/onnxruntime-web/ort-wasm-simd-threaded.mjs'];
  const selected = Object.fromEntries(keys.map(key => [key, manifest[key]]));
  for (const entry of Object.values(selected)) for (const chunk of entry.chunks) await asset(chunk.name, chunk.offsets[1] - chunk.offsets[0]);
  await writeFile(resolve(target, 'resources.json'), JSON.stringify(selected));
}
