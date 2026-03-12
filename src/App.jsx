import { useState, useRef } from "react";

const FILTERS = [
  { key: "brightness", label: "Brightness",  min: 0,    max: 200, default: 100, unit: "%", group: "basic" },
  { key: "contrast",   label: "Contrast",    min: 0,    max: 200, default: 100, unit: "%", group: "basic" },
  { key: "saturation", label: "Saturation",  min: 0,    max: 200, default: 100, unit: "%", group: "basic" },
  { key: "exposure",   label: "Exposure",    min: -100, max: 100, default: 0,   unit: "",  group: "basic" },
  { key: "temperature",label: "Warmth",      min: -100, max: 100, default: 0,   unit: "",  group: "basic" },
  { key: "sharpness",  label: "Sharpness",   min: 0,    max: 20,  default: 0,   unit: "",  group: "enhance" },
  { key: "clarity",    label: "Clarity",     min: 0,    max: 20,  default: 0,   unit: "",  group: "enhance" },
  { key: "denoise",    label: "Denoise",     min: 0,    max: 10,  default: 0,   unit: "",  group: "enhance" },
  { key: "smooth",     label: "Skin Smooth", min: 0,    max: 10,  default: 0,   unit: "",  group: "enhance" },
  { key: "vignette",   label: "Vignette",    min: 0,    max: 100, default: 0,   unit: "%", group: "style" },
  { key: "fade",       label: "Fade",        min: 0,    max: 100, default: 0,   unit: "%", group: "style" },
];

const DEFAULT_STATE = Object.fromEntries(FILTERS.map(f => [f.key, f.default]));

const PRESETS = [
  { name: "Restore Old Photo", icon: "◈", values: { brightness: 110, contrast: 115, saturation: 115, exposure: 15, sharpness: 8,  clarity: 6,  denoise: 7, smooth: 2, temperature: 10, vignette: 0,  fade: 0  } },
  { name: "Enhance Portrait",  icon: "◉", values: { brightness: 108, contrast: 110, saturation: 105, exposure: 8,  sharpness: 5,  clarity: 8,  denoise: 4, smooth: 5, temperature: 5,  vignette: 20, fade: 0  } },
  { name: "Clean & Sharp",     icon: "◇", values: { brightness: 105, contrast: 120, saturation: 100, exposure: 5,  sharpness: 12, clarity: 10, denoise: 3, smooth: 0, temperature: 0,  vignette: 10, fade: 0  } },
  { name: "Soft & Warm",       icon: "◌", values: { brightness: 110, contrast: 95,  saturation: 110, exposure: 10, sharpness: 2,  clarity: 3,  denoise: 5, smooth: 6, temperature: 30, vignette: 25, fade: 15 } },
];

const GROUPS = [{ key: "basic", label: "BASIC" }, { key: "enhance", label: "ENHANCE" }, { key: "style", label: "STYLE" }];

const EXPORT_FORMATS = [
  { id: "png",  label: "PNG",  desc: "Lossless · Best for archiving", ext: "png",  mime: "image/png" },
  { id: "webp", label: "WebP", desc: "Near-lossless · Smallest size",  ext: "webp", mime: "image/webp" },
  { id: "jpg",  label: "JPEG", desc: "Compressed · Universal",         ext: "jpg",  mime: "image/jpeg" },
];

const SCALE_OPTIONS = [
  { value: 1,    label: "1×",   desc: "Original" },
  { value: 2,    label: "2×",   desc: "Double" },
  { value: 4,    label: "4×",   desc: "Ultra HD" },
  { value: "8k", label: "8K",   desc: "7680px wide" },
  { value: "12k",label: "12K",  desc: "12288px wide" },
];

// Facebook export modes
const FB_MODES = [
  {
    id: "portrait",
    label: "Portrait Post",
    desc: "1080 × 1350px",
    tip: "Best for mobile — takes up most screen space",
    w: 1080, h: 1350,
    format: "jpg", quality: 75,
  },
  {
    id: "square",
    label: "Square Post",
    desc: "1080 × 1080px",
    tip: "Universal square format",
    w: 1080, h: 1080,
    format: "jpg", quality: 75,
  },
  {
    id: "landscape",
    label: "Landscape Post",
    desc: "2048px longest side",
    tip: "Max res before aggressive compression",
    w: 2048, h: null,
    format: "jpg", quality: 75,
  },
  {
    id: "cover",
    label: "Cover Photo",
    desc: "851 × 315px",
    tip: "Exact Facebook cover dimensions",
    w: 851, h: 315,
    format: "jpg", quality: 75,
  },
];

function getScaleForTarget(imgW, imgH, scaleVal) {
  if (scaleVal === "8k")  return Math.max(1, 7680  / imgW);
  if (scaleVal === "12k") return Math.max(1, 12288 / imgW);
  return scaleVal;
}

// Render to exact pixel dimensions for Facebook
async function renderFacebook(imgEl, filters, fbMode) {
  let targetW = fbMode.w;
  let targetH = fbMode.h;
  const srcW  = imgEl.naturalWidth;
  const srcH  = imgEl.naturalHeight;

  // For landscape, cap longest side at 2048
  if (fbMode.id === "landscape") {
    const longest = Math.max(srcW, srcH);
    const scale   = Math.min(1, 2048 / longest);
    targetW = Math.round(srcW * scale);
    targetH = Math.round(srcH * scale);
  } else if (!targetH) {
    targetH = Math.round(srcH * (targetW / srcW));
  }

  // Cover and portrait/square: crop to exact ratio
  const canvas = document.createElement("canvas");
  canvas.width  = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");

  // Apply CSS filters
  const ev = 1 + filters.exposure / 100;
  const bv = (filters.brightness / 100) * ev;
  ctx.filter = `brightness(${bv}) contrast(${filters.contrast / 100}) saturate(${filters.saturation / 100})`;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Smart crop: center-crop to target aspect ratio
  const srcAspect = srcW / srcH;
  const tgtAspect = targetW / targetH;
  let sx = 0, sy = 0, sw = srcW, sh = srcH;
  if (srcAspect > tgtAspect) {
    sw = srcH * tgtAspect;
    sx = (srcW - sw) / 2;
  } else {
    sh = srcW / tgtAspect;
    sy = (srcH - sh) / 2;
  }
  ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, targetW, targetH);
  ctx.filter = "none";

  return { canvas, W: targetW, H: targetH };
}

// ── Pixel processing helpers ────────────────────────────────────────────────
function makeGaussianKernel(radius, sigma) {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size * size);
  let sum = 0;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const v = Math.exp(-(x*x + y*y) / (2 * sigma * sigma));
      kernel[(y + radius) * size + (x + radius)] = v;
      sum += v;
    }
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  return { kernel, size, radius };
}

function gaussianBlur(data, w, h, sigma) {
  if (sigma <= 0) return data;
  const radius = Math.ceil(sigma * 2);
  const { kernel, size } = makeGaussianKernel(radius, sigma);
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const sy = Math.min(Math.max(y + ky - radius, 0), h - 1);
          const sx = Math.min(Math.max(x + kx - radius, 0), w - 1);
          const k  = kernel[ky * size + kx];
          const idx = (sy * w + sx) * 4;
          r += data[idx] * k; g += data[idx+1] * k; b += data[idx+2] * k; a += data[idx+3] * k;
        }
      }
      const i = (y * w + x) * 4;
      out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = a;
    }
  }
  return out;
}

function unsharpMask(data, w, h, sigma, amount) {
  const blurred = gaussianBlur(data, w, h, sigma);
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i]   = Math.min(255, Math.max(0, data[i]   + amount * (data[i]   - blurred[i])));
    out[i+1] = Math.min(255, Math.max(0, data[i+1] + amount * (data[i+1] - blurred[i+1])));
    out[i+2] = Math.min(255, Math.max(0, data[i+2] + amount * (data[i+2] - blurred[i+2])));
    out[i+3] = data[i+3];
  }
  return out;
}

async function renderHighQuality(imgEl, filters, scaleVal) {
  const scale = getScaleForTarget(imgEl.naturalWidth, imgEl.naturalHeight, scaleVal);
  const W = Math.round(imgEl.naturalWidth  * scale);
  const H = Math.round(imgEl.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // For very large exports (8K/12K), skip pixel-level ops — they'd lock the browser
  // CSS filters + compositing still look excellent at high res
  const isHuge = W * H > 16_000_000; // ~4K threshold for pixel ops

  const ev = 1 + filters.exposure / 100;
  const bv = (filters.brightness / 100) * ev;

  // Build full CSS filter string including denoise/sharpness approximations for huge exports
  let cssF = `brightness(${bv}) contrast(${filters.contrast / 100}) saturate(${filters.saturation / 100})`;
  if (isHuge) {
    if (filters.denoise  > 0) cssF += ` blur(${filters.denoise * 0.06}px)`;
    if (filters.sharpness > 0) cssF += ` contrast(${1 + filters.sharpness * 0.03})`;
    if (filters.clarity  > 0) cssF += ` contrast(${1 + filters.clarity  * 0.025})`;
  }

  ctx.filter = cssF;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imgEl, 0, 0, W, H);
  ctx.filter = "none";

  // Pixel-level processing — only for ≤4K where it won't hang
  if (!isHuge) {
    let data = ctx.getImageData(0, 0, W, H).data;
    if (filters.denoise > 0) data = gaussianBlur(data, W, H, filters.denoise * 0.18);
    if (filters.smooth  > 0) {
      const smoothed = gaussianBlur(data, W, H, filters.smooth * 0.25);
      const op = filters.smooth / 10 * 0.7;
      for (let i = 0; i < data.length; i += 4) {
        data[i]   = data[i]   * (1-op) + smoothed[i]   * op;
        data[i+1] = data[i+1] * (1-op) + smoothed[i+1] * op;
        data[i+2] = data[i+2] * (1-op) + smoothed[i+2] * op;
      }
    }
    if (filters.clarity   > 0) data = unsharpMask(data, W, H, 8   * Math.min(scale,2), filters.clarity   * 0.1);
    if (filters.sharpness > 0) data = unsharpMask(data, W, H, 1.2 * Math.min(scale,2), filters.sharpness * 0.12);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), W, H), 0, 0);
  }

  // Compositing overlays
  if (filters.temperature !== 0) {
    const a = Math.abs(filters.temperature) / 300;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = filters.temperature > 0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }
  if (filters.fade > 0) {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255,255,255,${filters.fade / 180})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }
  if (filters.vignette > 0) {
    const g = ctx.createRadialGradient(W/2,H/2,W*0.3, W/2,H/2,W*0.85);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${filters.vignette/100})`);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }
  return { canvas, W, H };
}

function buildCSSFilter(f) {
  const ev = 1 + f.exposure / 100;
  const bv = (f.brightness / 100) * ev;
  let s = `brightness(${bv}) contrast(${f.contrast / 100}) saturate(${f.saturation / 100})`;
  if (f.denoise > 0) s += ` blur(${f.denoise * 0.07}px)`;
  return s;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PhotoOptimizer() {
  const [image,        setImage]        = useState(null);
  const [filters,      setFilters]      = useState(DEFAULT_STATE);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [showBefore,   setShowBefore]   = useState(false);
  const [dragging,     setDragging]     = useState(false);
  const [activeGroup,  setActiveGroup]  = useState("enhance");
  const [activeFilter, setActiveFilter] = useState(null);
  const [showExport,   setShowExport]   = useState(false);
  const [exportTab,    setExportTab]    = useState("standard"); // "standard" | "facebook"
  const [exportFormat, setExportFormat] = useState("png");
  const [exportScale,  setExportScale]  = useState(2);
  const [exportQuality,setExportQuality]= useState(97);
  const [exporting,    setExporting]    = useState(false);
  const [exportDone,   setExportDone]   = useState(false);
  const [exportInfo,   setExportInfo]   = useState(null);
  const [fbMode,       setFbMode]       = useState("portrait");
  const [fbExporting,  setFbExporting]  = useState(false);
  const [fbDone,       setFbDone]       = useState(false);

  // Gemini key
  const [apiKey,       setApiKey]       = useState("");
  const [keyError,     setKeyError]     = useState("");

  const fileInputRef = useRef(null);
  const imgRef       = useRef(null);

  const loadImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => { setImage(e.target.result); setFilters(DEFAULT_STATE); setAiSuggestion(null); };
    reader.readAsDataURL(file);
  };

  // ── Gemini vision call ──────────────────────────────────────────────────
  const analyzeWithAI = async () => {
    if (!apiKey.trim()) {
      setKeyError("Paste your Gemini API key above first.");
      return;
    }
    setLoading(true); setAiSuggestion(null); setKeyError("");
    try {
      // Resize image to max 1024px before sending — Gemini doesn't need full res
      const img = imgRef.current;
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.naturalWidth  * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

      const body = {
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: base64 } },
            { text: `Analyze this photo for quality issues (faces, noise, sharpness, lighting, color). Return ONLY a valid JSON object with no markdown, no backticks, no explanation — just raw JSON:
{"analysis":"2-3 sentences describing quality issues","adjustments":{"brightness":100,"contrast":100,"saturation":100,"exposure":0,"temperature":0,"sharpness":0,"clarity":0,"denoise":0,"smooth":0,"vignette":0,"fade":0},"tip":"one specific actionable tip"}` }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
      };

      // Retry up to 3 times with backoff on rate limit
      let res, data, attempts = 0;
      while (attempts < 3) {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        );
        data = await res.json();
        if (res.status === 429) {
          attempts++;
          if (attempts < 3) {
            setKeyError(`Rate limit — retrying in ${attempts * 3}s...`);
            await new Promise(r => setTimeout(r, attempts * 3000));
            setKeyError("");
          } else {
            setKeyError("Rate limit — wait 30 seconds and try again.");
            setLoading(false); return;
          }
        } else {
          break;
        }
      }

      // Handle API errors with clear messages
      if (!res.ok) {
        const msg = data?.error?.message || `API error ${res.status}`;
        if (res.status === 400) setKeyError("Bad request — try a different image format.");
        else if (res.status === 403 || res.status === 401) setKeyError("Invalid API key. Check it at aistudio.google.com");
        else if (res.status === 429) setKeyError("Rate limit hit — wait a moment and try again.");
        else setKeyError(msg);
        setLoading(false); return;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("Empty response from Gemini");

      // Strip any markdown fences Gemini might add despite instructions
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(clean);
      setAiSuggestion(parsed);
    } catch (e) {
      setKeyError(`Error: ${e.message || "Could not parse response. Try again."}`);
    }
    setLoading(false);
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!imgRef.current) return;
    setExporting(true); setExportDone(false); setExportInfo(null);
    try {
      const { canvas, W, H } = await renderHighQuality(imgRef.current, filters, exportScale);
      const fmt     = EXPORT_FORMATS.find(f => f.id === exportFormat);
      const quality = exportFormat === "png" ? undefined : exportQuality / 100;
      const dataUrl = canvas.toDataURL(fmt.mime, quality);

      // Estimate file size
      const bytes = Math.round((dataUrl.length * 3) / 4 / 1024);
      setExportInfo(`${W} × ${H}px · ~${bytes > 1024 ? (bytes/1024).toFixed(1)+"MB" : bytes+"KB"}`);

      const a = document.createElement("a");
      a.download = `photolab_${exportScale}x.${fmt.ext}`;
      a.href = dataUrl; a.click();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3500);
    } catch(e) { console.error(e); }
    setExporting(false);
  };

  const handleFacebookExport = async () => {
    if (!imgRef.current) return;
    setFbExporting(true); setFbDone(false);
    try {
      const mode = FB_MODES.find(m => m.id === fbMode);
      const { canvas, W, H } = await renderFacebook(imgRef.current, filters, mode);
      const dataUrl = canvas.toDataURL("image/jpeg", mode.quality / 100);
      const bytes   = Math.round((dataUrl.length * 3) / 4 / 1024);
      setExportInfo(`${W} × ${H}px · ~${bytes > 1024 ? (bytes/1024).toFixed(1)+"MB" : bytes+"KB"}`);
      const a = document.createElement("a");
      a.download = `facebook_${mode.id}.jpg`;
      a.href = dataUrl; a.click();
      setFbDone(true);
      setTimeout(() => setFbDone(false), 3500);
    } catch(e) { console.error(e); }
    setFbExporting(false);
  };

  const isEdited   = Object.entries(filters).some(([k, v]) => v !== DEFAULT_STATE[k]);
  const cssFilter  = buildCSSFilter(filters);
  const tempAlpha  = Math.abs(filters.temperature) / 300;
  const tempColor  = filters.temperature > 0 ? `rgba(255,140,0,${tempAlpha})` : `rgba(100,149,237,${tempAlpha})`;
  const natW       = imgRef.current?.naturalWidth  || 0;
  const natH       = imgRef.current?.naturalHeight || 0;
  const previewScale = getScaleForTarget(natW || 1, natH || 1, exportScale);
  const previewW   = Math.round(natW * previewScale);
  const previewH   = Math.round(natH * previewScale);

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#0a0a0a", minHeight: "100vh", color: "#e8e8e0", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
        .sl{-webkit-appearance:none;appearance:none;width:100%;height:2px;border-radius:1px;outline:none;cursor:pointer;background:linear-gradient(to right,#c8b89a var(--v,50%),#1e1e1e var(--v,50%))}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#c8b89a;border:2px solid #0a0a0a;box-shadow:0 0 0 1px #c8b89a44;cursor:grab;transition:transform .15s}
        .sl::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.4)}
        .btn{border:none;cursor:pointer;transition:all .2s;font-family:inherit;letter-spacing:.06em}
        .btn:hover{opacity:.85}.btn:active{transform:scale(.97)}
        .drop{border:1px dashed #222;cursor:pointer;transition:all .3s}
        .drop:hover,.drop.on{border-color:#c8b89a44;background:rgba(200,184,154,.02)}
        .preset-btn{transition:all .2s;cursor:pointer;border:1px solid #1e1e1e;background:transparent}
        .preset-btn:hover{border-color:#c8b89a44;background:rgba(200,184,154,.05)}
        .fmt-btn{transition:all .2s;cursor:pointer;padding:10px 12px;border:1px solid #1e1e1e;background:transparent;text-align:left;border-radius:3px;width:100%}
        .fmt-btn:hover{border-color:#c8b89a44}
        .fmt-btn.act{border-color:#c8b89a;background:rgba(200,184,154,.07)}
        .sc-btn{transition:all .2s;cursor:pointer;padding:8px 4px;border:1px solid #1e1e1e;background:transparent;text-align:center;border-radius:3px;flex:1}
        .sc-btn:hover{border-color:#c8b89a44}
        .sc-btn.act{border-color:#c8b89a;background:rgba(200,184,154,.07)}
        .sc-btn.premium{border-color:#c8b89a22;position:relative}
        .key-input{background:#0d0d0d;border:1px solid #2a2a2a;color:#e8e8e0;padding:10px 12px;font-family:inherit;font-size:11px;width:100%;border-radius:3px;outline:none;letter-spacing:.04em}
        .key-input:focus{border-color:#c8b89a44}
        @keyframes pulse{0%,100%{opacity:.2}50%{opacity:.8}}
        @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #141414", padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:"20px", fontWeight:300, letterSpacing:"-.02em" }}>
            PHOTO<span style={{ color:"#c8b89a", fontStyle:"italic" }}>lab</span>
          </div>
          <div style={{ fontSize:"9px", color:"#383838", letterSpacing:".22em", marginTop:"2px" }}>OPTIMIZE · RESTORE · ENHANCE</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {image && <>
            <button className="btn" onClick={() => setFilters(DEFAULT_STATE)} style={{ background:"transparent", color:"#555", padding:"7px 14px", border:"1px solid #1e1e1e", fontSize:"10px" }}>RESET</button>
            <button className="btn" onClick={() => setShowExport(true)} style={{ background:"#c8b89a", color:"#0a0a0a", padding:"7px 18px", fontSize:"10px", fontWeight:500 }}>↓ EXPORT</button>
          </>}
        </div>
      </div>

      <div style={{ display:"flex", height:"calc(100vh - 61px)" }}>
        {/* Left panel */}
        <div style={{ width:"268px", borderRight:"1px solid #141414", overflowY:"auto", padding:"20px 18px", flexShrink:0, display:"flex", flexDirection:"column", gap:"22px" }}>

          {/* Gemini Key — always visible in panel */}
          <div>
            <div style={{ fontSize:"9px", letterSpacing:".22em", color:"#383838", marginBottom:"10px" }}>GEMINI API KEY</div>
            <div style={{ display:"flex", gap:"6px" }}>
              <input className="key-input" type="password"
                placeholder="AIza... (free at aistudio.google.com)"
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setKeyError(""); }}
                style={{ flex:1, minWidth:0 }}
              />
              {apiKey && <span style={{ color:"#4caf50", fontSize:"16px", display:"flex", alignItems:"center", flexShrink:0 }}>✓</span>}
            </div>
            {keyError && <div style={{ marginTop:"5px", fontSize:"9px", color:"#e07070" }}>⚠ {keyError}</div>}
            <div style={{ marginTop:"5px", fontSize:"8px", color:"#2a2a2a", letterSpacing:".06em", lineHeight:1.5 }}>
              Free · 1,500/day · No credit card ·{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                style={{ color:"#c8b89a44", textDecoration:"none" }}>get key →</a>
            </div>
          </div>

          {/* Presets */}
          <div>
            <div style={{ fontSize:"9px", letterSpacing:".22em", color:"#383838", marginBottom:"10px" }}>PRESETS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
              {PRESETS.map(p => (
                <button key={p.name} className="preset-btn" onClick={() => setFilters({ ...DEFAULT_STATE, ...p.values })}
                  style={{ padding:"9px 8px", textAlign:"left", borderRadius:"2px" }}>
                  <div style={{ fontSize:"14px", color:"#c8b89a", marginBottom:"3px" }}>{p.icon}</div>
                  <div style={{ fontSize:"9px", color:"#777", letterSpacing:".05em", lineHeight:1.3 }}>{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          {image && (
            <div>
              <div style={{ fontSize:"9px", letterSpacing:".22em", color:"#383838", marginBottom:"10px" }}>AI ANALYSIS</div>
              <button className="btn" onClick={analyzeWithAI} disabled={loading}
                style={{ width:"100%", padding:"11px", background:loading?"#111":"rgba(200,184,154,.06)", border:"1px solid #c8b89a22", color:loading?"#444":"#c8b89a", fontSize:"10px", borderRadius:"2px" }}>
                {loading
                  ? <span style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:"8px" }}>
                      <span style={{ display:"inline-block",width:"10px",height:"10px",border:"1px solid #c8b89a44",borderTopColor:"#c8b89a",borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
                      ANALYZING...
                    </span>
                  : !apiKey ? "✦ SET KEY TO ANALYZE" : "✦ AUTO-OPTIMIZE WITH GEMINI"}
              </button>
              {!apiKey && (
                <div style={{ marginTop:"8px", fontSize:"9px", color:"#444", textAlign:"center", letterSpacing:".06em" }}>
                  Click <span style={{ color:"#c8b89a" }}>GEMINI KEY</span> above to add your free key
                </div>
              )}
              {aiSuggestion && (
                <div style={{ marginTop:"10px", padding:"12px", border:"1px solid #161616", background:"#0c0c0c", borderRadius:"2px", animation:"fadein .3s ease" }}>
                  <p style={{ fontSize:"10px", color:"#777", lineHeight:1.65, marginBottom:"10px" }}>{aiSuggestion.analysis}</p>
                  {aiSuggestion.tip && <p style={{ fontSize:"9px", color:"#c8b89a88", fontStyle:"italic", marginBottom:"10px", lineHeight:1.5 }}>✦ {aiSuggestion.tip}</p>}
                  {aiSuggestion.adjustments && (
                    <button className="btn" onClick={() => setFilters({ ...DEFAULT_STATE, ...aiSuggestion.adjustments })}
                      style={{ width:"100%", padding:"8px", background:"#c8b89a", color:"#0a0a0a", fontSize:"9px", letterSpacing:".12em", borderRadius:"2px" }}>
                      APPLY SUGGESTIONS
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Filter tabs */}
          <div>
            <div style={{ display:"flex", gap:"2px", marginBottom:"16px", background:"#0d0d0d", padding:"3px", borderRadius:"3px", border:"1px solid #141414" }}>
              {GROUPS.map(g => (
                <button key={g.key} className="btn" onClick={() => setActiveGroup(g.key)}
                  style={{ flex:1, padding:"6px 4px", fontSize:"9px", letterSpacing:".12em", background:activeGroup===g.key?"#c8b89a":"transparent", color:activeGroup===g.key?"#0a0a0a":"#555", borderRadius:"2px" }}>
                  {g.label}
                </button>
              ))}
            </div>
            {FILTERS.filter(f => f.group === activeGroup).map(f => {
              const val = filters[f.key];
              const pct = ((val - f.min) / (f.max - f.min)) * 100;
              const changed = val !== f.default;
              return (
                <div key={f.key} style={{ marginBottom:"18px" }}
                  onMouseEnter={() => setActiveFilter(f.key)} onMouseLeave={() => setActiveFilter(null)}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"7px" }}>
                    <span style={{ fontSize:"10px", letterSpacing:".04em", color:changed?"#c8b89a":"#555", transition:"color .2s" }}>{f.label}</span>
                    <span style={{ fontSize:"10px", color:activeFilter===f.key?"#c8b89a":"#333", fontVariantNumeric:"tabular-nums" }}>
                      {val > 0 && f.default === 0 ? "+" : ""}{Number.isInteger(val) ? val : val.toFixed(1)}{f.unit}
                    </span>
                  </div>
                  <input type="range" className="sl" min={f.min} max={f.max} step={f.max <= 20 ? 0.5 : 1}
                    value={val} style={{ "--v":`${pct}%` }}
                    onChange={e => setFilters(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))} />
                </div>
              );
            })}
          </div>

          {isEdited && (
            <div style={{ fontSize:"9px", color:"#383838", letterSpacing:".1em", textAlign:"center", paddingTop:"4px", borderTop:"1px solid #141414" }}>
              {Object.entries(filters).filter(([k,v]) => v !== DEFAULT_STATE[k]).length} ADJUSTMENTS ACTIVE
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"28px", background:"#060606", position:"relative", overflow:"hidden" }}>
          {!image ? (
            <div className={`drop ${dragging?"on":""}`}
              style={{ width:"100%", maxWidth:"480px", aspectRatio:"4/3", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:"4px" }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); loadImage(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => loadImage(e.target.files[0])} />
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:"52px", color:"#181818", lineHeight:1, marginBottom:"14px" }}>⊕</div>
              <div style={{ fontSize:"12px", color:"#383838", letterSpacing:".12em", marginBottom:"6px" }}>DROP PHOTO HERE</div>
              <div style={{ fontSize:"9px", color:"#222", letterSpacing:".18em" }}>OR CLICK TO BROWSE</div>
              <div style={{ marginTop:"22px", display:"flex", gap:"6px" }}>
                {["JPG","PNG","WEBP","HEIC"].map(x => (
                  <span key={x} style={{ padding:"2px 7px", border:"1px solid #1a1a1a", fontSize:"9px", letterSpacing:".12em", color:"#2a2a2a" }}>{x}</span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ position:"absolute", top:"18px", right:"18px", display:"flex", background:"#0d0d0d", border:"1px solid #1a1a1a", zIndex:10, borderRadius:"2px" }}>
                {["AFTER","BEFORE"].map(label => (
                  <button key={label} className="btn" onClick={() => setShowBefore(label==="BEFORE")}
                    style={{ padding:"6px 13px", fontSize:"9px", letterSpacing:".12em", background:(label==="BEFORE")===showBefore?"#c8b89a":"transparent", color:(label==="BEFORE")===showBefore?"#0a0a0a":"#444", borderRadius:"1px" }}>
                    {label}
                  </button>
                ))}
              </div>
              {isEdited && !showBefore && (
                <div style={{ position:"absolute", top:"18px", left:"18px", fontSize:"9px", color:"#c8b89a88", letterSpacing:".12em", zIndex:10 }}>● EDITED</div>
              )}
              <div style={{ position:"relative", maxWidth:"100%", maxHeight:"calc(100vh - 160px)", lineHeight:0 }}>
                <img ref={imgRef} src={image} alt="photo"
                  style={{ maxWidth:"100%", maxHeight:"calc(100vh - 160px)", objectFit:"contain", display:"block", boxShadow:"0 24px 80px rgba(0,0,0,.9)", filter:showBefore?"none":cssFilter, transition:"filter .08s ease", borderRadius:"2px" }} />
                {!showBefore && filters.temperature !== 0 && (
                  <div style={{ position:"absolute", inset:0, background:tempColor, mixBlendMode:"overlay", pointerEvents:"none" }} />
                )}
                {!showBefore && filters.fade > 0 && (
                  <div style={{ position:"absolute", inset:0, background:`rgba(255,255,255,${filters.fade/180})`, mixBlendMode:"screen", pointerEvents:"none" }} />
                )}
                {!showBefore && filters.vignette > 0 && (
                  <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`, pointerEvents:"none" }} />
                )}
              </div>
              <div style={{ position:"absolute", bottom:"18px" }}>
                <button className="btn" onClick={() => { setImage(null); setAiSuggestion(null); }}
                  style={{ background:"transparent", color:"#444", padding:"7px 14px", border:"1px solid #181818", fontSize:"9px", letterSpacing:".12em", borderRadius:"2px" }}>
                  NEW PHOTO
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Export Modal ── */}
      {showExport && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", backdropFilter:"blur(10px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e => { if (e.target === e.currentTarget) setShowExport(false); }}>
          <div style={{ background:"#0e0e0e", border:"1px solid #1e1e1e", width:"480px", maxHeight:"90vh", overflowY:"auto", padding:"28px", borderRadius:"4px", animation:"slideup .25s ease" }}>

            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"22px" }}>
              <div>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:"18px", fontWeight:300, color:"#e8e8e0", marginBottom:"4px" }}>Export Photo</div>
                <div style={{ fontSize:"9px", color:"#444", letterSpacing:".15em" }}>PIXEL-PERFECT · UP TO 12K · FACEBOOK OPTIMIZED</div>
              </div>
              <button className="btn" onClick={() => setShowExport(false)} style={{ background:"transparent", color:"#555", fontSize:"16px", padding:"2px 6px" }}>✕</button>
            </div>

            {/* Tab switcher */}
            <div style={{ display:"flex", gap:"2px", marginBottom:"22px", background:"#0a0a0a", padding:"3px", borderRadius:"3px", border:"1px solid #141414" }}>
              <button className="btn" onClick={() => setExportTab("standard")}
                style={{ flex:1, padding:"9px 6px", fontSize:"10px", letterSpacing:".1em", background:exportTab==="standard"?"#c8b89a":"transparent", color:exportTab==="standard"?"#0a0a0a":"#666", borderRadius:"2px" }}>
                STANDARD
              </button>
              <button className="btn" onClick={() => setExportTab("facebook")}
                style={{ flex:1, padding:"9px 6px", fontSize:"10px", letterSpacing:".1em", background:exportTab==="facebook"?"#1877f2":"transparent", color:exportTab==="facebook"?"#fff":"#5890ff", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                FACEBOOK
              </button>
            </div>

            {/* ── STANDARD TAB ── */}
            {exportTab === "standard" && (<>
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontSize:"9px", letterSpacing:".18em", color:"#444", marginBottom:"10px" }}>FORMAT</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                  {EXPORT_FORMATS.map(f => (
                    <button key={f.id} className={`fmt-btn ${exportFormat===f.id?"act":""}`} onClick={() => setExportFormat(f.id)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <span style={{ fontSize:"11px", color:exportFormat===f.id?"#c8b89a":"#888", letterSpacing:".06em" }}>{f.label}</span>
                          <span style={{ fontSize:"9px", color:"#444", marginLeft:"10px" }}>{f.desc}</span>
                        </div>
                        {exportFormat===f.id && <span style={{ color:"#c8b89a" }}>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {exportFormat !== "png" && (
                <div style={{ marginBottom:"20px" }}>
                  <div style={{ fontSize:"9px", letterSpacing:".18em", color:"#444", marginBottom:"10px", display:"flex", justifyContent:"space-between" }}>
                    <span>QUALITY</span><span style={{ color:"#c8b89a" }}>{exportQuality}%</span>
                  </div>
                  <input type="range" className="sl" min={60} max={100} step={1}
                    value={exportQuality} style={{ "--v":`${((exportQuality-60)/40)*100}%` }}
                    onChange={e => setExportQuality(parseInt(e.target.value))} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:"6px" }}>
                    <span style={{ fontSize:"8px", color:"#333" }}>SMALLER FILE</span>
                    <span style={{ fontSize:"8px", color:"#333" }}>BEST QUALITY</span>
                  </div>
                </div>
              )}

              <div style={{ marginBottom:"22px" }}>
                <div style={{ fontSize:"9px", letterSpacing:".18em", color:"#444", marginBottom:"10px" }}>RESOLUTION</div>
                <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                  {SCALE_OPTIONS.map(s => {
                    const isPremium = s.value === "8k" || s.value === "12k";
                    return (
                      <button key={s.value} className={`sc-btn ${exportScale===s.value?"act":""}`}
                        onClick={() => setExportScale(s.value)} style={{ minWidth:"62px" }}>
                        <div style={{ fontSize:"13px", color:exportScale===s.value?"#c8b89a":isPremium?"#c8b89a55":"#555", marginBottom:"2px", fontWeight:500 }}>{s.label}</div>
                        <div style={{ fontSize:"7px", color:"#3a3a3a" }}>{s.desc}</div>
                        {isPremium && <div style={{ fontSize:"7px", color:"#c8b89a44", marginTop:"2px" }}>PRO</div>}
                      </button>
                    );
                  })}
                </div>
                {natW > 0 && (
                  <div style={{ marginTop:"10px", padding:"10px", background:"#0a0a0a", border:"1px solid #161616", borderRadius:"3px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:"9px", color:"#444", letterSpacing:".1em" }}>OUTPUT SIZE</span>
                      <span style={{ fontSize:"10px", color:"#c8b89a" }}>{previewW.toLocaleString()} × {previewH.toLocaleString()}px</span>
                    </div>
                    {(exportScale === "8k" || exportScale === "12k") && (
                      <div style={{ marginTop:"7px", fontSize:"9px", color:"#555", lineHeight:1.5 }}>
                        ⚡ Fast mode — uses CSS filters at this size to prevent browser freeze. All color, exposure and style adjustments still fully applied.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom:"22px", padding:"12px", background:"#0a0a0a", border:"1px solid #161616", borderRadius:"3px" }}>
                <div style={{ fontSize:"9px", color:"#383838", letterSpacing:".12em", marginBottom:"8px" }}>PROCESSING PIPELINE</div>
                {[
                  { label:"Brightness / Contrast / Saturation / Exposure", active:true },
                  { label:"Pixel-level Noise Reduction", active:filters.denoise > 0 },
                  { label:"Pixel-level Skin Smoothing", active:filters.smooth > 0 },
                  { label:"Clarity — Midtone Contrast", active:filters.clarity > 0 },
                  { label:"Unsharp Mask Sharpening", active:filters.sharpness > 0 },
                  { label:"Warmth / Temperature Overlay", active:filters.temperature !== 0 },
                  { label:"Vignette", active:filters.vignette > 0 },
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", gap:"8px", marginBottom:"5px", alignItems:"center" }}>
                    <span style={{ fontSize:"9px", color:item.active?"#c8b89a":"#222" }}>{item.active?"●":"○"}</span>
                    <span style={{ fontSize:"9px", color:item.active?"#666":"#222" }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <button className="btn" onClick={handleExport} disabled={exporting}
                style={{ width:"100%", padding:"14px", background:exportDone?"#1a2e1a":"#c8b89a", color:exportDone?"#6abf6a":"#0a0a0a", fontSize:"11px", letterSpacing:".1em", fontWeight:500, borderRadius:"3px" }}>
                {exporting
                  ? <span style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:"10px" }}>
                      <span style={{ display:"inline-block",width:"12px",height:"12px",border:"2px solid #0a0a0a44",borderTopColor:"#0a0a0a",borderRadius:"50%",animation:"spin .7s linear infinite" }}/>
                      PROCESSING...
                    </span>
                  : exportDone ? `✓ SAVED · ${exportInfo||""}` : `↓ EXPORT ${EXPORT_FORMATS.find(f=>f.id===exportFormat)?.label} · ${exportScale.toString().toUpperCase()}`}
              </button>
            </>)}

            {/* ── FACEBOOK TAB ── */}
            {exportTab === "facebook" && (<>
              <div style={{ marginBottom:"20px", padding:"14px", background:"rgba(24,119,242,.05)", border:"1px solid rgba(24,119,242,.15)", borderRadius:"3px" }}>
                <div style={{ fontSize:"9px", color:"#5890ff", letterSpacing:".12em", marginBottom:"8px" }}>WHY THIS EXISTS</div>
                <p style={{ fontSize:"10px", color:"#666", lineHeight:1.7 }}>
                  Facebook compresses photos that are the wrong size or too large. These presets use <span style={{ color:"#c8b89a" }}>exact accepted dimensions</span>, <span style={{ color:"#c8b89a" }}>JPEG 75%</span> (the sweet spot that avoids their crusher), and <span style={{ color:"#c8b89a" }}>sRGB color</span> — so your photo stays crisp after upload.
                </p>
              </div>

              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontSize:"9px", letterSpacing:".18em", color:"#444", marginBottom:"12px" }}>SELECT POST TYPE</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {FB_MODES.map(mode => (
                    <button key={mode.id} onClick={() => setFbMode(mode.id)}
                      style={{ padding:"14px", border:`1px solid ${fbMode===mode.id?"#1877f2":"#1e1e1e"}`, background:fbMode===mode.id?"rgba(24,119,242,.07)":"transparent", borderRadius:"3px", textAlign:"left", cursor:"pointer", transition:"all .2s", width:"100%" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:"11px", color:fbMode===mode.id?"#6ba3ff":"#777", letterSpacing:".05em", marginBottom:"3px" }}>{mode.label}</div>
                          <div style={{ fontSize:"10px", color:fbMode===mode.id?"#c8b89a":"#555", marginBottom:"2px" }}>{mode.desc}</div>
                          <div style={{ fontSize:"9px", color:"#383838" }}>{mode.tip}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"5px" }}>
                          {fbMode===mode.id && <span style={{ color:"#1877f2", fontSize:"15px" }}>✓</span>}
                          <span style={{ fontSize:"8px", color:"#444", background:"#141414", padding:"2px 7px", borderRadius:"2px" }}>JPEG 75%</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:"20px", padding:"12px", background:"#0a0a0a", border:"1px solid #161616", borderRadius:"3px" }}>
                <div style={{ fontSize:"9px", color:"#383838", letterSpacing:".12em", marginBottom:"10px" }}>OPTIMIZATION CHECKLIST</div>
                {[
                  { label:"JPEG — Facebook native format", done:true },
                  { label:"75% quality — avoids compression trigger", done:true },
                  { label:"sRGB color space (no washed-out colors)", done:true },
                  { label:"Exact pixel dimensions — Facebook won't resize", done:true },
                  { label:"Smart center-crop to target ratio", done:true },
                  { label:"Your photo enhancements applied first", done:isEdited },
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", gap:"8px", marginBottom:"6px", alignItems:"center" }}>
                    <span style={{ fontSize:"10px", color:item.done?"#4caf50":"#2a2a2a" }}>{item.done?"✓":"○"}</span>
                    <span style={{ fontSize:"9px", color:item.done?"#666":"#2a2a2a" }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:"22px", padding:"12px", background:"#0a0a0a", border:"1px solid #161616", borderRadius:"3px" }}>
                <div style={{ fontSize:"9px", color:"#383838", letterSpacing:".12em", marginBottom:"8px" }}>UPLOAD TIPS</div>
                {["Upload from desktop browser for highest quality", "On mobile: Settings → Media → High Quality", "If pixelated after upload, wait 1–2 min — FB is still processing"].map((tip, i) => (
                  <div key={i} style={{ display:"flex", gap:"8px", marginBottom:"6px" }}>
                    <span style={{ fontSize:"9px", color:"#1877f2", flexShrink:0 }}>→</span>
                    <span style={{ fontSize:"9px", color:"#555", lineHeight:1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>

              <button className="btn" onClick={handleFacebookExport} disabled={fbExporting}
                style={{ width:"100%", padding:"14px", background:fbDone?"#1a2e1a":fbExporting?"#0e1e35":"#1877f2", color:fbDone?"#6abf6a":"#fff", fontSize:"11px", letterSpacing:".1em", fontWeight:500, borderRadius:"3px", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
                {fbExporting
                  ? <><span style={{ display:"inline-block",width:"12px",height:"12px",border:"2px solid rgba(255,255,255,.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite" }}/> OPTIMIZING FOR FACEBOOK...</>
                  : fbDone ? `✓ SAVED · ${exportInfo||""}`
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> EXPORT FOR FACEBOOK · {FB_MODES.find(m=>m.id===fbMode)?.desc}</>}
              </button>
              <p style={{ marginTop:"8px", fontSize:"8px", color:"#252525", textAlign:"center", letterSpacing:".06em" }}>
                Auto center-crop · JPEG 75% · sRGB · Facebook-ready
              </p>
            </>)}

          </div>
        </div>
      )}
    </div>
  );
}
