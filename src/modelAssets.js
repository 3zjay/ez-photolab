const CACHE = 'photolab-ai-models-v1';
export async function cachedModel(url) {
  const cache = typeof caches !== 'undefined' ? await caches.open(CACHE) : null;
  const existing = await cache?.match(url);
  if (existing) return new Uint8Array(await existing.arrayBuffer());
  const response = await fetch(url);
  if (!response.ok) throw new Error('The AI model could not be downloaded. Check your connection and retry AI setup.');
  const copy = response.clone();
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error('The AI model download was empty. Please retry.');
  await cache?.put(url, copy);
  return bytes;
}
