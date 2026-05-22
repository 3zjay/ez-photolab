/**
 * Custom Proxy for LibRaw to handle Vite's worker loading issues.
 * Points directly to the worker in the public directory.
 */
class LibRawProxy {
  constructor() {
    this.worker = new Worker("/libraw/worker.js", { type: "module" });
    this.waitForWorker = null;
    this.worker.onmessage = ({ data }) => {
      if (this.waitForWorker) {
        const { resolve, reject } = this.waitForWorker;
        this.waitForWorker = null;
        if (data?.error) reject(new Error(data.error));
        else resolve(data?.out);
      }
    };
    this.worker.onerror = (err) => {
      if (this.waitForWorker) {
        const { reject } = this.waitForWorker;
        this.waitForWorker = null;
        reject(err || new Error("Worker error"));
      }
    };
  }

  async runFn(fn, ...args) {
    const promise = new Promise((resolve, reject) => {
      this.waitForWorker = { resolve, reject };
    });
    
    // Pass buffers as transferables
    const transferables = args.filter(a => 
      a instanceof ArrayBuffer || 
      (a && a.buffer instanceof ArrayBuffer)
    ).map(a => a instanceof ArrayBuffer ? a : a.buffer);

    this.worker.postMessage({ fn, args }, transferables);
    return await promise;
  }

  async open(buffer, settings) { return await this.runFn("open", buffer, settings); }
  async metadata(thumb) { 
    const r = await this.runFn("metadata", !!thumb);
    if (r?.timestamp) r.timestamp = new Date(r.timestamp);
    return r;
  }
  async imageData() { return await this.runFn("imageData"); }
  terminate() { this.worker.terminate(); }
}

function stripExif(jpegBytes) {
  if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
    return jpegBytes; // Not a valid JPEG
  }
  let i = 2;
  while (i < jpegBytes.length - 4) {
    if (jpegBytes[i] === 0xFF) {
      const marker = jpegBytes[i + 1];
      if (marker === 0xD9) break; // EOI
      const length = (jpegBytes[i + 2] << 8) | jpegBytes[i + 3];
      if (marker === 0xE1) { // APP1
        const before = jpegBytes.slice(0, i);
        const after = jpegBytes.slice(i + 2 + length);
        const newBytes = new Uint8Array(before.length + after.length);
        newBytes.set(before);
        newBytes.set(after, before.length);
        jpegBytes = newBytes;
        continue;
      }
      i += 2 + length;
    } else {
      i++;
    }
  }
  return jpegBytes;
}

function rotateImageBlob(blob, orientation) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      
      if (orientation <= 1) {
        resolve({ url, width: w, height: h });
        return;
      }
      
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      let finalW, finalH;
      if (orientation >= 5 && orientation <= 8) {
        finalW = h;
        finalH = w;
      } else {
        finalW = w;
        finalH = h;
      }
      canvas.width = finalW;
      canvas.height = finalH;
      
      switch (orientation) {
        case 2: // Flip H
          ctx.translate(finalW, 0);
          ctx.scale(-1, 1);
          break;
        case 3: // Rotate 180
          ctx.translate(finalW, finalH);
          ctx.rotate(Math.PI);
          break;
        case 4: // Flip V
          ctx.translate(0, finalH);
          ctx.scale(1, -1);
          break;
        case 5: // Rotate 90 CCW + Flip H
          ctx.rotate(90 * Math.PI / 180);
          ctx.scale(1, -1);
          break;
        case 6: // Rotate 90 CW
          ctx.translate(finalW, 0);
          ctx.rotate(90 * Math.PI / 180);
          break;
        case 7: // Rotate 90 CW + Flip H
          ctx.rotate(90 * Math.PI / 180);
          ctx.translate(0, -finalH);
          ctx.scale(-1, 1);
          break;
        case 8: // Rotate 90 CCW
          ctx.translate(0, finalH);
          ctx.rotate(-90 * Math.PI / 180);
          break;
      }
      
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((rotatedBlob) => {
        if (rotatedBlob) {
          resolve({ url: URL.createObjectURL(rotatedBlob), width: finalW, height: finalH });
        } else {
          // Fallback to unrotated URL
          resolve({ url: URL.createObjectURL(blob), width: w, height: h });
        }
      }, "image/jpeg", 0.95);
    };
    img.onerror = () => {
      resolve({ url, width: 0, height: 0 }); // Fallback
    };
    img.src = url;
  });
}

function getOrientationFromTiff(buffer) {
  try {
    if (buffer.byteLength < 8) return 1;
    const view = new DataView(buffer);
    const byteOrder = view.getUint16(0, false);
    if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) return 1;
    const little = (byteOrder === 0x4949);
    const magic = view.getUint16(2, little);
    if (magic !== 42 && magic !== 85) return 1;
    
    let ifd0Orientation = null;
    let exifOrientation = null;
    let otherOrientation = null;
    
    const ifdQueue = [{ offset: view.getUint32(4, little), source: 'IFD0' }];
    const visited = new Set();
    
    while (ifdQueue.length > 0) {
      const { offset: ifdOffset, source } = ifdQueue.shift();
      if (ifdOffset === 0 || ifdOffset > buffer.byteLength - 8 || visited.has(ifdOffset)) continue;
      visited.add(ifdOffset);
      
      const numTags = view.getUint16(ifdOffset, little);
      const tagOffset = ifdOffset + 2;
      
      for (let i = 0; i < numTags; i++) {
        const offset = tagOffset + (i * 12);
        if (offset + 12 > buffer.byteLength) break;
        
        const tagId = view.getUint16(offset, little);
        if (tagId === 0x0112) { // Orientation
          const type = view.getUint16(offset + 2, little);
          let val = 1;
          if (type === 3) { // SHORT
            val = view.getUint16(offset + 8, little);
          } else if (type === 4) { // LONG
            val = view.getUint32(offset + 8, little);
          } else if (type === 1) { // BYTE
            val = view.getUint8(offset + 8);
          } else {
            val = view.getUint16(offset + 8, little);
          }
          
          if (val >= 1 && val <= 8) {
            if (source === 'IFD0') {
              ifd0Orientation = val;
            } else if (source === 'Exif') {
              exifOrientation = val;
            } else {
              otherOrientation = val;
            }
          }
        } else if (tagId === 0x8769) { // Exif IFD Pointer
          const exifOffset = view.getUint32(offset + 8, little);
          ifdQueue.push({ offset: exifOffset, source: 'Exif' });
        } else if (tagId === 0x014a) { // SubIFDs pointer
          const count = view.getUint32(offset + 4, little);
          const type = view.getUint16(offset + 2, little);
          let valOffset = view.getUint32(offset + 8, little);
          if (type === 4) { // LONG
            if (count === 1) {
              ifdQueue.push({ offset: valOffset, source: 'SubIFD' });
            } else {
              for (let j = 0; j < count; j++) {
                if (valOffset >= 0 && valOffset + j * 4 + 4 <= buffer.byteLength) {
                  ifdQueue.push({ offset: view.getUint32(valOffset + j * 4, little), source: 'SubIFD' });
                }
              }
            }
          }
        }
      }
      
      const nextIfdPointerOffset = tagOffset + numTags * 12;
      if (nextIfdPointerOffset + 4 <= buffer.byteLength) {
        const nextIfdOffset = view.getUint32(nextIfdPointerOffset, little);
        if (nextIfdOffset > 0) {
          const nextSource = (source === 'IFD0') ? 'IFD1' : 'other';
          ifdQueue.push({ offset: nextIfdOffset, source: nextSource });
        }
      }
    }
    
    if (ifd0Orientation > 1) return ifd0Orientation;
    if (exifOrientation > 1) return exifOrientation;
    if (otherOrientation > 1) return otherOrientation;
    
    if (ifd0Orientation !== null) return ifd0Orientation;
    if (exifOrientation !== null) return exifOrientation;
    if (otherOrientation !== null) return otherOrientation;
    return 1;
  } catch (e) {
    console.warn("Error parsing TIFF orientation:", e);
  }
  return 1;
}

function getOrientationFromJpeg(jpegBytes) {
  try {
    const view = new DataView(jpegBytes.buffer, jpegBytes.byteOffset, jpegBytes.byteLength);
    if (view.getUint16(0, false) !== 0xFFD8) return 1;
    
    let i = 2;
    while (i < jpegBytes.byteLength - 4) {
      if (jpegBytes[i] === 0xFF) {
        const marker = jpegBytes[i + 1];
        if (marker === 0xD9 || marker === 0xDA) break;
        const length = (jpegBytes[i + 2] << 8) | jpegBytes[i + 3];
        if (marker === 0xE1) { // APP1
          if (jpegBytes[i + 4] === 0x45 && jpegBytes[i + 5] === 0x78 && jpegBytes[i + 6] === 0x69 && jpegBytes[i + 7] === 0x66 &&
              jpegBytes[i + 8] === 0x00 && jpegBytes[i + 9] === 0x00) {
            const tiffBuffer = jpegBytes.buffer.slice(jpegBytes.byteOffset + i + 10, jpegBytes.byteOffset + i + 2 + length);
            return getOrientationFromTiff(tiffBuffer);
          }
        }
        i += 2 + length;
      } else {
        i++;
      }
    }
  } catch (e) {
    console.warn("Error parsing JPEG orientation:", e);
  }
  return 1;
}

/**
 * Utility to decode RAW camera files in the browser.
 */
export async function decodeRaw(fileBuffer, onLog) {
  const raw = new LibRawProxy();
  const log = (m) => onLog && onLog(m);

  try {
    log("🚀 Prioritizing high-quality embedded preview extraction...");
    const bytes = new Uint8Array(fileBuffer);
    
    // 0. Parse Master RAW (TIFF) Header for Orientation
    const masterOrientation = getOrientationFromTiff(fileBuffer);
    log(`🧭 Master RAW Orientation detected: ${masterOrientation}`);

    const candidates = [];
    
    // 1. Deep Scan for embedded JPEG previews (Nikon/Canon/Sony standard)
    let i = 0;
    while (i < bytes.length - 2) {
      const nextFF = bytes.indexOf(0xFF, i);
      if (nextFF === -1 || nextFF > bytes.length - 3) {
        break;
      }
      
      if (bytes[nextFF + 1] === 0xD8 && bytes[nextFF + 2] === 0xFF) {
        let start = nextFF;
        let end = -1;
        // Search for EOI (FF D9) within max 8MB limit
        const limit = Math.min(start + 8000000, bytes.length - 1);
        let pos = start + 10;
        while (pos < limit - 1) {
          const nextEOIFF = bytes.indexOf(0xFF, pos);
          if (nextEOIFF === -1 || nextEOIFF >= limit - 1) {
            break;
          }
          if (bytes[nextEOIFF + 1] === 0xD9) {
            end = nextEOIFF + 2;
            break;
          }
          pos = nextEOIFF + 1;
        }
        
        if (end !== -1) {
          candidates.push({ start, end, size: end - start });
          i = end; 
        } else {
          // If no EOI is found within 8MB, skip the scanned region to avoid quadratic execution
          i = limit;
        }
      } else {
        i = nextFF + 1;
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.size - a.size);
      const best = candidates[0];
      
      // If we found a substantial preview (Full-size or Large), use it immediately
      if (best.size > 500000) {
        const jpegData = bytes.slice(best.start, best.end);
        
        // Check if JPEG has its own orientation, fallback to masterOrientation
        let jpegOrientation = getOrientationFromJpeg(jpegData);
        if (jpegOrientation <= 1 && masterOrientation > 1) {
          jpegOrientation = masterOrientation;
        }
        if (jpegOrientation <= 0 || jpegOrientation > 8) {
          jpegOrientation = 1;
        }
        log(`🧭 JPEG Preview Orientation detected: ${jpegOrientation}`);
        
        log(`📸 High-quality preview found (${(best.size / 1024).toFixed(0)} KB). Extracting with Orientation: ${jpegOrientation}...`);
        
        // Strip EXIF to prevent browser double rotation
        const cleanJpegData = stripExif(jpegData);
        const blob = new Blob([cleanJpegData], { type: 'image/jpeg' });
        
        // Physically rotate the image to be upright
        const rotResult = await rotateImageBlob(blob, jpegOrientation);
        
        return { 
          url: rotResult.url, 
          width: rotResult.width, 
          height: rotResult.height, 
          model: "Nikon/Embedded", 
          iso: 0,
          orientation: 1 // Already rotated upright
        };
      }
      log(`⚠️ Only small thumbnails found (${candidates.length}). Proceeding to RAW engine...`);
    }

    // 2. FALLBACK TO RAW ENGINE
    log("Initializing RAW engine (proxy worker)...");
    log("Opening file buffer...");
    const backupBuffer = fileBuffer.slice(0);
    
    await raw.open(new Uint8Array(fileBuffer), {
      useCameraWb: true,
      noAutoBright: false,
      bright: 1.0,
      outputColor: 1,
      userGamma: [2.222, 4.5]
    });

    log("Fetching camera metadata...");
    const meta = await raw.metadata();
    if (!meta) throw new Error("Metadata extraction failed");

    const modelName = meta.camera_model || meta.model || 'Unknown Model';
    const isoVal = meta.iso_speed || meta.iso || 0;
    let pixels = await raw.imageData();
    let { width, height } = meta;

    // UNWRAP
    if (pixels && pixels.data && pixels.width) {
      width = pixels.width;
      height = pixels.height;
      pixels = pixels.data;
    }

    // MANUAL DEVELOPMENT ENGINE (PRO VERSION)
    log(`🛠 Developing RAW sensor data (ISO ${isoVal})...`);
    
    // 1. Calculate robust black/white points (2% / 98% percentiles to ignore hot/dead pixels)
    const samples = 20000;
    const sampleData = [];
    for (let i = 0; i < samples; i++) {
      sampleData.push(pixels[Math.floor(Math.random() * pixels.length)]);
    }
    sampleData.sort((a, b) => a - b);
    const pBlack = sampleData[Math.floor(samples * 0.02)] || 0;
    const pWhite = sampleData[Math.floor(samples * 0.98)] || 255;
    const pRange = Math.max(1, pWhite - pBlack);
    
    log(`Denoise Profile: Black=${pBlack}, White=${pWhite}, ISO=${isoVal}`);
    
    const rgba = new Uint8ClampedArray(width * height * 4);
    const g = 1 / 2.2;
    
    // 2. High-ISO Chroma Denoise & Development
    // Strength scales with ISO (0 at ISO 100, strong at ISO 12800+)
    const denoiseStr = Math.min(0.8, Math.max(0, (isoVal - 800) / 25000));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const idx = i * 3;
        if (idx + 2 >= pixels.length) break;

        let r = (pixels[idx] - pBlack) / pRange;
        let gVal = (pixels[idx + 1] - pBlack) / pRange;
        let b = (pixels[idx + 2] - pBlack) / pRange;

        // Clip
        r = Math.max(0, Math.min(1, r));
        gVal = Math.max(0, Math.min(1, gVal));
        b = Math.max(0, Math.min(1, b));

        // ISO-Aware Chroma Smoothing (Reduce color speckles)
        if (denoiseStr > 0) {
          const avg = (r + gVal + b) / 3;
          r = r * (1 - denoiseStr) + avg * denoiseStr;
          b = b * (1 - denoiseStr) + avg * denoiseStr;
        }

        rgba[i * 4]     = Math.pow(r, g) * 255;
        rgba[i * 4 + 1] = Math.pow(gVal, g) * 255;
        rgba[i * 4 + 2] = Math.pow(b, g) * 255;
        rgba[i * 4 + 3] = 255;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(rgba, width, height), 0, 0);

    let finalCanvas = canvas;
    let finalW = width;
    let finalH = height;
    
    if (masterOrientation > 1) {
      log(`🔄 Physically rotating developed RAW canvas by orientation ${masterOrientation}...`);
      finalCanvas = document.createElement('canvas');
      if (masterOrientation >= 5 && masterOrientation <= 8) {
        finalW = height;
        finalH = width;
      } else {
        finalW = width;
        finalH = height;
      }
      finalCanvas.width = finalW;
      finalCanvas.height = finalH;
      const fCtx = finalCanvas.getContext('2d');
      
      switch (masterOrientation) {
        case 2: // Flip H
          fCtx.translate(finalW, 0);
          fCtx.scale(-1, 1);
          break;
        case 3: // Rotate 180
          fCtx.translate(finalW, finalH);
          fCtx.rotate(Math.PI);
          break;
        case 4: // Flip V
          fCtx.translate(0, finalH);
          fCtx.scale(1, -1);
          break;
        case 5: // Rotate 90 CCW + Flip H
          fCtx.rotate(90 * Math.PI / 180);
          fCtx.scale(1, -1);
          break;
        case 6: // Rotate 90 CW
          fCtx.translate(finalW, 0);
          fCtx.rotate(90 * Math.PI / 180);
          break;
        case 7: // Rotate 90 CW + Flip H
          fCtx.rotate(90 * Math.PI / 180);
          fCtx.translate(0, -finalH);
          fCtx.scale(-1, 1);
          break;
        case 8: // Rotate 90 CCW
          fCtx.translate(0, finalH);
          fCtx.rotate(-90 * Math.PI / 180);
          break;
      }
      fCtx.drawImage(canvas, 0, 0);
    }

    log("Decoding complete.");

    // Return the developed result
    const result = {
      url: finalCanvas.toDataURL('image/jpeg', 0.9),
      width: finalW,
      height: finalH,
      model: modelName,
      iso: isoVal,
      orientation: 1 // Already rotated upright
    };
    
    return result;
  } finally {
    raw.terminate();
  }
}

/**
 * Returns a list of supported RAW extensions for the input 'accept' attribute.
 */
export const RAW_EXTENSIONS = [
  '.cr2', '.cr3', '.crw',  // Canon
  '.nef', '.nrw',          // Nikon
  '.arw', '.srf', '.sr2',  // Sony
  '.dng',                  // Adobe / Universal
  '.orf',                  // Olympus
  '.raf',                  // Fujifilm
  '.rw2',                  // Panasonic
  '.pef',                  // Pentax
  '.x3f'                   // Sigma
].join(',');

export const RAW_REGEX = /\.(nef|nrw|cr2|cr3|crw|arw|srf|sr2|dng|orf|raf|rw2|pef|x3f)$/i;

