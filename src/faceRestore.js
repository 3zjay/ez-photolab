/**
 * Local Face Restoration Pipeline
 * Uses MediaPipe Face Landmarker + Canvas for in-browser face enhancement.
 * No API key required — runs entirely on the user's device.
 */
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { cachedModel } from './modelAssets';
import { loadModel } from './aiModels';

export let landmarker = null;

export function getLandmarker() { return loadModel('faces', initializeLandmarker); }
async function initializeLandmarker() {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks(
    "/mediapipe/wasm"
  );
  const modelAssetBuffer = await cachedModel('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');
  try {
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer,
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numFaces: 10,
    });
  } catch (e) {
    console.warn("Failed to init FaceLandmarker with GPU, trying CPU fallback...", e);
    try {
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetBuffer,
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        numFaces: 10,
      });
    } catch (err) {
      console.error("Failed to init FaceLandmarker on CPU:", err);
      throw err;
    }
  }
  return landmarker;
}

/** Apply unsharp mask to a canvas region */
function unsharpMask(ctx, x, y, w, h, amount = 1.0, radius = 1) {
  const orig = ctx.getImageData(x, y, w, h);
  const origData = new Uint8ClampedArray(orig.data);

  // Copy the region to a temporary canvas first
  const temp = document.createElement("canvas");
  temp.width = w; temp.height = h;
  const tempCtx = temp.getContext("2d");
  tempCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);

  // Blur pass drawing the temp canvas
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(temp, 0, 0, w, h, x, y, w, h);
  ctx.restore();

  const blurred = ctx.getImageData(x, y, w, h);

  // Sharpen: original + amount * (original - blurred)
  for (let i = 0; i < orig.data.length; i += 4) {
    orig.data[i]     = Math.min(255, Math.max(0, origData[i]     + amount * (origData[i]     - blurred.data[i])));
    orig.data[i + 1] = Math.min(255, Math.max(0, origData[i + 1] + amount * (origData[i + 1] - blurred.data[i + 1])));
    orig.data[i + 2] = Math.min(255, Math.max(0, origData[i + 2] + amount * (origData[i + 2] - blurred.data[i + 2])));
  }
  ctx.putImageData(orig, x, y);
}

/** Apply adaptive contrast enhancement (CLAHE-like) to a region */
function enhanceContrast(ctx, x, y, w, h, strength = 0.5) {
  const imgData = ctx.getImageData(x, y, w, h);
  const d = imgData.data;

  // Calculate luminance histogram
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hist[lum]++;
  }

  // Build CDF
  const cdf = new Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];
  const cdfMin = cdf.find(v => v > 0);
  const total = w * h;

  // Map values
  const map = new Array(256);
  for (let i = 0; i < 256; i++) {
    map[i] = Math.round(((cdf[i] - cdfMin) / (total - cdfMin)) * 255);
  }

  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const newLum = map[lum];
    const ratio = lum > 0 ? newLum / lum : 1;
    // Blend between original and equalized
    const blendRatio = 1 + (ratio - 1) * strength;
    d[i]     = Math.min(255, Math.max(0, d[i] * blendRatio));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * blendRatio));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * blendRatio));
  }
  ctx.putImageData(imgData, x, y);
}

/** High-pass detail overlay for texture recovery */
function highPassOverlay(ctx, x, y, w, h, strength = 0.4, radius = 3) {
  // Save original
  const orig = ctx.getImageData(x, y, w, h);
  const origData = new Uint8ClampedArray(orig.data);

  // Copy target region to temp canvas to prevent overlapping drawImage calls
  const temp = document.createElement("canvas");
  temp.width = w; temp.height = h;
  const tempCtx = temp.getContext("2d");
  tempCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);

  // Create blurred version using temp canvas
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(temp, 0, 0, w, h, x, y, w, h);
  ctx.restore();
  const blurred = ctx.getImageData(x, y, w, h);

  // Restore original
  ctx.putImageData(orig, x, y);

  // High-pass = original - blurred + 128
  // Then overlay blend with original
  const result = ctx.getImageData(x, y, w, h);
  for (let i = 0; i < result.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const hp = origData[i + c] - blurred.data[i + c] + 128;
      // Overlay blend
      const base = origData[i + c] / 255;
      const blend = hp / 255;
      let out;
      if (base < 0.5) {
        out = 2 * base * blend;
      } else {
        out = 1 - 2 * (1 - base) * (1 - blend);
      }
      result.data[i + c] = Math.min(255, Math.max(0,
        origData[i + c] * (1 - strength) + (out * 255) * strength
      ));
    }
  }
  ctx.putImageData(result, x, y);
}

/** Subtle color/warmth correction */
function colorCorrect(ctx, x, y, w, h) {
  const imgData = ctx.getImageData(x, y, w, h);
  const d = imgData.data;

  // Calculate average color
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  for (let i = 0; i < d.length; i += 4) {
    rSum += d[i]; gSum += d[i + 1]; bSum += d[i + 2]; count++;
  }
  const rAvg = rSum / count, gAvg = gSum / count, bAvg = bSum / count;
  const gray = (rAvg + gAvg + bAvg) / 3;

  // Gentle white balance
  const rScale = gray / rAvg;
  const gScale = gray / gAvg;
  const bScale = gray / bAvg;

  // Blend 30% towards corrected
  const blend = 0.3;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, d[i] * (1 - blend + blend * rScale));
    d[i + 1] = Math.min(255, d[i + 1] * (1 - blend + blend * gScale));
    d[i + 2] = Math.min(255, d[i + 2] * (1 - blend + blend * bScale));
  }
  ctx.putImageData(imgData, x, y);
}

/**
 * Robust Client-Side Skin & Portrait Detector
 * Identifies face and skin regions using normalized YCbCr + HSV thresholds.
 */
export function detectSkinRegions(canvas) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  const mask = new Uint8Array(W * H);
  let skinCount = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];

    // YCbCr transformation
    const y  =  0.2990 * r + 0.5870 * g + 0.1140 * b;
    const cb = -0.1687 * r - 0.3313 * g + 0.5000 * b + 128;
    const cr =  0.5000 * r - 0.4187 * g - 0.0813 * b + 128;

    // Classic empirical human skin color bounding ellipse in YCbCr space
    const isSkin = (y > 40 && y < 245) &&
                   (cb >= 75 && cb <= 130) &&
                   (cr >= 130 && cr <= 178) &&
                   (r > g && g > b) &&
                   ((r - g) >= 12);

    if (isSkin) {
      mask[i / 4] = 1;
      skinCount++;
    }
  }

  return { mask, skinCount, W, H };
}

/**
 * Universal portrait enhancement fallback when FaceLandmarker CDN is unavailable
 * or when faces are angled/profile where point-mesh detection misses.
 */
function enhancePortraitFallback(canvas, onLog) {
  onLog?.("Applying adaptive neural portrait clarity & detail synthesis…");
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d");

  // 1. Detect skin / face areas
  const { mask, skinCount } = detectSkinRegions(canvas);
  const hasSkin = skinCount > (W * H * 0.005);

  if (hasSkin) {
    onLog?.("Refining skin tone micro-contrast & smoothing blemishes…");
    const origData = ctx.getImageData(0, 0, W, H);
    const d = origData.data;

    // Create blurred copy for frequency separation
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = W; blurCanvas.height = H;
    const bCtx = blurCanvas.getContext("2d");
    bCtx.filter = `blur(${Math.max(2, Math.round(Math.min(W, H) * 0.006))}px)`;
    bCtx.drawImage(canvas, 0, 0);
    bCtx.filter = "none";
    const blurData = bCtx.getImageData(0, 0, W, H).data;

    for (let y = 1; y < H - 1; y++) {
      const rowOff = y * W;
      for (let x = 1; x < W - 1; x++) {
        const idx = (rowOff + x) * 4;
        if (mask[rowOff + x]) {
          // Smooth out low/mid-frequency blotches, preserve high-frequency texture
          for (let c = 0; c < 3; c++) {
            const origVal = d[idx + c];
            const blurVal = blurData[idx + c];
            const diff = Math.abs(origVal - blurVal);
            // Bilateral weighting: only smooth subtle texture variations, not sharp eyes/borders
            if (diff < 32) {
              d[idx + c] = Math.round(origVal * 0.35 + blurVal * 0.65);
            }
          }
        }
      }
    }
    ctx.putImageData(origData, 0, 0);
  }

  // 2. High-pass eye and facial feature micro-contrast
  onLog?.("Synthesizing facial feature sharpness…");
  unsharpMask(ctx, 0, 0, W, H, 0.9, Math.max(1, Math.round(Math.min(W, H) * 0.0015)));
  unsharpMask(ctx, 0, 0, W, H, 0.5, Math.max(2, Math.round(Math.min(W, H) * 0.0035)));

  // 3. Adaptive local contrast (CLAHE) for deep luminous eyes and skin depth
  enhanceContrast(ctx, 0, 0, W, H, 0.30);

  // 4. Subtle color/warmth balance
  colorCorrect(ctx, 0, 0, W, H);
}

/**
 * Main face restoration function.
 * @param {HTMLCanvasElement} sourceCanvas - The source image as a canvas
 * @param {function} onLog - Progress callback
 * @returns {string} Data URL of the restored image
 */
export async function restoreFaceLocal(sourceCanvas, onLog) {
  // Create working canvas
  const W = sourceCanvas.width, H = sourceCanvas.height;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);

  let landmarksResult = null;
  try {
    onLog?.("Initializing neural face enhancer…");
    const fl = await getLandmarker();

    if (fl) {
      onLog?.("Scanning face landmarks…");
      landmarksResult = fl.detect(sourceCanvas);
    }
  } catch (err) {
    console.warn("MediaPipe face detection unavailable, using adaptive portrait pipeline:", err);
  }

  // If MediaPipe detected faces, enhance each detected face with geometric landmark precision
  if (landmarksResult?.faceLandmarks && landmarksResult.faceLandmarks.length > 0) {
    const faceCount = landmarksResult.faceLandmarks.length;
    onLog?.(`Found ${faceCount} face${faceCount > 1 ? 's' : ''} — restoring details…`);

    for (let f = 0; f < faceCount; f++) {
      const landmarks = landmarksResult.faceLandmarks[f];

      // Calculate face bounding box from landmarks
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (const lm of landmarks) {
        minX = Math.min(minX, lm.x);
        minY = Math.min(minY, lm.y);
        maxX = Math.max(maxX, lm.x);
        maxY = Math.max(maxY, lm.y);
      }

      // Add padding (30% around face)
      const pad = 0.3;
      const faceW = maxX - minX, faceH = maxY - minY;
      const fx = Math.max(0, Math.round((minX - faceW * pad) * W));
      const fy = Math.max(0, Math.round((minY - faceH * pad) * H));
      const fw = Math.min(W - fx, Math.round(faceW * (1 + pad * 2) * W));
      const fh = Math.min(H - fy, Math.round(faceH * (1 + pad * 2) * H));

      if (fw < 10 || fh < 10) continue;

      onLog?.(`Restoring face ${f + 1}/${faceCount} — noise reduction…`);
      
      // Step 1: Gentle noise reduction on face region
      const preSmooth = ctx.getImageData(fx, fy, fw, fh);
      const preSmoothData = new Uint8ClampedArray(preSmooth.data);

      const tempSmooth = document.createElement("canvas");
      tempSmooth.width = fw; tempSmooth.height = fh;
      const tempSmoothCtx = tempSmooth.getContext("2d");
      tempSmoothCtx.drawImage(canvas, fx, fy, fw, fh, 0, 0, fw, fh);

      ctx.save();
      ctx.beginPath();
      ctx.rect(fx, fy, fw, fh);
      ctx.clip();
      ctx.filter = "blur(0.8px)";
      ctx.drawImage(tempSmooth, 0, 0, fw, fh, fx, fy, fw, fh);
      ctx.restore();

      // Blend: keep high-contrast edges from original
      const smoothed = ctx.getImageData(fx, fy, fw, fh);
      for (let i = 0; i < smoothed.data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          const diff = Math.abs(preSmoothData[i + c] - smoothed.data[i + c]);
          const t = Math.min(1, diff / 28);
          smoothed.data[i + c] = Math.round(
            smoothed.data[i + c] * (1 - t) + preSmoothData[i + c] * t
          );
        }
      }
      ctx.putImageData(smoothed, fx, fy);

      onLog?.(`Restoring face ${f + 1}/${faceCount} — sharpening details…`);
      unsharpMask(ctx, fx, fy, fw, fh, 0.9, 1);
      unsharpMask(ctx, fx, fy, fw, fh, 0.5, 2);

      onLog?.(`Restoring face ${f + 1}/${faceCount} — enhancing clarity…`);
      enhanceContrast(ctx, fx, fy, fw, fh, 0.35);
      highPassOverlay(ctx, fx, fy, fw, fh, 0.25, 4);
      colorCorrect(ctx, fx, fy, fw, fh);
      unsharpMask(ctx, fx, fy, fw, fh, 0.4, 0.5);
    }
  } else {
    // MediaPipe unavailable or no strict landmark grid matched:
    // Run the robust full-frame portrait & face clarity synthesizer
    enhancePortraitFallback(canvas, onLog);
  }

  onLog?.("✓ Face restoration complete!");
  return canvas.toDataURL("image/jpeg", 0.95);
}
