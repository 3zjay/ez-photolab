/**
 * Fast In-Browser Context-Aware Inpainting Engine (Telea / Boundary-Marching + Patch Texture Synthesis)
 * Runs 100% locally on HTML5 Canvas ImageData with zero external API keys required.
 */

export async function inpaintCanvasLocal(sourceCanvas, maskCanvas, onProgress) {
  if (!sourceCanvas || !maskCanvas) return sourceCanvas;
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  if (!W || !H) return sourceCanvas;
  const srcCtx = sourceCanvas.getContext("2d");
  const srcImageData = srcCtx.getImageData(0, 0, W, H);
  const srcData = srcImageData.data;

  // Scale maskCanvas to match sourceCanvas dimensions if needed
  const scaledMaskCanvas = document.createElement("canvas");
  scaledMaskCanvas.width = W;
  scaledMaskCanvas.height = H;
  const mCtx = scaledMaskCanvas.getContext("2d");
  mCtx.drawImage(maskCanvas, 0, 0, W, H);
  const maskData = mCtx.getImageData(0, 0, W, H).data;

  // 1. Build binary mask (1 = to inpaint, 0 = known pixel) and find bounding box
  // Supports both alpha-based colored masks (rgba(244, 63, 94, ...)) and classic black-and-white masks
  const rawMask = new Uint8Array(W * H);
  let minX = W, minY = H, maxX = -1, maxY = -1;
  let maskedCount = 0;

  for (let y = 0; y < H; y++) {
    const rowOff = y * W;
    for (let x = 0; x < W; x++) {
      const idx = (rowOff + x) * 4;
      const isAlphaMasked = maskData[idx + 3] > 20 && (maskData[idx] > 30 || maskData[idx + 1] > 30 || maskData[idx + 2] > 30);
      const isBrightMasked = maskData[idx] > 60 || maskData[idx + 1] > 60 || maskData[idx + 2] > 60;
      
      if (isAlphaMasked || isBrightMasked) {
        rawMask[rowOff + x] = 1;
        maskedCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = W;
  outCanvas.height = H;
  const outCtx = outCanvas.getContext("2d");

  if (maskedCount === 0 || maxX < minX) {
    outCtx.putImageData(srcImageData, 0, 0);
    return outCanvas;
  }

  if (onProgress) onProgress("Analyzing surrounding texture...");

  // 2. Dilate mask slightly (by ~3-6px scaled to image size) to remove edge halos around the object
  const dilateRadius = Math.max(3, Math.min(8, Math.round(Math.max(W, H) / 350)));
  const pad = dilateRadius + 32;
  const bMinX = Math.max(0, minX - pad);
  const bMinY = Math.max(0, minY - pad);
  const bMaxX = Math.min(W - 1, maxX + pad);
  const bMaxY = Math.min(H - 1, maxY + pad);
  const bW = bMaxX - bMinX + 1;
  const bH = bMaxY - bMinY + 1;

  // Work on the cropped ROI for maximum speed
  const mask = new Uint8Array(bW * bH);
  for (let y = bMinY; y <= bMaxY; y++) {
    for (let x = bMinX; x <= bMaxX; x++) {
      if (rawMask[y * W + x]) {
        const lx = x - bMinX;
        const ly = y - bMinY;
        for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
          const ny = ly + dy;
          if (ny < 0 || ny >= bH) continue;
          for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
            const nx = lx + dx;
            if (nx < 0 || nx >= bW) continue;
            if (dx * dx + dy * dy <= dilateRadius * dilateRadius) {
              mask[ny * bW + nx] = 1;
            }
          }
        }
      }
    }
  }

  // Large ROI downscaling optimization:
  // For large brush strokes or high-res images, downscale the ROI proxy to <= 360px
  // for instant (<60ms) harmonic inpainting without UI lockups, then upscale and blend.
  const maxRoiDim = 360;
  if (Math.max(bW, bH) > maxRoiDim) {
    const roiScale = maxRoiDim / Math.max(bW, bH);
    const sW = Math.max(1, Math.round(bW * roiScale));
    const sH = Math.max(1, Math.round(bH * roiScale));

    const roiSourceCanvas = document.createElement("canvas");
    roiSourceCanvas.width = sW;
    roiSourceCanvas.height = sH;
    const rscCtx = roiSourceCanvas.getContext("2d");
    rscCtx.drawImage(sourceCanvas, bMinX, bMinY, bW, bH, 0, 0, sW, sH);

    const roiMaskCanvas = document.createElement("canvas");
    roiMaskCanvas.width = sW;
    roiMaskCanvas.height = sH;
    const rmcCtx = roiMaskCanvas.getContext("2d");
    rmcCtx.drawImage(scaledMaskCanvas, bMinX, bMinY, bW, bH, 0, 0, sW, sH);

    const healedRoiCanvas = await inpaintCanvasLocal(roiSourceCanvas, roiMaskCanvas, onProgress);

    const upscaledPatchCanvas = document.createElement("canvas");
    upscaledPatchCanvas.width = bW;
    upscaledPatchCanvas.height = bH;
    const upCtx = upscaledPatchCanvas.getContext("2d");
    upCtx.imageSmoothingEnabled = true;
    upCtx.imageSmoothingQuality = "high";
    upCtx.drawImage(healedRoiCanvas, 0, 0, bW, bH);
    const upscaledData = upCtx.getImageData(0, 0, bW, bH).data;

    for (let ly = 0; ly < bH; ly++) {
      const gy = bMinY + ly;
      for (let lx = 0; lx < bW; lx++) {
        if (!mask[ly * bW + lx]) continue;
        const gx = bMinX + lx;
        const gIdx = (gy * W + gx) * 4;
        const pIdx = (ly * bW + lx) * 4;
        srcData[gIdx] = upscaledData[pIdx];
        srcData[gIdx + 1] = upscaledData[pIdx + 1];
        srcData[gIdx + 2] = upscaledData[pIdx + 2];
        srcData[gIdx + 3] = upscaledData[pIdx + 3];
      }
    }

    outCtx.putImageData(srcImageData, 0, 0);
    return outCanvas;
  }

  // Copy ROI RGB channels into float buffers for smooth multi-pass propagation
  const rBuf = new Float32Array(bW * bH);
  const gBuf = new Float32Array(bW * bH);
  const bBuf = new Float32Array(bW * bH);

  // Also collect known exterior ring samples for subtle texture/grain synthesis
  const ringSamples = [];

  for (let ly = 0; ly < bH; ly++) {
    const gy = bMinY + ly;
    for (let lx = 0; lx < bW; lx++) {
      const gx = bMinX + lx;
      const gIdx = (gy * W + gx) * 4;
      const lIdx = ly * bW + lx;
      rBuf[lIdx] = srcData[gIdx];
      gBuf[lIdx] = srcData[gIdx + 1];
      bBuf[lIdx] = srcData[gIdx + 2];
    }
  }

  // Collect high-frequency texture residuals from unmasked boundary ring
  for (let ly = 2; ly < bH - 2; ly++) {
    for (let lx = 2; lx < bW - 2; lx++) {
      const lIdx = ly * bW + lx;
      if (mask[lIdx] === 0) {
        // Check if near mask
        let nearMask = false;
        for (let dy = -5; dy <= 5 && !nearMask; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            const nIdx = (ly + dy) * bW + (lx + dx);
            if (mask[nIdx] === 1) {
              nearMask = true;
              break;
            }
          }
        }
        if (nearMask) {
          const avgR = (rBuf[lIdx - 1] + rBuf[lIdx + 1] + rBuf[lIdx - bW] + rBuf[lIdx + bW]) * 0.25;
          const avgG = (gBuf[lIdx - 1] + gBuf[lIdx + 1] + gBuf[lIdx - bW] + gBuf[lIdx + bW]) * 0.25;
          const avgB = (bBuf[lIdx - 1] + bBuf[lIdx + 1] + bBuf[lIdx - bW] + bBuf[lIdx + bW]) * 0.25;
          ringSamples.push([
            rBuf[lIdx] - avgR,
            gBuf[lIdx] - avgG,
            bBuf[lIdx] - avgB
          ]);
        }
      }
    }
  }

  if (onProgress) onProgress("Reconstructing background pixels...");
  await new Promise(r => setTimeout(r, 10));

  // 3. Onion-peel boundary marching inward (Telea-style weighted harmonic fill)
  const workingMask = new Uint8Array(mask);
  const searchRadius = 6;
  let remaining = 0;
  for (let i = 0; i < workingMask.length; i++) {
    if (workingMask[i] === 1) remaining++;
  }

  let safetyIterations = Math.max(bW, bH) * 2;
  while (remaining > 0 && safetyIterations-- > 0) {
    const boundaryIndices = [];

    for (let ly = 0; ly < bH; ly++) {
      const rowOff = ly * bW;
      for (let lx = 0; lx < bW; lx++) {
        const lIdx = rowOff + lx;
        if (workingMask[lIdx] !== 1) continue;

        // A masked pixel is on the boundary if at least one 8-connected neighbor is known (0)
        let hasKnownNeighbor = false;
        for (let dy = -1; dy <= 1 && !hasKnownNeighbor; dy++) {
          const ny = ly + dy;
          if (ny < 0 || ny >= bH) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = lx + dx;
            if (nx < 0 || nx >= bW) continue;
            if (workingMask[ny * bW + nx] === 0) {
              hasKnownNeighbor = true;
              break;
            }
          }
        }
        if (hasKnownNeighbor) {
          boundaryIndices.push(lIdx);
        }
      }
    }

    if (boundaryIndices.length === 0) break;

    for (let i = 0; i < boundaryIndices.length; i++) {
      const lIdx = boundaryIndices[i];
      const ly = (lIdx / bW) | 0;
      const lx = lIdx - ly * bW;

      let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const ny = ly + dy;
        if (ny < 0 || ny >= bH) continue;
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = lx + dx;
          if (nx < 0 || nx >= bW) continue;
          const nIdx = ny * bW + nx;
          if (workingMask[nIdx] === 0) {
            const dist2 = dx * dx + dy * dy;
            const w = 1 / (dist2 * Math.sqrt(dist2));
            sumR += rBuf[nIdx] * w;
            sumG += gBuf[nIdx] * w;
            sumB += bBuf[nIdx] * w;
            sumW += w;
          }
        }
      }

      if (sumW > 0) {
        rBuf[lIdx] = sumR / sumW;
        gBuf[lIdx] = sumG / sumW;
        bBuf[lIdx] = sumB / sumW;
      }
    }

    for (let i = 0; i < boundaryIndices.length; i++) {
      workingMask[boundaryIndices[i]] = 0;
      remaining--;
    }
  }

  // 4. Anisotropic harmonic relaxation passes inside the inpainted region for seamless gradients
  const relaxPasses = 24;
  for (let pass = 0; pass < relaxPasses; pass++) {
    for (let ly = 1; ly < bH - 1; ly++) {
      const rowOff = ly * bW;
      for (let lx = 1; lx < bW - 1; lx++) {
        const lIdx = rowOff + lx;
        if (mask[lIdx] !== 1) continue;

        rBuf[lIdx] = (
          rBuf[lIdx] * 2 +
          rBuf[lIdx - 1] + rBuf[lIdx + 1] +
          rBuf[lIdx - bW] + rBuf[lIdx + bW] +
          (rBuf[lIdx - bW - 1] + rBuf[lIdx - bW + 1] + rBuf[lIdx + bW - 1] + rBuf[lIdx + bW + 1]) * 0.5
        ) / 8;

        gBuf[lIdx] = (
          gBuf[lIdx] * 2 +
          gBuf[lIdx - 1] + gBuf[lIdx + 1] +
          gBuf[lIdx - bW] + gBuf[lIdx + bW] +
          (gBuf[lIdx - bW - 1] + gBuf[lIdx - bW + 1] + gBuf[lIdx + bW - 1] + gBuf[lIdx + bW + 1]) * 0.5
        ) / 8;

        bBuf[lIdx] = (
          bBuf[lIdx] * 2 +
          bBuf[lIdx - 1] + bBuf[lIdx + 1] +
          bBuf[lIdx - bW] + bBuf[lIdx + bW] +
          (bBuf[lIdx - bW - 1] + bBuf[lIdx - bW + 1] + bBuf[lIdx + bW - 1] + bBuf[lIdx + bW + 1]) * 0.5
        ) / 8;
      }
    }
  }

  // 5. Re-inject subtle surrounding texture grain so the healed patch blends naturally
  const hasRingTexture = ringSamples.length > 8;
  for (let ly = 0; ly < bH; ly++) {
    const gy = bMinY + ly;
    for (let lx = 0; lx < bW; lx++) {
      const lIdx = ly * bW + lx;
      if (mask[lIdx] !== 1) continue;
      const gx = bMinX + lx;
      const gIdx = (gy * W + gx) * 4;

      let tr = 0, tg = 0, tb = 0;
      if (hasRingTexture) {
        const sample = ringSamples[(lx * 73 + ly * 139) % ringSamples.length];
        tr = sample[0] * 0.55;
        tg = sample[1] * 0.55;
        tb = sample[2] * 0.55;
      }

      srcData[gIdx] = Math.min(255, Math.max(0, Math.round(rBuf[lIdx] + tr)));
      srcData[gIdx + 1] = Math.min(255, Math.max(0, Math.round(gBuf[lIdx] + tg)));
      srcData[gIdx + 2] = Math.min(255, Math.max(0, Math.round(bBuf[lIdx] + tb)));
    }
  }

  outCtx.putImageData(srcImageData, 0, 0);
  return outCanvas;
}
