/**
 * Local Face Restoration Pipeline
 * Uses MediaPipe Face Landmarker + Canvas for in-browser face enhancement.
 * No API key required — runs entirely on the user's device.
 */
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export let landmarker = null;

export async function getLandmarker() {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  landmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numFaces: 10,
  });
  return landmarker;
}

/** Apply unsharp mask to a canvas region */
function unsharpMask(ctx, x, y, w, h, amount = 1.0, radius = 1) {
  const orig = ctx.getImageData(x, y, w, h);
  const origData = new Uint8ClampedArray(orig.data);

  // Blur pass
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(ctx.canvas, x, y, w, h, x, y, w, h);
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

  // Create blurred version
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(ctx.canvas, x, y, w, h, x, y, w, h);
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
 * Main face restoration function.
 * @param {HTMLCanvasElement} sourceCanvas - The source image as a canvas
 * @param {function} onLog - Progress callback
 * @returns {string} Data URL of the restored image
 */
export async function restoreFaceLocal(sourceCanvas, onLog) {
  onLog?.("Loading face detection model…");
  const fl = await getLandmarker();

  onLog?.("Detecting faces…");
  const result = fl.detect(sourceCanvas);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    throw new Error("No faces detected in this image. Try a photo with a clearly visible face.");
  }

  // Create working canvas
  const W = sourceCanvas.width, H = sourceCanvas.height;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);

  const faceCount = result.faceLandmarks.length;
  onLog?.(`Found ${faceCount} face${faceCount > 1 ? 's' : ''} — enhancing…`);

  for (let f = 0; f < faceCount; f++) {
    const landmarks = result.faceLandmarks[f];

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
    // We approximate bilateral filtering with a small gaussian
    const preSmooth = ctx.getImageData(fx, fy, fw, fh);
    const preSmoothData = new Uint8ClampedArray(preSmooth.data);
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    ctx.filter = "blur(0.7px)";
    ctx.drawImage(canvas, fx, fy, fw, fh, fx, fy, fw, fh);
    ctx.restore();
    // Blend: keep edges from original
    const smoothed = ctx.getImageData(fx, fy, fw, fh);
    for (let i = 0; i < smoothed.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const diff = Math.abs(preSmoothData[i + c] - smoothed.data[i + c]);
        // Edge-preserving: if big difference, keep original
        const t = Math.min(1, diff / 30);
        smoothed.data[i + c] = Math.round(
          smoothed.data[i + c] * (1 - t) + preSmoothData[i + c] * t
        );
      }
    }
    ctx.putImageData(smoothed, fx, fy);

    onLog?.(`Restoring face ${f + 1}/${faceCount} — sharpening details…`);

    // Step 2: Multi-pass unsharp mask for detail recovery
    unsharpMask(ctx, fx, fy, fw, fh, 0.8, 1);   // Fine detail
    unsharpMask(ctx, fx, fy, fw, fh, 0.5, 2);   // Medium detail

    onLog?.(`Restoring face ${f + 1}/${faceCount} — enhancing clarity…`);

    // Step 3: Adaptive contrast enhancement
    enhanceContrast(ctx, fx, fy, fw, fh, 0.35);

    // Step 4: High-pass texture overlay for crispness
    highPassOverlay(ctx, fx, fy, fw, fh, 0.25, 4);

    // Step 5: Subtle color correction
    colorCorrect(ctx, fx, fy, fw, fh);

    // Step 6: Final gentle sharpen for crispness
    unsharpMask(ctx, fx, fy, fw, fh, 0.4, 0.5);
  }

  onLog?.("Face restoration complete!");
  return canvas.toDataURL("image/jpeg", 0.95);
}
