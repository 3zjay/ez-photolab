import { BATCH_RESIZE_PRESETS, FONT_MAP } from "./constants";

// Auto-levels: stretches each RGB channel histogram to 0–255
export function applyAutoLevels(ctx, W, H) {
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  let rMin=255,rMax=0,gMin=255,gMax=0,bMin=255,bMax=0;
  for (let i=0;i<d.length;i+=4) {
    if (d[i+3]<10) continue;
    rMin=Math.min(rMin,d[i]);   rMax=Math.max(rMax,d[i]);
    gMin=Math.min(gMin,d[i+1]); gMax=Math.max(gMax,d[i+1]);
    bMin=Math.min(bMin,d[i+2]); bMax=Math.max(bMax,d[i+2]);
  }
  for (let i=0;i<d.length;i+=4) {
    d[i]   = rMax>rMin ? Math.min(255,Math.round(((d[i]  -rMin)/(rMax-rMin))*255)) : d[i];
    d[i+1] = gMax>gMin ? Math.min(255,Math.round(((d[i+1]-gMin)/(gMax-gMin))*255)) : d[i+1];
    d[i+2] = bMax>bMin ? Math.min(255,Math.round(((d[i+2]-bMin)/(bMax-bMin))*255)) : d[i+2];
  }
  ctx.putImageData(imgData, 0, 0);
}

// Auto-contrast: same as auto-levels but uses luminance to scale uniformly
export function applyAutoContrast(ctx, W, H) {
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  let lMin=255, lMax=0;
  for (let i=0;i<d.length;i+=4) {
    if (d[i+3]<10) continue;
    const l = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    lMin=Math.min(lMin,l); lMax=Math.max(lMax,l);
  }
  if (lMax===lMin) return;
  const scale = 255/(lMax-lMin);
  for (let i=0;i<d.length;i+=4) {
    d[i]   = Math.min(255,Math.max(0,Math.round((d[i]  -lMin)*scale)));
    d[i+1] = Math.min(255,Math.max(0,Math.round((d[i+1]-lMin)*scale)));
    d[i+2] = Math.min(255,Math.max(0,Math.round((d[i+2]-lMin)*scale)));
  }
  ctx.putImageData(imgData, 0, 0);
}

// Unsharp mask: sharpen by subtracting a blurred copy
export function applyUnsharpMask(srcCanvas, ctx, W, H, amount, radius) {
  const blurC = document.createElement('canvas');
  blurC.width=W; blurC.height=H;
  const bctx = blurC.getContext('2d');
  bctx.filter = `blur(${radius.toFixed(1)}px)`;
  bctx.drawImage(srcCanvas, 0, 0);
  bctx.filter = 'none';
  const orig    = ctx.getImageData(0, 0, W, H);
  const blurred = bctx.getImageData(0, 0, W, H);
  const od = orig.data, bd = blurred.data;
  for (let i=0;i<od.length;i+=4) {
    for (let c=0;c<3;c++) {
      od[i+c] = Math.min(255,Math.max(0, od[i+c] + (od[i+c]-bd[i+c])*amount));
    }
  }
  ctx.putImageData(orig, 0, 0);
}

// Noise reduction: gentle Gaussian-like blend
export function applyNoiseReduction(srcCanvas, ctx, W, H, amount) {
  const blurC = document.createElement('canvas');
  blurC.width=W; blurC.height=H;
  const bctx = blurC.getContext('2d');
  bctx.filter = `blur(${(amount*0.8).toFixed(1)}px)`;
  bctx.drawImage(srcCanvas, 0, 0);
  bctx.filter='none';
  const orig    = ctx.getImageData(0,0,W,H);
  const blurred = bctx.getImageData(0,0,W,H);
  const od=orig.data, bd=blurred.data;
  const t=amount/5; // blend factor 0–1
  for (let i=0;i<od.length;i+=4) {
    for (let c=0;c<3;c++) od[i+c]=Math.round(od[i+c]*(1-t)+bd[i+c]*t);
  }
  ctx.putImageData(orig,0,0);
}

// Calculate batch output dimensions
export function calcBatchDims(natW, natH, mode, preset, customW, customH, keepAspect, longEdgePx) {
  if (mode==='none') return {W:natW,H:natH};
  let tW, tH;
  if (mode==='longEdge') {
    const scale = longEdgePx / Math.max(natW,natH);
    return {W:Math.round(natW*scale), H:Math.round(natH*scale)};
  }
  if (mode==='preset') {
    const p = BATCH_RESIZE_PRESETS.find(r=>r.id===preset);
    tW=p.w; tH=p.h||Math.round(natH*(p.w/natW));
  } else {
    tW=customW; tH=customH;
  }
  if (keepAspect) {
    const scale=Math.min(tW/natW,tH/natH);
    return {W:Math.round(natW*scale),H:Math.round(natH*scale)};
  }
  return {W:tW,H:tH};
}

// ── CSS filter from state ─────────────────────────────────────────────────────
export function toCSSFilter(f) {
  const ev = 1 + f.exposure/100;
  const bv = (f.brightness/100)*ev;
  const hlAdj = f.highlights > 0 ? 1 + f.highlights*0.002 : 1 + f.highlights*0.003;
  const shAdj = f.shadows > 0 ? 1 + f.shadows*0.003 : 1 + f.shadows*0.002;
  let s = `brightness(${(bv*hlAdj*shAdj).toFixed(3)}) contrast(${(f.contrast/100).toFixed(3)}) saturate(${(f.saturation/100 * f.vibrance/100).toFixed(3)})`;
  if (f.hue     !== 0) s += ` hue-rotate(${f.hue}deg)`;
  if (f.denoise > 0)   s += ` blur(${(f.denoise*0.05).toFixed(2)}px)`;
  if (f.sharpness > 0) s += ` contrast(${(1+f.sharpness*0.022).toFixed(3)})`;
  if (f.clarity   > 0) s += ` contrast(${(1+f.clarity*0.016).toFixed(3)})`;
  if (f.tint !== 0) {
    const tintSign = f.tint > 0 ? 120 : 300;
    const tintAmt  = Math.abs(f.tint)/400;
    s += ` sepia(${tintAmt.toFixed(3)}) hue-rotate(${tintSign}deg) sepia(0)`;
  }
  return s;
}

export function toTransformCSS(rotation, flipH, flipV) {
  return `rotate(${rotation}deg) scaleX(${flipH?-1:1}) scaleY(${flipV?-1:1})`;
}

export async function saveFile(blob, name) {
  // Try File System Access API for "Save As" dialog on desktop (Chrome, Edge, Opera, etc.)
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      const ext = name.split('.').pop() || 'jpg';
      const mime = blob.type || 'image/jpeg';
      const opts = {
        suggestedName: name,
        types: [{
          description: 'Image Files',
          accept: {
            [mime]: [`.${ext}`]
          }
        }]
      };
      const handle = await window.showSaveFilePicker(opts);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log("Save cancelled by user.");
        return; // User cancelled the save dialog, stop here
      }
      console.warn("showSaveFilePicker failed or was rejected, falling back to download anchor:", e);
    }
  }

  // Fallback to direct anchor download for other browsers (Firefox, Safari, mobile, etc.)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function canvasToBlob(c,mime,q){ return new Promise(r=>{ if(c.toBlob){c.toBlob(r,mime,q);return;} const d=c.toDataURL(mime,q),a=d.split(","),b=atob(a[1]);let n=b.length;const u=new Uint8Array(n);while(n--)u[n]=b.charCodeAt(n);r(new Blob([u],{type:mime}));});}

// Load an image from a src string (data URL or blob URL) reliably
export function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null; img.onerror = null;
      reject(new Error('Image load timeout (10s)'));
    }, 10000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Image failed to load')); };
    img.src = src;
  });
}

// Applies a 3D LUT to Canvas ImageData using trilinear interpolation & opacity blending
export function apply3DLut(imgData, lutData, size, intensity = 1.0) {
  if (intensity <= 0 || !lutData) return;
  const d = imgData.data;
  const sizeMin1 = size - 1;
  const size2 = size * size;
  const scaleFactor = sizeMin1 / 255;
  const oneMinusIntensity = 1 - intensity;
  
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i+1];
    const b = d[i+2];
    
    // Scale normalized coordinates to LUT space
    const rx = r * scaleFactor;
    const gx = g * scaleFactor;
    const bx = b * scaleFactor;
    
    const r0 = rx | 0;
    const r1 = r0 < sizeMin1 ? r0 + 1 : sizeMin1;
    const g0 = gx | 0;
    const g1 = g0 < sizeMin1 ? g0 + 1 : sizeMin1;
    const b0 = bx | 0;
    const b1 = b0 < sizeMin1 ? b0 + 1 : sizeMin1;
    
    const rf = rx - r0;
    const gf = gx - g0;
    const bf = bx - b0;
    
    const g0_size = g0 * size;
    const g1_size = g1 * size;
    const b0_size2 = b0 * size2;
    const b1_size2 = b1 * size2;
    
    const idx000 = (r0 + g0_size + b0_size2) * 3;
    const idx100 = (r1 + g0_size + b0_size2) * 3;
    const idx010 = (r0 + g1_size + b0_size2) * 3;
    const idx110 = (r1 + g1_size + b0_size2) * 3;
    const idx001 = (r0 + g0_size + b1_size2) * 3;
    const idx101 = (r1 + g0_size + b1_size2) * 3;
    const idx011 = (r0 + g1_size + b1_size2) * 3;
    const idx111 = (r1 + g1_size + b1_size2) * 3;
    
    // Interpolate along Red
    const c00_r = lutData[idx000] * (1 - rf) + lutData[idx100] * rf;
    const c10_r = lutData[idx010] * (1 - rf) + lutData[idx110] * rf;
    const c01_r = lutData[idx001] * (1 - rf) + lutData[idx101] * rf;
    const c11_r = lutData[idx011] * (1 - rf) + lutData[idx111] * rf;
    
    // Interpolate along Green
    const c0_r = c00_r * (1 - gf) + c10_r * gf;
    const c1_r = c01_r * (1 - gf) + c11_r * gf;
    
    // Interpolate along Blue
    const lutR = (c0_r * (1 - bf) + c1_r * bf) * 255;
    
    // Interpolate Green channel
    const c00_g = lutData[idx000 + 1] * (1 - rf) + lutData[idx100 + 1] * rf;
    const c10_g = lutData[idx010 + 1] * (1 - rf) + lutData[idx110 + 1] * rf;
    const c01_g = lutData[idx001 + 1] * (1 - rf) + lutData[idx101 + 1] * rf;
    const c11_g = lutData[idx011 + 1] * (1 - rf) + lutData[idx111 + 1] * rf;
    
    const c0_g = c00_g * (1 - gf) + c10_g * gf;
    const c1_g = c01_g * (1 - gf) + c11_g * gf;
    
    const lutG = (c0_g * (1 - bf) + c1_g * bf) * 255;
    
    // Interpolate Blue channel
    const c00_b = lutData[idx000 + 2] * (1 - rf) + lutData[idx100 + 2] * rf;
    const c10_b = lutData[idx010 + 2] * (1 - rf) + lutData[idx110 + 2] * rf;
    const c01_b = lutData[idx001 + 2] * (1 - rf) + lutData[idx101 + 2] * rf;
    const c11_b = lutData[idx011 + 2] * (1 - rf) + lutData[idx111 + 2] * rf;
    
    const c0_b = c00_b * (1 - gf) + c10_b * gf;
    const c1_b = c01_b * (1 - gf) + c11_b * gf;
    
    const lutB = (c0_b * (1 - bf) + c1_b * bf) * 255;
    
    // Blend with original color based on intensity
    d[i]   = (r * oneMinusIntensity + lutR * intensity) | 0;
    d[i+1] = (g * oneMinusIntensity + lutG * intensity) | 0;
    d[i+2] = (b * oneMinusIntensity + lutB * intensity) | 0;
  }
}

export async function renderFinal(imageSrc, cssFilterStr, filters, rotation, flipH, flipV, texts, targetW, targetH, lutData = null, lutSize = 33, lutIntensity = 1.0, logo = null, logoScale = 0.15, logoScalePortrait = 0.30, logoOpacity = 0.7, logoPos = "bottom-right", logoMargin = 20) {
  // Always load a fresh Image to avoid canvas taint and stale DOM refs
  const imgEl = await loadImageFromSrc(imageSrc);
  const natW = imgEl.naturalWidth;
  const natH = imgEl.naturalHeight;
  if (!natW || !natH) throw new Error('Image has zero dimensions — cannot export');

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|Firefox/i.test(navigator.userAgent);
  const MAX = (isMobile || isSafari) ? 16_000_000 : 268_435_456;
  let W = targetW || natW;
  let H = targetH || natH;
  if (W * H > MAX) { const s = Math.sqrt(MAX / (W * H)); W = Math.floor(W * s); H = Math.floor(H * s); }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Apply rotation + flip
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply CSS filters via ctx.filter (supported in all modern browsers)
  if (cssFilterStr && cssFilterStr !== 'none' && cssFilterStr.trim() !== '') {
    ctx.filter = cssFilterStr;
  }
  ctx.drawImage(imgEl, -W / 2, -H / 2, W, H);
  ctx.restore();
  ctx.filter = 'none';

  // Apply 3D LUT
  if (lutData) {
    const imgData = ctx.getImageData(0, 0, W, H);
    apply3DLut(imgData, lutData, lutSize, lutIntensity);
    ctx.putImageData(imgData, 0, 0);
  }

  // Warmth overlay
  if (filters.temperature !== 0) {
    const a = Math.abs(filters.temperature) / 300;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = filters.temperature > 0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Fade
  if (filters.fade > 0) {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,255,255,${filters.fade / 180})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Vignette
  if (filters.vignette > 0) {
    const g = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Grain
  if (filters.grain > 0) {
    const gC = document.createElement('canvas'); gC.width = W; gC.height = H;
    const gc = gC.getContext('2d'); const id = gc.createImageData(W, H); const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() - 0.5) * filters.grain * 2.5;
      d[i] = d[i+1] = d[i+2] = 128 + v; d[i+3] = 255;
    }
    gc.putImageData(id, 0, 0);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35;
    ctx.drawImage(gC, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // Text overlays
  texts.forEach(t => {
    if (!t.content.trim()) return;
    const sz = Math.round(t.fontSize * (W / 800));
    ctx.font = `${t.bold ? 'bold ' : ''}${t.italic ? 'italic ' : ''}${sz}px ${FONT_MAP[t.font] || FONT_MAP.System}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const x = t.x / 100 * W, y = t.y / 100 * H;
    if (t.stroke) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = sz * 0.08; ctx.strokeText(t.content, x, y); }
    ctx.fillStyle = t.color; ctx.fillText(t.content, x, y);
  });

  // Logo watermark overlay
  if (logo) {
    const isPortrait = H > W;
    const logoW = W * (isPortrait ? logoScalePortrait : logoScale);
    const logoH = (logo.height / logo.width) * logoW;
    const m = logoMargin;
    const positions = {
      'top-left': { x: m, y: m },
      'top-right': { x: W - logoW - m, y: m },
      'top-center': { x: (W - logoW) / 2, y: m },
      'bottom-left': { x: m, y: H - logoH - m },
      'bottom-right': { x: W - logoW - m, y: H - logoH - m },
      'bottom-center': { x: (W - logoW) / 2, y: H - logoH - m },
      'center': { x: (W - logoW) / 2, y: (H - logoH) / 2 },
      'center-left': { x: m, y: (H - logoH) / 2 },
      'center-right': { x: W - logoW - m, y: (H - logoH) / 2 }
    };
    const { x, y } = positions[logoPos] || positions['bottom-right'];
    ctx.globalAlpha = logoOpacity;
    ctx.drawImage(logo, x, y, logoW, logoH);
    ctx.globalAlpha = 1.0;
  }

  return { canvas, W, H };
}

export function getExportDims(natW,natH,scaleVal){
  if(scaleVal==="8k"){const s=7680/Math.max(natW,natH);return{W:Math.round(natW*s),H:Math.round(natH*s)};}
  return{W:Math.round(natW*scaleVal),H:Math.round(natH*scaleVal)};
}
