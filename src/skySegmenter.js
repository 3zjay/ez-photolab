let segmenterPromise = null;

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { env, pipeline } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      return pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512');
    })().catch(error => { segmenterPromise = null; throw error; });
  }
  return segmenterPromise;
}

/**
 * Fast client-side sky detection via color-spatial heuristics & top-down flood-fill.
 * Runs in <15ms directly on HTML5 Canvas.
 */
function buildInstantSkyMask(imageElement) {
  const W = imageElement.width || 800;
  const H = imageElement.height || 600;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = W;
  tempCanvas.height = H;
  const tCtx = tempCanvas.getContext('2d');
  tCtx.drawImage(imageElement, 0, 0, W, H);
  const srcData = tCtx.getImageData(0, 0, W, H).data;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = W;
  maskCanvas.height = H;
  const mCtx = maskCanvas.getContext('2d');
  const outImg = mCtx.createImageData(W, H);
  const od = outImg.data;

  const horizonMaxY = Math.round(H * 0.72);
  const skyGrid = new Uint8Array(W * H);

  // 1. Initial pass: mark candidate sky pixels in the upper 72% of the frame
  for (let y = 0; y < horizonMaxY; y++) {
    const rowOff = y * W;
    for (let x = 0; x < W; x++) {
      const idx = (rowOff + x) * 4;
      const r = srcData[idx];
      const g = srcData[idx + 1];
      const b = srcData[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Blue sky: blue dominance
      const isBlueSky = (b > r + 8) && (b > g - 10) && (b > 75);

      // Overcast / white hazy sky: high luminance + neutral tint
      const isOvercastSky = (lum > 185) && (Math.abs(r - g) < 26) && (Math.abs(g - b) < 26);

      // Sunset / golden hour sky: warm gradient in upper frame
      const isSunsetSky = (y < H * 0.5) && (r > 160) && (r > b + 25) && (g > 90);

      if (isBlueSky || isOvercastSky || isSunsetSky) {
        skyGrid[rowOff + x] = 1;
      }
    }
  }

  // 2. Column-wise downward connectivity from top edge
  for (let x = 0; x < W; x++) {
    let connected = true;
    let gapCount = 0;

    for (let y = 0; y < horizonMaxY; y++) {
      const idx = y * W + x;
      if (skyGrid[idx]) {
        gapCount = 0;
      } else {
        gapCount++;
        // Allow tiny breaks (like a wire or tree branch) up to 8px
        if (gapCount > 8) {
          connected = false;
        }
      }

      if (connected) {
        const pIdx = idx * 4;
        od[pIdx] = 255;
        od[pIdx + 1] = 255;
        od[pIdx + 2] = 255;
        od[pIdx + 3] = 255;
      }
    }
  }

  mCtx.putImageData(outImg, 0, 0);

  // 3. Feather the horizon edge for seamless blending
  const featheredCanvas = document.createElement('canvas');
  featheredCanvas.width = W;
  featheredCanvas.height = H;
  const fCtx = featheredCanvas.getContext('2d');
  const blurPx = Math.max(3, Math.round(W * 0.008));
  fCtx.filter = `blur(${blurPx}px)`;
  fCtx.drawImage(maskCanvas, 0, 0);
  fCtx.filter = 'none';

  return featheredCanvas;
}

/**
 * Segments sky from an image element or URL.
 * Returns a canvas of size width x height where white represents the sky area.
 */
export async function segmentSky(imageElement, onProgress) {
  try {
    onProgress?.('Analyzing horizon & sky lines…');
    const segmenter = await Promise.race([
      getSegmenter(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading Sky AI Model')), 2500))
    ]);

    if (segmenter) {
      const input = (imageElement instanceof HTMLCanvasElement || typeof imageElement.toDataURL === 'function')
        ? imageElement.toDataURL('image/jpeg', 0.9)
        : (imageElement.src || imageElement);

      const results = await Promise.race([
        segmenter(input),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sky inference timeout')), 5000))
      ]);

      const skySegment = results.find(seg => seg.label.toLowerCase() === 'sky');
      if (skySegment) {
        const { width, height, data } = skySegment.mask;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const ctx = maskCanvas.getContext('2d');
        
        const imgData = ctx.createImageData(width, height);
        for (let i = 0; i < data.length; ++i) {
          const val = data[i]; // 0 to 255
          const idx = i * 4;
          imgData.data[idx] = 255;     // R
          imgData.data[idx + 1] = 255; // G
          imgData.data[idx + 2] = 255; // B
          imgData.data[idx + 3] = val; // Alpha
        }
        ctx.putImageData(imgData, 0, 0);
        return maskCanvas;
      }
    }
  } catch (e) {
    console.warn('Sky AI model unavailable, using instant color-spatial sky detector:', e);
  }

  return buildInstantSkyMask(imageElement);
}
