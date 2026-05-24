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
          // Portra 160 Lifestyle: Soft contrast, warm skin rendering, highlight compression
          outR = 0.04 + 0.96 * Math.pow(rv, 0.95);
          outG = 0.02 + 0.98 * Math.pow(gv, 1.0);
          outB = 0.01 + 0.99 * Math.pow(bv, 1.05);
          
          const midL = 1.0 - 4.0 * Math.pow(gv - 0.55, 2);
          if (midL > 0) {
            outR += midL * 0.05;
            outG += midL * 0.025;
            outB -= midL * 0.02;
          }
          
          if (outR > 0.9) outR = 0.9 + (outR - 0.9) * 0.7;
          if (outG > 0.9) outG = 0.9 + (outG - 0.9) * 0.7;
          if (outB > 0.9) outB = 0.9 + (outB - 0.9) * 0.7;
          
          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          outG = outG * 0.93 + luma * 0.07;
          outB = outB * 0.90 + luma * 0.10;
          
        } else if (type === 'fuji') {
          // Fuji Superia 400: Cool green/cyan highlight shift, organic contrast
          const sCurve = (x) => 3 * x * x - 2 * x * x * x;
          outR = sCurve(rv);
          outG = sCurve(gv);
          outB = sCurve(bv);
          
          outG = outG * 1.04;
          outB = outB * 0.98 + outG * 0.03;
          
          if (gv > 0.65) {
            const hAmt = (gv - 0.65) * 2.8;
            outG += hAmt * 0.02;
            outB += hAmt * 0.035;
          }
          
        } else if (type === 'arena_lights') {
          // Arena Spotlight: Neutralizes overhead cast, desaturates crowd backgrounds, boosts subject highlights
          outR = Math.pow(rv, 1.05);
          outG = Math.pow(gv, 1.02);
          outB = Math.pow(bv, 0.96); // cools shadows
          
          // Desaturate crowd backgrounds/shadows slightly
          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          if (luma < 0.4) {
            outR = outR * 0.9 + luma * 0.1;
            outG = outG * 0.9 + luma * 0.1;
            outB = outB * 0.95 + luma * 0.05;
          }

          const compressGlare = (x) => x > 0.8 ? 0.8 + (x - 0.8) * 0.65 : x;
          outR = compressGlare(outR);
          outG = compressGlare(outG);
          outB = compressGlare(outB);

        } else if (type === 'ymca') {
          // Rec-Gym Fluorescent: neutralizes muddy yellow-green casts, lifts flat midtones
          outR = rv * 1.05;
          outG = gv * 0.93;
          outB = bv * 1.07;

          const recCurve = (x) => 0.03 + 0.97 * (3 * x * x - 2 * x * x * x);
          outR = recCurve(outR) * 1.05;
          outG = recCurve(outG) * 1.03;
          outB = recCurve(outB) * 1.06;

        } else if (type === 'msg') {
          // Stadium Night: isolates action center, hides empty dark stadium seats
          const msgCurve = (x) => Math.pow(x, 1.45) * (2 - x);
          outR = msgCurve(rv);
          outG = msgCurve(gv);
          outB = msgCurve(bv);

          // Deep black crush on backgrounds/shadows
          if (outR < 0.25) outR *= 0.55;
          if (outG < 0.25) outG *= 0.55;
          if (outB < 0.25) outB *= 0.45;

        } else if (type === 'hardwood_tones') {
          // Hardwood Glow: enriches wood floor textures and boosts floor shine/reflections
          outR = Math.pow(rv, 0.94) * 1.05;
          outG = gv * 1.02;
          outB = Math.pow(bv, 1.12) * 0.94; // warm shadow shift

          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          if (luma > 0.5) {
            const hAmt = (luma - 0.5) * 0.13;
            outR += hAmt * 0.45;
            outG += hAmt * 0.20;
            outB -= hAmt * 0.35;
          }

        } else if (type === 'ice_rink') {
          // Ice Cold Rink: cools white balance, cleans up yellowed ice, pops blue lines
          outR = rv * 0.93;
          outG = gv * 0.97;
          outB = bv * 1.08;

          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          if (luma > 0.7) {
            const blend = (luma - 0.7) * 2.0;
            const factor = Math.min(0.65, blend);
            outR = outR * (1 - factor) + luma * factor * 0.96;
            outG = outG * (1 - factor) + luma * factor * 0.98;
            outB = outB * (1 - factor) + luma * factor * 1.05;
          }

          if (outB > outR && outB > outG) {
            const diff = outB - Math.max(outR, outG);
            outB += diff * 0.25;
            outR -= diff * 0.1;
            outG -= diff * 0.05;
          }

        } else if (type === 'matte_gym') {
          // Matte Gym Cast: reduces glare off gymnastics mats, raises midtone contrast
          outR = 0.05 + 0.95 * rv;
          outG = 0.04 + 0.96 * gv;
          outB = 0.03 + 0.97 * bv;
          
          const compressMat = (x) => x > 0.78 ? 0.78 + (x - 0.78) * 0.6 : x;
          outR = compressMat(outR);
          outG = compressMat(outG);
          outB = compressMat(outB);
          
          const midContrast = (x) => Math.pow(x, 1.15) * (2 - x);
          outR = midContrast(outR);
          outG = midContrast(outG);
          outB = midContrast(outB);

        } else if (type === 'mvp_sport') {
          // Clarity Punch: heavy contrast curves, slightly pulled-back blacks, jersey details
          const heavyContrast = (x) => 3.5 * x * x * x - 4.5 * x * x + 2 * x;
          outR = heavyContrast(rv);
          outG = heavyContrast(gv);
          outB = heavyContrast(bv);
          
          outR = 0.02 + 0.98 * outR;
          outG = 0.02 + 0.98 * outG;
          outB = 0.01 + 0.99 * outB;

        } else if (type === 'hyper_active') {
          // Hyper-Active: boost dynamic range, controls clipping highlights, edge definition
          outR = rv > 0.85 ? 0.85 + (rv - 0.85) * 0.55 : rv;
          outG = gv > 0.85 ? 0.85 + (gv - 0.85) * 0.55 : gv;
          outB = bv > 0.85 ? 0.85 + (bv - 0.85) * 0.55 : bv;
          
          outR = Math.pow(outR, 0.92);
          outG = Math.pow(outG, 0.92);
          outB = Math.pow(outB, 0.92);
          
          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          outR = outR * 1.05;
          outG = outG * 1.02;

        } else if (type === 'mud_grit') {
          // Mud & Grit: enhances earthy browns and grassy greens, crushed shadows
          outR = Math.pow(rv, 1.35);
          outG = Math.pow(gv, 1.30);
          outB = Math.pow(bv, 1.40);
          
          outR = outR * 1.08 + 0.02;
          outG = outG * 1.02;
          outB = outB * 0.83; 
          
          if (outG > outR && outG > outB) {
            outR *= 0.88;
            outB *= 0.82;
            outG = outG * 1.03;
          }

        } else if (type === 'velodrome') {
          // Velodrome Speed: pushes colors slightly warm, pops highlights
          outR = rv * 1.06 + 0.02;
          outG = gv * 1.02;
          outB = bv * 0.93;
          
          if (outR > 0.75) outR = 0.75 + (outR - 0.75) * 1.15;
          if (outG > 0.75) outG = 0.75 + (outG - 0.75) * 1.08;

        } else if (type === 'sweat_steel') {
          // Sweat & Steel: desaturates environment, pops metallic skin shine
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          const s = 3.2 * luma * luma - 2.2 * luma * luma * luma;
          
          outR = s + (rv - luma) * 0.42;
          outG = s + (gv - luma) * 0.42;
          outB = s + (bv - luma) * 0.42;
          
          if (outR > 0.68) outR += (outR - 0.68) * 0.25;
          if (outG > 0.68) outG += (outG - 0.68) * 0.25;
          if (outB > 0.68) outB += (outB - 0.68) * 0.25;

        } else if (type === 'extreme_peak') {
          // Extreme Peak: snowy highlight normalization and high exposure roll-offs
          outR = Math.min(1.0, rv * 1.08);
          outG = Math.min(1.0, gv * 1.08);
          outB = Math.min(1.0, bv * 1.14);
          
          if (outR > 0.86) outR = 0.86 + (outR - 0.86) * 0.5;
          if (outG > 0.86) outG = 0.86 + (outG - 0.86) * 0.5;
          if (outB > 0.86) outB = 0.86 + (outB - 0.86) * 0.5;

        } else if (type === 'doc_30_30') {
          // 30 for 30 Gritty: highly desaturated, heavy black crush, slate-tint shadows
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          const gritCurve = (x) => Math.pow(x, 1.35) * (2 - x);
          const rC = gritCurve(rv);
          const gC = gritCurve(gv);
          const bC = gritCurve(bv);

          const targetLuma = 0.299 * rC + 0.587 * gC + 0.114 * bC;
          outR = targetLuma + (rC - targetLuma) * 0.35;
          outG = targetLuma + (gC - targetLuma) * 0.35;
          outB = targetLuma + (bC - targetLuma) * 0.45;
          
          outR *= 0.94;
          outG *= 0.97;
          outB *= 1.06;

        } else if (type === 'drive_survive') {
          // Drive to Survive: rich greens, high-contrast reds, warm skin
          outR = Math.pow(rv, 1.15);
          outG = Math.pow(gv, 1.02);
          outB = Math.pow(bv, 1.25);
          
          if (outR > outG && outR > outB) {
            outR = Math.min(1.0, outR * 1.12);
            outG *= 0.88;
            outB *= 0.88;
          }
          if (outG > outR && outG > outB) {
            outG *= 0.96;
            outB *= 1.10;
            outR *= 0.80;
          }
          if (rv > gv && gv > bv) {
            outR += 0.02;
            outG += 0.01;
          }

        } else if (type === 'underdog') {
          // Underdog Story: dark moody, warm olive/green midtone undertones
          outR = Math.pow(rv, 1.38);
          outG = Math.pow(gv, 1.30);
          outB = Math.pow(bv, 1.50);
          
          const mid = 1.0 - 4.0 * Math.pow(gv - 0.45, 2);
          if (mid > 0) {
            outR += mid * 0.02;
            outG += mid * 0.04;
            outB -= mid * 0.035;
          }

        } else if (type === 'friday_lights') {
          // Friday Night Lights: amber highlights, faded deep-blue shadows, high contrast
          const sCurve = (x) => 3 * x * x - 2 * x * x * x;
          let rC = sCurve(rv);
          let gC = sCurve(gv);
          let bC = sCurve(bv);

          rC = 0.02 + 0.96 * rC;
          gC = 0.02 + 0.96 * gC;
          bC = 0.03 + 0.95 * bC;

          const luma = 0.299 * rC + 0.587 * gC + 0.114 * bC;
          if (luma < 0.45) {
            const amt = (0.45 - luma) * 0.2;
            outR = rC - amt * 0.3;
            outG = gC - amt * 0.1;
            outB = bC + amt * 0.4;
          } else {
            const amt = (luma - 0.45) * 0.18;
            outR = rC + amt * 0.35;
            outG = gC + amt * 0.18;
            outB = bC - amt * 0.25;
          }

        } else if (type === 'locker_room') {
          // Locker Room Shadow: deep dark shadows with flat ambers
          outR = Math.pow(rv, 1.55) * 1.12;
          outG = Math.pow(gv, 1.55) * 1.05;
          outB = Math.pow(bv, 1.75) * 0.80;
          
          if (outR < 0.18) outR *= 0.35;
          if (outG < 0.18) outG *= 0.35;
          if (outB < 0.18) outB *= 0.25;

        } else if (type === 'victory_glow') {
          // Victory Glow: golden-hour highlights, soft matte blacks, rich skin
          outR = 0.035 + 0.965 * Math.pow(rv, 0.95);
          outG = 0.025 + 0.975 * Math.pow(gv, 1.0);
          outB = 0.015 + 0.985 * Math.pow(bv, 1.06);
          
          const luma = 0.299 * outR + 0.587 * outG + 0.114 * outB;
          if (luma > 0.55) {
            const amt = (luma - 0.55) * 0.15;
            outR += amt * 0.42;
            outG += amt * 0.22;
            outB -= amt * 0.38;
          }

        } else if (type === 'red_storm') {
          // Red Storm: desaturate background greens and ambers, make primary reds pop intensely
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          if (rv > gv * 1.25 && rv > bv * 1.25) {
            const diff = rv - Math.max(gv, bv);
            outR = rv + diff * 0.22;
            outG = gv - diff * 0.18;
            outB = bv - diff * 0.18;
          } else {
            const satFactor = 0.65;
            outR = luma + (rv - luma) * satFactor;
            outG = luma + (gv - luma) * satFactor;
            outB = luma + (bv - luma) * satFactor;
          }

        } else if (type === 'royal_pride') {
          // Royal Pride: pop blues and cyans, suppress court yellow casts
          let rC = rv;
          let gC = gv;
          let bC = bv;

          if (rC > 0.4 && gC > 0.4 && bC < Math.min(rC, gC) - 0.12) {
            rC *= 0.95;
            gC *= 0.92;
          }

          if (bC > rC && (bC > gC || (gC > rC && bC > rC * 1.25))) {
            const diff = bC - rC;
            bC = bC + diff * 0.25;
            gC = gC + diff * 0.08;
            rC = rC - diff * 0.05;
          }

          outR = rC;
          outG = gC;
          outB = bC;

        } else if (type === 'green_field') {
          // Green Field Clear: stabilize grass colors to deep hunter green, clean up turf glare
          let rC = rv;
          let gC = gv;
          let bC = bv;

          const contrast = (x) => Math.pow(x, 1.05);
          rC = contrast(rC);
          gC = contrast(gC);
          bC = contrast(bC);

          if (gC > rC && gC > bC) {
            rC *= 0.90;
            gC = gC * 0.97 + 0.03 * bC;
            bC = bC * 0.92 + gC * 0.09;
          }

          outR = rC;
          outG = gC;
          outB = bC;

        } else if (type === 'carbon_clean') {
          // Carbon Commercial: accurate jersey colors, linear color replication, matte shadow curve
          outR = rv < 0.16 ? Math.pow(rv / 0.16, 1.35) * 0.16 : rv;
          outG = gv < 0.16 ? Math.pow(gv / 0.16, 1.35) * 0.16 : gv;
          outB = bv < 0.16 ? Math.pow(bv / 0.16, 1.35) * 0.16 : bv;
          
          outR = 0.02 + 0.98 * outR;
          outG = 0.02 + 0.98 * outG;
          outB = 0.03 + 0.97 * outB;

        } else if (type === 'court_gold') {
          // Court Gold: selectively boost gold, yellow, and copper uniform accents
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          const isGold = (rv > 0.42 && gv > 0.33 && bv < gv - 0.08);
          const factor = isGold ? 1.35 : 0.82;
          
          outR = luma + (rv - luma) * factor;
          outG = luma + (gv - luma) * (isGold ? 1.25 : 0.80);
          outB = luma + (bv - luma) * (isGold ? 0.70 : 0.80);

        } else if (type === 'neon_high') {
          // High-Key Neon: saturates bright fluorescent colors
          const maxVal = Math.max(rv, gv, bv);
          const minVal = Math.min(rv, gv, bv);
          const sat = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          const satBoost = sat > 0.35 ? 1.48 : 1.05;
          outR = luma + (rv - luma) * satBoost;
          outG = luma + (gv - luma) * satBoost;
          outB = luma + (bv - luma) * satBoost;

        } else if (type === 'kodachrome') {
          // Kodachrome Retro: deep rich reds, warm highlight wash, matte blacks
          outR = Math.pow(rv, 1.07) * 1.06;
          outG = Math.pow(gv, 1.02);
          outB = Math.pow(bv, 1.1) * 0.95;

          outR = 0.035 + 0.965 * outR;
          outG = 0.035 + 0.965 * outG;
          outB = 0.045 + 0.955 * outB;

          if (outR > outG && outR > outB) {
            outR = Math.min(1.0, outR * 1.08);
          }

        } else if (type === 'vintage') {
          // Streetball Gold: golden-yellow wash, faded matte shadows, soft highlights
          outR = 0.08 + 0.92 * Math.pow(rv, 0.95);
          outG = 0.05 + 0.95 * Math.pow(gv, 1.0);
          outB = 0.02 + 0.88 * Math.pow(bv, 1.15);
          
          outR = 0.05 + 0.95 * outR;
          outG = 0.05 + 0.95 * outG;
          outB = 0.08 + 0.92 * outB;
          
          if (lumaColor(outR, outG, outB) > 0.4) {
            const l = lumaColor(outR, outG, outB);
            outR += (l - 0.4) * 0.08;
            outG += (l - 0.4) * 0.04;
          }
          
        } else if (type === 'trix') {
          // Tri-X High Contrast B&W: punchy monochrome analog curve
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          let s = 1.0 / (1.0 + Math.exp(-8 * (luma - 0.46)));
          s = 0.02 + 0.96 * s;
          outR = outG = outB = s;

        } else if (type === 'rucker_park') {
          // Rucker Park Faded: heavy desaturation, warm concrete grays, faded hoops
          const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          
          outR = luma + (rv - luma) * 0.30;
          outG = luma + (gv - luma) * 0.30;
          outB = luma + (bv - luma) * 0.22;
          
          const isOrange = (rv > 0.35 && gv > 0.2 && bv < gv);
          if (isOrange) {
            outR += 0.05;
            outG += 0.02;
          }
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

// Exports a built-in LUT preset to a standard IRIDAS .cube string format
export function exportLutToCube(type) {
  if (!type || type === 'none' || type === 'custom') return null;
  const { size, data } = generateBuiltInLut(type, 33);
  let content = `# Created by EZ PhotoLab\n`;
  content += `# Preset ID: ${type}\n`;
  content += `LUT_3D_SIZE ${size}\n\n`;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i].toFixed(6);
    const g = data[i+1].toFixed(6);
    const b = data[i+2].toFixed(6);
    content += `${r} ${g} ${b}\n`;
  }
  return content;
}

