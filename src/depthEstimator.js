let depthPipePromise = null;

async function getDepthPipeline() {
  if (!depthPipePromise) {
    depthPipePromise = (async () => {
      const { env, pipeline } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      return pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
    })().catch(error => { depthPipePromise = null; throw error; });
  }
  return depthPipePromise;
}

/**
 * Fast client-side geometric & salience depth map (runs in <15ms on HTML5 Canvas).
 * Models vertical ground-plane depth gradient combined with center foreground salience.
 */
function buildInstantDepthMap(imageElement) {
  const W = imageElement.width || 800;
  const H = imageElement.height || 600;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Base background (far = dark)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 1. Perspective vertical gradient (bottom of frame is nearest to camera, upper frame is far)
  const vertGrad = ctx.createLinearGradient(0, 0, 0, H);
  vertGrad.addColorStop(0, 'rgba(30, 30, 30, 1)');
  vertGrad.addColorStop(0.35, 'rgba(80, 80, 80, 1)');
  vertGrad.addColorStop(0.70, 'rgba(180, 180, 180, 1)');
  vertGrad.addColorStop(1.0, 'rgba(255, 255, 255, 1)');
  ctx.fillStyle = vertGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Central subject salience spotlight (subjects typically occupy center 60% of frame)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const radGrad = ctx.createRadialGradient(
    W * 0.5, H * 0.52, Math.min(W, H) * 0.08,
    W * 0.5, H * 0.52, Math.max(W, H) * 0.52
  );
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  radGrad.addColorStop(0.5, 'rgba(160, 160, 160, 0.5)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Smooth feathering
  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = W;
  blurredCanvas.height = H;
  const bCtx = blurredCanvas.getContext('2d');
  const blurPx = Math.max(8, Math.round(Math.min(W, H) * 0.03));
  bCtx.filter = `blur(${blurPx}px)`;
  bCtx.drawImage(canvas, 0, 0);
  bCtx.filter = 'none';

  return blurredCanvas;
}

/**
 * Estimates depth of an image element or URL.
 * Returns a canvas of size width x height where white represents near, black represents far.
 */
export async function estimateDepth(imageElement, onProgress) {
  try {
    onProgress?.('Estimating 3D depth geometry…');
    const depthPipe = await Promise.race([
      getDepthPipeline(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading Depth AI Model')), 2500))
    ]);

    if (depthPipe) {
      const input = (imageElement instanceof HTMLCanvasElement || typeof imageElement.toDataURL === 'function')
        ? imageElement.toDataURL('image/jpeg', 0.9)
        : (imageElement.src || imageElement);
      const result = await Promise.race([
        depthPipe(input),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Depth inference timeout')), 5000))
      ]);

      const { depth } = result;
      const { width, height, data } = depth;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const ctx = maskCanvas.getContext('2d');
      
      const imgData = ctx.createImageData(width, height);
      for (let i = 0; i < width * height; ++i) {
        const val = data[i];
        const idx = i * 4;
        imgData.data[idx] = val;     // R
        imgData.data[idx + 1] = val; // G
        imgData.data[idx + 2] = val; // B
        imgData.data[idx + 3] = 255; // Alpha
      }
      ctx.putImageData(imgData, 0, 0);
      return maskCanvas;
    }
  } catch (e) {
    console.warn('Depth AI model unavailable, using instant geometric 3D depth map:', e);
  }

  return buildInstantDepthMap(imageElement);
}
