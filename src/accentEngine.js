/**
 * Client-Side Accent AI (Auto-Enhancer) Engine
 * Analyzes image pixels in-browser to compute optimal grading offsets.
 */

export function analyzeImage(imgElement) {
  if (!imgElement) return null;

  // 1. Create a tiny canvas to perform fast pixel analysis (100x100 is plenty)
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Draw the image
  ctx.drawImage(imgElement, 0, 0, 100, 100);
  const imgData = ctx.getImageData(0, 0, 100, 100);
  const data = imgData.data;

  let totalLum = 0;
  let rSum = 0, gSum = 0, bSum = 0;
  let shadowCount = 0;
  let highlightCount = 0;
  const numPixels = 10000;

  // Arrays to hold luminance values for percentile/variance calculation
  const lums = new Float32Array(numPixels);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];

    rSum += r;
    gSum += g;
    bSum += b;

    // Standard relative luminance formula
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lums[i / 4] = lum;
    totalLum += lum;

    if (lum < 50) shadowCount++;
    if (lum > 200) highlightCount++;
  }

  const avgLum = totalLum / numPixels;
  const avgR = rSum / numPixels;
  const avgG = gSum / numPixels;
  const avgB = bSum / numPixels;

  // Calculate standard deviation of luminance (rough measure of contrast)
  let varianceSum = 0;
  for (let i = 0; i < numPixels; i++) {
    varianceSum += Math.pow(lums[i] - avgLum, 2);
  }
  const stdDevLum = Math.sqrt(varianceSum / numPixels);

  // --- Compute Adjustments ---

  // A. Exposure (Target average luminance around 125-135)
  // Low avgLum -> positive exposure boost, High -> slight exposure reduction
  let recommendedExposure = 0;
  if (avgLum < 115) {
    recommendedExposure = Math.min(45, (125 - avgLum) * 0.6);
  } else if (avgLum > 155) {
    recommendedExposure = Math.max(-25, (145 - avgLum) * 0.4);
  }

  // B. Contrast (Lower std dev -> needs more contrast)
  // Default stdDev for balanced photos is roughly 50-65.
  let recommendedContrast = 100; // default is 100%
  if (stdDevLum < 45) {
    recommendedContrast = 100 + Math.min(30, (45 - stdDevLum) * 1.5);
  } else if (stdDevLum > 75) {
    recommendedContrast = 100 - Math.min(15, (stdDevLum - 75) * 0.5);
  }

  // C. Shadows & Highlights
  // High shadowCount -> boost shadows to recover details
  let recommendedShadows = 0;
  const shadowRatio = shadowCount / numPixels;
  if (shadowRatio > 0.15) {
    recommendedShadows = Math.min(50, shadowRatio * 75);
  }

  // High highlightCount -> pull back highlights to control clipping
  let recommendedHighlights = 0;
  const highlightRatio = highlightCount / numPixels;
  if (highlightRatio > 0.1) {
    recommendedHighlights = Math.max(-40, -highlightRatio * 60);
  }

  // D. Saturation & Vibrance (Compute average saturation in HSV space)
  let totalSat = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i+1] / 255;
    const b = data[i+2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    totalSat += s;
  }
  const avgSat = totalSat / numPixels;

  let recommendedSaturation = 100; // default is 100%
  let recommendedVibrance = 100; // default is 100%
  if (avgSat < 0.25) {
    // Very dull image: boost saturation and vibrance
    recommendedSaturation = 100 + Math.min(25, (0.25 - avgSat) * 75);
    recommendedVibrance = 100 + Math.min(30, (0.25 - avgSat) * 90);
  } else if (avgSat > 0.6) {
    // Overly saturated: pull back slightly
    recommendedSaturation = 100 - Math.min(15, (avgSat - 0.6) * 40);
  }

  // E. Temperature / Warmth (Simple Auto White Balance check)
  // Compare Red to Blue channels. If Red >> Blue, shift cool; if Blue >> Red, shift warm.
  let recommendedTemp = 0;
  const rbRatio = avgR / (avgB || 1);
  if (rbRatio > 1.15) {
    recommendedTemp = Math.max(-20, (1.15 - rbRatio) * 60);
  } else if (rbRatio < 0.85) {
    recommendedTemp = Math.min(20, (0.85 - rbRatio) * 60);
  }

  return {
    exposure: Math.round(recommendedExposure),
    contrast: Math.round(recommendedContrast),
    shadows: Math.round(recommendedShadows),
    highlights: Math.round(recommendedHighlights),
    saturation: Math.round(recommendedSaturation),
    vibrance: Math.round(recommendedVibrance),
    temperature: Math.round(recommendedTemp),
  };
}
