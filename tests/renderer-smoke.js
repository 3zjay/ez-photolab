import { renderFinal, toCSSFilter, applySkyReplacement } from '../src/utils';
import { DEFAULT_FILTERS, DEFAULT_HSL_MIXER } from '../src/constants';
import { generateXmpContent, mergeXmpContent, exportXmpSidecars } from '../src/xmpExporter';
import { clusterPhotos } from '../src/cullEngine';
import { identityCurves } from '../src/platform/project';
const passed = [], failed = [];
const check = (condition, message) => { if (!condition) throw new Error(message); };
const test = async (name, fn) => { try { await fn(); passed.push(name); } catch (error) { failed.push({ name, message: error.message }); } };
const canvas = document.createElement('canvas'); canvas.width = 12; canvas.height = 8;
const context = canvas.getContext('2d'); context.fillStyle = '#e03020'; context.fillRect(0, 0, 6, 8); context.fillStyle = '#2050e0'; context.fillRect(6, 0, 6, 8);
const src = canvas.toDataURL();
const pixel = (c, x = 2, y = 2) => [...c.getContext('2d').getImageData(x, y, 1, 1).data];
async function render({ rotation = 0, filters = DEFAULT_FILTERS, hsl = null, curves = null } = {}) {
  return renderFinal(src, toCSSFilter(filters), filters, rotation, false, false, [], 12, 8, null, 33, 1, null, .15, .3, .7, 'bottom-right', 20, null, null, 0, 0, 0, false, 0, 'none', 100, 50, null, 0, 0, null, null, null, {}, hsl, curves);
}
await test('90 degree export preserves dimensions and every source pixel', async () => {
  const result = await render({ rotation: 90 }); check(result.W === 8 && result.H === 12, 'Incorrect rotated dimensions');
  const bytes = result.canvas.getContext('2d').getImageData(0, 0, 8, 12).data;
  check(bytes.filter((_v, index) => index % 4 === 3).every(alpha => alpha === 255), 'Rotation clipped pixels');
});
await test('zero saturation exports a grayscale image', async () => {
  const result = await render({ filters: { ...DEFAULT_FILTERS, saturation: 0 } });
  const p = pixel(result.canvas); check(p[0] === p[1] && p[1] === p[2], 'Zero saturation became 100%');
});
await test('HSL and curves are applied to final exported pixels', async () => {
  const original = await render();
  const hsl = structuredClone(DEFAULT_HSL_MIXER); hsl.red.hue = 90;
  const changed = await render({ hsl }); check(String(pixel(changed.canvas)) !== String(pixel(original.canvas)), 'HSL ignored');
  const curves = identityCurves(); curves.master = [{ x: 0, y: 255 }, { x: 255, y: 0 }];
  const inverted = await render({ curves }); check(String(pixel(inverted.canvas)) !== String(pixel(original.canvas)), 'Curves ignored');
});
await test('zero sky opacity preserves original pixels and alpha', async () => {
  const c = document.createElement('canvas'); c.width = 12; c.height = 8; const ctx = c.getContext('2d'); ctx.drawImage(canvas, 0, 0);
  const mask = document.createElement('canvas'); mask.width = 12; mask.height = 8; const mc = mask.getContext('2d'); mc.fillStyle = 'white'; mc.fillRect(0, 0, 12, 8);
  const before = String(ctx.getImageData(0, 0, 12, 8).data);
  await applySkyReplacement(c, ctx, 12, 8, 'custom', mask, src, 0, .5);
  check(String(ctx.getImageData(0, 0, 12, 8).data) === before, 'Zero opacity changed original pixels');
});
await test('XMP merge preserves Camera Raw edits and clears old ratings', () => {
  const existing = generateXmpContent(5, 'green').replace('rdf:about=""', 'rdf:about="" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/" crs:Exposure2012="1.5"');
  const merged = mergeXmpContent(existing, 0, '');
  const xml = new DOMParser().parseFromString(merged, 'application/xml');
  const desc = xml.getElementsByTagNameNS('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'Description')[0];
  check(desc.getAttributeNS('http://ns.adobe.com/camera-raw-settings/1.0/', 'Exposure2012') === '1.5', 'Camera Raw edits were lost');
  check(desc.getAttributeNS('http://ns.adobe.com/xap/1.0/', 'Rating') === '0', 'Old rating remained');
  let rejected = false; try { mergeXmpContent('<broken', 5, 'green'); } catch { rejected = true; } check(rejected, 'Invalid XML accepted');
});
await test('conflicting RAW/JPEG sidecars are reported without writes', async () => {
  let writes = 0;
  const result = await exportXmpSidecars({ getFileHandle: () => { writes++; throw new Error('Unexpected write'); } }, [{ name: 'DSC1.NEF', rating: 5, label: 'green' }, { name: 'DSC1.jpg', rating: 1, label: 'red' }]);
  check(writes === 0 && result.failed === 1 && result.saved === 0, 'Conflict overwrote metadata');
});
await test('manual culling decisions survive regrouping and duplicate names stay distinct', () => {
  const one = { name: 'same.jpg', dHash: '0000', brightness: 80, sharpness: 90, cullScore: 95, manualSelection: true, category: 'rejected', rating: 1, label: 'red', isKeyPhoto: false };
  const two = { name: 'same.jpg', dHash: '0000', brightness: 80, sharpness: 90, cullScore: 90 };
  clusterPhotos([one, two]);
  check(one.rating === 1 && one.category === 'rejected' && !one.isKeyPhoto, 'Manual rejection changed');
  check(two.rating === 5 && two.isKeyPhoto, 'Next eligible photo was not selected after manual rejection');
  const broken = { name: 'broken.jpg', analysisFailed: true, cullScore: 10, sharpness: 10, brightness: 50 };
  clusterPhotos([broken]); check(broken.category === 'alternate' && broken.rating === 0, 'Analysis failure became rejection');
});
window.photoLabTestResults = { passed, failed };
