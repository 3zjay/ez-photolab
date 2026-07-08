import { env, pipeline } from '@xenova/transformers';

// Configure environment to fetch from Hugging Face CDN
env.allowLocalModels = false;

let depthPipePromise = null;

async function getDepthPipeline() {
  if (!depthPipePromise) {
    depthPipePromise = pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
  }
  return depthPipePromise;
}

/**
 * Estimates depth of an image element or URL.
 * Returns a canvas of size width x height where white represents near, black represents far.
 */
export async function estimateDepth(imageElement, onProgress) {
  onProgress?.('Loading Depth AI Model (approx. 50MB)...');
  const depthPipe = await getDepthPipeline();

  onProgress?.('Analyzing depth geometry...');
  // Run depth estimation model
  const result = await depthPipe(imageElement.src || imageElement);

  // The output is a raw grayscale representation of depth
  const { depth, width, height } = result;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const ctx = maskCanvas.getContext('2d');
  
  const imgData = ctx.createImageData(width, height);
  const data = depth.data; // Float32Array containing values (0.0 to 1.0 or pixel levels depending on scaling)
  
  // Find min and max values to normalize to 0-255
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; ++i) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }

  const range = max - min || 1;

  for (let i = 0; i < data.length; ++i) {
    // Scale value to 0-255
    const val = Math.round(((data[i] - min) / range) * 255);
    const idx = i * 4;
    imgData.data[idx] = val;     // R
    imgData.data[idx + 1] = val; // G
    imgData.data[idx + 2] = val; // B
    imgData.data[idx + 3] = 255; // Alpha
  }
  ctx.putImageData(imgData, 0, 0);

  return maskCanvas;
}
