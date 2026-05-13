import { useState, useRef, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const COLOR_FILTERS = [
  { key:"brightness",  label:"Brightness",  min:0,    max:200, default:100, unit:"%",  group:"basic" },
  { key:"contrast",    label:"Contrast",    min:0,    max:200, default:100, unit:"%",  group:"basic" },
  { key:"saturation",  label:"Saturation",  min:0,    max:200, default:100, unit:"%",  group:"basic" },
  { key:"exposure",    label:"Exposure",    min:-100, max:100, default:0,   unit:"",   group:"basic" },
  { key:"temperature", label:"Warmth",      min:-100, max:100, default:0,   unit:"",   group:"basic" },
  { key:"tint",        label:"Tint",        min:-100, max:100, default:0,   unit:"",   group:"basic" },
  { key:"sharpness",   label:"Sharpness",   min:0,    max:20,  default:0,   unit:"",   group:"enhance" },
  { key:"clarity",     label:"Clarity",     min:0,    max:20,  default:0,   unit:"",   group:"enhance" },
  { key:"denoise",     label:"Smooth",      min:0,    max:10,  default:0,   unit:"",   group:"enhance" },
  { key:"highlights",  label:"Highlights",  min:-100, max:100, default:0,   unit:"",   group:"enhance" },
  { key:"shadows",     label:"Shadows",     min:-100, max:100, default:0,   unit:"",   group:"enhance" },
  { key:"hue",         label:"Hue",         min:-180, max:180, default:0,   unit:"°",  group:"hsl" },
  { key:"vibrance",    label:"Vibrance",    min:0,    max:200, default:100, unit:"%",  group:"hsl" },
  { key:"vignette",    label:"Vignette",    min:0,    max:100, default:0,   unit:"%",  group:"style" },
  { key:"fade",        label:"Fade",        min:0,    max:100, default:0,   unit:"%",  group:"style" },
  { key:"grain",       label:"Grain",       min:0,    max:100, default:0,   unit:"",   group:"style" },
];
const DEFAULT_FILTERS = Object.fromEntries(COLOR_FILTERS.map(f=>[f.key,f.default]));

const FILTER_GROUPS = [
  { key:"basic",   label:"Basic" },
  { key:"enhance", label:"Enhance" },
  { key:"hsl",     label:"Color" },
  { key:"style",   label:"Style" },
];

const PRESETS = [
  { name:"Portrait",   icon:"👤", values:{ denoise:4,clarity:5,sharpness:3,contrast:106,saturation:104,temperature:8,vignette:12 }},
  { name:"Vivid",      icon:"🌈", values:{ contrast:115,saturation:122,clarity:6,sharpness:4,vibrance:130 }},
  { name:"Soft",       icon:"☁️", values:{ denoise:4,brightness:104,contrast:95,saturation:105,fade:10,temperature:6 }},
  { name:"B&W",        icon:"⚫", values:{ saturation:0,vibrance:100,contrast:118,clarity:7,sharpness:3 }},
  { name:"Warm",       icon:"🌅", values:{ temperature:40,saturation:110,brightness:103,contrast:104,fade:5 }},
  { name:"Cool",       icon:"❄️", values:{ temperature:-35,saturation:108,brightness:102,contrast:104 }},
  { name:"Moody",      icon:"🌑", values:{ contrast:120,saturation:90,shadows:-20,highlights:-15,vignette:30,fade:5 }},
  { name:"Restore",    icon:"🖼", values:{ denoise:5,clarity:5,sharpness:4,contrast:108,saturation:108,exposure:6 }},
  { name:"Cinema",     icon:"🎬", values:{ contrast:118,saturation:88,fade:12,vignette:25,temperature:-10,grain:15 }},
  { name:"Golden",     icon:"✨", values:{ temperature:30,highlights:20,saturation:115,brightness:104,vibrance:120 }},
];

const FB_MODES = [
  { id:"portrait",  label:"Portrait",      desc:"1080 × 1350",  w:1080, h:1350 },
  { id:"square",    label:"Square",        desc:"1080 × 1080",  w:1080, h:1080 },
  { id:"landscape", label:"Landscape",     desc:"2048px wide",  w:2048, h:null  },
  { id:"cover",     label:"Cover Photo",   desc:"851 × 315",    w:851,  h:315   },
  { id:"story",     label:"Story/Reel",    desc:"1080 × 1920",  w:1080, h:1920  },
];

const FONTS = ["System","Serif","Mono","Impact","Georgia","Arial Black"];
const FONT_MAP = { System:"-apple-system,sans-serif", Serif:"Georgia,serif", Mono:"'Courier New',monospace", Impact:"Impact,sans-serif", Georgia:"Georgia,serif", "Arial Black":"'Arial Black',sans-serif" };
const BG_COLORS = ["#ffffff","#f5f5f5","#000000","#1a1a2e","#2d4a3e","#4a1a2e","#1a3a4a","#fff8e7"];

// ── Batch resize presets ──────────────────────────────────────────────────────
const BATCH_RESIZE_PRESETS = [
  { id:"ig_sq",    label:"Instagram Square",    w:1080, h:1080 },
  { id:"ig_port",  label:"Instagram Portrait",  w:1080, h:1350 },
  { id:"ig_land",  label:"Instagram Landscape", w:1080, h:566  },
  { id:"fb_post",  label:"Facebook Post",       w:1200, h:630  },
  { id:"twitter",  label:"Twitter / X Post",    w:1200, h:675  },
  { id:"4k",       label:"4K UHD",              w:3840, h:2160 },
  { id:"1080p",    label:"Full HD 1080p",        w:1920, h:1080 },
  { id:"720p",     label:"HD 720p",              w:1280, h:720  },
  { id:"web_lg",   label:"Web Large",            w:2048, h:null },
  { id:"web_md",   label:"Web Medium",           w:1200, h:null },
  { id:"web_sm",   label:"Web Small",            w:800,  h:null },
];

// ── Batch pixel-level helpers ─────────────────────────────────────────────────

// Auto-levels: stretches each RGB channel histogram to 0–255
function applyAutoLevels(ctx, W, H) {
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  let rMin=255,rMax=0,gMin=255,gMax=0,bMin=255,bMax=0;
  for (let i=0;i<d.length;i+=4) {
    if (d[i+3]<10) continue;
    rMin=Math.min(rMin,d[i]);   rMax=Math.max(rMax,d[i]);
    gMin=Math.min(gMin,d[i+1]); gMax=Math.max(gMax,d[i+1]);
    bMin=Math.min(bMin,d[i+2]); bMax=Math.max(bMax,d[i+2]);
  }
  for (let i=0;i<d.length;i+=4) {
    d[i]   = rMax>rMin ? Math.min(255,Math.round(((d[i]  -rMin)/(rMax-rMin))*255)) : d[i];
    d[i+1] = gMax>gMin ? Math.min(255,Math.round(((d[i+1]-gMin)/(gMax-gMin))*255)) : d[i+1];
    d[i+2] = bMax>bMin ? Math.min(255,Math.round(((d[i+2]-bMin)/(bMax-bMin))*255)) : d[i+2];
  }
  ctx.putImageData(imgData, 0, 0);
}

// Auto-contrast: same as auto-levels but uses luminance to scale uniformly
function applyAutoContrast(ctx, W, H) {
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  let lMin=255, lMax=0;
  for (let i=0;i<d.length;i+=4) {
    if (d[i+3]<10) continue;
    const l = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    lMin=Math.min(lMin,l); lMax=Math.max(lMax,l);
  }
  if (lMax===lMin) return;
  const scale = 255/(lMax-lMin);
  for (let i=0;i<d.length;i+=4) {
    d[i]   = Math.min(255,Math.max(0,Math.round((d[i]  -lMin)*scale)));
    d[i+1] = Math.min(255,Math.max(0,Math.round((d[i+1]-lMin)*scale)));
    d[i+2] = Math.min(255,Math.max(0,Math.round((d[i+2]-lMin)*scale)));
  }
  ctx.putImageData(imgData, 0, 0);
}

// Unsharp mask: sharpen by subtracting a blurred copy
function applyUnsharpMask(srcCanvas, ctx, W, H, amount, radius) {
  const blurC = document.createElement('canvas');
  blurC.width=W; blurC.height=H;
  const bctx = blurC.getContext('2d');
  bctx.filter = `blur(${radius.toFixed(1)}px)`;
  bctx.drawImage(srcCanvas, 0, 0);
  bctx.filter = 'none';
  const orig    = ctx.getImageData(0, 0, W, H);
  const blurred = bctx.getImageData(0, 0, W, H);
  const od = orig.data, bd = blurred.data;
  for (let i=0;i<od.length;i+=4) {
    for (let c=0;c<3;c++) {
      od[i+c] = Math.min(255,Math.max(0, od[i+c] + (od[i+c]-bd[i+c])*amount));
    }
  }
  ctx.putImageData(orig, 0, 0);
}

// Noise reduction: gentle Gaussian-like blend
function applyNoiseReduction(srcCanvas, ctx, W, H, amount) {
  const blurC = document.createElement('canvas');
  blurC.width=W; blurC.height=H;
  const bctx = blurC.getContext('2d');
  bctx.filter = `blur(${(amount*0.8).toFixed(1)}px)`;
  bctx.drawImage(srcCanvas, 0, 0);
  bctx.filter='none';
  const orig    = ctx.getImageData(0,0,W,H);
  const blurred = bctx.getImageData(0,0,W,H);
  const od=orig.data, bd=blurred.data;
  const t=amount/5; // blend factor 0–1
  for (let i=0;i<od.length;i+=4) {
    for (let c=0;c<3;c++) od[i+c]=Math.round(od[i+c]*(1-t)+bd[i+c]*t);
  }
  ctx.putImageData(orig,0,0);
}

// Calculate batch output dimensions
function calcBatchDims(natW, natH, mode, preset, customW, customH, keepAspect, longEdgePx) {
  if (mode==='none') return {W:natW,H:natH};
  let tW, tH;
  if (mode==='longEdge') {
    const scale = longEdgePx / Math.max(natW,natH);
    return {W:Math.round(natW*scale), H:Math.round(natH*scale)};
  }
  if (mode==='preset') {
    const p = BATCH_RESIZE_PRESETS.find(r=>r.id===preset);
    tW=p.w; tH=p.h||Math.round(natH*(p.w/natW));
  } else {
    tW=customW; tH=customH;
  }
  if (keepAspect) {
    const scale=Math.min(tW/natW,tH/natH);
    return {W:Math.round(natW*scale),H:Math.round(natH*scale)};
  }
  return {W:tW,H:tH};
}

// ── CSS filter from state ─────────────────────────────────────────────────────
function toCSSFilter(f) {
  const ev = 1 + f.exposure/100;
  const bv = (f.brightness/100)*ev;
  const hlAdj = f.highlights > 0 ? 1 + f.highlights*0.002 : 1 + f.highlights*0.003;
  const shAdj = f.shadows > 0 ? 1 + f.shadows*0.003 : 1 + f.shadows*0.002;
  let s = `brightness(${(bv*hlAdj*shAdj).toFixed(3)}) contrast(${(f.contrast/100).toFixed(3)}) saturate(${(f.saturation/100 * f.vibrance/100).toFixed(3)})`;
  if (f.hue     !== 0) s += ` hue-rotate(${f.hue}deg)`;
  if (f.denoise > 0)   s += ` blur(${(f.denoise*0.05).toFixed(2)}px)`;
  if (f.sharpness > 0) s += ` contrast(${(1+f.sharpness*0.022).toFixed(3)})`;
  if (f.clarity   > 0) s += ` contrast(${(1+f.clarity*0.016).toFixed(3)})`;
  if (f.tint !== 0) {
    const tintSign = f.tint > 0 ? 120 : 300;
    const tintAmt  = Math.abs(f.tint)/400;
    s += ` sepia(${tintAmt.toFixed(3)}) hue-rotate(${tintSign}deg) sepia(0)`;
  }
  return s;
}

function toTransformCSS(rotation, flipH, flipV) {
  return `rotate(${rotation}deg) scaleX(${flipH?-1:1}) scaleY(${flipV?-1:1})`;
}

async function saveFile(blob, name) {
  if (navigator.canShare?.({ files:[new File([blob],name,{type:blob.type})] })) {
    try { await navigator.share({ files:[new File([blob],name,{type:blob.type})], title:"PHOTOlab" }); return; }
    catch(e) { if(e.name==="AbortError") return; }
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function canvasToBlob(c,mime,q){ return new Promise(r=>{ if(c.toBlob){c.toBlob(r,mime,q);return;} const d=c.toDataURL(mime,q),a=d.split(","),b=atob(a[1]);let n=b.length;const u=new Uint8Array(n);while(n--)u[n]=b.charCodeAt(n);r(new Blob([u],{type:mime}));});}

// Load an image from a src string (data URL or blob URL) reliably
function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load for export'));
    img.src = src;
  });
}

async function renderFinal(imageSrc, cssFilterStr, filters, rotation, flipH, flipV, texts, targetW, targetH) {
  // Always load a fresh Image to avoid canvas taint and stale DOM refs
  const imgEl = await loadImageFromSrc(imageSrc);
  const natW = imgEl.naturalWidth;
  const natH = imgEl.naturalHeight;
  if (!natW || !natH) throw new Error('Image has zero dimensions — cannot export');

  const MAX = 16_000_000;
  let W = targetW || natW;
  let H = targetH || natH;
  if (W * H > MAX) { const s = Math.sqrt(MAX / (W * H)); W = Math.floor(W * s); H = Math.floor(H * s); }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Apply rotation + flip
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply CSS filters via ctx.filter (supported in all modern browsers)
  if (cssFilterStr && cssFilterStr !== 'none' && cssFilterStr.trim() !== '') {
    ctx.filter = cssFilterStr;
  }
  ctx.drawImage(imgEl, -W / 2, -H / 2, W, H);
  ctx.restore();
  ctx.filter = 'none';

  // Warmth overlay
  if (filters.temperature !== 0) {
    const a = Math.abs(filters.temperature) / 300;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = filters.temperature > 0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Fade
  if (filters.fade > 0) {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,255,255,${filters.fade / 180})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Vignette
  if (filters.vignette > 0) {
    const g = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Grain
  if (filters.grain > 0) {
    const gC = document.createElement('canvas'); gC.width = W; gC.height = H;
    const gc = gC.getContext('2d'); const id = gc.createImageData(W, H); const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() - 0.5) * filters.grain * 2.5;
      d[i] = d[i+1] = d[i+2] = 128 + v; d[i+3] = 255;
    }
    gc.putImageData(id, 0, 0);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35;
    ctx.drawImage(gC, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // Text overlays
  texts.forEach(t => {
    if (!t.content.trim()) return;
    const sz = Math.round(t.fontSize * (W / 800));
    ctx.font = `${t.bold ? 'bold ' : ''}${t.italic ? 'italic ' : ''}${sz}px ${FONT_MAP[t.font] || FONT_MAP.System}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const x = t.x / 100 * W, y = t.y / 100 * H;
    if (t.stroke) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = sz * 0.08; ctx.strokeText(t.content, x, y); }
    ctx.fillStyle = t.color; ctx.fillText(t.content, x, y);
  });
  return { canvas, W, H };
}

function getExportDims(natW,natH,scaleVal){
  if(scaleVal==="8k"){const s=7680/Math.max(natW,natH);return{W:Math.round(natW*s),H:Math.round(natH*s)};}
  return{W:Math.round(natW*scaleVal),H:Math.round(natH*scaleVal)};
}

// ── Component ────────────────────────────────────────────────────────────────
export default function App() {
  const [image,       setImage]      = useState(null);
  const [filters,     setFilters]    = useState(DEFAULT_FILTERS);
  const [rotation,    setRotation]   = useState(0);
  const [flipH,       setFlipH]      = useState(false);
  const [flipV,       setFlipV]      = useState(false);
  const [cropMode,    setCropMode]   = useState(false);
  const [cropBox,     setCropBox]    = useState({x:0,y:0,w:100,h:100});
  const [cropAspect,  setCropAspect] = useState("free");
  const [texts,       setTexts]      = useState([]);
  const [selText,     setSelText]    = useState(null);
  const [activeTab,   setActiveTab]  = useState("edit");
  const [filterGroup, setFilterGroup]= useState("basic");
  const [showBefore,  setShowBefore] = useState(false);
  const [splitPos,    setSplitPos]   = useState(50);
  const [isDragSplit, setIsDragSplit]= useState(false);
  const [dragging,    setDragging]   = useState(false);
  const [isMobile,    setIsMobile]   = useState(false);
  const [showExport,  setShowExport] = useState(false);
  const [exportTab,   setExportTab]  = useState("standard");
  const [exportFmt,   setExportFmt]  = useState("jpg");
  const [exportQ,     setExportQ]    = useState(92);
  const [exportScale, setExportScale]= useState(2);
  const [exporting,   setExporting]  = useState(false);
  const [exportDone,  setExportDone] = useState(false);
  const [exportInfo,  setExportInfo] = useState("");
  const [fbMode,      setFbMode]     = useState("portrait");
  const [fbExporting, setFbExporting]= useState(false);
  const [fbDone,      setFbDone]     = useState(false);
  const [bgStatus,    setBgStatus]   = useState("idle");
  const [bgProgress,  setBgProgress] = useState(0);
  const [bgSubUrl,    setBgSubUrl]   = useState(null);
  const [bgMode,      setBgMode]     = useState("transparent");
  const [bgColor,     setBgColor]    = useState("#ffffff");
  const [bgBlur,      setBgBlur]     = useState(14);
  const [bgResult,    setBgResult]   = useState(null);

  // ── BATCH STATE ──────────────────────────────────────────────────────────
  const [sourceHandle, setSourceHandle] = useState(null);
  const [outputHandle, setOutputHandle] = useState(null);
  const [batchImages,  setBatchImages]  = useState([]);
  // Logo/watermark
  const [batchLogo,        setBatchLogo]        = useState(null);
  const [batchLogoFile,    setBatchLogoFile]     = useState(null);
  const [batchLogoScale,   setBatchLogoScale]    = useState(0.15);
  const [batchLogoOpacity, setBatchLogoOpacity]  = useState(0.7);
  const [batchLogoPos,     setBatchLogoPos]      = useState("bottom-right");
  const [batchLogoMargin,  setBatchLogoMargin]   = useState(20);
  // Resize
  const [batchResizeMode,   setBatchResizeMode]  = useState("none");      // none | preset | custom | longEdge
  const [batchResizePreset, setBatchResizePreset]= useState("ig_sq");
  const [batchCustomW,      setBatchCustomW]     = useState(1920);
  const [batchCustomH,      setBatchCustomH]     = useState(1080);
  const [batchKeepAspect,   setBatchKeepAspect]  = useState(true);
  const [batchLongEdgePx,   setBatchLongEdgePx]  = useState(2000);
  // Enhancement
  const [batchAutoLevels,   setBatchAutoLevels]  = useState(false);
  const [batchAutoContrast, setBatchAutoContrast]= useState(false);
  const [batchSharpen,      setBatchSharpen]     = useState(false);
  const [batchSharpenAmt,   setBatchSharpenAmt]  = useState(0.8);
  const [batchSharpenRad,   setBatchSharpenRad]  = useState(1.5);
  const [batchDenoise,      setBatchDenoise]     = useState(false);
  const [batchDenoiseAmt,   setBatchDenoiseAmt]  = useState(1.5);
  // Output format
  const [batchOutputFmt,  setBatchOutputFmt]  = useState("jpeg");
  const [batchOutputQ,    setBatchOutputQ]    = useState(90);
  const [batchPrefix,     setBatchPrefix]     = useState("");
  const [batchSuffix,     setBatchSuffix]     = useState("_edited");
  // Processing state
  const [batchProcessing,  setBatchProcessing]  = useState(false);
  const [batchProgress,    setBatchProgress]    = useState({current:0,total:0,currentFile:""});
  const [batchDone,        setBatchDone]        = useState(false);
  // Batch accordion sections
  const [batchSection, setBatchSection] = useState("folders");
  const [batchFilterGroup, setBatchFilterGroup] = useState("basic");

  // ── AI Features state ─────────────────────────────────────────────────────
  const [falApiKey,        setFalApiKey]        = useState(()=>localStorage.getItem('fal-api-key')||'');
  const [aiUpscaleStatus,  setAiUpscaleStatus]  = useState('idle');
  const [aiUpscaleResult,  setAiUpscaleResult]  = useState(null);
  const [aiUpscaleLog,     setAiUpscaleLog]     = useState('');
  const [aiBeautyStatus,   setAiBeautyStatus]   = useState('idle');
  const [aiBeautyResult,   setAiBeautyResult]   = useState(null);
  const [aiBeautyLog,      setAiBeautyLog]      = useState('');
  const [aiRemoveStatus,   setAiRemoveStatus]   = useState('idle');
  const [aiRemoveResult,   setAiRemoveResult]   = useState(null);
  const [aiRemoveLog,      setAiRemoveLog]      = useState('');
  const [aiRemoveBrush,    setAiRemoveBrush]    = useState(40);
  const [aiMaskReady,      setAiMaskReady]      = useState(false);
  const [aiActiveFeature,  setAiActiveFeature]  = useState(null); // 'upscale'|'beauty'|'remove'
  const [aiScale,          setAiScale]          = useState(4);
  const [aiUpscaleProgress, setAiUpscaleProgress] = useState(0);
  const [aiUpscaleResultSize, setAiUpscaleResultSize] = useState('');
  const [aiBeautySmooth,   setAiBeautySmooth]   = useState(6);
  const [aiBeautyClarity,  setAiBeautyClarity]  = useState(5);
  const [aiBeautyGlow,     setAiBeautyGlow]     = useState(3);
  // Batch preview
  const [batchPreviewIdx,     setBatchPreviewIdx]     = useState(null);
  const [batchPreviewOrigUrl, setBatchPreviewOrigUrl] = useState(null);
  const [batchPreviewAfterUrl,setBatchPreviewAfterUrl]= useState(null);
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false);
  const [batchPreviewSplit,   setBatchPreviewSplit]   = useState(50);
  const [batchPreviewDragging,setBatchPreviewDragging]= useState(false);
  const [batchPreviewOpen,    setBatchPreviewOpen]    = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('photolab-darkmode')==='true';
    return false;
  });
  useEffect(() => {
    localStorage.setItem('photolab-darkmode', darkMode);
    document.body.setAttribute('data-dark', darkMode?'true':'false');
  }, [darkMode]);

  const fileInputRef = useRef(null);
  const imgRef       = useRef(null);
  const splitRef     = useRef(null);
  const previewRef   = useRef(null);
  const canvasRef    = useRef(null);
  const maskCanvasRef  = useRef(null);
  const maskDrawingRef = useRef(false);

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    check(); window.addEventListener("resize",check);
    return()=>window.removeEventListener("resize",check);
  },[]);

  // ── Global slider track-fill: update --v CSS var natively on every input
  //    event so the gradient updates BEFORE React reconciles. This makes
  //    the filled track feel perfectly in sync with thumb movement.
  useEffect(()=>{
    const onSliderInput = e => {
      const el = e.target;
      if (!el.classList.contains('sl')) return;
      const min  = parseFloat(el.min)  || 0;
      const max  = parseFloat(el.max)  || 100;
      const pct  = ((parseFloat(el.value) - min) / (max - min)) * 100;
      el.style.setProperty('--v', `${pct.toFixed(2)}%`);
    };
    // Use capture=true so we run before React's synthetic event handlers
    document.addEventListener('input', onSliderInput, { capture: true });
    return () => document.removeEventListener('input', onSliderInput, { capture: true });
  }, []);

  useEffect(()=>{
    if(bgSubUrl&&bgStatus==="done") buildBgComposite(bgSubUrl,bgMode,bgColor,bgBlur);
  },[bgMode,bgColor,bgBlur,bgSubUrl]);

  const onSplitMove=useCallback((cx)=>{
    if(!splitRef.current) return;
    const r=splitRef.current.getBoundingClientRect();
    setSplitPos(Math.min(95,Math.max(5,((cx-r.left)/r.width)*100)));
  },[]);
  useEffect(()=>{
    if(!isDragSplit) return;
    const mm=e=>onSplitMove(e.clientX);
    const tm=e=>{e.preventDefault();onSplitMove(e.touches[0].clientX);};
    const up=()=>setIsDragSplit(false);
    window.addEventListener("mousemove",mm); window.addEventListener("mouseup",up);
    window.addEventListener("touchmove",tm,{passive:false}); window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mousemove",mm);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",tm);window.removeEventListener("touchend",up);};
  },[isDragSplit,onSplitMove]);

  const loadImage=file=>{
    if(!file||!file.type.startsWith("image/")) return;
    const reader=new FileReader();
    reader.onload=e=>{
      setImage(e.target.result); setFilters(DEFAULT_FILTERS); setRotation(0); setFlipH(false); setFlipV(false);
      setTexts([]); setSelText(null); setCropMode(false); setCropBox({x:0,y:0,w:100,h:100});
      setBgStatus("idle"); setBgSubUrl(null); setBgResult(null); setSplitPos(50); setShowBefore(false);
    };
    reader.readAsDataURL(file);
  };

  const resetAll=()=>{setFilters(DEFAULT_FILTERS);setRotation(0);setFlipH(false);setFlipV(false);setTexts([]);setSelText(null);};

  const applyCrop=()=>{
    const img=imgRef.current; if(!img) return;
    const W=img.naturalWidth, H=img.naturalHeight;
    const sx=cropBox.x/100*W, sy=cropBox.y/100*H;
    const sw=cropBox.w/100*W, sh=cropBox.h/100*H;
    const c=document.createElement("canvas"); c.width=sw; c.height=sh;
    const ctx=c.getContext("2d"); ctx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
    setImage(c.toDataURL("image/png")); setCropMode(false); setCropBox({x:0,y:0,w:100,h:100});
  };
  const setCropAspectRatio=ratio=>{
    setCropAspect(ratio);
    if(ratio==="free") return;
    const [aw,ah]=ratio.split(":").map(Number);
    const imgW=imgRef.current?.naturalWidth||1, imgH=imgRef.current?.naturalHeight||1;
    const imgAspect=imgW/imgH, cropAspect=aw/ah;
    let w,h;
    if(imgAspect>cropAspect){h=100;w=h*(cropAspect/(imgW/imgH))*(imgW/imgH);}
    else{w=100;h=w*(imgW/imgH)/cropAspect;}
    w=Math.min(100,w); h=Math.min(100,h);
    setCropBox({x:(100-w)/2,y:(100-h)/2,w,h});
  };

  const addText=()=>{
    const id=Date.now();
    setTexts(p=>[...p,{id,content:"Tap to edit",x:50,y:50,fontSize:48,color:"#ffffff",font:"System",bold:false,italic:false,stroke:true}]);
    setSelText(id);
  };
  const updateText=(id,key,val)=>setTexts(p=>p.map(t=>t.id===id?{...t,[key]:val}:t));
  const deleteText=id=>{setTexts(p=>p.filter(t=>t.id!==id));setSelText(null);};
  const selectedText=texts.find(t=>t.id===selText);

  const handleRemoveBg=async()=>{
    if(!image||bgStatus==="loading") return;
    setBgStatus("loading"); setBgProgress(0); setBgSubUrl(null); setBgResult(null);
    try{
      const{removeBackground}=await import("@imgly/background-removal");
      const blob=await(await fetch(image)).blob();
      const out=await removeBackground(blob,{progress:(k,c,t)=>setBgProgress(Math.round(c/t*100)),model:"medium"});
      const url=URL.createObjectURL(out);
      setBgSubUrl(url); setBgStatus("done");
      await buildBgComposite(url,bgMode,bgColor,bgBlur);
    }catch(e){console.error(e);setBgStatus("error");}
  };
  const buildBgComposite=async(subUrl,mode,color,blur)=>{
    const orig=imgRef.current; if(!orig||!subUrl) return;
    const W=orig.naturalWidth,H=orig.naturalHeight;
    const sub=new Image(); sub.src=subUrl;
    await new Promise(r=>{sub.onload=r;if(sub.complete)r();});
    const c=document.createElement("canvas"); c.width=W; c.height=H; const ctx=c.getContext("2d");
    if(mode==="transparent") ctx.drawImage(sub,0,0,W,H);
    else if(mode==="color"){ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.drawImage(sub,0,0,W,H);}
    else if(mode==="blur"){ctx.filter=`blur(${blur}px)`;ctx.drawImage(orig,-30,-30,W+60,H+60);ctx.filter="none";ctx.drawImage(sub,0,0,W,H);}
    setBgResult(c.toDataURL("image/png"));
  };

  const cssFilter=toCSSFilter(filters);
  const natW=imgRef.current?.naturalWidth||0, natH=imgRef.current?.naturalHeight||0;
  const {W:expW,H:expH}=natW?getExportDims(natW,natH,exportScale):{W:0,H:0};

  const handleExport=async()=>{
    const src = bgResult || image;  // use bg-removed version if available
    if(!src){ setExportInfo("No image loaded."); return; }
    setExporting(true); setExportDone(false); setExportInfo("Preparing…");
    try{
      // Load fresh image to get real dimensions
      const tmpImg = await loadImageFromSrc(src);
      const {W,H}=getExportDims(tmpImg.naturalWidth,tmpImg.naturalHeight,exportScale);
      setExportInfo(`Rendering ${W.toLocaleString()}×${H.toLocaleString()}px…`);
      const{canvas,W:rW,H:rH}=await renderFinal(src,cssFilter,filters,rotation,flipH,flipV,texts,W,H);
      const fmts={jpg:{mime:"image/jpeg",ext:"jpg"},png:{mime:"image/png",ext:"png"},webp:{mime:"image/webp",ext:"webp"}};
      const{mime,ext}=fmts[exportFmt];
      const q=exportFmt==="png"?undefined:exportQ/100;
      const blob=await canvasToBlob(canvas,mime,q);
      if(!blob || blob.size===0) throw new Error("Canvas produced empty blob — check image source.");
      const kb=Math.round(blob.size/1024);
      setExportInfo(`${rW.toLocaleString()}×${rH.toLocaleString()}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      await saveFile(blob,`photolab.${ext}`);
      setExportDone(true); setTimeout(()=>setExportDone(false),4000);
    }catch(e){
      console.error("Export error:",e);
      setExportInfo("Export failed: "+e.message);
    }
    setExporting(false);
  };
  const handleFbExport=async()=>{
    const src = bgResult || image;
    if(!src) return;
    setFbExporting(true); setFbDone(false); setExportInfo("Preparing…");
    try{
      const tmpImg = await loadImageFromSrc(src);
      const mode=FB_MODES.find(m=>m.id===fbMode);
      let tW=mode.w, tH=mode.h;
      if(!tH){ const sc=Math.min(1,tW/Math.max(tmpImg.naturalWidth,tmpImg.naturalHeight)); tW=Math.round(tmpImg.naturalWidth*sc); tH=Math.round(tmpImg.naturalHeight*sc); }
      const{canvas,W,H}=await renderFinal(src,cssFilter,filters,rotation,flipH,flipV,texts,tW,tH);
      const blob=await canvasToBlob(canvas,"image/jpeg",0.82);
      if(!blob || blob.size===0) throw new Error("Empty blob");
      const kb=Math.round(blob.size/1024);
      setExportInfo(`${W}×${H}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      await saveFile(blob,`facebook_${mode.id}.jpg`);
      setFbDone(true); setTimeout(()=>setFbDone(false),4000);
    }catch(e){ console.error("FB export error:",e); setExportInfo("Export failed: "+e.message); }
    setFbExporting(false);
  };

  const isEdited=Object.entries(filters).some(([k,v])=>v!==DEFAULT_FILTERS[k])||rotation!==0||flipH||flipV||texts.length>0;
  const showSplit=isEdited&&activeTab==="edit"&&!cropMode;
  const transformCSS=toTransformCSS(rotation,flipH,flipV);

  // ── BATCH FUNCTIONS ───────────────────────────────────────────────────────
  const selectSourceFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setSourceHandle(handle);
      const files = [];
      for await (const entry of handle.values()) {
        if (entry.kind==='file' && entry.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const file = await entry.getFile();
          files.push({name:entry.name, file});
        }
      }
      setBatchImages(files);
      setBatchDone(false);
    } catch(err) { if(err.name!=='AbortError') console.error(err); }
  };

  const selectOutputFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setOutputHandle(handle);
    } catch(err) { if(err.name!=='AbortError') console.error(err); }
  };

  const handleBatchLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBatchLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => setBatchLogo(img);
    };
    reader.readAsDataURL(file);
  };

  // ── Generate single-image batch preview ──────────────────────────────────
  const generateBatchPreview = useCallback(async (idx) => {
    if (idx === null || !batchImages[idx]) return;
    setBatchPreviewLoading(true);
    setBatchPreviewIdx(idx);
    setBatchPreviewOpen(true);
    const { file } = batchImages[idx];
    try {
      // Load image
      const origUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setBatchPreviewOrigUrl(origUrl);

      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = origUrl;
      });

      // Dimensions — cap preview at 1200px long edge for speed
      const PREVIEW_MAX = 1200;
      const scale = Math.min(1, PREVIEW_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const W = Math.round(img.naturalWidth * scale);
      const H = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Apply CSS filter
      const cssFilterStr = toCSSFilter(filters);
      ctx.filter = cssFilterStr;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, W, H);
      ctx.filter = 'none';

      // Colour overlays
      if (filters.temperature !== 0) {
        const a = Math.abs(filters.temperature) / 300;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = filters.temperature > 0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (filters.fade > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255,255,255,${filters.fade / 180})`;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (filters.vignette > 0) {
        const g = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.85);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100})`);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }

      // Enhancement passes
      if (batchAutoContrast) applyAutoContrast(ctx, W, H);
      if (batchAutoLevels)   applyAutoLevels(ctx, W, H);
      if (batchDenoise)      applyNoiseReduction(canvas, ctx, W, H, batchDenoiseAmt);
      if (batchSharpen)      applyUnsharpMask(canvas, ctx, W, H, batchSharpenAmt, batchSharpenRad);

      // Logo overlay (preview only — no resize applied for speed)
      if (batchLogo) {
        const logoW = W * batchLogoScale;
        const logoH = (batchLogo.height / batchLogo.width) * logoW;
        const m = Math.round(batchLogoMargin * scale);
        const positions = {
          'top-left': {x:m, y:m}, 'top-center': {x:(W-logoW)/2, y:m}, 'top-right': {x:W-logoW-m, y:m},
          'center-left': {x:m, y:(H-logoH)/2}, 'center': {x:(W-logoW)/2, y:(H-logoH)/2}, 'center-right': {x:W-logoW-m, y:(H-logoH)/2},
          'bottom-left': {x:m, y:H-logoH-m}, 'bottom-center': {x:(W-logoW)/2, y:H-logoH-m}, 'bottom-right': {x:W-logoW-m, y:H-logoH-m},
        };
        const {x, y} = positions[batchLogoPos] || positions['bottom-right'];
        ctx.globalAlpha = batchLogoOpacity;
        ctx.drawImage(batchLogo, x, y, logoW, logoH);
        ctx.globalAlpha = 1;
      }

      setBatchPreviewAfterUrl(canvas.toDataURL('image/jpeg', 0.92));
    } catch(e) {
      console.error('Preview failed', e);
    }
    setBatchPreviewLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchImages, filters, batchAutoContrast, batchAutoLevels, batchDenoise, batchDenoiseAmt,
      batchSharpen, batchSharpenAmt, batchSharpenRad, batchLogo, batchLogoScale,
      batchLogoOpacity, batchLogoPos, batchLogoMargin, batchResizeMode]);

  const handleBatchProcess = async () => {
    if (!sourceHandle || !outputHandle || batchImages.length===0) {
      alert('Select source & output folders with at least one image.');
      return;
    }
    setBatchProcessing(true); setBatchDone(false);
    setBatchProgress({current:0, total:batchImages.length, currentFile:""});

    const cssFilterStr = toCSSFilter(filters);
    const fmtMime = {jpeg:"image/jpeg", png:"image/png", webp:"image/webp"};
    const fmtExt  = {jpeg:"jpg", png:"png", webp:"webp"};
    const mime = fmtMime[batchOutputFmt];
    const ext  = fmtExt[batchOutputFmt];
    const quality = batchOutputFmt==="png" ? undefined : batchOutputQ/100;

    for (let i=0; i<batchImages.length; i++) {
      const {name, file} = batchImages[i];
      setBatchProgress({current:i+1, total:batchImages.length, currentFile:name});
      try {
        // Load image into Image element
        const img = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = e.target.result;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Calculate output dimensions
        const {W, H} = calcBatchDims(
          img.naturalWidth, img.naturalHeight,
          batchResizeMode, batchResizePreset,
          batchCustomW, batchCustomH,
          batchKeepAspect, batchLongEdgePx
        );

        // Draw on canvas with CSS filters + color edits
        const canvas = canvasRef.current;
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Draw base image with CSS filter
        ctx.filter = cssFilterStr;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, W, H);
        ctx.filter = 'none';

        // Warmth overlay
        if (filters.temperature !== 0) {
          const a = Math.abs(filters.temperature)/300;
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = filters.temperature>0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
          ctx.fillRect(0,0,W,H);
          ctx.globalCompositeOperation = 'source-over';
        }
        // Fade
        if (filters.fade > 0) {
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(255,255,255,${filters.fade/180})`;
          ctx.fillRect(0,0,W,H);
          ctx.globalCompositeOperation = 'source-over';
        }
        // Vignette
        if (filters.vignette > 0) {
          const g = ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.85);
          g.addColorStop(0,'rgba(0,0,0,0)');
          g.addColorStop(1,`rgba(0,0,0,${filters.vignette/100})`);
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = g;
          ctx.fillRect(0,0,W,H);
          ctx.globalCompositeOperation = 'source-over';
        }

        // ── ENHANCEMENT PASSES ─────────────────────────────────────────
        if (batchAutoContrast) applyAutoContrast(ctx, W, H);
        if (batchAutoLevels)   applyAutoLevels(ctx, W, H);
        if (batchDenoise)      applyNoiseReduction(canvas, ctx, W, H, batchDenoiseAmt);
        if (batchSharpen)      applyUnsharpMask(canvas, ctx, W, H, batchSharpenAmt, batchSharpenRad);

        // ── WATERMARK / LOGO ──────────────────────────────────────────
        if (batchLogo) {
          const logoW = W * batchLogoScale;
          const logoH = (batchLogo.height/batchLogo.width)*logoW;
          const m = batchLogoMargin;
          const positions = {
            'top-left':      {x:m,         y:m},
            'top-right':     {x:W-logoW-m, y:m},
            'top-center':    {x:(W-logoW)/2,y:m},
            'bottom-left':   {x:m,         y:H-logoH-m},
            'bottom-right':  {x:W-logoW-m, y:H-logoH-m},
            'bottom-center': {x:(W-logoW)/2,y:H-logoH-m},
            'center':        {x:(W-logoW)/2,y:(H-logoH)/2},
          };
          const {x,y} = positions[batchLogoPos]||positions['bottom-right'];
          ctx.globalAlpha = batchLogoOpacity;
          ctx.drawImage(batchLogo, x, y, logoW, logoH);
          ctx.globalAlpha = 1.0;
        }

        // Generate output filename
        const base = name.replace(/\.[^.]+$/, '');
        const outName = `${batchPrefix}${base}${batchSuffix}.${ext}`;

        // Save to output folder
        const blob = await canvasToBlob(canvas, mime, quality);
        if (!blob) continue;
        const newFile = await outputHandle.getFileHandle(outName, {create:true});
        const writable = await newFile.createWritable();
        await writable.write(blob);
        await writable.close();

      } catch(err) {
        console.error(`Failed processing ${name}`, err);
      }
    }

    setBatchProcessing(false);
    setBatchDone(true);
  };

  // ── Real-time batch preview: re-render whenever settings change ───────────
  const batchPreviewTimerRef = useRef(null);
  useEffect(() => {
    if (!batchPreviewOpen || batchPreviewIdx === null) return;
    // Debounce: wait 350ms after the last change before re-rendering
    clearTimeout(batchPreviewTimerRef.current);
    batchPreviewTimerRef.current = setTimeout(() => {
      generateBatchPreview(batchPreviewIdx);
    }, 350);
    return () => clearTimeout(batchPreviewTimerRef.current);
  }, [
    // Edit tab filters
    filters.brightness, filters.contrast, filters.saturation, filters.exposure,
    filters.temperature, filters.tint, filters.sharpness, filters.clarity,
    filters.denoise, filters.highlights, filters.shadows, filters.hue,
    filters.vibrance, filters.vignette, filters.fade, filters.grain,
    // Enhancements
    batchAutoContrast, batchAutoLevels,
    batchDenoise, batchDenoiseAmt,
    batchSharpen, batchSharpenAmt, batchSharpenRad,
    // Logo
    batchLogo, batchLogoScale, batchLogoOpacity, batchLogoPos, batchLogoMargin,
    // Preview open/idx changes
    batchPreviewOpen, batchPreviewIdx,
    // stable callback (useCallback)
    generateBatchPreview,
  ]);

  // ── fal.ai helpers ───────────────────────────────────────────────────────
  const saveFalKey = (k) => { setFalApiKey(k); localStorage.setItem('fal-api-key', k); };

  // ── fal.ai REST helpers ───────────────────────────────────────────────────
  // Convert canvas to base64 data URI (fal.ai models accept these directly)
  const canvasToDataUrl = useCallback((canvas, quality=0.92) => {
    // Cap at 1600px long edge to keep payload size reasonable
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(canvas.width, canvas.height));
    if (scale < 1) {
      const tmp = document.createElement('canvas');
      tmp.width  = Math.round(canvas.width  * scale);
      tmp.height = Math.round(canvas.height * scale);
      tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height);
      return tmp.toDataURL('image/jpeg', quality);
    }
    return canvas.toDataURL('image/jpeg', quality);
  }, []);

  // Submit job and poll until done — returns result JSON
  const falRun = useCallback(async (modelId, input, onLog) => {
    const key = falApiKey.trim();
    const headers = { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' };

    onLog?.('Submitting to fal.ai queue…');
    const submitRes = await fetch(`https://queue.fal.run/${modelId}`, {
      method: 'POST', headers, body: JSON.stringify(input),
    });
    if (!submitRes.ok) {
      const txt = await submitRes.text();
      throw new Error(`Submit failed (${submitRes.status}): ${txt}`);
    }
    const { request_id } = await submitRes.json();

    onLog?.('Job queued — waiting for GPU…');
    const statusUrl = `https://queue.fal.run/${modelId}/requests/${request_id}/status`;
    const resultUrl = `https://queue.fal.run/${modelId}/requests/${request_id}`;

    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const sRes = await fetch(statusUrl, { headers });
      const s    = await sRes.json();
      if (s.status === 'COMPLETED') {
        const rRes = await fetch(resultUrl, { headers });
        return await rRes.json();
      }
      if (s.status === 'FAILED') throw new Error(s.error || 'Job failed on fal.ai server');
      if (s.status === 'IN_QUEUE')    onLog?.(`In queue — position ${s.queue_position ?? '…'}`);
      if (s.status === 'IN_PROGRESS') onLog?.('Running on GPU…');
    }
    throw new Error('Timed out after 5 minutes');
  }, [falApiKey]);

  const runFalModel = useCallback(async (modelId, extraInput, setStatus, setResult, setLog) => {
    if (!falApiKey.trim()) { alert('Enter your fal.ai API key in the Tools tab first.'); return; }
    if (!image) { alert('Upload a photo first.'); return; }
    setStatus('loading'); setResult(null); setLog('Preparing image…');
    try {
      // Render edited image to canvas → base64 data URI (no upload needed)
      const srcImg = imgRef.current;
      const W = srcImg.naturalWidth, H = srcImg.naturalHeight;
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const ctx = tmp.getContext('2d');
      ctx.filter = toCSSFilter(filters);
      ctx.drawImage(srcImg, 0, 0, W, H);
      ctx.filter = 'none';
      const imageUrl = canvasToDataUrl(tmp);

      const result = await falRun(
        modelId,
        { image_url: imageUrl, ...extraInput },
        msg => setLog(msg)
      );
      const outUrl = result?.image?.url
        || result?.images?.[0]?.url
        || result?.output_image_url
        || result?.output?.[0]?.url;
      if (!outUrl) throw new Error(`No image URL in response: ${JSON.stringify(result).slice(0,300)}`);
      setResult(outUrl); setStatus('done'); setLog('');
    } catch(e) {
      console.error('fal.ai error:', e);
      setStatus('error');
      setLog(e?.message || 'Request failed. Check your API key and try again.');
    }
  }, [falApiKey, image, filters, canvasToDataUrl, falRun]);

  // Apply AI result back to the editor as the new source image
  const applyAiResult = useCallback(async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result);
      setFilters(DEFAULT_FILTERS); setRotation(0); setFlipH(false); setFlipV(false);
      setTexts([]); setBgStatus('idle'); setBgSubUrl(null); setBgResult(null);
    };
    reader.readAsDataURL(blob);
  }, []);

  // Mask canvas helpers for object removal
  const initMaskCanvas = useCallback(() => {
    const mc = maskCanvasRef.current;
    const img = imgRef.current;
    if (!mc || !img) return;
    mc.width  = img.naturalWidth;
    mc.height = img.naturalHeight;
    const ctx = mc.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, mc.width, mc.height);
    setAiMaskReady(false);
  }, []);

  const drawMask = useCallback((e, canvas) => {
    if (!maskDrawingRef.current) return;
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = mc.width  / rect.width;
    const scaleY = mc.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top)  * scaleY;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, aiRemoveBrush * scaleX, 0, Math.PI * 2);
    ctx.fill();
    setAiMaskReady(true);
  }, [aiRemoveBrush]);

  const handleAiRemove = useCallback(async () => {
    if (!aiMaskReady) { alert('Paint over the area to remove first.'); return; }
    const mc = maskCanvasRef.current;
    if (!mc) return;
    if (!falApiKey.trim()) { alert('Enter your Claid.ai API key first.'); return; }
    if (!image) return;
    setAiRemoveStatus('loading'); setAiRemoveResult(null); setAiRemoveLog('Preparing image…');
    try {
      // Draw source image to canvas → blob
      const srcImg = await loadImageFromSrc(image);
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = srcImg.naturalWidth; tmpCanvas.height = srcImg.naturalHeight;
      const tCtx = tmpCanvas.getContext('2d');
      tCtx.filter = toCSSFilter(filters);
      tCtx.drawImage(srcImg, 0, 0);
      tCtx.filter = 'none';

      // Mask canvas → PNG blob
      const [imgBlob, maskBlob] = await Promise.all([
        canvasToBlob(tmpCanvas, 'image/jpeg', 0.95),
        canvasToBlob(mc, 'image/png'),
      ]);

      setAiRemoveLog('Uploading to Claid.ai…');
      // Claid.ai inpainting — multipart form
      const form = new FormData();
      form.append('image', imgBlob, 'photo.jpg');
      form.append('mask', maskBlob, 'mask.png');
      form.append('operations', JSON.stringify([{ operation: 'inpaint' }]));

      const res = await fetch('https://api.claid.ai/v1-beta1/image/edit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${falApiKey.trim()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || `Claid error ${res.status}`);
      const outUrl = data?.data?.output?.tmp_url || data?.data?.output?.url;
      if (!outUrl) throw new Error(`No URL in response: ${JSON.stringify(data).slice(0,200)}`);
      setAiRemoveResult(outUrl); setAiRemoveStatus('done'); setAiRemoveLog('');
    } catch(e) {
      console.error(e); setAiRemoveStatus('error');
      setAiRemoveLog(e?.message || 'Failed. Check your Claid.ai API key.');
    }
  }, [aiMaskReady, falApiKey, image, filters]);

  // ── Free browser-based AI functions ─────────────────────────────────────

  // Multi-pass bicubic upscale with unsharp mask between passes
  const runBrowserUpscale = useCallback(async () => {
    if (!image) return;
    setAiUpscaleStatus('loading'); setAiUpscaleResult(null); setAiUpscaleLog('Loading image…'); setAiUpscaleProgress(10);
    try {
      const src = bgResult || image;
      const srcImg = await loadImageFromSrc(src);
      const natW = srcImg.naturalWidth, natH = srcImg.naturalHeight;
      const targetW = natW * aiScale, targetH = natH * aiScale;
      const passes = aiScale; // one pass per scale factor for quality

      setAiUpscaleLog(`Upscaling ${natW}×${natH} → ${targetW}×${targetH} in ${passes} passes…`);

      let currentCanvas = document.createElement('canvas');
      currentCanvas.width = natW; currentCanvas.height = natH;
      const initCtx = currentCanvas.getContext('2d');
      initCtx.filter = toCSSFilter(filters);
      initCtx.drawImage(srcImg, 0, 0, natW, natH);
      initCtx.filter = 'none';

      for (let pass = 0; pass < passes; pass++) {
        const passW = Math.round(natW * ((pass + 1) / passes) * aiScale);
        const passH = Math.round(natH * ((pass + 1) / passes) * aiScale);
        const nextCanvas = document.createElement('canvas');
        nextCanvas.width = passW; nextCanvas.height = passH;
        const ctx = nextCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(currentCanvas, 0, 0, passW, passH);
        // Unsharp mask between passes for sharpness retention
        if (pass < passes - 1) {
          applyUnsharpMask(nextCanvas, ctx, passW, passH, 0.6, 1.2);
        } else {
          // Final pass — slightly stronger sharpen
          applyUnsharpMask(nextCanvas, ctx, passW, passH, 0.9, 1.5);
        }
        currentCanvas = nextCanvas;
        setAiUpscaleProgress(Math.round(((pass + 1) / passes) * 90) + 5);
        await new Promise(r => setTimeout(r, 10)); // let UI breathe
      }

      setAiUpscaleProgress(98); setAiUpscaleLog('Encoding result…');
      const resultUrl = currentCanvas.toDataURL('image/jpeg', 0.95);
      const W = currentCanvas.width, H = currentCanvas.height;
      const approxKb = Math.round((resultUrl.length * 0.75) / 1024);
      setAiUpscaleResultSize(`${W.toLocaleString()}×${H.toLocaleString()}px · ~${approxKb > 1024 ? (approxKb/1024).toFixed(1)+'MB' : approxKb+'KB'}`);
      setAiUpscaleResult(resultUrl);
      setAiUpscaleStatus('done'); setAiUpscaleLog(''); setAiUpscaleProgress(100);
    } catch(e) {
      console.error('Upscale error:', e);
      setAiUpscaleStatus('error'); setAiUpscaleLog(e.message || 'Upscale failed');
    }
  }, [image, bgResult, filters, aiScale]);

  // Canvas-based portrait beauty pipeline
  const runBrowserBeauty = useCallback(async () => {
    if (!image) return;
    setAiBeautyStatus('loading'); setAiBeautyResult(null); setAiBeautyLog('Processing…');
    try {
      const src = bgResult || image;
      const srcImg = await loadImageFromSrc(src);
      const W = srcImg.naturalWidth, H = srcImg.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 1. Draw with current filters
      ctx.filter = toCSSFilter(filters);
      ctx.drawImage(srcImg, 0, 0, W, H);
      ctx.filter = 'none';

      // 2. Skin smoothing (adaptive denoise)
      if (aiBeautySmooth > 0) {
        applyNoiseReduction(canvas, ctx, W, H, aiBeautySmooth * 0.5);
      }

      // 3. Auto levels for consistent white balance
      applyAutoLevels(ctx, W, H);

      // 4. Subtle warmth overlay (portrait feel)
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(255,200,150,${aiBeautyGlow * 0.012})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';

      // 5. Clarity / edge sharpening
      if (aiBeautyClarity > 0) {
        applyUnsharpMask(canvas, ctx, W, H, aiBeautyClarity * 0.15, 1.2);
      }

      // 6. Gentle screen glow for luminosity lift
      if (aiBeautyGlow > 0) {
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = W; glowCanvas.height = H;
        const gCtx = glowCanvas.getContext('2d');
        gCtx.filter = `blur(${Math.round(aiBeautyGlow * 3)}px) brightness(1.15)`;
        gCtx.drawImage(canvas, 0, 0);
        gCtx.filter = 'none';
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = aiBeautyGlow * 0.025;
        ctx.drawImage(glowCanvas, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }

      setAiBeautyResult(canvas.toDataURL('image/jpeg', 0.95));
      setAiBeautyStatus('done'); setAiBeautyLog('');
    } catch(e) {
      console.error('Beauty error:', e);
      setAiBeautyStatus('error'); setAiBeautyLog(e.message || 'Beauty filter failed');
    }
  }, [image, bgResult, filters, aiBeautySmooth, aiBeautyClarity, aiBeautyGlow]);

  // ── PANEL ─────────────────────────────────────────────────────────────────
  const dm = darkMode;
  const cardBg  = dm?'#2a2a2a':'#f8f8fd';
  const cardBdr  = dm?'#3a3a3a':'#e8e8f0';
  const inputSt  = {width:"100%",padding:"8px 10px",border:`1.5px solid ${cardBdr}`,borderRadius:"8px",fontSize:"13px",fontFamily:"inherit",outline:"none",background:dm?'#1e1e1e':'#fff',color:dm?'#ddd':'#1a1a1a'};

  const Panel=({inline=false})=>(
    <div style={{display:"flex",flexDirection:"column",gap:"16px",padding:inline?"10px 14px 40px":"14px",background:dm?'#1e1e1e':'#fff',color:dm?'#ddd':'#1a1a1a',transition:'background .3s,color .3s'}}>

      {/* ── TOOLS ── */}
      {activeTab==="tools"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div>
            <SL>Background Removal</SL>
            <p style={{fontSize:"12px",color:"#aaa",lineHeight:1.6,marginBottom:"10px"}}>Runs in your browser — private &amp; free.</p>
            <AB onClick={handleRemoveBg} disabled={!image||bgStatus==="loading"}
              color={bgStatus==="done"?"#f0fff4":image?"purple":"#f0f0f0"} textColor={bgStatus==="done"?"#16a34a":image?"#fff":"#bbb"}
              style={{width:"100%",padding:"11px",marginBottom:"6px"}}>
              {bgStatus==="loading"?<Row><Spin/>Processing... {bgProgress}%</Row>:bgStatus==="done"?"✓ Done — Remove Again":"✂ Remove Background"}
            </AB>
            {bgStatus==="loading"&&<PBar value={bgProgress}/>}
            {bgStatus==="error"&&<p style={{fontSize:"12px",color:"#ef4444",marginTop:"4px"}}>⚠ Failed — try JPG or PNG</p>}
            {!image&&<Empty>Upload a photo first</Empty>}
          </div>
          {bgStatus==="done"&&bgSubUrl&&(
            <div style={{animation:"fadein .3s"}}>
              <SL>Background Style</SL>
              {[{id:"transparent",l:"Transparent",i:"◻"},{id:"color",l:"Solid Color",i:"🎨"},{id:"blur",l:"Blur Original",i:"✦"}].map(o=>(
                <button key={o.id} onClick={()=>setBgMode(o.id)}
                  style={{width:"100%",padding:"10px 12px",marginBottom:"6px",border:`1.5px solid ${bgMode===o.id?"#6c63ff":cardBdr}`,background:bgMode===o.id?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"10px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",transition:"all .18s",fontFamily:"inherit"}}>
                  <span style={{fontSize:"15px"}}>{o.i}</span>
                  <span style={{fontSize:"13px",fontWeight:600,color:bgMode===o.id?"#6c63ff":dm?'#ccc':'#444'}}>{o.l}</span>
                  {bgMode===o.id&&<span style={{marginLeft:"auto",color:"#6c63ff"}}>✓</span>}
                </button>
              ))}
              {bgMode==="color"&&(
                <div style={{padding:"12px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"10px",marginBottom:"8px"}}>
                  <div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginBottom:"10px"}}>
                    {BG_COLORS.map(c=><div key={c} onClick={()=>setBgColor(c)} style={{width:"26px",height:"26px",borderRadius:"6px",background:c,border:`2.5px solid ${bgColor===c?"#6c63ff":"#ddd"}`,cursor:"pointer",flexShrink:0}}/>)}
                  </div>
                  <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{width:"100%",height:"32px",border:`1.5px solid ${cardBdr}`,borderRadius:"8px",cursor:"pointer"}}/>
                </div>
              )}
              {bgMode==="blur"&&(
                <div style={{padding:"12px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"10px",marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em"}}>Blur</span>
                    <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:600}}>{bgBlur}px</span>
                  </div>
                  <input type="range" className="sl" min={2} max={40} step={1} value={bgBlur} style={{"--v":`${((bgBlur-2)/38)*100}%`}} onChange={e=>setBgBlur(+e.target.value)}/>
                </div>
              )}
              {bgResult&&(<>
                <div style={{position:"relative",borderRadius:"10px",overflow:"hidden",margin:"8px 0",border:"1.5px solid #eee"}}>
                  {bgMode==="transparent"&&<div className="checker" style={{position:"absolute",inset:0}}/>}
                  <img src={bgResult} alt="result" style={{width:"100%",display:"block",position:"relative"}}/>
                </div>
                <AB onClick={async()=>await saveFile(await(await fetch(bgResult)).blob(),"photolab_nobg.png")} color="purple" textColor="#fff" style={{width:"100%",padding:"11px"}}>↓ Download PNG</AB>
              </>)}
            </div>
          )}
          {/* ── AI Features ── */}
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>

            {/* Free badge */}
            <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",background:dm?'#0f2a1a':'#f0fff4',border:"1.5px solid #86efac",borderRadius:"10px"}}>
              <span style={{fontSize:"14px"}}>✅</span>
              <span style={{fontSize:"12px",fontWeight:600,color:"#16a34a"}}>Upscale & Beauty run 100% free in your browser — no API key needed.</span>
            </div>

            {/* Feature selector */}
            <div style={{display:"flex",gap:"6px"}}>
              {[{id:'upscale',icon:'⬆️',label:'Smart Upscale'},{id:'beauty',icon:'✨',label:'Beauty Filter'},{id:'remove',icon:'🧹',label:'Remove Object'}].map(f=>(
                <button key={f.id} onClick={()=>setAiActiveFeature(aiActiveFeature===f.id?null:f.id)}
                  style={{flex:1,padding:"10px 4px",border:`1.5px solid ${aiActiveFeature===f.id?'#6c63ff':cardBdr}`,
                    background:aiActiveFeature===f.id?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#fff',
                    borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all .18s"}}>
                  <div style={{fontSize:"18px",marginBottom:"3px"}}>{f.icon}</div>
                  <div style={{fontSize:"10px",fontWeight:700,color:aiActiveFeature===f.id?'#6c63ff':dm?'#ccc':'#555'}}>{f.label}</div>
                </button>
              ))}
            </div>

            {!image&&<Empty>Upload a photo to use AI features</Empty>}

            {/* ── SMART UPSCALE (free, in-browser) ── */}
            {aiActiveFeature==='upscale'&&image&&(
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px",display:"flex",flexDirection:"column",gap:"10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <SL>Smart Upscale</SL>
                  <span style={{fontSize:"10px",fontWeight:700,padding:"2px 8px",background:"#f0fff4",color:"#16a34a",borderRadius:"20px",border:"1px solid #86efac",marginBottom:"8px"}}>FREE • In-Browser</span>
                </div>
                <p style={{fontSize:"11px",color:"#aaa",lineHeight:1.5}}>Multi-pass bicubic upscaling with unsharp mask sharpening between each pass. Produces far sharper results than a single resize — runs entirely in your browser.</p>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Scale factor</span>
                    <span style={{fontSize:"12px",fontWeight:700,color:"#6c63ff"}}>{aiScale}×</span>
                  </div>
                  <div style={{display:"flex",gap:"6px"}}>
                    {[2,3,4].map(s=>(
                      <button key={s} onClick={()=>setAiScale(s)}
                        style={{flex:1,padding:"8px",border:`1.5px solid ${aiScale===s?'#6c63ff':cardBdr}`,
                          background:aiScale===s?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#fff',
                          borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",
                          color:aiScale===s?'#6c63ff':dm?'#ccc':'#555',fontFamily:"inherit"}}>
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
                <AB onClick={runBrowserUpscale}
                  disabled={aiUpscaleStatus==='loading'}
                  color={aiUpscaleStatus==='done'?'#f0fff4':'purple'}
                  textColor={aiUpscaleStatus==='done'?'#16a34a':'#fff'}
                  style={{width:"100%",padding:"11px"}}>
                  {aiUpscaleStatus==='loading'?<Row><Spin/>Upscaling…</Row>
                   :aiUpscaleStatus==='done'?'✓ Done — Run Again'
                   :'⬆️ Upscale Image'}
                </AB>
                {aiUpscaleLog&&<p style={{fontSize:"11px",color:aiUpscaleStatus==='error'?'#ef4444':'#a78bfa',lineHeight:1.4}}>{aiUpscaleLog}</p>}
                {aiUpscaleStatus==='loading'&&<PBar value={aiUpscaleProgress}/>}
                {aiUpscaleResult&&(
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    <div style={{borderRadius:"8px",overflow:"hidden",border:`1px solid ${cardBdr}`,position:"relative"}}>
                      <img src={aiUpscaleResult} alt="upscaled" style={{width:"100%",display:"block"}}/>
                      <div style={{position:"absolute",bottom:"6px",right:"6px",padding:"3px 8px",background:"rgba(0,0,0,.6)",borderRadius:"12px",fontSize:"10px",fontWeight:600,color:"#fff"}}>{aiUpscaleResultSize}</div>
                    </div>
                    <div style={{display:"flex",gap:"7px"}}>
                      <AB onClick={()=>applyAiResult(aiUpscaleResult)} color={dm?'#252525':'#f2f2f8'} textColor={dm?'#ccc':'#555'} style={{flex:1,padding:"9px",fontSize:"12px"}}>← Apply to Editor</AB>
                      <AB onClick={async()=>saveFile(await(await fetch(aiUpscaleResult)).blob(),'upscaled.jpg')} color="purple" textColor="#fff" style={{flex:1,padding:"9px",fontSize:"12px"}}>↓ Download</AB>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── BEAUTY FILTER (free, in-browser) ── */}
            {aiActiveFeature==='beauty'&&image&&(
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px",display:"flex",flexDirection:"column",gap:"10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <SL>Beauty Filter</SL>
                  <span style={{fontSize:"10px",fontWeight:700,padding:"2px 8px",background:"#f0fff4",color:"#16a34a",borderRadius:"20px",border:"1px solid #86efac",marginBottom:"8px"}}>FREE • In-Browser</span>
                </div>
                <p style={{fontSize:"11px",color:"#aaa",lineHeight:1.5}}>Portrait retouching pipeline: adaptive skin smoothing, edge sharpening, auto white balance, subtle warmth + clarity boost. All runs locally.</p>
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                      <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Smooth</span>
                      <span style={{fontSize:"12px",fontWeight:700,color:"#6c63ff"}}>{aiBeautySmooth}</span>
                    </div>
                    <input type="range" className="sl" min={0} max={10} step={1} value={aiBeautySmooth}
                      style={{"--v":`${(aiBeautySmooth/10)*100}%`}} onChange={e=>setAiBeautySmooth(+e.target.value)}/>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                      <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Clarity</span>
                      <span style={{fontSize:"12px",fontWeight:700,color:"#6c63ff"}}>{aiBeautyClarity}</span>
                    </div>
                    <input type="range" className="sl" min={0} max={10} step={1} value={aiBeautyClarity}
                      style={{"--v":`${(aiBeautyClarity/10)*100}%`}} onChange={e=>setAiBeautyClarity(+e.target.value)}/>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                      <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Glow</span>
                      <span style={{fontSize:"12px",fontWeight:700,color:"#6c63ff"}}>{aiBeautyGlow}</span>
                    </div>
                    <input type="range" className="sl" min={0} max={10} step={1} value={aiBeautyGlow}
                      style={{"--v":`${(aiBeautyGlow/10)*100}%`}} onChange={e=>setAiBeautyGlow(+e.target.value)}/>
                  </div>
                </div>
                <AB onClick={runBrowserBeauty}
                  disabled={aiBeautyStatus==='loading'}
                  color={aiBeautyStatus==='done'?'#f0fff4':'purple'}
                  textColor={aiBeautyStatus==='done'?'#16a34a':'#fff'}
                  style={{width:"100%",padding:"11px"}}>
                  {aiBeautyStatus==='loading'?<Row><Spin/>Processing…</Row>
                   :aiBeautyStatus==='done'?'✓ Done — Run Again'
                   :'✨ Apply Beauty Filter'}
                </AB>
                {aiBeautyLog&&<p style={{fontSize:"11px",color:aiBeautyStatus==='error'?'#ef4444':'#a78bfa',lineHeight:1.4}}>{aiBeautyLog}</p>}
                {aiBeautyResult&&(
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    <div style={{borderRadius:"8px",overflow:"hidden",border:`1px solid ${cardBdr}`}}>
                      <img src={aiBeautyResult} alt="beauty" style={{width:"100%",display:"block"}}/>
                    </div>
                    <div style={{display:"flex",gap:"7px"}}>
                      <AB onClick={()=>applyAiResult(aiBeautyResult)} color={dm?'#252525':'#f2f2f8'} textColor={dm?'#ccc':'#555'} style={{flex:1,padding:"9px",fontSize:"12px"}}>← Apply to Editor</AB>
                      <AB onClick={async()=>saveFile(await(await fetch(aiBeautyResult)).blob(),'beauty.jpg')} color="purple" textColor="#fff" style={{flex:1,padding:"9px",fontSize:"12px"}}>↓ Download</AB>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── OBJECT REMOVAL (Claid.ai — 50 free credits) ── */}
            {aiActiveFeature==='remove'&&image&&(
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px",display:"flex",flexDirection:"column",gap:"10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <SL>Object Removal — LaMa Inpainting</SL>
                  <span style={{fontSize:"10px",fontWeight:700,padding:"2px 8px",background:"#fff8e7",color:"#b45309",borderRadius:"20px",border:"1px solid #fcd34d",marginBottom:"8px"}}>50 FREE CREDITS</span>
                </div>
                <div style={{padding:"10px 12px",background:dm?'#1e2a10':'#f0fdf4',border:"1px solid #86efac",borderRadius:"8px",fontSize:"11px",color:dm?'#86efac':'#166534',lineHeight:1.6}}>
                  🎁 Sign up free at <strong>claid.ai</strong> → you get <strong>50 free credits</strong> (50 removals). No credit card needed. Get your API key from Settings → API.
                </div>
                {/* Claid API Key */}
                <div>
                  <div style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"5px"}}>Claid.ai API Key</div>
                  <input type="password" value={falApiKey} onChange={e=>saveFalKey(e.target.value)}
                    placeholder="your-claid-api-key"
                    style={{width:"100%",padding:"8px 10px",border:`1px solid ${falApiKey?'#6c63ff':cardBdr}`,borderRadius:"8px",fontSize:"12px",fontFamily:"monospace",outline:"none",background:dm?'#0e0e1a':'#fff',color:dm?'#ddd':'#333'}}/>
                  {falApiKey&&<p style={{fontSize:"10px",color:"#16a34a",marginTop:"4px",fontWeight:600}}>✓ Key saved</p>}
                </div>
                <p style={{fontSize:"11px",color:"#aaa",lineHeight:1.5}}>Paint over the object you want removed. LaMa fills it with context-aware inpainting.</p>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Brush size</span>
                    <span style={{fontSize:"12px",fontWeight:700,color:"#6c63ff"}}>{aiRemoveBrush}px</span>
                  </div>
                  <input type="range" className="sl" min={10} max={120} step={5} value={aiRemoveBrush}
                    style={{"--v":`${((aiRemoveBrush-10)/110)*100}%`}}
                    onChange={e=>setAiRemoveBrush(+e.target.value)}/>
                </div>
                <div style={{position:"relative",borderRadius:"8px",overflow:"hidden",border:`1.5px solid ${aiMaskReady?'#f59e0b':cardBdr}`,cursor:"crosshair",lineHeight:0,userSelect:"none"}}
                  onMouseDown={e=>{maskDrawingRef.current=true; drawMask(e,e.currentTarget);}}
                  onMouseMove={e=>drawMask(e,e.currentTarget)}
                  onMouseUp={()=>{maskDrawingRef.current=false;}}
                  onMouseLeave={()=>{maskDrawingRef.current=false;}}
                  onTouchStart={e=>{e.preventDefault();maskDrawingRef.current=true;drawMask(e,e.currentTarget);}}
                  onTouchMove={e=>{e.preventDefault();drawMask(e,e.currentTarget);}}
                  onTouchEnd={()=>{maskDrawingRef.current=false;}}>
                  <img src={image} alt="source" style={{width:"100%",display:"block",filter:toCSSFilter(filters)}} onLoad={initMaskCanvas}/>
                  <canvas ref={maskCanvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.5,mixBlendMode:"screen",pointerEvents:"none"}}/>
                  {aiMaskReady&&<div style={{position:"absolute",top:"6px",left:"6px",padding:"3px 8px",background:"rgba(245,158,11,.9)",borderRadius:"12px",fontSize:"10px",fontWeight:700,color:"#fff"}}>✏ Mask painted</div>}
                </div>
                <div style={{display:"flex",gap:"7px"}}>
                  <button onClick={()=>{initMaskCanvas();setAiRemoveResult(null);setAiRemoveStatus('idle');}}
                    style={{flex:1,padding:"9px",border:`1px solid ${cardBdr}`,background:dm?'#252525':'#f2f2f8',borderRadius:"9px",fontSize:"12px",fontWeight:600,color:dm?'#ccc':'#666',cursor:"pointer",fontFamily:"inherit"}}>
                    🗑 Clear
                  </button>
                  <AB onClick={handleAiRemove}
                    disabled={aiRemoveStatus==='loading'||!aiMaskReady||!falApiKey}
                    color={aiRemoveStatus==='done'?'#f0fff4':'purple'}
                    textColor={aiRemoveStatus==='done'?'#16a34a':'#fff'}
                    style={{flex:2,padding:"9px",fontSize:"12px"}}>
                    {aiRemoveStatus==='loading'?<Row><Spin/>Removing…</Row>
                     :aiRemoveStatus==='done'?'✓ Done — Paint Again'
                     :!falApiKey?'Enter API key above'
                     :'🧹 Remove Object'}
                  </AB>
                </div>
                {aiRemoveLog&&<p style={{fontSize:"11px",color:aiRemoveStatus==='error'?'#ef4444':'#a78bfa',lineHeight:1.4}}>{aiRemoveLog}</p>}
                {aiRemoveStatus==='loading'&&<PBar value={50}/>}
                {aiRemoveResult&&(
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    <div style={{borderRadius:"8px",overflow:"hidden",border:`1px solid ${cardBdr}`}}>
                      <img src={aiRemoveResult} alt="result" style={{width:"100%",display:"block"}}/>
                    </div>
                    <div style={{display:"flex",gap:"7px"}}>
                      <AB onClick={()=>applyAiResult(aiRemoveResult)} color={dm?'#252525':'#f2f2f8'} textColor={dm?'#ccc':'#555'} style={{flex:1,padding:"9px",fontSize:"12px"}}>← Apply to Editor</AB>
                      <AB onClick={async()=>saveFile(await(await fetch(aiRemoveResult)).blob(),'removed.jpg')} color="purple" textColor="#fff" style={{flex:1,padding:"9px",fontSize:"12px"}}>↓ Download</AB>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADJUST ── */}
      {activeTab==="adjust"&&(<>
        {!image&&<Empty>Upload a photo first</Empty>}
        {image&&(<>
          <div>
            <SL>Rotate & Flip</SL>
            <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
              {[{l:"↺ -90°",a:()=>setRotation(r=>(r-90+360)%360)},{l:"↻ +90°",a:()=>setRotation(r=>(r+90)%360)},{l:"↔ Flip H",a:()=>setFlipH(v=>!v),active:flipH},{l:"↕ Flip V",a:()=>setFlipV(v=>!v),active:flipV}].map(b=>(
                <button key={b.l} onClick={b.a}
                  style={{flex:1,padding:"9px 4px",border:`1.5px solid ${b.active?"#6c63ff":cardBdr}`,background:b.active?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"9px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:b.active?"#6c63ff":dm?'#ccc':'#555',fontFamily:"inherit"}}>
                  {b.l}
                </button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
              <span style={{fontSize:"13px",fontWeight:500,color:rotation!==0?"#6c63ff":dm?'#ccc':'#666'}}>Fine Rotate</span>
              <span style={{fontSize:"12px",color:"#bbb"}}>{rotation}°</span>
            </div>
            <input type="range" className="sl" min={-180} max={180} step={1} value={rotation} style={{"--v":`${((rotation+180)/360)*100}%`}} onChange={e=>setRotation(+e.target.value)}/>
            {rotation!==0&&<button onClick={()=>setRotation(0)} style={{marginTop:"6px",fontSize:"11px",color:"#6c63ff",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Reset rotation</button>}
          </div>
          <div>
            <SL>Crop</SL>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"10px"}}>
              {["free","1:1","4:3","16:9","9:16","3:4"].map(r=>(
                <button key={r} onClick={()=>{setCropAspectRatio(r);setCropMode(true);}}
                  style={{padding:"7px 10px",border:`1.5px solid ${cropAspect===r&&cropMode?"#6c63ff":cardBdr}`,background:cropAspect===r&&cropMode?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"8px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:cropAspect===r&&cropMode?"#6c63ff":dm?'#ccc':'#555',fontFamily:"inherit"}}>
                  {r==="free"?"✦ Free":r}
                </button>
              ))}
            </div>
            {cropMode&&(
              <div style={{display:"flex",gap:"8px"}}>
                <AB onClick={applyCrop} color="purple" textColor="#fff" style={{flex:1,padding:"10px"}}>✓ Apply Crop</AB>
                <AB onClick={()=>{setCropMode(false);setCropBox({x:0,y:0,w:100,h:100});setCropAspect("free");}} color={dm?'#333':'#f2f2f8'} textColor={dm?'#ccc':'#666'} style={{flex:1,padding:"10px"}}>Cancel</AB>
              </div>
            )}
            {!cropMode&&<p style={{fontSize:"11px",color:"#bbb",lineHeight:1.5}}>Select a ratio to enter crop mode.</p>}
          </div>
        </>)}
      </>)}

      {/* ── OVERLAY ── */}
      {activeTab==="overlay"&&(<>
        {!image&&<Empty>Upload a photo first</Empty>}
        {image&&(<>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <SL>Text Overlays</SL>
              <button onClick={addText} style={{padding:"6px 12px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>+ Add Text</button>
            </div>
            {texts.length===0&&<Empty>Tap "+ Add Text" to add text to your photo</Empty>}
            {texts.map(t=>(
              <div key={t.id} onClick={()=>setSelText(t.id)}
                style={{padding:"10px 12px",border:`1.5px solid ${selText===t.id?"#6c63ff":cardBdr}`,background:selText===t.id?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"10px",marginBottom:"7px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"13px",fontWeight:500,color:dm?'#ccc':'#444',maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.content}</span>
                  <button onClick={e=>{e.stopPropagation();deleteText(t.id);}} style={{background:"#fee2e2",border:"none",borderRadius:"6px",padding:"3px 7px",fontSize:"11px",color:"#ef4444",cursor:"pointer",fontWeight:600}}>✕</button>
                </div>
              </div>
            ))}
            {selectedText&&(
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"10px",animation:"fadein .2s",marginTop:"4px"}}>
                <div style={{marginBottom:"10px"}}>
                  <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:"5px"}}>Text</span>
                  <input value={selectedText.content} onChange={e=>updateText(selText,"content",e.target.value)} style={inputSt}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                  <div>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:"5px"}}>Font</span>
                    <select value={selectedText.font} onChange={e=>updateText(selText,"font",e.target.value)} style={{...inputSt}}>
                      {FONTS.map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:"5px"}}>Color</span>
                    <input type="color" value={selectedText.color} onChange={e=>updateText(selText,"color",e.target.value)} style={{width:"100%",height:"34px",border:`1.5px solid ${cardBdr}`,borderRadius:"8px",cursor:"pointer"}}/>
                  </div>
                </div>
                <div style={{marginBottom:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em"}}>Size</span>
                    <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:600}}>{selectedText.fontSize}px</span>
                  </div>
                  <input type="range" className="sl" min={12} max={200} step={2} value={selectedText.fontSize} style={{"--v":`${((selectedText.fontSize-12)/188)*100}%`}} onChange={e=>updateText(selText,"fontSize",+e.target.value)}/>
                </div>
                <div style={{marginBottom:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em"}}>Position Y</span>
                    <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:600}}>{selectedText.y}%</span>
                  </div>
                  <input type="range" className="sl" min={5} max={95} step={1} value={selectedText.y} style={{"--v":`${((selectedText.y-5)/90)*100}%`}} onChange={e=>updateText(selText,"y",+e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  {[{k:"bold",l:"Bold"},{k:"italic",l:"Italic"},{k:"stroke",l:"Outline"}].map(o=>(
                    <button key={o.k} onClick={()=>updateText(selText,o.k,!selectedText[o.k])}
                      style={{flex:1,padding:"7px",border:`1.5px solid ${selectedText[o.k]?"#6c63ff":cardBdr}`,background:selectedText[o.k]?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer",color:selectedText[o.k]?"#6c63ff":dm?'#ccc':'#777',fontFamily:"inherit"}}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>)}
      </>)}

      {/* ── EDIT ── */}
      {activeTab==="edit"&&(<>
        <div>
          <SL>Presets</SL>
          <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"4px"}}>
            {PRESETS.map(p=>(
              <button key={p.name} onClick={()=>setFilters({...DEFAULT_FILTERS,...p.values})}
                style={{flexShrink:0,padding:"8px 12px",border:`1.5px solid ${cardBdr}`,background:dm?'#2a2a2a':'#fff',borderRadius:"10px",textAlign:"center",cursor:"pointer",transition:"all .18s",fontFamily:"inherit",minWidth:"70px"}}>
                <div style={{fontSize:"18px",marginBottom:"2px"}}>{p.icon}</div>
                <div style={{fontSize:"10px",fontWeight:600,color:dm?'#aaa':'#666'}}>{p.name}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{display:"flex",gap:"2px",marginBottom:"14px",background:dm?'#2a2a2a':'#f2f2f8',padding:"3px",borderRadius:"10px",overflowX:"auto"}}>
            {FILTER_GROUPS.map(g=>(
              <button key={g.key} onClick={()=>setFilterGroup(g.key)}
                style={{flex:"1 0 auto",padding:"6px 8px",fontSize:"11px",fontWeight:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:filterGroup===g.key?(dm?'#444':'#fff'):'transparent',color:filterGroup===g.key?"#6c63ff":"#999",borderRadius:"8px",boxShadow:filterGroup===g.key?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .18s",whiteSpace:"nowrap"}}>
                {g.label}
              </button>
            ))}
          </div>
          {COLOR_FILTERS.filter(f=>f.group===filterGroup).map(f=>{
            const val=filters[f.key]; const pct=((val-f.min)/(f.max-f.min))*100; const changed=val!==f.default;
            return(
              <div key={f.key} style={{marginBottom:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"13px",fontWeight:500,color:changed?"#6c63ff":dm?'#ccc':'#666'}}>{f.label}</span>
                  <span style={{fontSize:"12px",color:"#bbb",fontVariantNumeric:"tabular-nums"}}>{val>0&&f.default===0?"+":""}{Number.isInteger(val)?val:val.toFixed(1)}{f.unit}</span>
                </div>
                <input type="range" className="sl" min={f.min} max={f.max} step={f.max<=20?.5:1} value={val}
                  style={{"--v":`${pct}%`}} onChange={e=>setFilters(p=>({...p,[f.key]:parseFloat(e.target.value)}))}/>
              </div>
            );
          })}
        </div>
        {isEdited&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"4px",borderTop:`1px solid ${cardBdr}`}}>
            <span style={{fontSize:"11px",color:"#bbb"}}>{Object.entries(filters).filter(([k,v])=>v!==DEFAULT_FILTERS[k]).length + (rotation!==0?1:0) + (flipH?1:0) + (flipV?1:0)} adjustments</span>
            <button onClick={resetAll} style={{fontSize:"11px",color:"#6c63ff",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Reset all</button>
          </div>
        )}
      </>)}

      {/* ── BATCH — rendered as full page via BatchPage component ── */}
      {activeTab==="batch"&&(
        <div style={{padding:"16px",color:dm?'#aaa':'#888',fontSize:"13px",textAlign:"center"}}>
          <div style={{fontSize:"32px",marginBottom:"8px"}}>📦</div>
          Batch mode opens as a full-page view.
        </div>
      )}

    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",background:dm?'#121212':'#f7f8fa',minHeight:"100vh",color:dm?'#e0e0e0':'#1a1a1a',WebkitTapHighlightColor:"transparent",transition:'background .3s,color .3s'}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
        .sl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;background:linear-gradient(to right,#6c63ff var(--v,50%),#e0e0e8 var(--v,50%));touch-action:none;cursor:grab}
        .sl:active{cursor:grabbing}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#6c63ff;border:3px solid #fff;box-shadow:0 1px 6px rgba(108,99,255,.4);cursor:grab;will-change:transform;transition:transform .1s,box-shadow .1s}
        .sl:active::-webkit-slider-thumb{cursor:grabbing;transform:scale(1.18);box-shadow:0 2px 10px rgba(108,99,255,.55)}
        .sl::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#6c63ff;border:3px solid #fff;box-shadow:0 1px 6px rgba(108,99,255,.4);cursor:grab;transition:transform .1s}
        .sl:active::-moz-range-thumb{cursor:grabbing;transform:scale(1.18)}
        .sl::-webkit-slider-runnable-track{cursor:grab}
        .sl:active::-webkit-slider-runnable-track{cursor:grabbing}
        button{touch-action:manipulation;font-family:inherit}
        input[type=range]{touch-action:none}
        .checker{background-image:linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}
        .drop{border:2px dashed #d0d0e0;cursor:pointer;transition:all .25s;border-radius:16px}
        .drop:hover,.drop.on{border-color:#6c63ff;background:rgba(108,99,255,.03)}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
      `}</style>

      {/* HEADER */}
      <header style={{background:dm?'#1e1e1e':'#fff',borderBottom:`1px solid ${dm?'#333':'#eee'}`,height:"52px",padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:dm?'0 1px 4px rgba(255,255,255,.05)':'0 1px 4px rgba(0,0,0,.05)'}}>
        <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
          <div style={{width:"30px",height:"30px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0}}>✨</div>
          <div style={{fontSize:"16px",fontWeight:700,color:dm?'#f0f0f0':'#1a1a2e',letterSpacing:"-.3px"}}>PHOTOlab</div>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <button onClick={()=>setDarkMode(!darkMode)} style={{background:'transparent',border:'none',fontSize:'18px',cursor:'pointer',padding:'4px 8px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',color:dm?'#ffd43b':'#666'}} title={dm?'Light Mode':'Dark Mode'}>
            {dm?'☀️':'🌙'}
          </button>
          <div style={{display:"flex",background:dm?'#2a2a2a':'#f2f2f8',borderRadius:"10px",padding:"3px",gap:"2px",overflowX:"auto"}}>
            {[["edit","✏️","Edit"],["adjust","✂️","Adjust"],["overlay","🔤","Overlay"],["tools","🛠","Tools"],["batch","📦","Batch"]].map(([id,ic,lb])=>(
              <button key={id} onClick={()=>setActiveTab(id)}
                style={{padding:isMobile?"5px 8px":"5px 12px",fontSize:"12px",fontWeight:600,border:"none",cursor:"pointer",background:activeTab===id?(dm?'#444':'#fff'):'transparent',color:activeTab===id?'#6c63ff':(dm?'#aaa':'#888'),borderRadius:"8px",boxShadow:activeTab===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s",whiteSpace:"nowrap"}}>
                {isMobile?ic:`${ic} ${lb}`}
              </button>
            ))}
          </div>
          {image&&(
            <button onClick={()=>setShowExport(true)}
              style={{padding:"7px 14px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(108,99,255,.3)",flexShrink:0}}>
              {isMobile?"↓":"↓ Export"}
            </button>
          )}
        </div>
      </header>

      {/* DESKTOP */}
      {!isMobile&&(
        activeTab==="batch" ? (
          <BatchPage {...{dm,cardBg,cardBdr,inputSt,
            sourceHandle,outputHandle,batchImages,selectSourceFolder,selectOutputFolder,
            batchResizeMode,setBatchResizeMode,batchResizePreset,setBatchResizePreset,
            batchCustomW,setBatchCustomW,batchCustomH,setBatchCustomH,
            batchKeepAspect,setBatchKeepAspect,batchLongEdgePx,setBatchLongEdgePx,
            batchAutoLevels,setBatchAutoLevels,batchAutoContrast,setBatchAutoContrast,
            batchSharpen,setBatchSharpen,batchSharpenAmt,setBatchSharpenAmt,batchSharpenRad,setBatchSharpenRad,
            batchDenoise,setBatchDenoise,batchDenoiseAmt,setBatchDenoiseAmt,
            batchLogo,setBatchLogo,batchLogoFile,setBatchLogoFile,handleBatchLogoUpload,
            batchLogoScale,setBatchLogoScale,batchLogoOpacity,setBatchLogoOpacity,
            batchLogoPos,setBatchLogoPos,batchLogoMargin,setBatchLogoMargin,
            batchOutputFmt,setBatchOutputFmt,batchOutputQ,setBatchOutputQ,
            batchPrefix,setBatchPrefix,batchSuffix,setBatchSuffix,
            batchProcessing,batchProgress,batchDone,handleBatchProcess,
            batchPreviewIdx,batchPreviewOrigUrl,batchPreviewAfterUrl,
            batchPreviewLoading,batchPreviewSplit,setBatchPreviewSplit,
            batchPreviewDragging,setBatchPreviewDragging,
            batchPreviewOpen,setBatchPreviewOpen,generateBatchPreview,
            filters,setFilters,resetAll,calcBatchDims,BATCH_RESIZE_PRESETS,DEFAULT_FILTERS,COLOR_FILTERS,FILTER_GROUPS,PRESETS,batchFilterGroup,setBatchFilterGroup}}/>
        ) : (
          <div style={{display:"flex",height:"calc(100vh - 52px)"}}>
            <div style={{width:"310px",borderRight:`1px solid ${dm?'#333':'#eee'}`,overflowY:"auto",background:dm?'#1e1e1e':'#fff',flexShrink:0}}>
              <Panel/>
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:dm?'#181818':'#f7f8fa',position:"relative",overflow:"hidden"}}>
              <Preview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,previewRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,isDragSplit,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}}/>
            </div>
          </div>
        )
      )}

      {/* MOBILE */}
      {isMobile&&(
        activeTab==="batch" ? (
          <div style={{height:"calc(100vh - 52px)",overflowY:"auto",background:dm?'#121212':'#f7f8fa'}}>
            <BatchPage {...{dm,cardBg,cardBdr,inputSt,isMobile:true,
              sourceHandle,outputHandle,batchImages,selectSourceFolder,selectOutputFolder,
              batchResizeMode,setBatchResizeMode,batchResizePreset,setBatchResizePreset,
              batchCustomW,setBatchCustomW,batchCustomH,setBatchCustomH,
              batchKeepAspect,setBatchKeepAspect,batchLongEdgePx,setBatchLongEdgePx,
              batchAutoLevels,setBatchAutoLevels,batchAutoContrast,setBatchAutoContrast,
              batchSharpen,setBatchSharpen,batchSharpenAmt,setBatchSharpenAmt,batchSharpenRad,setBatchSharpenRad,
              batchDenoise,setBatchDenoise,batchDenoiseAmt,setBatchDenoiseAmt,
              batchLogo,setBatchLogo,batchLogoFile,setBatchLogoFile,handleBatchLogoUpload,
              batchLogoScale,setBatchLogoScale,batchLogoOpacity,setBatchLogoOpacity,
              batchLogoPos,setBatchLogoPos,batchLogoMargin,setBatchLogoMargin,
              batchOutputFmt,setBatchOutputFmt,batchOutputQ,setBatchOutputQ,
              batchPrefix,setBatchPrefix,batchSuffix,setBatchSuffix,
              batchProcessing,batchProgress,batchDone,handleBatchProcess,
              batchPreviewIdx,batchPreviewOrigUrl,batchPreviewAfterUrl,
              batchPreviewLoading,batchPreviewSplit,setBatchPreviewSplit,
              batchPreviewDragging,setBatchPreviewDragging,
              batchPreviewOpen,setBatchPreviewOpen,generateBatchPreview,
              filters,setFilters,resetAll,calcBatchDims,BATCH_RESIZE_PRESETS,DEFAULT_FILTERS,COLOR_FILTERS,FILTER_GROUPS,PRESETS,batchFilterGroup,setBatchFilterGroup}}/>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden"}}>
            <div style={{height:"42vh",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:dm?'#181818':'#f0f1f5',position:"relative",borderBottom:`1px solid ${dm?'#333':'#e8e8f0'}`}}>
              <Preview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,previewRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,isDragSplit,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}}/>
            </div>
            <div style={{flex:1,overflowY:"auto",background:dm?'#1e1e1e':'#fff',WebkitOverflowScrolling:"touch"}}>
              {image&&activeTab==="edit"&&(
                <div style={{display:"flex",gap:"6px",padding:"10px 12px",borderBottom:`1px solid ${dm?'#333':'#f0f0f4'}`,background:dm?'#1e1e1e':'#fff',position:"sticky",top:0,zIndex:10,overflowX:"auto"}}>
                  {PRESETS.slice(0,5).map(p=>(
                    <button key={p.name} onClick={()=>setFilters({...DEFAULT_FILTERS,...p.values})}
                      style={{flexShrink:0,padding:"7px 10px",border:`1.5px solid ${dm?'#333':'#e8e8f0'}`,background:dm?'#2a2a2a':'#fff',borderRadius:"9px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:dm?'#ccc':'#555',fontFamily:"inherit"}}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                  <button onClick={resetAll} style={{flexShrink:0,padding:"7px 10px",background:dm?'#333':'#f2f2f8',border:"none",borderRadius:"9px",fontSize:"11px",fontWeight:600,color:"#888",cursor:"pointer"}}>↺</button>
                </div>
              )}
              <Panel inline/>
            </div>
          </div>
        )
      )}

      {/* EXPORT MODAL */}
      {showExport&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:isMobile?"0":"20px"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowExport(false);}}>
          <div style={{background:dm?'#1e1e1e':'#fff',borderRadius:isMobile?"16px 16px 0 0":"16px",width:"100%",maxWidth:"460px",maxHeight:"90vh",overflowY:"auto",padding:"22px",animation:"slideup .25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
              <div>
                <div style={{fontSize:"18px",fontWeight:700,color:dm?'#f0f0f0':'#1a1a2e'}}>Export Photo</div>
                <div style={{fontSize:"12px",color:"#bbb",marginTop:"2px"}}>High quality · All platforms</div>
              </div>
              <button onClick={()=>setShowExport(false)} style={{background:dm?'#333':'#f2f2f8',border:"none",width:"34px",height:"34px",borderRadius:"8px",cursor:"pointer",fontSize:"18px",color:"#888"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:"3px",marginBottom:"18px",background:dm?'#2a2a2a':'#f2f2f8',padding:"3px",borderRadius:"10px"}}>
              {[["standard","Standard"],["facebook","📘 Social"]].map(([id,lb])=>(
                <button key={id} onClick={()=>setExportTab(id)}
                  style={{flex:1,padding:"9px",fontSize:"13px",fontWeight:600,border:"none",cursor:"pointer",background:exportTab===id?(id==="facebook"?"#1877f2":(dm?'#444':'#fff')):"transparent",color:exportTab===id?(id==="facebook"?"#fff":"#6c63ff"):"#999",borderRadius:"8px",boxShadow:exportTab===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s"}}>
                  {lb}
                </button>
              ))}
            </div>
            {exportTab==="standard"&&(<>
              <SL>Format</SL>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"16px"}}>
                {[{id:"jpg",l:"JPEG",d:"Best for photos"},{id:"png",l:"PNG",d:"Lossless"},{id:"webp",l:"WebP",d:"Smallest size"}].map(f=>(
                  <button key={f.id} onClick={()=>setExportFmt(f.id)}
                    style={{padding:"10px 14px",border:`1.5px solid ${exportFmt===f.id?"#6c63ff":dm?'#333':'#eee'}`,background:exportFmt===f.id?(dm?'#2a2a3a':'#faf9ff'):dm?'#1e1e1e':'#fff',borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                    <div><span style={{fontSize:"13px",fontWeight:600,color:exportFmt===f.id?"#6c63ff":dm?'#ccc':'#444'}}>{f.l}</span><span style={{fontSize:"11px",color:"#bbb",marginLeft:"10px"}}>{f.d}</span></div>
                    {exportFmt===f.id&&<span style={{color:"#6c63ff",fontSize:"18px"}}>✓</span>}
                  </button>
                ))}
              </div>
              {exportFmt!=="png"&&(<>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><SL>Quality</SL><span style={{fontSize:"13px",fontWeight:700,color:"#6c63ff"}}>{exportQ}%</span></div>
                <input type="range" className="sl" min={70} max={100} step={1} value={exportQ} style={{"--v":`${((exportQ-70)/30)*100}%`,marginBottom:"16px"}} onChange={e=>setExportQ(+e.target.value)}/>
              </>)}
              <SL>Resolution</SL>
              <div style={{display:"flex",gap:"6px",marginBottom:"10px",flexWrap:"wrap"}}>
                {[{v:1,l:"1×",d:"Original"},{v:2,l:"2×",d:"Double"},{v:3,l:"3×",d:"Triple"},{v:4,l:"4×",d:"Ultra HD"},{v:"8k",l:"8K",d:"7680px"}].map(s=>(
                  <button key={s.v} onClick={()=>setExportScale(s.v)}
                    style={{flex:"1 1 56px",padding:"9px 4px",border:`1.5px solid ${exportScale===s.v?"#6c63ff":s.v==="8k"?"#e0d8ff":dm?'#333':'#eee'}`,background:exportScale===s.v?(dm?'#2a2a3a':'#faf9ff'):s.v==="8k"?(dm?'#1e1a2e':'#faf8ff'):dm?'#1e1e1e':'#fff',borderRadius:"10px",textAlign:"center",cursor:"pointer",transition:"all .18s",fontFamily:"inherit"}}>
                    <div style={{fontSize:"14px",fontWeight:700,color:exportScale===s.v?"#6c63ff":s.v==="8k"?"#a78bfa":dm?'#ccc':'#555',marginBottom:"1px"}}>{s.l}</div>
                    <div style={{fontSize:"9px",color:"#bbb"}}>{s.d}</div>
                  </button>
                ))}
              </div>
              {natW>0&&<div style={{padding:"10px 14px",background:dm?'#2a2a2a':'#f8f8fd',borderRadius:"8px",display:"flex",justifyContent:"space-between",marginBottom:"16px"}}><span style={{fontSize:"12px",color:"#bbb"}}>Output</span><span style={{fontSize:"13px",fontWeight:600,color:"#6c63ff"}}>{expW.toLocaleString()} × {expH.toLocaleString()}px</span></div>}
              {exportInfo&&<div style={{padding:"10px 14px",background:exportDone?"#f0fff4":"#fff8e7",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:exportDone?"#16a34a":"#92400e",fontWeight:500}}>{exportDone?`✓ Saved — ${exportInfo}`:exportInfo}</div>}
              <AB onClick={handleExport} disabled={exporting} color={exportDone?"#f0fff4":"purple"} textColor={exportDone?"#16a34a":"#fff"} style={{width:"100%",padding:"14px",fontSize:"14px",fontWeight:700}}>
                {exporting?<Row><Spin/>Processing...</Row>:exportDone?"✓ Saved!":`↓ Download ${({jpg:"JPEG",png:"PNG",webp:"WebP"})[exportFmt]} · ${typeof exportScale==="string"?exportScale.toUpperCase():exportScale+"×"}`}
              </AB>
              <p style={{fontSize:"11px",color:"#bbb",textAlign:"center",marginTop:"8px"}}>iOS/Android: tap "Save Image" in the share sheet</p>
            </>)}
            {exportTab==="facebook"&&(<>
              <div style={{padding:"12px",background:dm?'#1e2a3a':'#eff6ff',border:"1.5px solid #bfdbfe",borderRadius:"10px",marginBottom:"16px"}}>
                <div style={{fontSize:"12px",fontWeight:600,color:"#1d4ed8",marginBottom:"4px"}}>Optimised for Social Media</div>
                <div style={{fontSize:"12px",color:"#3b82f6",lineHeight:1.6}}>Exact dimensions + JPEG 82% — bypasses compression on Facebook, Instagram &amp; more.</div>
              </div>
              <SL>Platform / Format</SL>
              {FB_MODES.map(m=>(
                <button key={m.id} onClick={()=>setFbMode(m.id)}
                  style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${fbMode===m.id?"#1877f2":dm?'#333':'#eee'}`,background:fbMode===m.id?(dm?'#1e2a3a':'#eff6ff'):dm?'#1e1e1e':'#fff',borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",marginBottom:"7px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                  <div><div style={{fontSize:"13px",fontWeight:600,color:fbMode===m.id?"#1877f2":dm?'#ccc':'#444',marginBottom:"2px"}}>{m.label}</div><div style={{fontSize:"12px",color:"#bbb"}}>{m.desc}</div></div>
                  {fbMode===m.id&&<span style={{color:"#1877f2",fontSize:"18px"}}>✓</span>}
                </button>
              ))}
              {exportInfo&&fbDone&&<div style={{padding:"10px 14px",background:"#f0fff4",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:"#16a34a",fontWeight:500}}>✓ Saved — {exportInfo}</div>}
              <AB onClick={handleFbExport} disabled={fbExporting} color={fbDone?"#f0fff4":"#1877f2"} textColor={fbDone?"#16a34a":"#fff"} style={{width:"100%",padding:"14px",fontSize:"14px",fontWeight:700}}>
                {fbExporting?<Row><Spin color="rgba(255,255,255,.7)"/>Exporting...</Row>:fbDone?"✓ Saved!":`↓ Export · ${FB_MODES.find(m=>m.id===fbMode)?.desc}`}
              </AB>
            </>)}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{display:"none"}}/>
    </div>
  );
}

// ── BatchPage ─────────────────────────────────────────────────────────────────
function BatchPage({dm,cardBg,cardBdr,inputSt,isMobile=false,
  sourceHandle,outputHandle,batchImages,selectSourceFolder,selectOutputFolder,
  batchResizeMode,setBatchResizeMode,batchResizePreset,setBatchResizePreset,
  batchCustomW,setBatchCustomW,batchCustomH,setBatchCustomH,
  batchKeepAspect,setBatchKeepAspect,batchLongEdgePx,setBatchLongEdgePx,
  batchAutoLevels,setBatchAutoLevels,batchAutoContrast,setBatchAutoContrast,
  batchSharpen,setBatchSharpen,batchSharpenAmt,setBatchSharpenAmt,batchSharpenRad,setBatchSharpenRad,
  batchDenoise,setBatchDenoise,batchDenoiseAmt,setBatchDenoiseAmt,
  batchLogo,setBatchLogo,batchLogoFile,setBatchLogoFile,handleBatchLogoUpload,
  batchLogoScale,setBatchLogoScale,batchLogoOpacity,setBatchLogoOpacity,
  batchLogoPos,setBatchLogoPos,batchLogoMargin,setBatchLogoMargin,
  batchOutputFmt,setBatchOutputFmt,batchOutputQ,setBatchOutputQ,
  batchPrefix,setBatchPrefix,batchSuffix,setBatchSuffix,
  batchProcessing,batchProgress,batchDone,handleBatchProcess,
  batchPreviewIdx,batchPreviewOrigUrl,batchPreviewAfterUrl,
  batchPreviewLoading,batchPreviewSplit,setBatchPreviewSplit,
  batchPreviewDragging,setBatchPreviewDragging,
  batchPreviewOpen,setBatchPreviewOpen,generateBatchPreview,
  filters,setFilters,resetAll,calcBatchDims,BATCH_RESIZE_PRESETS,DEFAULT_FILTERS,COLOR_FILTERS,FILTER_GROUPS,PRESETS,batchFilterGroup,setBatchFilterGroup}) {

  const bg   = dm?'#121212':'#f0f1f5';
  const panelBg = dm?'#1e1e1e':'#ffffff';
  const accent = '#6c63ff';

  const Card = ({children, style={}}) => (
    <div style={{background:panelBg,border:`1px solid ${cardBdr}`,borderRadius:"14px",padding:"18px",display:"flex",flexDirection:"column",gap:"12px",...style}}>
      {children}
    </div>
  );

  const SecLabel = ({icon, children}) => (
    <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"2px"}}>
      <span style={{fontSize:"15px"}}>{icon}</span>
      <span style={{fontSize:"12px",fontWeight:700,color:"#aaa",letterSpacing:".07em",textTransform:"uppercase"}}>{children}</span>
    </div>
  );

  const Toggle = ({checked, onChange, label, sub}) => (
    <label style={{display:"flex",alignItems:"flex-start",gap:"10px",cursor:"pointer",padding:"10px 12px",border:`1.5px solid ${checked?accent:cardBdr}`,borderRadius:"10px",background:checked?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#fafafa',transition:"all .18s"}}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{width:"18px",height:"18px",marginTop:"1px",accentColor:accent,flexShrink:0}}/>
      <div>
        <div style={{fontSize:"13px",fontWeight:600,color:checked?accent:dm?'#ddd':'#333'}}>{label}</div>
        {sub&&<div style={{fontSize:"11px",color:"#999",marginTop:"2px",lineHeight:1.4}}>{sub}</div>}
      </div>
    </label>
  );

  const canProcess = !batchProcessing && sourceHandle && outputHandle && batchImages.length > 0;
  const activeEnhancements = [
    batchResizeMode!=="none" && "📐 Resize",
    batchAutoContrast && "⚡ Auto Contrast",
    batchAutoLevels && "🎨 Auto Levels",
    batchDenoise && "🌊 Denoise",
    batchSharpen && "🔍 Sharpen",
    batchLogo && "🏷 Watermark",
  ].filter(Boolean);

  return (
    <div style={{height:"calc(100vh - 52px)",overflowY:"auto",background:bg}}>
      {/* ── Top bar ── */}
      <div style={{background:panelBg,borderBottom:`1px solid ${cardBdr}`,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",flexWrap:"wrap",position:"sticky",top:0,zIndex:20}}>
        <div>
          <div style={{fontSize:"16px",fontWeight:700,color:dm?'#f0f0f0':'#1a1a2e',marginBottom:"2px"}}>📦 Batch Processor</div>
          <div style={{fontSize:"12px",color:"#999"}}>
            {batchImages.length>0 ? `${batchImages.length} images queued` : "No source folder selected"}
            {Object.entries(filters).filter(([k,v])=>v!==DEFAULT_FILTERS[k]).length>0 && ` · ✏️ ${Object.entries(filters).filter(([k,v])=>v!==DEFAULT_FILTERS[k]).length} adjustments`}
            {activeEnhancements.length>0 && " · "+activeEnhancements.join(" · ")}
          </div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center",flexShrink:0}}>
          {/* Preview toggle */}
          {batchImages.length>0 && (
            <button
              onClick={()=>{
                if (!batchPreviewOpen) {
                  setBatchPreviewOpen(true);
                  if (batchPreviewIdx===null) generateBatchPreview(0);
                } else {
                  setBatchPreviewOpen(false);
                }
              }}
              style={{padding:"10px 16px",border:`1.5px solid ${batchPreviewOpen?'#6c63ff':cardBdr}`,
                borderRadius:"10px",fontFamily:"inherit",fontWeight:700,fontSize:"13px",cursor:"pointer",
                background:batchPreviewOpen?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#fff',
                color:batchPreviewOpen?'#6c63ff':dm?'#aaa':'#666',
                transition:"all .2s",display:"flex",alignItems:"center",gap:"6px"}}>
              👁 {batchPreviewOpen?"Hide Preview":"Preview"}
            </button>
          )}
          {/* Process */}
          <button
            onClick={handleBatchProcess}
            disabled={!canProcess}
            style={{padding:"10px 24px",border:"none",borderRadius:"10px",fontFamily:"inherit",fontWeight:700,fontSize:"14px",cursor:canProcess?"pointer":"not-allowed",
              background:canProcess?"linear-gradient(135deg,#6c63ff,#a78bfa)":(dm?'#333':'#ddd'),
              color:canProcess?"#fff":(dm?'#555':'#aaa'),
              boxShadow:canProcess?"0 2px 12px rgba(108,99,255,.35)":"none",
              transition:"all .2s",display:"flex",alignItems:"center",gap:"8px"}}>
            {batchProcessing
              ? <><Spin/>Processing {batchProgress.current}/{batchProgress.total}…</>
              : batchDone ? "✅ Done — Run Again"
              : canProcess ? `⚡ Process ${batchImages.length} Image${batchImages.length!==1?"s":""}`
              : !sourceHandle ? "Select source folder →"
              : !outputHandle ? "Select output folder →"
              : "Add images to source folder"}
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {batchProcessing && (
        <div style={{height:"3px",background:dm?'#333':'#eee'}}>
          <div style={{height:"100%",width:`${(batchProgress.current/batchProgress.total)*100}%`,background:"linear-gradient(90deg,#6c63ff,#a78bfa)",transition:"width .3s"}}/>
        </div>
      )}
      {batchDone && !batchProcessing && (
        <div style={{background:"#f0fff4",borderBottom:"1px solid #86efac",padding:"10px 24px",fontSize:"13px",fontWeight:600,color:"#16a34a",textAlign:"center"}}>
          ✅ Done! {batchImages.length} images saved to output folder.
        </div>
      )}

      {/* ── Before / After Preview Panel ── */}
      {batchPreviewOpen && batchImages.length > 0 && (
        <div style={{borderBottom:`1px solid ${cardBdr}`,background:dm?'#161616':'#f8f8fd'}}>

          {/* Image picker row */}
          <div style={{padding:"10px 24px 0",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
            <span style={{fontSize:"12px",fontWeight:700,color:dm?'#aaa':'#888',textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>
              👁 Preview image:
            </span>
            <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"4px",flex:1}}>
              {batchImages.map((img,i)=>(
                <button key={i} onClick={()=>generateBatchPreview(i)}
                  style={{flexShrink:0,padding:"5px 12px",border:`1.5px solid ${batchPreviewIdx===i?'#6c63ff':cardBdr}`,
                    background:batchPreviewIdx===i?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#fff',
                    borderRadius:"8px",fontSize:"11px",fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                    color:batchPreviewIdx===i?'#6c63ff':dm?'#ccc':'#555',
                    maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                    transition:"all .15s"}}>
                  {img.name}
                </button>
              ))}
            </div>
            <button onClick={()=>setBatchPreviewOpen(false)}
              style={{background:dm?'#333':'#f2f2f8',border:"none",borderRadius:"8px",padding:"5px 10px",fontSize:"12px",color:dm?'#aaa':'#888',cursor:"pointer",fontWeight:600,flexShrink:0}}>
              ✕ Close
            </button>
          </div>

          {/* Split viewer */}
          {batchPreviewLoading && (
            <div style={{height:"300px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",color:"#6c63ff",fontWeight:600,fontSize:"13px"}}>
              <span style={{display:"inline-block",width:"18px",height:"18px",border:"2px solid #6c63ff44",borderTopColor:"#6c63ff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
              Generating preview…
            </div>
          )}

          {!batchPreviewLoading && batchPreviewOrigUrl && batchPreviewAfterUrl && (
            <div style={{padding:"12px 24px 16px"}}>
              {/* Split view container */}
              <div
                style={{position:"relative",userSelect:"none",cursor:batchPreviewDragging?"grabbing":"ew-resize",borderRadius:"10px",overflow:"hidden",
                  boxShadow:"0 4px 24px rgba(0,0,0,.18)",maxHeight:"60vh",lineHeight:0,
                  background:dm?'#111':'#000'}}
                onMouseDown={()=>setBatchPreviewDragging(true)}
                onMouseMove={e=>{
                  if(!batchPreviewDragging) return;
                  const r=e.currentTarget.getBoundingClientRect();
                  setBatchPreviewSplit(Math.min(95,Math.max(5,((e.clientX-r.left)/r.width)*100)));
                }}
                onMouseUp={()=>setBatchPreviewDragging(false)}
                onMouseLeave={()=>setBatchPreviewDragging(false)}
                onTouchMove={e=>{
                  e.preventDefault();
                  const r=e.currentTarget.getBoundingClientRect();
                  setBatchPreviewSplit(Math.min(95,Math.max(5,((e.touches[0].clientX-r.left)/r.width)*100)));
                }}>

                {/* AFTER (full width, clipped on right) */}
                <img src={batchPreviewAfterUrl} alt="after"
                  style={{width:"100%",maxHeight:"60vh",objectFit:"contain",display:"block"}}/>

                {/* BEFORE (clipped from left = splitPos) */}
                <div style={{position:"absolute",inset:0,clipPath:`inset(0 0 0 ${batchPreviewSplit}%)`,pointerEvents:"none"}}>
                  <img src={batchPreviewOrigUrl} alt="before"
                    style={{width:"100%",maxHeight:"60vh",objectFit:"contain",display:"block"}}/>
                </div>

                {/* Divider line + handle */}
                <div
                  onMouseDown={e=>{e.preventDefault();setBatchPreviewDragging(true);}}
                  onTouchStart={()=>setBatchPreviewDragging(true)}
                  style={{position:"absolute",top:0,bottom:0,left:`${batchPreviewSplit}%`,transform:"translateX(-50%)",
                    width:"44px",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"ew-resize"}}>
                  <div style={{width:"2px",height:"100%",background:"rgba(255,255,255,.9)",boxShadow:"0 0 8px rgba(0,0,0,.5)"}}/>
                  <div style={{position:"absolute",width:"38px",height:"38px",borderRadius:"50%",
                    background:"#fff",boxShadow:"0 2px 14px rgba(0,0,0,.3)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:"#6c63ff",fontWeight:700}}>
                    ⇄
                  </div>
                </div>

                {/* Labels */}
                <div style={{position:"absolute",bottom:"10px",left:"10px",padding:"3px 10px",
                  background:"rgba(108,99,255,.85)",borderRadius:"20px",fontSize:"11px",fontWeight:700,color:"#fff",
                  clipPath:`inset(0 ${100-batchPreviewSplit}% 0 0)`}}>AFTER</div>
                <div style={{position:"absolute",bottom:"10px",right:"10px",padding:"3px 10px",
                  background:"rgba(0,0,0,.55)",borderRadius:"20px",fontSize:"11px",fontWeight:700,color:"#fff",
                  clipPath:`inset(0 0 0 ${batchPreviewSplit}%)`}}>BEFORE</div>
              </div>

              {/* Info row */}
              <div style={{display:"flex",gap:"16px",marginTop:"10px",flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:"11px",color:"#bbb"}}>
                  ← Drag to compare · {batchImages[batchPreviewIdx]?.name}
                </span>
                <div style={{display:"flex",gap:"6px",marginLeft:"auto",flexWrap:"wrap"}}>
                  {[
                    batchResizeMode!=="none"&&"📐 Resize",
                    batchAutoContrast&&"⚡ Contrast",
                    batchAutoLevels&&"🎨 Levels",
                    batchDenoise&&"🌊 Denoise",
                    batchSharpen&&"🔍 Sharpen",
                    batchLogo&&"🏷 Logo"
                  ].filter(Boolean).map(t=>(
                    <span key={t} style={{padding:"2px 8px",background:dm?'#2a2a3a':'#f0eeff',borderRadius:"12px",fontSize:"10px",fontWeight:600,color:"#7c3aed"}}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Presets strip — right below the preview */}
              <div style={{marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${cardBdr}`}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                  <span style={{fontSize:"11px",fontWeight:700,color:dm?'#aaa':'#888',textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>
                    🎨 Presets
                  </span>
                  {Object.entries(filters).some(([k,v])=>v!==DEFAULT_FILTERS[k])&&(
                    <button onClick={resetAll}
                      style={{fontSize:"11px",color:'#6c63ff',background:"none",border:"none",cursor:"pointer",fontWeight:700,padding:"2px 6px",fontFamily:"inherit"}}>
                      Reset ↺
                    </button>
                  )}
                </div>
                <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"4px"}}>
                  {PRESETS.map(p=>(
                    <button key={p.name}
                      onClick={()=>{ setFilters({...DEFAULT_FILTERS,...p.values}); }}
                      style={{flexShrink:0,padding:"8px 12px",
                        border:`1.5px solid ${JSON.stringify(filters)===JSON.stringify({...DEFAULT_FILTERS,...p.values})?'#6c63ff':cardBdr}`,
                        background:JSON.stringify(filters)===JSON.stringify({...DEFAULT_FILTERS,...p.values})?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#fff',
                        borderRadius:"10px",textAlign:"center",cursor:"pointer",fontFamily:"inherit",minWidth:"68px",
                        transition:"all .15s"}}>
                      <div style={{fontSize:"18px",marginBottom:"3px"}}>{p.icon}</div>
                      <div style={{fontSize:"10px",fontWeight:700,color:dm?'#ccc':'#555'}}>{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!batchPreviewLoading && !batchPreviewOrigUrl && (
            <div style={{height:"120px",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",fontSize:"13px"}}>
              Select an image above to preview ↑
            </div>
          )}
        </div>
      )}

      {/* ── Persistent presets bar (shown when preview is closed) ── */}
      {!batchPreviewOpen && (
        <div style={{borderBottom:`1px solid ${cardBdr}`,background:dm?'#1a1a1a':'#fff',padding:"10px 24px",display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"11px",fontWeight:700,color:dm?'#aaa':'#888',textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>
            🎨 Presets
          </span>
          <div style={{display:"flex",gap:"7px",overflowX:"auto",paddingBottom:"2px",flex:1}}>
            {PRESETS.map(p=>(
              <button key={p.name}
                onClick={()=>setFilters({...DEFAULT_FILTERS,...p.values})}
                style={{flexShrink:0,padding:"6px 12px",
                  border:`1.5px solid ${cardBdr}`,
                  background:dm?'#252525':'#f8f8fd',
                  borderRadius:"9px",display:"flex",alignItems:"center",gap:"6px",
                  cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                  whiteSpace:"nowrap"}}>
                <span style={{fontSize:"15px"}}>{p.icon}</span>
                <span style={{fontSize:"11px",fontWeight:600,color:dm?'#ccc':'#555'}}>{p.name}</span>
              </button>
            ))}
          </div>
          {Object.entries(filters).some(([k,v])=>v!==DEFAULT_FILTERS[k])&&(
            <button onClick={resetAll}
              style={{flexShrink:0,fontSize:"12px",color:'#6c63ff',background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>
              Reset ↺
            </button>
          )}
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{
        display:"grid",
        gridTemplateColumns: isMobile ? "1fr" : "280px 260px 1fr 260px",
        gap:"16px",
        padding:"20px 24px 40px",
        maxWidth:"1400px",
        margin:"0 auto"
      }}>

        {/* ── COLUMN 1: Files + Output ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

          <Card>
            <SecLabel icon="📁">Source Folder</SecLabel>
            <button onClick={selectSourceFolder}
              style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"9px",fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {sourceHandle ? "📁 Change Folder" : "📁 Select Source Folder"}
            </button>
            {batchImages.length>0
              ? <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",background:dm?'#1a3a1a':'#f0fff4',border:"1.5px solid #86efac",borderRadius:"8px"}}>
                  <span style={{fontSize:"20px"}}>🖼</span>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:700,color:"#16a34a"}}>{batchImages.length} images found</div>
                    <div style={{fontSize:"11px",color:"#aaa"}}>JPG · PNG · WebP</div>
                  </div>
                </div>
              : <div style={{fontSize:"11px",color:"#bbb",textAlign:"center",padding:"6px 0"}}>JPG, PNG, WebP accepted</div>}
          </Card>

          <Card>
            <SecLabel icon="💾">Output Folder</SecLabel>
            <button onClick={selectOutputFolder}
              style={{width:"100%",padding:"11px",background:outputHandle?"linear-gradient(135deg,#059669,#34d399)":"linear-gradient(135deg,#374151,#6b7280)",color:"#fff",border:"none",borderRadius:"9px",fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {outputHandle ? "✓ Output Set — Change" : "💾 Select Output Folder"}
            </button>
            <div style={{fontSize:"11px",color:"#bbb"}}>Processed files are saved here</div>
          </Card>

          <Card>
            <SecLabel icon="💾">Output Format</SecLabel>
            <div style={{display:"flex",gap:"6px"}}>
              {[{id:"jpeg",l:"JPEG"},{id:"png",l:"PNG"},{id:"webp",l:"WebP"}].map(f=>(
                <button key={f.id} onClick={()=>setBatchOutputFmt(f.id)}
                  style={{flex:1,padding:"8px 4px",border:`1.5px solid ${batchOutputFmt===f.id?accent:cardBdr}`,background:batchOutputFmt===f.id?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#f8f8fd',borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer",color:batchOutputFmt===f.id?accent:dm?'#ccc':'#555',fontFamily:"inherit",transition:"all .18s"}}>
                  {f.l}
                </button>
              ))}
            </div>
            {batchOutputFmt!=="png"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Quality</span>
                  <span style={{fontSize:"12px",color:accent,fontWeight:700}}>{batchOutputQ}%</span>
                </div>
                <input type="range" className="sl" min={60} max={100} step={1} value={batchOutputQ} style={{"--v":`${((batchOutputQ-60)/40)*100}%`}} onChange={e=>setBatchOutputQ(+e.target.value)}/>
                <div style={{display:"flex",gap:"5px",marginTop:"8px"}}>
                  {[75,85,90,95].map(q=>(
                    <button key={q} onClick={()=>setBatchOutputQ(q)}
                      style={{flex:1,padding:"5px",border:`1px solid ${batchOutputQ===q?accent:cardBdr}`,background:batchOutputQ===q?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#f8f8fd',borderRadius:"6px",fontSize:"10px",fontWeight:600,cursor:"pointer",color:batchOutputQ===q?accent:dm?'#bbb':'#777',fontFamily:"inherit"}}>
                      {q}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <SecLabel icon="🏷">Filename Template</SecLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <div>
                <div style={{fontSize:"10px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"4px"}}>Prefix</div>
                <input type="text" value={batchPrefix} onChange={e=>setBatchPrefix(e.target.value)} placeholder="shop_" style={inputSt}/>
              </div>
              <div>
                <div style={{fontSize:"10px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"4px"}}>Suffix</div>
                <input type="text" value={batchSuffix} onChange={e=>setBatchSuffix(e.target.value)} placeholder="_v2" style={inputSt}/>
              </div>
            </div>
            <div style={{padding:"8px 10px",background:dm?'#252525':'#f2f2f8',borderRadius:"7px",fontSize:"11px",color:dm?'#bbb':'#888',fontFamily:"monospace"}}>
              {batchPrefix||""}photo001{batchSuffix||"_edited"}.{batchOutputFmt==="jpeg"?"jpg":batchOutputFmt}
            </div>
          </Card>
        </div>

        {/* ── COLUMN 2: Edit (Presets + Adjustments) ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <Card style={{flex:1}}>
            <SecLabel icon="🎛">Adjustments</SecLabel>
            {/* Group tabs */}
            <div style={{display:"flex",gap:"2px",background:dm?'#252525':'#f2f2f8',padding:"3px",borderRadius:"9px"}}>
              {FILTER_GROUPS.map(g=>(
                <button key={g.key} onClick={()=>setBatchFilterGroup(g.key)}
                  style={{flex:1,padding:"5px 4px",fontSize:"11px",fontWeight:600,border:"none",cursor:"pointer",
                    fontFamily:"inherit",background:batchFilterGroup===g.key?(dm?'#444':'#fff'):'transparent',
                    color:batchFilterGroup===g.key?accent:'#999',borderRadius:"7px",
                    boxShadow:batchFilterGroup===g.key?"0 1px 3px rgba(0,0,0,.1)":"none",transition:"all .15s",
                    whiteSpace:"nowrap"}}>
                  {g.label}
                </button>
              ))}
            </div>
            {/* Sliders */}
            <div style={{display:"flex",flexDirection:"column",gap:"14px",marginTop:"4px"}}>
              {COLOR_FILTERS.filter(f=>f.group===batchFilterGroup).map(f=>{
                const val = filters[f.key];
                const pct = ((val - f.min) / (f.max - f.min)) * 100;
                const changed = val !== DEFAULT_FILTERS[f.key];
                return (
                  <div key={f.key}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                      <span style={{fontSize:"12px",fontWeight:500,color:changed?accent:dm?'#ccc':'#666'}}>{f.label}</span>
                      <span style={{fontSize:"11px",color:"#bbb",fontVariantNumeric:"tabular-nums"}}>
                        {val>0&&f.default===0?"+":""}{Number.isInteger(val)?val:val.toFixed(1)}{f.unit}
                      </span>
                    </div>
                    <input type="range" className="sl"
                      min={f.min} max={f.max} step={f.max<=20?.5:1}
                      value={val}
                      style={{"--v":`${pct}%`}}
                      onChange={e=>setFilters(p=>({...p,[f.key]:parseFloat(e.target.value)}))}/>
                    {changed&&(
                      <button onClick={()=>setFilters(p=>({...p,[f.key]:f.default}))}
                        style={{marginTop:"3px",fontSize:"10px",color:"#bbb",background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                        reset
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Active count */}
            {Object.entries(filters).some(([k,v])=>v!==DEFAULT_FILTERS[k])&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"8px",borderTop:`1px solid ${cardBdr}`,marginTop:"4px"}}>
                <span style={{fontSize:"11px",color:"#bbb"}}>
                  {Object.entries(filters).filter(([k,v])=>v!==DEFAULT_FILTERS[k]).length} active
                </span>
                <button onClick={resetAll}
                  style={{fontSize:"11px",color:accent,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>
                  Reset all
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* ── COLUMN 3: Resize + Enhance ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

          <Card>
            <SecLabel icon="📐">Resize</SecLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
              {[
                {id:"none",    l:"No Resize",    i:"🚫"},
                {id:"preset",  l:"Social Preset",i:"📱"},
                {id:"longEdge",l:"Long Edge",    i:"📏"},
                {id:"custom",  l:"Custom Size",  i:"🎛"},
              ].map(o=>(
                <button key={o.id} onClick={()=>setBatchResizeMode(o.id)}
                  style={{padding:"10px 8px",border:`1.5px solid ${batchResizeMode===o.id?accent:cardBdr}`,background:batchResizeMode===o.id?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#f8f8fd',borderRadius:"9px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .18s",display:"flex",alignItems:"center",gap:"7px"}}>
                  <span style={{fontSize:"16px"}}>{o.i}</span>
                  <span style={{fontSize:"12px",fontWeight:600,color:batchResizeMode===o.id?accent:dm?'#ccc':'#444'}}>{o.l}</span>
                </button>
              ))}
            </div>

            {batchResizeMode==="preset"&&(
              <div style={{display:"flex",flexDirection:"column",gap:"8px",paddingTop:"4px",borderTop:`1px solid ${cardBdr}`}}>
                <select value={batchResizePreset} onChange={e=>setBatchResizePreset(e.target.value)} style={inputSt}>
                  {BATCH_RESIZE_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.w}×{p.h||'auto'}</option>)}
                </select>
                <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:dm?'#ccc':'#555'}}>
                  <input type="checkbox" checked={batchKeepAspect} onChange={e=>setBatchKeepAspect(e.target.checked)} style={{accentColor:accent,width:"15px",height:"15px"}}/>
                  Maintain aspect ratio
                </label>
              </div>
            )}

            {batchResizeMode==="longEdge"&&(
              <div style={{paddingTop:"4px",borderTop:`1px solid ${cardBdr}`,display:"flex",flexDirection:"column",gap:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Long edge target</span>
                  <span style={{fontSize:"13px",fontWeight:700,color:accent}}>{batchLongEdgePx.toLocaleString()}px</span>
                </div>
                <input type="range" className="sl" min={400} max={8000} step={100} value={batchLongEdgePx} style={{"--v":`${((batchLongEdgePx-400)/7600)*100}%`}} onChange={e=>setBatchLongEdgePx(+e.target.value)}/>
                <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                  {[800,1200,1920,2560,3840].map(v=>(
                    <button key={v} onClick={()=>setBatchLongEdgePx(v)}
                      style={{padding:"4px 10px",border:`1px solid ${batchLongEdgePx===v?accent:cardBdr}`,background:batchLongEdgePx===v?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#f8f8fd',borderRadius:"6px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:batchLongEdgePx===v?accent:dm?'#bbb':'#666',fontFamily:"inherit"}}>
                      {v>=1000?`${v/1000}K`:v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {batchResizeMode==="custom"&&(
              <div style={{paddingTop:"4px",borderTop:`1px solid ${cardBdr}`,display:"flex",flexDirection:"column",gap:"8px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"8px",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:"10px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"4px"}}>Width px</div>
                    <input type="number" value={batchCustomW} min={100} max={16000} onChange={e=>setBatchCustomW(+e.target.value)} style={inputSt}/>
                  </div>
                  <span style={{color:"#aaa",fontSize:"14px",marginTop:"18px"}}>×</span>
                  <div>
                    <div style={{fontSize:"10px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"4px"}}>Height px</div>
                    <input type="number" value={batchCustomH} min={100} max={16000} onChange={e=>setBatchCustomH(+e.target.value)} style={inputSt}/>
                  </div>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:dm?'#ccc':'#555'}}>
                  <input type="checkbox" checked={batchKeepAspect} onChange={e=>setBatchKeepAspect(e.target.checked)} style={{accentColor:accent,width:"15px",height:"15px"}}/>
                  Maintain aspect ratio
                </label>
              </div>
            )}
          </Card>

          <Card>
            <SecLabel icon="✨">Enhancements</SecLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <Toggle checked={batchAutoContrast} onChange={e=>setBatchAutoContrast(e.target.checked)} label="Auto Contrast" sub="Punchy histogram stretch"/>
              <Toggle checked={batchAutoLevels}   onChange={e=>setBatchAutoLevels(e.target.checked)}   label="Auto Levels"   sub="Fix colour casts per-channel"/>
              <Toggle checked={batchDenoise}       onChange={e=>setBatchDenoise(e.target.checked)}       label="Noise Reduction" sub="Smooth high-ISO grain"/>
              <Toggle checked={batchSharpen}       onChange={e=>setBatchSharpen(e.target.checked)}       label="Unsharp Mask"  sub="Crisp edge definition"/>
            </div>

            {batchDenoise&&(
              <div style={{padding:"12px",background:dm?'#252525':'#f8f8fd',border:`1px solid ${cardBdr}`,borderRadius:"9px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Denoise Strength</span>
                  <span style={{fontSize:"12px",color:accent,fontWeight:700}}>{batchDenoiseAmt.toFixed(1)}</span>
                </div>
                <input type="range" className="sl" min={0.5} max={5} step={0.5} value={batchDenoiseAmt} style={{"--v":`${((batchDenoiseAmt-0.5)/4.5)*100}%`}} onChange={e=>setBatchDenoiseAmt(+e.target.value)}/>
              </div>
            )}

            {batchSharpen&&(
              <div style={{padding:"12px",background:dm?'#252525':'#f8f8fd',border:`1px solid ${cardBdr}`,borderRadius:"9px",display:"flex",flexDirection:"column",gap:"10px"}}>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Amount</span>
                    <span style={{fontSize:"12px",color:accent,fontWeight:700}}>{batchSharpenAmt.toFixed(1)}×</span>
                  </div>
                  <input type="range" className="sl" min={0.2} max={3} step={0.1} value={batchSharpenAmt} style={{"--v":`${((batchSharpenAmt-0.2)/2.8)*100}%`}} onChange={e=>setBatchSharpenAmt(+e.target.value)}/>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Radius</span>
                    <span style={{fontSize:"12px",color:accent,fontWeight:700}}>{batchSharpenRad.toFixed(1)}px</span>
                  </div>
                  <input type="range" className="sl" min={0.5} max={4} step={0.5} value={batchSharpenRad} style={{"--v":`${((batchSharpenRad-0.5)/3.5)*100}%`}} onChange={e=>setBatchSharpenRad(+e.target.value)}/>
                </div>
              </div>
            )}

            <div style={{paddingTop:"6px",borderTop:`1px solid ${cardBdr}`}}>
              <div style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:"8px"}}>Quick Combos</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
                {[
                  {l:"📸 Product",   fn:()=>{setBatchAutoContrast(true);setBatchAutoLevels(false);setBatchSharpen(true);setBatchSharpenAmt(1.2);setBatchSharpenRad(1.5);setBatchDenoise(false);}},
                  {l:"🤳 Portrait",  fn:()=>{setBatchAutoContrast(false);setBatchAutoLevels(true);setBatchSharpen(true);setBatchSharpenAmt(0.6);setBatchSharpenRad(1.0);setBatchDenoise(true);setBatchDenoiseAmt(2);}},
                  {l:"🌆 Landscape", fn:()=>{setBatchAutoContrast(false);setBatchAutoLevels(true);setBatchSharpen(true);setBatchSharpenAmt(1.8);setBatchSharpenRad(2.0);setBatchDenoise(false);}},
                  {l:"🌙 Low-Light", fn:()=>{setBatchAutoContrast(true);setBatchAutoLevels(false);setBatchSharpen(true);setBatchSharpenAmt(0.8);setBatchSharpenRad(1.5);setBatchDenoise(true);setBatchDenoiseAmt(3);}},
                ].map(p=>(
                  <button key={p.l} onClick={p.fn}
                    style={{padding:"8px",border:`1px solid ${cardBdr}`,background:dm?'#252525':'#f8f8fd',borderRadius:"8px",fontSize:"12px",fontWeight:600,cursor:"pointer",color:dm?'#ccc':'#444',fontFamily:"inherit",textAlign:"left",transition:"all .15s"}}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SecLabel icon="✏️">Active Adjustments</SecLabel>
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {Object.entries(filters).filter(([k,v])=>v!==DEFAULT_FILTERS[k]).map(([k])=>(
                <span key={k} style={{padding:"3px 8px",background:dm?'#2a2a3a':'#f0eeff',borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#7c3aed"}}>{k}</span>
              ))}
              {Object.entries(filters).every(([k,v])=>v===DEFAULT_FILTERS[k])&&(
                <span style={{fontSize:"11px",color:"#bbb"}}>No adjustments — use the Edit column ←</span>
              )}
            </div>
          </Card>
        </div>

        {/* ── COLUMN 3: Logo / Watermark ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <Card>
            <SecLabel icon="🏷">Logo / Watermark</SecLabel>
            <label style={{display:"block",padding:"16px 12px",border:`2px dashed ${batchLogo?accent:cardBdr}`,borderRadius:"10px",cursor:"pointer",textAlign:"center",transition:"all .2s",background:batchLogo?(dm?'#1e1a3a':'#faf9ff'):dm?'#252525':'#fafafa'}}>
              <input type="file" accept="image/*" onChange={handleBatchLogoUpload} style={{display:"none"}}/>
              {batchLogo
                ? <><div style={{fontSize:"26px",marginBottom:"5px"}}>✅</div><div style={{fontSize:"12px",fontWeight:600,color:accent,marginBottom:"2px"}}>{batchLogoFile?.name}</div><div style={{fontSize:"11px",color:"#bbb"}}>Click to replace</div></>
                : <><div style={{fontSize:"26px",marginBottom:"5px"}}>🖼</div><div style={{fontSize:"12px",fontWeight:600,color:dm?'#ccc':'#555',marginBottom:"2px"}}>Click to upload logo</div><div style={{fontSize:"11px",color:"#bbb"}}>PNG with transparency works best</div></>}
            </label>
            {batchLogo&&(
              <button onClick={()=>{setBatchLogo(null);setBatchLogoFile(null);}} style={{padding:"7px",background:"#fee2e2",border:"none",borderRadius:"7px",fontSize:"12px",color:"#ef4444",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                ✕ Remove Logo
              </button>
            )}
          </Card>

          {batchLogo&&(<>
            <Card>
              <SecLabel icon="📐">Logo Size & Opacity</SecLabel>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Size</span>
                  <span style={{fontSize:"12px",color:accent,fontWeight:700}}>{(batchLogoScale*100).toFixed(0)}% of width</span>
                </div>
                <input type="range" className="sl" min={0.03} max={0.5} step={0.01} value={batchLogoScale} style={{"--v":`${((batchLogoScale-0.03)/0.47)*100}%`}} onChange={e=>setBatchLogoScale(+e.target.value)}/>
              </div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Opacity</span>
                  <span style={{fontSize:"12px",color:accent,fontWeight:700}}>{Math.round(batchLogoOpacity*100)}%</span>
                </div>
                <input type="range" className="sl" min={0.1} max={1} step={0.05} value={batchLogoOpacity} style={{"--v":`${((batchLogoOpacity-0.1)/0.9)*100}%`}} onChange={e=>setBatchLogoOpacity(+e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:"12px",color:dm?'#ccc':'#555',marginBottom:"6px",fontWeight:500}}>Margin from edge</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"11px",color:"#aaa"}}>{batchLogoMargin}px</span>
                </div>
                <input type="range" className="sl" min={0} max={100} step={5} value={batchLogoMargin} style={{"--v":`${(batchLogoMargin/100)*100}%`}} onChange={e=>setBatchLogoMargin(+e.target.value)}/>
              </div>
            </Card>

            <Card>
              <SecLabel icon="📍">Logo Position</SecLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"5px"}}>
                {[
                  {id:"top-left",l:"↖"},{id:"top-center",l:"↑"},{id:"top-right",l:"↗"},
                  {id:"center-left",l:"←"},{id:"center",l:"⊕"},{id:"center-right",l:"→"},
                  {id:"bottom-left",l:"↙"},{id:"bottom-center",l:"↓"},{id:"bottom-right",l:"↘"},
                ].map(p=>{
                  const realId = p.id==="center-left"?"bottom-left":p.id==="center-right"?"bottom-right":p.id;
                  const ids = {
                    "top-left":"top-left","top-center":"top-center","top-right":"top-right",
                    "center-left":"center-left","center":"center","center-right":"center-right",
                    "bottom-left":"bottom-left","bottom-center":"bottom-center","bottom-right":"bottom-right",
                  };
                  const posId = p.id;
                  return (
                    <button key={posId} onClick={()=>setBatchLogoPos(posId)}
                      style={{padding:"12px 6px",border:`1.5px solid ${batchLogoPos===posId?accent:cardBdr}`,background:batchLogoPos===posId?accent:dm?'#252525':'#f8f8fd',borderRadius:"8px",fontSize:"16px",cursor:"pointer",color:batchLogoPos===posId?"#fff":dm?'#ccc':'#555',transition:"all .15s",fontFamily:"inherit"}}>
                      {p.l}
                    </button>
                  );
                })}
              </div>
            </Card>
          </>)}

          <Card style={{background:dm?'#1a1a2e':'#f5f3ff',border:`1px solid ${dm?'#333':'#e0d9ff'}`}}>
            <SecLabel icon="🪄">AI Features</SecLabel>
            <p style={{fontSize:"11px",color:dm?'#a78bfa':'#7c3aed',lineHeight:1.6}}>AI Upscale, Face Enhancement &amp; Object Removal are live in the <strong>Tools tab</strong>. Requires a free fal.ai API key.</p>
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {["✨ AI Beauty","⬆️ AI Upscale","🧹 Object Removal"].map(f=>(
                <span key={f} style={{padding:"3px 9px",background:dm?'rgba(124,58,237,.15)':'rgba(124,58,237,.08)',borderRadius:"20px",fontSize:"11px",fontWeight:600,color:dm?'#a78bfa':'#7c3aed'}}>{f}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────────
function Preview({image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,isDragSplit,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}) {
  const maxH=isMobile?"40vh":"calc(100vh - 120px)";
  const [dragTxt,setDragTxt]=useState(null);
  const containerRef=useRef(null);

  const startDragText=(e,id)=>{
    e.stopPropagation(); setSelText(id); setDragTxt({id,startX:e.clientX,startY:e.clientY});
  };
  useEffect(()=>{
    if(!dragTxt) return;
    const mm=e=>{
      if(!containerRef.current) return;
      const r=containerRef.current.getBoundingClientRect();
      const nx=Math.min(95,Math.max(5,((e.clientX-r.left)/r.width)*100));
      const ny=Math.min(95,Math.max(5,((e.clientY-r.top)/r.height)*100));
      updateText(dragTxt.id,"x",nx); updateText(dragTxt.id,"y",ny);
    };
    const up=()=>setDragTxt(null);
    window.addEventListener("mousemove",mm); window.addEventListener("mouseup",up);
    return()=>{window.removeEventListener("mousemove",mm);window.removeEventListener("mouseup",up);};
  },[dragTxt]);

  if(!image) return(
    <div className={`drop ${dragging?"on":""}`}
      style={{width:"100%",maxWidth:"480px",aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,.06)",cursor:"pointer"}}
      onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);loadImage(e.dataTransfer.files[0]);}}
      onClick={()=>fileInputRef.current?.click()}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadImage(e.target.files[0])}/>
      <div style={{fontSize:"44px",marginBottom:"14px",animation:"pulse 2.5s infinite"}}>🖼</div>
      <div style={{fontSize:"16px",fontWeight:600,color:"#555",marginBottom:"6px"}}>{isMobile?"Tap to upload photo":"Drop photo here"}</div>
      {!isMobile&&<div style={{fontSize:"13px",color:"#bbb",marginBottom:"20px"}}>or click to browse</div>}
      <div style={{display:"flex",gap:"8px"}}>
        {["JPG","PNG","WEBP","HEIC"].map(x=><span key={x} style={{padding:"3px 10px",background:"#f2f2f8",borderRadius:"20px",fontSize:"11px",fontWeight:500,color:"#999"}}>{x}</span>)}
      </div>
    </div>
  );

  const tempAlpha=Math.abs(filters.temperature)/300;
  const tempColor=filters.temperature>0?`rgba(255,140,0,${tempAlpha})`:`rgba(100,149,237,${tempAlpha})`;

  return(
    <>
      {activeTab==="edit"&&!showSplit&&!cropMode&&(
        <div style={{position:"absolute",top:"12px",right:"12px",display:"flex",background:"#fff",border:"1.5px solid #eee",zIndex:10,borderRadius:"10px",padding:"3px",gap:"2px",boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
          {["After","Before"].map(l=>(
            <button key={l} onClick={()=>setShowBefore(l==="Before")}
              style={{padding:"5px 14px",fontSize:"12px",fontWeight:600,border:"none",cursor:"pointer",background:(l==="Before")===showBefore?"linear-gradient(135deg,#6c63ff,#a78bfa)":"transparent",color:(l==="Before")===showBefore?"#fff":"#999",borderRadius:"7px",transition:"all .18s"}}>{l}</button>
          ))}
        </div>
      )}
      {showSplit&&<div style={{position:"absolute",top:"12px",right:"12px",zIndex:10,padding:"5px 12px",background:"rgba(108,99,255,.9)",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#fff"}}>← Drag to compare →</div>}
      {activeTab==="tools"&&bgResult&&<div style={{position:"absolute",top:"12px",right:"12px",padding:"4px 12px",background:"#f0fff4",border:"1.5px solid #86efac",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#16a34a",zIndex:10}}>✓ BG Removed</div>}
      {cropMode&&<div style={{position:"absolute",top:"12px",right:"12px",padding:"5px 12px",background:"rgba(234,179,8,.9)",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#fff",zIndex:10}}>✂ Crop Mode</div>}

      <div ref={splitRef}
        style={{position:"relative",maxWidth:"100%",maxHeight:maxH,lineHeight:0,borderRadius:"14px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.12)",cursor:showSplit?(isDragSplit?"grabbing":"ew-resize"):"default",userSelect:"none"}}>
        {activeTab==="tools"&&bgResult?(
          <>
            {bgMode==="transparent"&&<div className="checker" style={{position:"absolute",inset:0}}/>}
            <img src={bgResult} alt="result" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",position:"relative"}}/>
          </>
        ):showSplit?(
          <>
            <img ref={imgRef} src={image} alt="after" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:cssFilter,transform:transformCSS}}/>
            {filters.temperature!==0&&<div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none",clipPath:`inset(0 ${100-splitPos}% 0 0)`}}/>}
            {filters.vignette>0&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none",clipPath:`inset(0 ${100-splitPos}% 0 0)`}}/>}
            <div style={{position:"absolute",inset:0,clipPath:`inset(0 0 0 ${splitPos}%)`}}>
              <img src={image} alt="before" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:"none"}}/>
            </div>
            <div onMouseDown={e=>{e.preventDefault();setIsDragSplit(true);}} onTouchStart={e=>{e.preventDefault();setIsDragSplit(true);}}
              style={{position:"absolute",top:0,bottom:0,left:`${splitPos}%`,transform:"translateX(-50%)",width:"44px",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",cursor:isDragSplit?"grabbing":"ew-resize"}}>
              <div style={{width:"2px",height:"100%",background:"#fff",boxShadow:"0 0 6px rgba(0,0,0,.5)"}}/>
              <div style={{position:"absolute",width:"36px",height:"36px",borderRadius:"50%",background:"#fff",boxShadow:"0 2px 12px rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:"#6c63ff",fontWeight:700}}>⇄</div>
            </div>
            <div style={{position:"absolute",bottom:"12px",left:"12px",padding:"3px 10px",background:"rgba(108,99,255,.85)",borderRadius:"20px",fontSize:"11px",fontWeight:700,color:"#fff"}}>AFTER</div>
            <div style={{position:"absolute",bottom:"12px",right:"12px",padding:"3px 10px",background:"rgba(0,0,0,.5)",borderRadius:"20px",fontSize:"11px",fontWeight:700,color:"#fff"}}>BEFORE</div>
          </>
        ):(
          <>
            <div ref={containerRef} style={{position:"relative",lineHeight:0}}>
              <img ref={imgRef} src={image} alt="photo"
                style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:showBefore||activeTab==="tools"?"none":cssFilter,transition:"filter .08s ease",transform:showBefore?"none":transformCSS}}/>
              {!showBefore&&activeTab==="edit"&&filters.temperature!==0&&<div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none"}}/>}
              {!showBefore&&activeTab==="edit"&&filters.fade>0&&<div style={{position:"absolute",inset:0,background:`rgba(255,255,255,${filters.fade/180})`,mixBlendMode:"screen",pointerEvents:"none"}}/>}
              {!showBefore&&activeTab==="edit"&&filters.vignette>0&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none"}}/>}
              {!showBefore&&activeTab==="edit"&&filters.grain>0&&(
                <div style={{position:"absolute",inset:0,pointerEvents:"none",mixBlendMode:"overlay",opacity:0.4,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`}}/>
              )}
              {!showBefore&&texts.map(t=>(
                <div key={t.id} onMouseDown={e=>startDragText(e,t.id)} onClick={()=>setSelText(t.id)}
                  style={{position:"absolute",left:`${t.x}%`,top:`${t.y}%`,transform:"translate(-50%,-50%)",cursor:dragTxt&&dragTxt.id===t.id?"grabbing":"grab",userSelect:"none",
                    fontFamily:FONT_MAP[t.font]||FONT_MAP.System,fontSize:`clamp(12px,${t.fontSize/8}vw,${t.fontSize}px)`,
                    fontWeight:t.bold?"700":"400",fontStyle:t.italic?"italic":"normal",color:t.color,
                    textShadow:t.stroke?"0 0 8px rgba(0,0,0,.8), 1px 1px 2px rgba(0,0,0,.6)":"none",
                    border:selText===t.id?"2px dashed rgba(108,99,255,.6)":"2px dashed transparent",
                    padding:"4px 6px",borderRadius:"4px",whiteSpace:"nowrap",zIndex:5}}>
                  {t.content}
                </div>
              ))}
              {cropMode&&(
                <div style={{position:"absolute",inset:0,zIndex:10}}>
                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
                  <div style={{position:"absolute",left:`${cropBox.x}%`,top:`${cropBox.y}%`,width:`${cropBox.w}%`,height:`${cropBox.h}%`,
                    border:"2px solid #fff",boxShadow:"0 0 0 9999px rgba(0,0,0,.5)",cursor:"move"}}>
                    <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gridTemplateRows:"1fr 1fr 1fr",pointerEvents:"none"}}>
                      {Array(9).fill(0).map((_,i)=><div key={i} style={{border:"0.5px solid rgba(255,255,255,.3)"}}/>)}
                    </div>
                    {[{t:"-4px",l:"-4px",c:"nw"},{t:"-4px",l:"calc(50% - 4px)",c:"n"},{t:"-4px",r:"-4px",c:"ne"},
                      {t:"calc(50% - 4px)",l:"-4px",c:"w"},{t:"calc(50% - 4px)",r:"-4px",c:"e"},
                      {b:"-4px",l:"-4px",c:"sw"},{b:"-4px",l:"calc(50% - 4px)",c:"s"},{b:"-4px",r:"-4px",c:"se"}].map(h=>(
                      <div key={h.c} style={{position:"absolute",...h,width:"8px",height:"8px",background:"#fff",borderRadius:"1px",cursor:`${h.c}-resize`}}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div style={{position:"absolute",bottom:"12px",left:"50%",transform:"translateX(-50%)"}}>
        <button onClick={()=>{setImage(null);setBgStatus("idle");setBgSubUrl(null);setBgResult(null);}}
          style={{background:"#fff",color:"#999",padding:"6px 14px",border:"1.5px solid #eee",borderRadius:"8px",fontSize:"12px",fontWeight:500,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          ← New Photo
        </button>
      </div>
    </>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
const SL=({children})=><div style={{fontSize:"11px",fontWeight:600,color:"#aaa",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"8px"}}>{children}</div>;
const Empty=({children})=><div style={{fontSize:"12px",color:"#bbb",textAlign:"center",padding:"20px",border:"2px dashed #eee",borderRadius:"10px"}}>{children}</div>;
const Row=({children})=><span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>{children}</span>;
const Spin=({color="#fff"})=><span style={{display:"inline-block",width:"14px",height:"14px",border:`2px solid ${color}44`,borderTopColor:color,borderRadius:"50%",animation:"spin .8s linear infinite",flexShrink:0}}/>;
const PBar=({value})=><div style={{height:"4px",background:"#f0f0f8",borderRadius:"2px",margin:"6px 0 10px",overflow:"hidden"}}><div style={{height:"100%",width:`${value}%`,background:"linear-gradient(90deg,#6c63ff,#a78bfa)",transition:"width .3s",borderRadius:"2px"}}/></div>;
function AB({children,onClick,disabled,color="purple",textColor="#fff",style={}}){
  const bg=color==="purple"?"linear-gradient(135deg,#6c63ff,#a78bfa)":color;
  const sh=color==="purple"?"0 2px 10px rgba(108,99,255,.3)":"none";
  return <button onClick={onClick} disabled={disabled} style={{border:"none",cursor:disabled?"not-allowed":"pointer",borderRadius:"10px",fontSize:"13px",fontWeight:600,fontFamily:"inherit",transition:"all .18s",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",background:disabled?"#f0f0f0":bg,color:disabled?"#bbb":textColor,boxShadow:disabled?"none":sh,padding:"11px 16px",...style}}>{children}</button>;
}
