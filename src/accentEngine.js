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
  let totalSat = 0;
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

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    totalSat += sat;

    // Standard relative luminance formula
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lums[i / 4] = lum;
    totalLum += lum;

    if (lum < 50) shadowCount++;
    if (lum > 200) highlightCount++;
  }

  const avgLum = totalLum / numPixels;
  const avgSat = totalSat / numPixels;
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

  // A. Exposure (Target average luminance around 130, add subtle default pop)
  let recommendedExposure = 8;
  if (avgLum < 120) {
    recommendedExposure = Math.min(35, (135 - avgLum) * 0.7);
  } else if (avgLum > 150) {
    recommendedExposure = Math.max(-20, (145 - avgLum) * 0.4);
  }

  // B. Contrast (Boost by default for punchier visual pop)
  let recommendedContrast = 112; // default +12%
  if (stdDevLum < 45) {
    recommendedContrast = 112 + Math.min(25, (45 - stdDevLum) * 1.2);
  } else if (stdDevLum > 75) {
    recommendedContrast = 105;
  }

  // C. Shadows & Highlights (Always perform subtle shadow recovery and highlight protection)
  let recommendedShadows = 15;
  const shadowRatio = shadowCount / numPixels;
  if (shadowRatio > 0.15) {
    recommendedShadows = Math.min(55, 15 + shadowRatio * 60);
  }

  let recommendedHighlights = -10;
  const highlightRatio = highlightCount / numPixels;
  if (highlightRatio > 0.1) {
    recommendedHighlights = Math.max(-45, -10 - highlightRatio * 50);
  }

  // D. Saturation & Vibrance (Add default vibrance pop for court/jersey colors)
  let recommendedSaturation = 104;
  let recommendedVibrance = 110;
  if (avgSat < 0.25) {
    recommendedSaturation = 112 + Math.min(20, (0.25 - avgSat) * 60);
    recommendedVibrance = 118 + Math.min(25, (0.25 - avgSat) * 80);
  } else if (avgSat > 0.5) {
    recommendedSaturation = 98;
    recommendedVibrance = 102;
  }

  // E. Temperature / Warmth (Auto White Balance check)
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
