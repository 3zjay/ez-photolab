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
  const input = (imageElement instanceof HTMLCanvasElement || typeof imageElement.toDataURL === 'function')
    ? imageElement.toDataURL('image/jpeg', 0.9)
    : (imageElement.src || imageElement);
  const result = await depthPipe(input);

  // The output contains a visualizable RawImage depth map
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
