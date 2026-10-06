import { DEFAULT_FILTERS, DEFAULT_HSL_MIXER } from '../constants.js';

export const identityCurves = () => Object.fromEntries(['master', 'red', 'green', 'blue'].map(key => [key, [{ x: 0, y: 0 }, { x: 255, y: 255 }]]));
export const emptyDocument = () => ({
  image: null, originalImage: null, filters: { ...DEFAULT_FILTERS }, hslMixer: structuredClone(DEFAULT_HSL_MIXER), curves: identityCurves(),
  rotation: 0, flipH: false, flipV: false, texts: [], lutId: 'none', lutIntensity: 1, customLutData: null, customLutName: '',
  accentAi: 0, structureAi: 0, skyMode: 'none', skyOpacity: 100, skyLightMatch: 50, customSkyUrl: null, relightNear: 0, relightFar: 0,
  aiBeautySmooth: 0, aiBeautyClarity: 0, aiBeautyGlow: 0, aiBeautyUseMask: true,
  chromatic: 0, prism: 0, halation: 0, filmDust: 0, glitter: 0, vhs: false, lightLeak: 'none', heatmap: 0,
  logo: null, logoScale: .15, logoScalePortrait: .30, logoOpacity: .7, logoPos: 'bottom-right', logoMargin: 20, logoX: null, logoY: null,
  bgResult: null, bgMode: 'transparent', bgColor: '#ffffff', bgBlur: 14,
});
const imageKeys = new Set(['image', 'originalImage', 'customSkyUrl', 'logo', 'bgResult']);
const validImage = value => value === null || (typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=\s]+$/i.test(value));
const bounded = (value, min = -10000, max = 10000) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const fail = () => { throw new Error('This project contains unsupported or invalid editing data.'); };

export function parseProject(data) {
  if (typeof data !== 'string' || data.length > 192 * 1024 * 1024) fail();
  const project = JSON.parse(data);
  if (project.format !== 'photolab-project' || project.version !== 1 || !project.document || typeof project.document !== 'object') fail();
  const source = project.document;
  const result = emptyDocument();
  for (const [key, fallback] of Object.entries(result)) {
    if (!(key in source)) continue;
    const value = source[key];
    if (imageKeys.has(key)) { if (!validImage(value)) fail(); }
    else if (key === 'filters') {
      if (!value || Object.entries(value).some(([k, v]) => !(k in DEFAULT_FILTERS) || !bounded(v))) fail();
      result[key] = { ...DEFAULT_FILTERS, ...value }; continue;
    } else if (key === 'hslMixer') {
      if (!value || Object.keys(DEFAULT_HSL_MIXER).some(k => !value[k] || ['hue', 'sat', 'lum'].some(c => !bounded(value[k][c], -360, 360)))) fail();
    } else if (key === 'curves') {
      if (!value || ['master', 'red', 'green', 'blue'].some(k => !Array.isArray(value[k]) || value[k].length < 2 || value[k].length > 64 || value[k].some((p, i, points) => !bounded(p.x, 0, 255) || !bounded(p.y, 0, 255) || (i > 0 && p.x <= points[i - 1].x)))) fail();
    } else if (key === 'texts') {
      if (!Array.isArray(value) || value.length > 100 || value.some(t => !t || !['string', 'number'].includes(typeof t.id) || typeof t.content !== 'string' || t.content.length > 10000 || !bounded(t.x, -100, 200) || !bounded(t.y, -100, 200) || !bounded(t.fontSize, 1, 1000) || typeof t.color !== 'string' || typeof t.font !== 'string')) fail();
    } else if (key === 'customLutData') {
      if (value !== null && (!value || ![2, 8, 16, 17, 32, 33, 64, 65].includes(value.size) || !Array.isArray(value.data) || value.data.length !== value.size ** 3 * 3 || value.data.some(v => !bounded(v, -10, 10)))) fail();
      result[key] = value ? { size: value.size, data: new Float32Array(value.data) } : null; continue;
    } else if (key === 'logoX' || key === 'logoY') { if (value !== null && !bounded(value, -100, 200)) fail(); }
    else if (typeof fallback === 'number') { if (!bounded(value)) fail(); }
    else if (typeof fallback === 'boolean') { if (typeof value !== 'boolean') fail(); }
    else if (typeof fallback === 'string') { if (typeof value !== 'string' || value.length > 500) fail(); }
    result[key] = value;
  }
  if (!result.image || !result.originalImage) fail();
  return result;
}

const assetCache = new Map();
async function embeddedImage(value) {
  if (!value) return null;
  const src = typeof value === 'string' ? value : value.src;
  if (validImage(src)) return src;
  if (!src?.startsWith('blob:')) throw new Error('Only imported local images can be saved in projects.');
  if (!assetCache.has(src)) {
    if (assetCache.size >= 8) assetCache.delete(assetCache.keys().next().value);
    assetCache.set(src, fetch(src).then(r => r.blob()).then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not embed image.')); reader.readAsDataURL(blob);
    })));
  }
  return assetCache.get(src);
}
export async function serializeProject(document) {
  const copy = Object.fromEntries(Object.keys(emptyDocument()).map(key => [key, document[key]]));
  await Promise.all([...imageKeys].map(async key => { copy[key] = await embeddedImage(copy[key]); }));
  if (copy.customLutData) copy.customLutData = { size: copy.customLutData.size, data: Array.from(copy.customLutData.data) };
  const data = JSON.stringify({ format: 'photolab-project', version: 1, savedAt: new Date().toISOString(), document: copy });
  parseProject(data);
  return data;
}
