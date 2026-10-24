import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDocument, parseProject, serializeProject } from '../src/platform/project.js';
import { cropForAspect, transformedSize, checkCanvasSize, changeCrop } from '../src/imageGeometry.js';
const pixel = 'data:image/png;base64,iVBORw0KGgo=';
test('cutout and composition controls survive project save and reopen', async () => {
  const document = { ...emptyDocument(), image: pixel, originalImage: pixel, bgResult: pixel, bgSubUrl: pixel, bgStatus: 'done', bgScene: 'neon_cyber', bgSubjectScale: 125, bgCustomUrl: pixel, bgOutlineWidth: 3 };
  const restored = parseProject(await serializeProject(document));
  for (const key of ['bgStatus', 'bgSubUrl', 'bgScene', 'bgSubjectScale', 'bgCustomUrl', 'bgOutlineWidth']) assert.equal(restored[key], document[key]);
});
test('editable projects round-trip adjustment values and typed LUTs without credentials', async () => {
  const document = { ...emptyDocument(), image: pixel, originalImage: pixel, accountToken: 'must-not-persist' };
  document.filters.saturation = 0; document.rotation = 90; document.hslMixer.red.hue = 50;
  document.customLutData = { size: 2, data: new Float32Array(24).fill(.5) };
  const serialized = await serializeProject(document); assert.equal(serialized.includes('must-not-persist'), false);
  const restored = parseProject(serialized);
  assert.equal(restored.filters.saturation, 0); assert.equal(restored.hslMixer.red.hue, 50); assert.equal(restored.rotation, 90);
  assert.ok(restored.customLutData.data instanceof Float32Array); assert.equal(restored.customLutData.data.length, 24);
});
test('imported projects reject network URLs, scripts, invalid curves, and oversized LUTs', () => {
  const encoded = doc => JSON.stringify({ format: 'photolab-project', version: 1, document: { ...emptyDocument(), image: pixel, originalImage: pixel, ...doc } });
  for (const image of ['https://example.test/photo.jpg', 'file:///C:/secret', 'data:image/svg+xml;base64,PHN2Zz4=']) assert.throws(() => parseProject(encoded({ image })));
  assert.throws(() => parseProject(encoded({ curves: { master: [{ x: 0, y: 0 }] } })));
  assert.throws(() => parseProject(encoded({ customLutData: { size: 10000, data: [] } })));
  assert.throws(() => parseProject(encoded({ filters: { saturation: 'bad' } })));
});
test('crop ratios use the actual source aspect and remain within bounds', () => {
  for (const [w, h, aw, ah] of [[6000, 4000, 1, 1], [4000, 6000, 16, 9], [6000, 4000, 3, 4]]) {
    const crop = cropForAspect(w, h, aw, ah);
    assert.ok(Math.abs((w * crop.w) / (h * crop.h) - aw / ah) < 1e-10);
    assert.ok(crop.w <= 100 && crop.h <= 100 && crop.x >= 0 && crop.y >= 0);
  }
});
test('rotated exports retain full bounds and reject excessive allocations', () => {
  assert.deepEqual(transformedSize(6000, 4000, 90), { W: 4000, H: 6000 });
  assert.deepEqual(transformedSize(6000, 4000, 180), { W: 6000, H: 4000 });
  assert.deepEqual(transformedSize(100, 100, 45), { W: 142, H: 142 });
  assert.throws(() => checkCanvasSize(20000, 100)); assert.throws(() => checkCanvasSize(10000, 10000));
  assert.doesNotThrow(() => checkCanvasSize(6000, 4000));
});
test('moving and resizing the crop preserves ratio and stays within the image', () => {
  const box = { x: 20, y: 25, w: 60, h: 40 };
  assert.deepEqual(changeCrop(box, 'move', 100, -100), { x: 40, y: 0, w: 60, h: 40 });
  for (const edge of ['nw','n','ne','e','se','s','sw','w']) for (const delta of [-200, -10, 10, 200]) {
    const result = changeCrop(box, edge, delta, delta, 1.5);
    assert.ok(Math.abs(result.w / result.h - 1.5) < 1e-10);
    assert.ok(result.x >= -1e-8 && result.y >= -1e-8 && result.x + result.w <= 100 + 1e-8 && result.y + result.h <= 100 + 1e-8);
  }
});
