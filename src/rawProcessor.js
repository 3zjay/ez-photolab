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
    let masterOrientation = 1;
    try {
      const view = new DataView(fileBuffer);
      // TIFF magic: 'II' (0x4949) or 'MM' (0x4D4D)
      const byteOrder = view.getUint16(0, false);
      if (byteOrder === 0x4949 || byteOrder === 0x4D4D) {
        const little = (byteOrder === 0x4949);
        const magic = view.getUint16(2, little);
        if (magic === 42 || magic === 85) { // 42 = Standard TIFF, 85 = Panasonic RAW
          const ifdOffset = view.getUint32(4, little);
          const tags = view.getUint16(ifdOffset, little);
          const tagOffset = ifdOffset + 2;
          for (let i = 0; i < tags; i++) {
            const tagId = view.getUint16(tagOffset + (i * 12), little);
            if (tagId === 0x0112) { // Orientation
              masterOrientation = view.getUint16(tagOffset + (i * 12) + 8, little);
              break;
            }
          }
        }
      }
    } catch (e) {
      log("⚠️ Master RAW Orientation read error: " + e.message);
    }
    
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
        
        log(`📸 High-quality preview found (${(best.size / 1024).toFixed(0)} KB). Extracting with Orientation: ${masterOrientation}...`);
        const blob = new Blob([jpegData], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        // Quick meta-peek for camera model if possible
        return { 
          url, 
          width: 0, height: 0, // Will be read by browser
          model: "Nikon/Embedded", 
          iso: 0,
          orientation: masterOrientation 
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

    log("Decoding complete.");

    // Return the developed result
    const result = {
      url: canvas.toDataURL('image/jpeg', 0.9),
      width,
      height,
      model: modelName,
      iso: isoVal
    };
    
    log("Decoding complete.");
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

