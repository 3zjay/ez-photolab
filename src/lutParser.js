// Parses IRIDAS .cube files into a normalized Float32Array
export function parseCubeLut(text) {
  const lines = text.split('\n');
  let size = 0;
  const rgbValues = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10);
      continue;
    }
    if (line.match(/^[A-Z_]/)) continue; // Ignore other headers
    
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        rgbValues.push(r, g, b);
      }
    }
  }
  
  if (size === 0 || rgbValues.length !== size * size * size * 3) {
    throw new Error(`Invalid .cube structure or dimensions. Expected ${size * size * size * 3} floats, got ${rgbValues.length}.`);
  }
  
  return { size, data: new Float32Array(rgbValues) };
}

// Converts a 2D CLUT Strip image (e.g. 256x16 or 512x64) to a unified 3D LUT array
export function parseClutImage(imageData, size) {
  const d = imageData.data;
  const lut3d = new Float32Array(size * size * size * 3);
  const width = size * size;
  
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const lut_x = b * size + r;
        const lut_y = g;
        const pixel_idx = (lut_y * width + lut_x) * 4;
        const out_idx = (r + g * size + b * size * size) * 3;
        
        lut3d[out_idx]   = d[pixel_idx] / 255;
        lut3d[out_idx+1] = d[pixel_idx+1] / 255;
        lut3d[out_idx+2] = d[pixel_idx+2] / 255;
      }
    }
  }
  return { size, data: lut3d };
}

// Generates film simulations mathematically
export function generateBuiltInLut(type, size = 33) {
  const data = new Float32Array(size * size * size * 3);
  const sizeMin1 = size - 1;
  
  for (let b = 0; b < size; b++) {
    const bv = b / sizeMin1;
    for (let g = 0; g < size; g++) {
      const gv = g / sizeMin1;
      for (let r = 0; r < size; r++) {
        const rv = r / sizeMin1;
        
        let outR = rv;
        let outG = gv;
        let outB = bv;
        
        if (type === 'portra') {
          // Kodak Portra: Warm golden skin tones, pastel highlights, lifted soft shadows
          // Lift shadows slightly
          outR = 0.04 + 0.96 * Math.pow(rv, 0.95);
          outG = 0.02 + 0.98 * Math.pow(gv, 1.0);
          outB = 0.01 + 0.99 * Math.pow(bv, 1.05);
          
          // Midtone warm orange glow
          const midL = 1.0 - 4.0 * Math.pow(gv - 0.55, 2);
          if (midL > 0) {
            outR += midL * 0.05;
            outG += midL * 0.025;
            outB -= midL * 0.02;
          }
          
          // Soften highlights (reduce dynamic range peak a tiny bit)
          if (outR > 0.9) outR = 0.9 + (outR - 0.9) * 0.7;
          if (outG > 0.9) outG = 0.9 + (outG - 0.9) * 0.7;
          if (outB > 0.9) outB = 0.9 + (outB - 0.9) * 0.7;
          
          // Desaturate greens and blues slightly
          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          outG = outG * 0.93 + luma * 0.07;
          outB = outB * 0.90 + luma * 0.10;
          
        } else if (type === 'fuji') {
          // Fuji Superia: Organic cool green accents, high contrast, cooler highlights
          // Contrast S-curve
          const sCurve = (x) => 3 * x * x - 2 * x * x * x;
          outR = sCurve(rv);
          outG = sCurve(gv);
          outB = sCurve(bv);
          
          // Rich, cool greens
          outG = outG * 1.04;
          outB = outB * 0.98 + outG * 0.03;
          
          // Shift highlights toward cyan/blue
          if (gv > 0.65) {
            const hAmt = (gv - 0.65) * 2.8;
            outG += hAmt * 0.02;
            outB += hAmt * 0.035;
          }
          
        } else if (type === 'teal_orange') {
          // Teal & Orange cinematic look
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          // Shadows: push to teal (cyan-blue)
          const shadowAmt = Math.pow(1 - luma, 1.8) * 0.15;
          outR -= shadowAmt * 0.25;
          outG += shadowAmt * 0.08;
          outB += shadowAmt * 0.35;
          
          // Highlights: push to orange (warm skin-tone range)
          const highlightAmt = Math.pow(luma, 1.4) * 0.13;
          outR += highlightAmt * 0.35;
          outG += highlightAmt * 0.15;
          outB -= highlightAmt * 0.3;
          
        } else if (type === 'vintage') {
          // Vintage Gold: golden warm wash, faded matte blacks
          outR = 0.08 + 0.92 * Math.pow(rv, 0.95);
          outG = 0.05 + 0.95 * Math.pow(gv, 1.0);
          outB = 0.02 + 0.88 * Math.pow(bv, 1.15);
          
          // Lift blacks & wash out
          outR = 0.05 + 0.95 * outR;
          outG = 0.05 + 0.95 * outG;
          outB = 0.08 + 0.92 * outB;
          
          // Golden highlight tint
          if (lumaColor(outR, outG, outB) > 0.4) {
            const l = lumaColor(outR, outG, outB);
            outR += (l - 0.4) * 0.08;
            outG += (l - 0.4) * 0.04;
          }
          
        } else if (type === 'trix') {
          // Ilford Tri-X 400 B&W: high contrast monochrome
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          // Punchy analog S-curve
          // Sigmoid function mapping
          let s = 1.0 / (1.0 + Math.exp(-8 * (luma - 0.46)));
          // Faded blacks and slightly soft highlights
          s = 0.02 + 0.96 * s;
          outR = outG = outB = s;
        }
        
        // Clamp output colors to [0.0, 1.0]
        const idx = (r + g * size + b * size * size) * 3;
        data[idx]     = Math.min(1.0, Math.max(0.0, outR));
        data[idx + 1] = Math.min(1.0, Math.max(0.0, outG));
        data[idx + 2] = Math.min(1.0, Math.max(0.0, outB));
      }
    }
  }
  return { size, data };
}

function lumaColor(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
