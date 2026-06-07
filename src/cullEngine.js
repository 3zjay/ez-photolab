/**
 * EZ-Cull AI Engine
 * 100% In-Browser & Local.
 * Features:
 * - dHash Perceptual Hashing for fast duplicate similarity grouping.
 * - Laplacian Edge Energy Variance for focus/blur quality scoring.
 * - MediaPipe Face Landmarker for blink detection (eye openness) & smiles.
 * - Aggregated Quality Scoring to auto-select the best "Key Photo" in each group.
 */
import { getLandmarker } from "./faceRestore";

/** Load or retrieve cached MediaPipe FaceLandmarker */
async function getCullLandmarker() {
  return await getLandmarker();
}

/**
 * Calculates a 64-bit dHash (Difference Hash) value for perceptual similarity.
 * Downsamples to 9x8, converts to grayscale, and compares horizontal gradient values.
 */
export function computeDHash(imageElementOrCanvas, canvas, ctx) {
  ctx.drawImage(imageElementOrCanvas, 0, 0, 9, 8);

  const imgData = ctx.getImageData(0, 0, 9, 8);
  const data = imgData.data;

  // Convert to grayscale
  const gray = new Uint8Array(72);
  for (let i = 0; i < 72; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Compare adjacent pixels horizontally
  let hash = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = gray[row * 9 + col];
      const right = gray[row * 9 + col + 1];
      hash += left > right ? "1" : "0";
    }
  }
  return hash;
}

/** Computes Hamming Distance (differing bits) between two binary dHashes */
export function getHammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

/**
 * Computes Sharpness Score via a Laplacian Edge Energy Filter.
 * Applies a 3x3 Laplacian edge-detection kernel on a downsampled bounding region,
 * and calculates the variance of the edge-intensity.
 */
export function computeSharpness(imageElementOrCanvas, canvas, ctx, faceRect = null) {
  // If analyzing a face, crop and analyze face box. Otherwise, check center 400x300.
  const w = 300;
  const h = 200;

  if (faceRect) {
    // Crop face with 20% padding
    const pad = 0.2;
    const fx = Math.max(0, faceRect.x - faceRect.w * pad);
    const fy = Math.max(0, faceRect.y - faceRect.h * pad);
    const fw = Math.min(1 - fx, faceRect.w * (1 + pad * 2));
    const fh = Math.min(1 - fy, faceRect.h * (1 + pad * 2));

    ctx.drawImage(
      imageElementOrCanvas,
      fx * imageElementOrCanvas.width,
      fy * imageElementOrCanvas.height,
      fw * imageElementOrCanvas.width,
      fh * imageElementOrCanvas.height,
      0, 0, w, h
    );
  } else {
    // Crop center 50% region to analyze general focus
    ctx.drawImage(
      imageElementOrCanvas,
      imageElementOrCanvas.width * 0.25,
      imageElementOrCanvas.height * 0.25,
      imageElementOrCanvas.width * 0.5,
      imageElementOrCanvas.height * 0.5,
      0, 0, w, h
    );
  }

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Grayscale representation
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // 3x3 Laplacian Filter
  const edges = new Int16Array(w * h);
  let mean = 0;
  const len = w * h;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      // Kernel: 
      //  0  1  0
      //  1 -4  1
      //  0  1  0
      const val = 
        gray[idx - w] + // top
        gray[idx - 1] + // left
        gray[idx + 1] + // right
        gray[idx + w] - // bottom
        4 * gray[idx];   // center

      edges[idx] = val;
      mean += val;
    }
  }
  mean /= len;

  // Calculate Variance of Laplacian
  let variance = 0;
  for (let i = 0; i < len; i++) {
    const diff = edges[i] - mean;
    variance += diff * diff;
  }
  variance /= len;

  // Normalize sharpness score into relative 0 - 100 range
  // General variance for high-contrast edges scales up to ~1000
  const normalized = Math.min(100, Math.max(0, Math.round((variance / 850) * 100)));
  return normalized;
}

/**
 * Computes Eye Openness Ratio (EOR) and Smile Curve metrics from MediaPipe FaceLandmarks.
 */
export function analyzeFaceMetrics(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;

  // Left Eye eyelid indices (using standard MediaPipe Face Mesh contours)
  // E.g., Landmark 159 (upper center), 145 (lower center), 33 (left corner), 133 (right corner)
  const lUpper = landmarks[159];
  const lLower = landmarks[145];
  const lLeft = landmarks[33];
  const lRight = landmarks[133];

  // Right Eye eyelid indices
  // E.g., Landmark 386 (upper center), 374 (lower center), 362 (left corner), 263 (right corner)
  const rUpper = landmarks[386];
  const rLower = landmarks[374];
  const rLeft = landmarks[362];
  const rRight = landmarks[263];

  const getDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
  };

  // EOR = vertical eyelid height / horizontal eye width
  const lHeight = getDistance(lUpper, lLower);
  const lWidth = getDistance(lLeft, lRight);
  const lEor = lWidth > 0 ? lHeight / lWidth : 0.2;

  const rHeight = getDistance(rUpper, rLower);
  const rWidth = getDistance(rLeft, rRight);
  const rEor = rWidth > 0 ? rHeight / rWidth : 0.2;

  // Check if either eye is closed (threshold is typically 0.15)
  const leftClosed = lEor < 0.145;
  const rightClosed = rEor < 0.145;
  const blinkDetected = leftClosed || rightClosed;

  // Smile Index (Mouth Corner Curvature)
  // Indices: 61 (left corner), 291 (right corner), 13 (upper lip center), 14 (lower lip center)
  const mLeft = landmarks[61];
  const mRight = landmarks[291];
  const mLip = landmarks[14];

  // Compute mouth line vector
  const mouthWidth = getDistance(mLeft, mRight);
  const cornerY = (mLeft.y + mRight.y) / 2;
  const smileDepth = mLip.y - cornerY; // Positive depth means corners are higher than lower lip

  // Smile ratio: higher curves indicate a happier, smiling mouth shape
  const smileVal = mouthWidth > 0 ? Math.min(100, Math.max(0, Math.round(((smileDepth / mouthWidth) + 0.1) * 300))) : 0;

  return {
    leftEor: parseFloat(lEor.toFixed(3)),
    rightEor: parseFloat(rEor.toFixed(3)),
    blinkDetected,
    smileScore: smileVal
  };
}

/**
 * Orchestrates local client-side AI photo culling process.
 * Loads and decodes raw/regular files, groups duplicates using perceptual hashes,
 * computes quality metric ratings, and designates the "Key Photo" keepers.
 * 
 * @param {Array} images - List of `{ name, file, previewUrl, ... }`
 * @param {Object} options - Grouping threshold, blur strictness, blink detection toggles
 * @param {Function} onProgress - Progress reporting callback `{ current, total, name }`
 */
export async function cullBatch(images, options = {}, onProgress) {
  const {
    groupingSensitivity = 12, // Hamming distance threshold (default ~12)
    blurStrictness = 50,       // Sharpness cutoff (default 50)
    enableFaceLandmarks = true // Run MediaPipe vision resolver
  } = options;

  let fl = null;
  if (enableFaceLandmarks) {
    try {
      fl = await getCullLandmarker();
    } catch (e) {
      console.warn("MediaPipe FaceLandmarker failed to load. Skipping blinking detection:", e);
    }
  }

  const results = [];
  const total = images.length;

  // Reusable canvas elements to prevent context/memory leaks
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const dHashCanvas = document.createElement("canvas");
  dHashCanvas.width = 9;
  dHashCanvas.height = 8;
  const dHashCtx = dHashCanvas.getContext("2d");

  const sharpnessCanvas = document.createElement("canvas");
  sharpnessCanvas.width = 300;
  sharpnessCanvas.height = 200;
  const sharpnessCtx = sharpnessCanvas.getContext("2d");

  for (let i = 0; i < total; i++) {
    const imgObj = images[i];
    let imageBitmap = null;
    let previewUrl = imgObj.previewUrl || null;

    onProgress?.({ current: i + 1, total, name: imgObj.name });

    try {
      if (imgObj.file) {
        if (imgObj.isRaw || imgObj.name.match(/\.(nef|cr2|cr3|arw|dng|orf|raf|rw2|pef|x3f)$/i)) {
          const { decodeRaw } = await import("./rawProcessor");
          const buffer = await imgObj.file.arrayBuffer();
          const decoded = await decodeRaw(buffer, () => {});
          const response = await fetch(decoded.url);
          const blob = await response.blob();
          imageBitmap = await createImageBitmap(blob);
          previewUrl = decoded.url; // Use the extracted preview JPEG for UI display
        } else {
          imageBitmap = await createImageBitmap(imgObj.file);
        }
      } else if (imgObj.previewUrl) {
        const response = await fetch(imgObj.previewUrl);
        const blob = await response.blob();
        imageBitmap = await createImageBitmap(blob);
      }

      if (!imageBitmap) {
        throw new Error("No image source found");
      }

      const sW = imageBitmap.width;
      const sH = imageBitmap.height;

      // 1. Scale down to 1200px tempCanvas for culling diagnostics (sharpness, dHash, face landmarker)
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(sW, sH));
      const pW = Math.round(sW * scale);
      const pH = Math.round(sH * scale);

      tempCanvas.width = pW;
      tempCanvas.height = pH;
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = "high";
      tempCtx.drawImage(imageBitmap, 0, 0, pW, pH);

      // Keep existing developed RAW previewUrl, otherwise null (generated on-demand in UI for JPEGs)
      const finalPreviewUrl = previewUrl || imgObj.previewUrl || null;

      // 2. Compute dHash using the pre-allocated dHashCanvas
      const dHash = computeDHash(tempCanvas, dHashCanvas, dHashCtx);

      // 3. Facial Analysis using 1200px tempCanvas
      let faces = [];
      let blinkDetected = false;
      let highestSmile = 0;

      if (fl) {
        const detection = fl.detect(tempCanvas);
        if (detection?.faceLandmarks && detection.faceLandmarks.length > 0) {
          faces = detection.faceLandmarks.map((landmarks) => {
            // Find face bounding rectangle
            let minX = 1, minY = 1, maxX = 0, maxY = 0;
            for (const lm of landmarks) {
              minX = Math.min(minX, lm.x);
              minY = Math.min(minY, lm.y);
              maxX = Math.max(maxX, lm.x);
              maxY = Math.max(maxY, lm.y);
            }
            const faceRect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
            const metrics = analyzeFaceMetrics(landmarks);
            if (metrics?.blinkDetected) blinkDetected = true;
            if (metrics?.smileScore > highestSmile) highestSmile = metrics.smileScore;

            return {
              rect: faceRect,
              metrics
            };
          });
        }
      }

      // 4. Compute Sharpness Score using pre-allocated sharpnessCanvas
      const primaryFace = faces[0]?.rect || null;
      const sharpness = computeSharpness(tempCanvas, sharpnessCanvas, sharpnessCtx, primaryFace);

      // 5. Generate 160px Thumbnail using reusable tempCanvas
      const tMaxDim = 160;
      const tScale = Math.min(1, tMaxDim / Math.max(sW, sH));
      const tW = Math.round(sW * tScale);
      const tH = Math.round(sH * tScale);

      tempCanvas.width = tW;
      tempCanvas.height = tH;
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = "high";
      tempCtx.drawImage(imageBitmap, 0, 0, tW, tH);

      const thumbnailUrl = tempCanvas.toDataURL("image/jpeg", 0.80);

      // 6. Aggregate Quality Score (0 to 100)
      let score = sharpness;
      const warnings = [];

      if (sharpness < blurStrictness) {
        warnings.push("Image is slightly blurry / out of focus");
      }

      if (blinkDetected) {
        score = Math.max(5, score - 50);
        warnings.push("Closed eyes / blinking detected");
      }

      if (highestSmile > 60) {
        score = Math.min(100, score + 10);
      }

      results.push({
        ...imgObj,
        previewUrl: finalPreviewUrl,
        thumbnailUrl, // Store downscaled 160px thumbnail
        dHash,
        sharpness,
        faces,
        cullScore: score,
        warnings,
        isKeyPhoto: false,
        cullGroup: -1,
        rating: 0,
        label: ""
      });

    } catch (e) {
      console.error(`Failed to analyze ${imgObj.name}:`, e);
      results.push({
        ...imgObj,
        previewUrl: imgObj.previewUrl || null,
        thumbnailUrl: null,
        cullScore: 10,
        cullGroup: -1,
        isKeyPhoto: false,
        warnings: [`Analysis Error: ${e.message}`],
        sharpness: 10,
        faces: []
      });
    } finally {
      if (imageBitmap) {
        imageBitmap.close();
        imageBitmap = null;
      }
    }

    // Yield control to the browser event loop to let the GC run and UI update
    await new Promise((resolve) => setTimeout(resolve, 15));
  }

  // 6. PERCEPTUAL SIMILARITY GROUPING & KEY PHOTO auto-selection
  // We cluster consecutive images whose Hamming distance is <= groupingSensitivity
  let currentGroupId = 0;
  const groups = [];

  for (let i = 0; i < results.length; i++) {
    const current = results[i];
    if (current.cullGroup !== -1) continue;

    // Start a new group
    current.cullGroup = currentGroupId;
    const groupItems = [current];

    // Find consecutive duplicates
    for (let j = i + 1; j < results.length; j++) {
      const next = results[j];
      if (next.cullGroup !== -1) continue;

      const dist = getHammingDistance(current.dHash, next.dHash);
      if (dist <= groupingSensitivity) {
        next.cullGroup = currentGroupId;
        groupItems.push(next);
      } else {
        // Break out for consecutive grouping (keeps scenes logically sequenced)
        break;
      }
    }

    groups.push(groupItems);
    currentGroupId++;
  }

  // 7. AUTO-PROMOTE "KEY PHOTO" with 4-Tier Quality Classification
  // ---------------------------------------------------------------
  // Tier 1 — KEEPER     : Best in group, sharp & clear → 5★ 🟢 Green
  // Tier 2 — ALTERNATE  : Good duplicate, not the best → 3★ 🔵 Blue
  // Tier 3 — BLURRY     : Out-of-focus / soft image    → 2★ 🟡 Yellow
  // Tier 4 — REJECTED   : Eyes closed / blink / severe quality fail → 1★ 🔴 Red
  for (const group of groups) {
    // Sort group members by quality score (highest first)
    group.sort((a, b) => b.cullScore - a.cullScore);

    for (let k = 0; k < group.length; k++) {
      const item = group[k];
      const isWinner = k === 0;

      const hasBlink = item.warnings.some(w =>
        w.toLowerCase().includes("blink") || w.toLowerCase().includes("closed")
      );
      const isBlurry = item.sharpness < blurStrictness;
      const isSeverelyBad = item.cullScore < 15; // Near-zero quality

      if (hasBlink || isSeverelyBad) {
        // Tier 4 — REJECTED: Eye blink, or catastrophically low score
        item.category = "rejected";
        item.rating = 1;
        item.label = "red";
        item.isKeyPhoto = false;
      } else if (isBlurry) {
        // Tier 3 — BLURRY: Soft / out-of-focus
        item.category = "blurry";
        item.rating = 2;
        item.label = "yellow";
        item.isKeyPhoto = isWinner; // Mark as "best of the blurry group" if winner
      } else if (isWinner) {
        // Tier 1 — KEEPER: Best in group, sharp, eyes open
        item.category = "keeper";
        item.rating = 5;
        item.label = "green";
        item.isKeyPhoto = true;
      } else {
        // Tier 2 — ALTERNATE: Good but not the winner
        item.category = "alternate";
        item.rating = 3;
        item.label = "blue";
        item.isKeyPhoto = false;
      }
    }
  }

  // Restore original ordering
  results.sort((a, b) => images.indexOf(images.find(x => x.name === a.name)) - images.indexOf(images.find(x => x.name === b.name)));

  return results;
}
