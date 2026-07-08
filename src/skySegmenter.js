import { env, pipeline } from '@xenova/transformers';

// Configure environment to fetch from Hugging Face CDN
env.allowLocalModels = false;

let segmenterPromise = null;

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512');
  }
  return segmenterPromise;
}

/**
 * Segments sky from an image element or URL.
 * Returns a canvas of size width x height where white represents the sky area.
 */
export async function segmentSky(imageElement, onProgress) {
  onProgress?.('Loading Sky AI Model (approx. 14MB)...');
  const segmenter = await getSegmenter();

  onProgress?.('Analyzing landscape lines...');
  const input = (imageElement instanceof HTMLCanvasElement || typeof imageElement.toDataURL === 'function')
    ? imageElement.toDataURL('image/jpeg', 0.9)
    : (imageElement.src || imageElement);
  const results = await segmenter(input);

  // ADE20K dataset label for sky is 'sky'
  const skySegment = results.find(seg => seg.label.toLowerCase() === 'sky');

  if (!skySegment) {
    onProgress?.('No sky detected in photo.');
    return null;
  }

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
