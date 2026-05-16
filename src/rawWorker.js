import LibRaw from 'libraw-wasm';

self.onmessage = async (e) => {
  const { fileBuffer } = e.data;
  const log = (msg) => self.postMessage({ type: 'log', msg });

  try {
    log("Initializing RAW engine...");
    const raw = new LibRaw();
    
    log("Opening file buffer...");
    await raw.open(new Uint8Array(fileBuffer), {
      useAutoWb: true,
      outputColor: 1 // sRGB
    });

    log("Unpacking raw data...");
    if (raw.unpack) await raw.unpack();
    
    log("Fetching camera metadata...");
    const meta = await raw.metadata();
    if (!meta) throw new Error("Metadata extraction failed - empty result");
    
    // Log the full metadata structure for debugging
    log(`Meta Keys: ${Object.keys(meta).join(', ')}`);
    
    // Correct keys based on log output
    const modelName = meta.camera_model || meta.model || 'Unknown Model';
    const makeName = meta.camera_make || meta.make || 'Unknown';
    const isoVal = meta.iso_speed || meta.iso || 0;

    log(`Decoding pixels for ${modelName}...`);
    const pixels = await raw.imageData();
    if (!pixels) throw new Error("Image data decoding failed - no pixels returned");
    
    const { width, height } = meta;
    if (!width || !height) throw new Error(`Invalid dimensions: ${width}x${height}`);

    log(`Converting color space (${width}x${height})...`);
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      if (pixels[i * 3] === undefined) break; 
      
      rgba[i * 4]     = pixels[i * 3];
      rgba[i * 4 + 1] = pixels[i * 3 + 1];
      rgba[i * 4 + 2] = pixels[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }

    log("Finalizing image results...");
    self.postMessage({
      type: 'result',
      success: true,
      rgba,
      width,
      height,
      metadata: {
        model: modelName,
        make: makeName,
        iso: isoVal,
        shutter: meta.shutter || '0',
        aperture: meta.aperture || '0',
        timestamp: meta.timestamp
      }
    }, [rgba.buffer]);

  } catch (error) {
    self.postMessage({
      type: 'result',
      success: false,
      error: error.message
    });
  }
};
