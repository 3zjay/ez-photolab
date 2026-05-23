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
          
        } else if (type === 'arena_lights') {
          // Arena Lights: neutralize harsh overhead yellow/green glare and exposure shifts
          // Slight contrast boost
          outR = Math.pow(rv, 1.05);
          outG = Math.pow(gv, 1.02);
          outB = Math.pow(bv, 0.96); // cools shadows

          // Flatten glare in highlights (compress highlights)
          const compressGlare = (x) => x > 0.8 ? 0.8 + (x - 0.8) * 0.65 : x;
          outR = compressGlare(outR);
          outG = compressGlare(outG);
          outB = compressGlare(outB);

        } else if (type === 'ymca') {
          // YMCA Rec Gym: neutralize muddy green-yellow tint casts, brightens flat midtones
          // Shift tint green -> magenta/pink
          outR = rv * 1.05;
          outG = gv * 0.93;
          outB = bv * 1.07;

          // Brighten and contrast boost midtones
          const recCurve = (x) => 0.03 + 0.97 * (3 * x * x - 2 * x * x * x);
          outR = recCurve(outR) * 1.05; // Brighten overall
          outG = recCurve(outG) * 1.03;
          outB = recCurve(outB) * 1.06;

        } else if (type === 'msg') {
          // MSG High Drama: isolate court wood floor, crush crowd backgrounds
          // High contrast S-curve
          const msgCurve = (x) => Math.pow(x, 1.45) * (2 - x);
          outR = msgCurve(rv);
          outG = msgCurve(gv);
          outB = msgCurve(bv);

          // Deep black crush on backgrounds
          if (outR < 0.25) outR *= 0.65;
          if (outG < 0.25) outG *= 0.65;
          if (outB < 0.25) outB *= 0.55;

          // Warm court wood frequencies boost (yellow-orange region)
          if (outR > 0.4 && outG > 0.3) {
            outR = Math.min(1.0, outR * 1.06);
            outG = Math.min(1.0, outG * 1.03);
          }

        } else if (type === 'team_pride') {
          // Team Pride: high saturation jersey color pop, protecting skin tones
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          // Detect typical orange/yellow skin tones (Red > Green > Blue)
          const isSkin = (rv > gv && gv > bv && (rv - bv) > 0.16);
          const satFactor = isSkin ? 1.04 : 1.28;

          outR = luma + (rv - luma) * satFactor;
          outG = luma + (gv - luma) * (isSkin ? 1.04 : 1.16);
          outB = luma + (bv - luma) * satFactor;

        } else if (type === 'hardwood_tones') {
          // Hardwood Tones: pushes warm golden-orange wood frequencies and reflections
          outR = Math.pow(rv, 0.94) * 1.05;
          outG = gv * 1.02;
          outB = Math.pow(bv, 1.12) * 0.94; // warm shadow shift

          // Golden highlight tint for reflection pop
          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          if (luma > 0.5) {
            const hAmt = (luma - 0.5) * 0.13;
            outR += hAmt * 0.45;
            outG += hAmt * 0.20;
            outB -= hAmt * 0.35;
          }

        } else if (type === 'mvp_sport') {
          // MVP Sport Clean: clean daily-driver journalism contrast, pure neutral whites
          const sCurve = (x) => 0.01 + 0.98 * (3 * x * x - 2 * x * x * x);
          outR = sCurve(rv);
          outG = sCurve(gv);
          outB = sCurve(bv);

          // Normalize/neutralize whites
          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          if (luma > 0.86) {
            const whAmt = (luma - 0.86) * 7.1;
            const factor = 1 - Math.min(1.0, whAmt) * 0.35;
            outR = luma + (outR - luma) * factor;
            outG = luma + (outG - luma) * factor;
            outB = luma + (outB - luma) * factor;
          }

        } else if (type === 'kodachrome') {
          // Kodachrome Retro: deep rich reds, warm wash, matte blacks
          outR = Math.pow(rv, 1.07) * 1.06;
          outG = Math.pow(gv, 1.02);
          outB = Math.pow(bv, 1.1) * 0.95;

          // Matte shadow fade
          outR = 0.035 + 0.965 * outR;
          outG = 0.035 + 0.965 * outG;
          outB = 0.045 + 0.955 * outB;

          // Deep red saturation boost
          if (outR > outG && outR > outB) {
            outR = Math.min(1.0, outR * 1.08);
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
          
        } else if (type === 'doc_30_30') {
          // 30 for 30 Gritty: desaturated high-contrast documentary look
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          // Heavy grit S-curve
          const gritCurve = (x) => Math.pow(x, 1.35) * (2 - x);
          const rC = gritCurve(rv);
          const gC = gritCurve(gv);
          const bC = gritCurve(bv);

          // Desaturate to 40% saturation
          const targetLuma = 0.299 * rC + 0.587 * gC + 0.114 * bC;
          outR = targetLuma + (rC - targetLuma) * 0.40;
          outG = targetLuma + (gC - targetLuma) * 0.40;
          outB = targetLuma + (bC - targetLuma) * 0.40;
          
          // Metallic slate tint
          outR *= 0.95;
          outG *= 0.98;
          outB *= 1.05;

        } else if (type === 'carbon_clean') {
          // Carbon Clean: subtle black crush, accurate jersey colors
          outR = rv < 0.16 ? Math.pow(rv / 0.16, 1.35) * 0.16 : rv;
          outG = gv < 0.16 ? Math.pow(gv / 0.16, 1.35) * 0.16 : gv;
          outB = bv < 0.16 ? Math.pow(bv / 0.16, 1.35) * 0.16 : bv;

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
