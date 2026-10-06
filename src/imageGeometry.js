export function cropForAspect(width, height, aspectWidth, aspectHeight) {
  if (![width, height, aspectWidth, aspectHeight].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid image dimensions.');
  const relative = (aspectWidth / aspectHeight) / (width / height);
  const w = Math.min(100, 100 * relative), h = Math.min(100, 100 / relative);
  return { x: (100 - w) / 2, y: (100 - h) / 2, w, h };
}
export function transformedSize(width, height, rotation) {
  if (![width, height, rotation].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error('Invalid export dimensions.');
  const radians = rotation * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians)), sin = Math.abs(Math.sin(radians));
  return { W: Math.ceil(width * cos + height * sin - 1e-8), H: Math.ceil(width * sin + height * cos - 1e-8) };
}
export function checkCanvasSize(width, height, maxPixels = 64_000_000) {
  if (![width, height].every(Number.isFinite) || width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > maxPixels) {
    throw new Error(`This image is too large for this preview. Use an export size below ${Math.round(maxPixels / 1000000)} megapixels and 16,384 pixels per side.`);
  }
}
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function changeCrop(box, edge, dx, dy, ratio = null) {
  if (edge === 'move') return { ...box, x: clamp(box.x + dx, 0, 100 - box.w), y: clamp(box.y + dy, 0, 100 - box.h) };
  const west = edge.includes('w'), east = edge.includes('e'), north = edge.includes('n'), south = edge.includes('s');
  let w = clamp(box.w + (west ? -dx : east ? dx : 0), 2, 100);
  let h = clamp(box.h + (north ? -dy : south ? dy : 0), 2, 100);
  if (ratio) {
    if (west || east) h = w / ratio; else w = h * ratio;
    const maxW = west ? box.x + box.w : east ? 100 - box.x : 2 * Math.min(box.x + box.w / 2, 100 - box.x - box.w / 2);
    const maxH = north ? box.y + box.h : south ? 100 - box.y : 2 * Math.min(box.y + box.h / 2, 100 - box.y - box.h / 2);
    const scale = Math.min(1, maxW / w, maxH / h); w *= scale; h *= scale;
  } else {
    w = Math.min(w, west ? box.x + box.w : 100 - box.x);
    h = Math.min(h, north ? box.y + box.h : 100 - box.y);
  }
  return { x: west ? box.x + box.w - w : east ? box.x : box.x + (box.w - w) / 2, y: north ? box.y + box.h - h : south ? box.y : box.y + (box.h - h) / 2, w, h };
}
