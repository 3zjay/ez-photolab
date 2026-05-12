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

async function renderFinal(imgEl, cssFilterStr, filters, rotation, flipH, flipV, texts, targetW, targetH) {
  const MAX=16_000_000;
  let W=targetW, H=targetH;
  if(W*H>MAX){const s=Math.sqrt(MAX/(W*H));W=Math.floor(W*s);H=Math.floor(H*s);}
  const canvas=document.createElement("canvas"); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext("2d");
  ctx.save();
  ctx.translate(W/2,H/2);
  ctx.rotate(rotation*Math.PI/180);
  ctx.scale(flipH?-1:1, flipV?-1:1);
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";
  ctx.filter=cssFilterStr;
  ctx.drawImage(imgEl,-W/2,-H/2,W,H);
  ctx.restore();
  ctx.filter="none";
  if(filters.temperature!==0){const a=Math.abs(filters.temperature)/300;ctx.globalCompositeOperation="overlay";ctx.fillStyle=filters.temperature>0?`rgba(255,140,0,${a})`:`rgba(100,149,237,${a})`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  if(filters.fade>0){ctx.globalCompositeOperation="screen";ctx.fillStyle=`rgba(255,255,255,${filters.fade/180})`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  if(filters.vignette>0){const g=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.85);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(0,0,0,${filters.vignette/100})`);ctx.globalCompositeOperation="multiply";ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  if(filters.grain>0){
    const grainCanvas=document.createElement("canvas"); grainCanvas.width=W; grainCanvas.height=H;
    const gc=grainCanvas.getContext("2d"); const id=gc.createImageData(W,H); const d=id.data;
    for(let i=0;i<d.length;i+=4){const v=(Math.random()-0.5)*filters.grain*2.5;d[i]=d[i+1]=d[i+2]=128+v;d[i+3]=255;}
    gc.putImageData(id,0,0);
    ctx.globalCompositeOperation="overlay"; ctx.globalAlpha=0.35;
    ctx.drawImage(grainCanvas,0,0); ctx.globalCompositeOperation="source-over"; ctx.globalAlpha=1;
  }
  texts.forEach(t=>{
    if(!t.content.trim()) return;
    const sz=Math.round(t.fontSize*(W/800));
    ctx.font=`${t.bold?"bold ":""}${t.italic?"italic ":""}${sz}px ${FONT_MAP[t.font]||FONT_MAP.System}`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    const x=t.x/100*W, y=t.y/100*H;
    if(t.stroke){ctx.strokeStyle="rgba(0,0,0,0.6)";ctx.lineWidth=sz*0.08;ctx.strokeText(t.content,x,y);}
    ctx.fillStyle=t.color; ctx.fillText(t.content,x,y);
  });
  return {canvas,W,H};
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

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    check(); window.addEventListener("resize",check);
    return()=>window.removeEventListener("resize",check);
  },[]);

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
    const img=imgRef.current; if(!img) return;
    setExporting(true); setExportDone(false); setExportInfo("");
    try{
      const{W,H}=getExportDims(img.naturalWidth,img.naturalHeight,exportScale);
      const{canvas,W:rW,H:rH}=await renderFinal(img,cssFilter,filters,rotation,flipH,flipV,texts,W,H);
      const fmts={jpg:{mime:"image/jpeg",ext:"jpg"},png:{mime:"image/png",ext:"png"},webp:{mime:"image/webp",ext:"webp"}};
      const{mime,ext}=fmts[exportFmt];
      const q=exportFmt==="png"?undefined:exportQ/100;
      const blob=await canvasToBlob(canvas,mime,q);
      const kb=Math.round(blob.size/1024);
      setExportInfo(`${rW.toLocaleString()}×${rH.toLocaleString()}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      await saveFile(blob,`photolab.${ext}`);
      setExportDone(true); setTimeout(()=>setExportDone(false),4000);
    }catch(e){console.error(e);setExportInfo("Export failed — try lower scale.");}
    setExporting(false);
  };
  const handleFbExport=async()=>{
    const img=imgRef.current; if(!img) return;
    setFbExporting(true); setFbDone(false);
    try{
      const mode=FB_MODES.find(m=>m.id===fbMode);
      let tW=mode.w,tH=mode.h;
      if(!tH){const sc=Math.min(1,tW/Math.max(img.naturalWidth,img.naturalHeight));tW=Math.round(img.naturalWidth*sc);tH=Math.round(img.naturalHeight*sc);}
      const{canvas,W,H}=await renderFinal(img,cssFilter,filters,rotation,flipH,flipV,texts,tW,tH);
      const blob=await canvasToBlob(canvas,"image/jpeg",0.82);
      const kb=Math.round(blob.size/1024);
      setExportInfo(`${W}×${H}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      await saveFile(blob,`facebook_${mode.id}.jpg`);
      setFbDone(true); setTimeout(()=>setFbDone(false),4000);
    }catch(e){console.error(e);}
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
          <div style={{padding:"14px",background:"linear-gradient(135deg,#f3e8ff,#ede9fe)",border:"1.5px solid #c4b5fd",borderRadius:"12px"}}>
            <div style={{fontSize:"13px",fontWeight:700,color:"#7c3aed",marginBottom:"4px"}}>🪄 AI Features — Coming Soon</div>
            <div style={{fontSize:"11px",color:"#9d6fb5",lineHeight:1.6,marginBottom:"10px"}}>AI Beauty, AI Enhance, Object Removal powered by fal.ai.</div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {["✨ AI Beauty","🔍 AI Enhance","🧹 Remove Object","⬆️ AI Upscale"].map(f=>(
                <span key={f} style={{padding:"4px 10px",background:"rgba(124,58,237,.1)",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#7c3aed"}}>{f}</span>
              ))}
            </div>
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

      {/* ── BATCH ── */}
      {activeTab==="batch"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>

          {/* Section tabs */}
          <div style={{display:"flex",gap:"4px",background:dm?'#2a2a2a':'#f2f2f8',padding:"3px",borderRadius:"10px",overflowX:"auto"}}>
            {[["folders","📁 Files"],["resize","📐 Resize"],["enhance","✨ Enhance"],["logo","🏷 Logo"],["output","💾 Output"]].map(([id,lb])=>(
              <button key={id} onClick={()=>setBatchSection(id)}
                style={{flex:"1 0 auto",padding:"6px 8px",fontSize:"11px",fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",background:batchSection===id?(dm?'#444':'#fff'):'transparent',color:batchSection===id?'#6c63ff':'#999',borderRadius:"7px",boxShadow:batchSection===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s"}}>
                {lb}
              </button>
            ))}
          </div>

          {/* ── FILES ── */}
          {batchSection==="folders"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                <SL>Source Folder</SL>
                <button onClick={selectSourceFolder}
                  style={{width:"100%",padding:"12px",marginBottom:"8px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"9px",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>
                  📁 Select Source Folder
                </button>
                {batchImages.length>0
                  ? <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",background:dm?'#1e3a1e':'#f0fff4',border:"1.5px solid #86efac",borderRadius:"8px"}}>
                      <span style={{fontSize:"18px"}}>🖼</span>
                      <span style={{fontSize:"13px",fontWeight:600,color:"#16a34a"}}>{batchImages.length} images found</span>
                    </div>
                  : <p style={{fontSize:"11px",color:"#bbb"}}>JPG, PNG, WebP accepted</p>}
              </div>
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                <SL>Output Folder</SL>
                <button onClick={selectOutputFolder}
                  style={{width:"100%",padding:"12px",marginBottom:"8px",background:outputHandle?"linear-gradient(135deg,#059669,#34d399)":"linear-gradient(135deg,#374151,#6b7280)",color:"#fff",border:"none",borderRadius:"9px",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>
                  💾 {outputHandle?"Output Folder ✓":"Select Output Folder"}
                </button>
                <p style={{fontSize:"11px",color:"#bbb"}}>Files save with your naming settings</p>
              </div>
              <div style={{padding:"12px",background:dm?'#1e2a1e':'#f0fdf4',border:"1.5px solid #86efac",borderRadius:"10px"}}>
                <p style={{fontSize:"11px",color:dm?'#6ee7b7':'#166534',lineHeight:1.6}}>💡 The <strong>Edit tab</strong> settings (presets, sliders) are applied to all images in the batch.</p>
              </div>
            </div>
          )}

          {/* ── RESIZE ── */}
          {batchSection==="resize"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                <SL>Resize Mode</SL>
                {[
                  {id:"none",     l:"No Resize",     d:"Keep original dimensions",  i:"🚫"},
                  {id:"preset",   l:"Social Presets", d:"Common platform sizes",     i:"📱"},
                  {id:"longEdge", l:"Long Edge",      d:"Scale longest side to px",  i:"📏"},
                  {id:"custom",   l:"Custom",         d:"Set exact width × height",  i:"🎛"},
                ].map(o=>(
                  <button key={o.id} onClick={()=>setBatchResizeMode(o.id)}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",marginBottom:"6px",border:`1.5px solid ${batchResizeMode===o.id?"#6c63ff":cardBdr}`,background:batchResizeMode===o.id?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"9px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .18s"}}>
                    <span style={{fontSize:"16px"}}>{o.i}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"13px",fontWeight:600,color:batchResizeMode===o.id?"#6c63ff":dm?'#ccc':'#444'}}>{o.l}</div>
                      <div style={{fontSize:"11px",color:"#bbb"}}>{o.d}</div>
                    </div>
                    {batchResizeMode===o.id&&<span style={{color:"#6c63ff",fontSize:"16px"}}>✓</span>}
                  </button>
                ))}
              </div>

              {batchResizeMode==="preset"&&(
                <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                  <SL>Platform Preset</SL>
                  <select value={batchResizePreset} onChange={e=>setBatchResizePreset(e.target.value)} style={inputSt}>
                    {BATCH_RESIZE_PRESETS.map(p=>(
                      <option key={p.id} value={p.id}>{p.label} — {p.w}×{p.h||'auto'}</option>
                    ))}
                  </select>
                  <label style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"10px",cursor:"pointer"}}>
                    <input type="checkbox" checked={batchKeepAspect} onChange={e=>setBatchKeepAspect(e.target.checked)} style={{width:"16px",height:"16px",accentColor:"#6c63ff"}}/>
                    <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Maintain aspect ratio (letterbox fit)</span>
                  </label>
                  <p style={{fontSize:"11px",color:"#bbb",marginTop:"6px"}}>
                    Preview: {calcBatchDims(4000,3000,batchResizeMode,batchResizePreset,batchCustomW,batchCustomH,batchKeepAspect,batchLongEdgePx).W} × {calcBatchDims(4000,3000,batchResizeMode,batchResizePreset,batchCustomW,batchCustomH,batchKeepAspect,batchLongEdgePx).H}px (from 4000×3000)
                  </p>
                </div>
              )}

              {batchResizeMode==="longEdge"&&(
                <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                    <SL>Long Edge (px)</SL>
                    <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:700}}>{batchLongEdgePx.toLocaleString()}px</span>
                  </div>
                  <input type="range" className="sl" min={400} max={8000} step={100} value={batchLongEdgePx} style={{"--v":`${((batchLongEdgePx-400)/7600)*100}%`}} onChange={e=>setBatchLongEdgePx(+e.target.value)}/>
                  <div style={{display:"flex",gap:"6px",marginTop:"10px",flexWrap:"wrap"}}>
                    {[800,1200,1920,2560,3840].map(v=>(
                      <button key={v} onClick={()=>setBatchLongEdgePx(v)}
                        style={{padding:"5px 10px",border:`1.5px solid ${batchLongEdgePx===v?"#6c63ff":cardBdr}`,background:batchLongEdgePx===v?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"7px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:batchLongEdgePx===v?"#6c63ff":dm?'#ccc':'#555',fontFamily:"inherit"}}>
                        {v>=1000?`${v/1000}K`:v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {batchResizeMode==="custom"&&(
                <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                  <SL>Custom Dimensions</SL>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                    <div>
                      <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",display:"block",marginBottom:"4px"}}>WIDTH (px)</span>
                      <input type="number" value={batchCustomW} min={100} max={16000} onChange={e=>setBatchCustomW(+e.target.value)} style={inputSt}/>
                    </div>
                    <div>
                      <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",display:"block",marginBottom:"4px"}}>HEIGHT (px)</span>
                      <input type="number" value={batchCustomH} min={100} max={16000} onChange={e=>setBatchCustomH(+e.target.value)} style={inputSt}/>
                    </div>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}}>
                    <input type="checkbox" checked={batchKeepAspect} onChange={e=>setBatchKeepAspect(e.target.checked)} style={{width:"16px",height:"16px",accentColor:"#6c63ff"}}/>
                    <span style={{fontSize:"12px",color:dm?'#ccc':'#555'}}>Maintain aspect ratio</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ── ENHANCE ── */}
          {batchSection==="enhance"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{padding:"12px",background:dm?'#1e2a3a':'#eff6ff',border:"1.5px solid #bfdbfe",borderRadius:"10px"}}>
                <p style={{fontSize:"11px",color:dm?'#93c5fd':'#1d4ed8',lineHeight:1.6}}>💡 These enhancements apply <strong>after</strong> your Edit tab settings. Stack them for max quality.</p>
              </div>

              {/* Auto Contrast */}
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${batchAutoContrast?"#6c63ff":cardBdr}`,borderRadius:"12px",transition:"border-color .2s"}}>
                <label style={{display:"flex",alignItems:"flex-start",gap:"12px",cursor:"pointer"}}>
                  <input type="checkbox" checked={batchAutoContrast} onChange={e=>setBatchAutoContrast(e.target.checked)} style={{width:"18px",height:"18px",marginTop:"1px",accentColor:"#6c63ff",flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:700,color:batchAutoContrast?"#6c63ff":dm?'#ddd':'#333',marginBottom:"3px"}}>⚡ Auto Contrast</div>
                    <div style={{fontSize:"11px",color:"#bbb",lineHeight:1.5}}>Stretches the luminance range so the darkest pixel is black and the brightest is white. Punchy results.</div>
                  </div>
                </label>
              </div>

              {/* Auto Levels */}
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${batchAutoLevels?"#6c63ff":cardBdr}`,borderRadius:"12px",transition:"border-color .2s"}}>
                <label style={{display:"flex",alignItems:"flex-start",gap:"12px",cursor:"pointer"}}>
                  <input type="checkbox" checked={batchAutoLevels} onChange={e=>setBatchAutoLevels(e.target.checked)} style={{width:"18px",height:"18px",marginTop:"1px",accentColor:"#6c63ff",flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:700,color:batchAutoLevels?"#6c63ff":dm?'#ddd':'#333',marginBottom:"3px"}}>🎨 Auto Levels</div>
                    <div style={{fontSize:"11px",color:"#bbb",lineHeight:1.5}}>Normalizes each RGB channel independently. Corrects colour casts and uneven exposure. Best for mixed lighting.</div>
                  </div>
                </label>
              </div>

              {/* Noise Reduction */}
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${batchDenoise?"#6c63ff":cardBdr}`,borderRadius:"12px",transition:"border-color .2s"}}>
                <label style={{display:"flex",alignItems:"flex-start",gap:"12px",cursor:"pointer",marginBottom:batchDenoise?"10px":"0"}}>
                  <input type="checkbox" checked={batchDenoise} onChange={e=>setBatchDenoise(e.target.checked)} style={{width:"18px",height:"18px",marginTop:"1px",accentColor:"#6c63ff",flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:700,color:batchDenoise?"#6c63ff":dm?'#ddd':'#333',marginBottom:"3px"}}>🌊 Noise Reduction</div>
                    <div style={{fontSize:"11px",color:"#bbb",lineHeight:1.5}}>Adaptive Gaussian smoothing reduces grain from high-ISO shots while preserving edges.</div>
                  </div>
                </label>
                {batchDenoise&&(
                  <div style={{paddingLeft:"30px",animation:"fadein .2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                      <span style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Strength</span>
                      <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:700}}>{batchDenoiseAmt.toFixed(1)}</span>
                    </div>
                    <input type="range" className="sl" min={0.5} max={5} step={0.5} value={batchDenoiseAmt} style={{"--v":`${((batchDenoiseAmt-0.5)/4.5)*100}%`}} onChange={e=>setBatchDenoiseAmt(+e.target.value)}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
                      <span style={{fontSize:"10px",color:"#bbb"}}>Subtle</span>
                      <span style={{fontSize:"10px",color:"#bbb"}}>Strong</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sharpen */}
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${batchSharpen?"#6c63ff":cardBdr}`,borderRadius:"12px",transition:"border-color .2s"}}>
                <label style={{display:"flex",alignItems:"flex-start",gap:"12px",cursor:"pointer",marginBottom:batchSharpen?"10px":"0"}}>
                  <input type="checkbox" checked={batchSharpen} onChange={e=>setBatchSharpen(e.target.checked)} style={{width:"18px",height:"18px",marginTop:"1px",accentColor:"#6c63ff",flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:700,color:batchSharpen?"#6c63ff":dm?'#ddd':'#333',marginBottom:"3px"}}>🔍 Unsharp Mask</div>
                    <div style={{fontSize:"11px",color:"#bbb",lineHeight:1.5}}>Enhances edge definition using an unsharp mask algorithm. Applied last so it sharpens the final result.</div>
                  </div>
                </label>
                {batchSharpen&&(
                  <div style={{paddingLeft:"30px",animation:"fadein .2s",display:"flex",flexDirection:"column",gap:"10px"}}>
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                        <span style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Amount</span>
                        <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:700}}>{batchSharpenAmt.toFixed(1)}×</span>
                      </div>
                      <input type="range" className="sl" min={0.2} max={3} step={0.1} value={batchSharpenAmt} style={{"--v":`${((batchSharpenAmt-0.2)/2.8)*100}%`}} onChange={e=>setBatchSharpenAmt(+e.target.value)}/>
                    </div>
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                        <span style={{fontSize:"11px",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Radius</span>
                        <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:700}}>{batchSharpenRad.toFixed(1)}px</span>
                      </div>
                      <input type="range" className="sl" min={0.5} max={4} step={0.5} value={batchSharpenRad} style={{"--v":`${((batchSharpenRad-0.5)/3.5)*100}%`}} onChange={e=>setBatchSharpenRad(+e.target.value)}/>
                      <p style={{fontSize:"10px",color:"#bbb",marginTop:"4px"}}>Lower = fine detail · Higher = broad edges</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick presets */}
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                <SL>Quick Combos</SL>
                <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                  {[
                    {label:"📸 Product Photos",    desc:"Contrast + Sharpen",                 fn:()=>{setBatchAutoContrast(true);setBatchAutoLevels(false);setBatchSharpen(true);setBatchSharpenAmt(1.2);setBatchSharpenRad(1.5);setBatchDenoise(false);}},
                    {label:"🤳 Portrait Retouch",  desc:"Denoise + Subtle sharpen",            fn:()=>{setBatchAutoContrast(false);setBatchAutoLevels(true);setBatchSharpen(true);setBatchSharpenAmt(0.6);setBatchSharpenRad(1.0);setBatchDenoise(true);setBatchDenoiseAmt(2);}},
                    {label:"🌆 Landscape Boost",   desc:"Levels + Strong sharpen",             fn:()=>{setBatchAutoContrast(false);setBatchAutoLevels(true);setBatchSharpen(true);setBatchSharpenAmt(1.8);setBatchSharpenRad(2.0);setBatchDenoise(false);}},
                    {label:"🌙 Low-Light Fix",     desc:"Contrast + Denoise + Light sharpen",  fn:()=>{setBatchAutoContrast(true);setBatchAutoLevels(false);setBatchSharpen(true);setBatchSharpenAmt(0.8);setBatchSharpenRad(1.5);setBatchDenoise(true);setBatchDenoiseAmt(3);}},
                    {label:"⬜ Reset All",          desc:"Turn off all enhancements",           fn:()=>{setBatchAutoContrast(false);setBatchAutoLevels(false);setBatchSharpen(false);setBatchDenoise(false);}},
                  ].map(p=>(
                    <button key={p.label} onClick={p.fn}
                      style={{padding:"10px 12px",border:`1.5px solid ${cardBdr}`,background:dm?'#1e1e1e':'#fff',borderRadius:"9px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all .18s"}}>
                      <div>
                        <div style={{fontSize:"12px",fontWeight:700,color:dm?'#ddd':'#333'}}>{p.label}</div>
                        <div style={{fontSize:"11px",color:"#bbb"}}>{p.desc}</div>
                      </div>
                      <span style={{fontSize:"11px",color:"#6c63ff",fontWeight:600}}>Apply →</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LOGO ── */}
          {batchSection==="logo"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                <SL>Logo / Watermark File</SL>
                <label style={{display:"block",padding:"12px",border:`2px dashed ${batchLogo?"#6c63ff":cardBdr}`,borderRadius:"9px",cursor:"pointer",textAlign:"center",transition:"all .2s",background:batchLogo?cardBg:dm?'#1e1e1e':'#fff'}}>
                  <input type="file" accept="image/*" onChange={handleBatchLogoUpload} style={{display:"none"}}/>
                  {batchLogo
                    ? <><div style={{fontSize:"24px",marginBottom:"4px"}}>✅</div><div style={{fontSize:"12px",fontWeight:600,color:"#6c63ff"}}>{batchLogoFile?.name}</div><div style={{fontSize:"11px",color:"#bbb",marginTop:"2px"}}>Click to change</div></>
                    : <><div style={{fontSize:"24px",marginBottom:"4px"}}>🏷</div><div style={{fontSize:"12px",fontWeight:600,color:dm?'#ccc':'#555'}}>Click to upload logo</div><div style={{fontSize:"11px",color:"#bbb"}}>PNG with transparency works best</div></>}
                </label>
                {batchLogo&&<button onClick={()=>{setBatchLogo(null);setBatchLogoFile(null);}} style={{width:"100%",marginTop:"8px",padding:"7px",background:"#fee2e2",border:"none",borderRadius:"7px",fontSize:"12px",color:"#ef4444",fontWeight:600,cursor:"pointer"}}>Remove Logo</button>}
              </div>
              {batchLogo&&(
                <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px",display:"flex",flexDirection:"column",gap:"12px"}}>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                      <SL>Size</SL>
                      <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:700}}>{(batchLogoScale*100).toFixed(0)}% of width</span>
                    </div>
                    <input type="range" className="sl" min={0.03} max={0.5} step={0.01} value={batchLogoScale} style={{"--v":`${((batchLogoScale-0.03)/0.47)*100}%`}} onChange={e=>setBatchLogoScale(+e.target.value)}/>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                      <SL>Opacity</SL>
                      <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:700}}>{Math.round(batchLogoOpacity*100)}%</span>
                    </div>
                    <input type="range" className="sl" min={0.1} max={1} step={0.05} value={batchLogoOpacity} style={{"--v":`${((batchLogoOpacity-0.1)/0.9)*100}%`}} onChange={e=>setBatchLogoOpacity(+e.target.value)}/>
                  </div>
                  <div>
                    <SL>Position</SL>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"5px"}}>
                      {[
                        {id:"top-left",l:"↖"},    {id:"top-center",l:"↑"},    {id:"top-right",l:"↗"},
                        {id:"",l:""},              {id:"center",l:"⊕"},       {id:"",l:""},
                        {id:"bottom-left",l:"↙"}, {id:"bottom-center",l:"↓"},{id:"bottom-right",l:"↘"},
                      ].map((p,i)=>(
                        p.id
                          ? <button key={p.id} onClick={()=>setBatchLogoPos(p.id)}
                              style={{padding:"10px",border:`1.5px solid ${batchLogoPos===p.id?"#6c63ff":cardBdr}`,background:batchLogoPos===p.id?"#6c63ff":dm?'#1e1e1e':'#fff',borderRadius:"7px",fontSize:"16px",cursor:"pointer",color:batchLogoPos===p.id?"#fff":dm?'#ccc':'#555',transition:"all .15s"}}>

                              {p.l}
                            </button>
                          : <div key={i}/>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                      <SL>Margin</SL>
                      <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:700}}>{batchLogoMargin}px</span>
                    </div>
                    <input type="range" className="sl" min={0} max={100} step={5} value={batchLogoMargin} style={{"--v":`${(batchLogoMargin/100)*100}%`}} onChange={e=>setBatchLogoMargin(+e.target.value)}/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── OUTPUT FORMAT ── */}
          {batchSection==="output"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                <SL>Format</SL>
                {[{id:"jpeg",l:"JPEG",d:"Smallest · Best for photos"},{id:"png",l:"PNG",d:"Lossless · Supports transparency"},{id:"webp",l:"WebP",d:"Modern · Great compression"}].map(f=>(
                  <button key={f.id} onClick={()=>setBatchOutputFmt(f.id)}
                    style={{width:"100%",padding:"10px 12px",marginBottom:"6px",border:`1.5px solid ${batchOutputFmt===f.id?"#6c63ff":cardBdr}`,background:batchOutputFmt===f.id?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"9px",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",transition:"all .18s"}}>
                    <div>
                      <span style={{fontSize:"13px",fontWeight:700,color:batchOutputFmt===f.id?"#6c63ff":dm?'#ccc':'#444'}}>{f.l}</span>
                      <span style={{fontSize:"11px",color:"#bbb",marginLeft:"10px"}}>{f.d}</span>
                    </div>
                    {batchOutputFmt===f.id&&<span style={{color:"#6c63ff",fontSize:"16px"}}>✓</span>}
                  </button>
                ))}
              </div>
              {batchOutputFmt!=="png"&&(
                <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                    <SL>Quality</SL>
                    <span style={{fontSize:"13px",fontWeight:700,color:"#6c63ff"}}>{batchOutputQ}%</span>
                  </div>
                  <input type="range" className="sl" min={60} max={100} step={1} value={batchOutputQ} style={{"--v":`${((batchOutputQ-60)/40)*100}%`}} onChange={e=>setBatchOutputQ(+e.target.value)}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
                    <span style={{fontSize:"10px",color:"#bbb"}}>Smaller file</span>
                    <span style={{fontSize:"10px",color:"#bbb"}}>Best quality</span>
                  </div>
                  <div style={{display:"flex",gap:"6px",marginTop:"10px"}}>
                    {[{v:75,l:"75%"},{v:85,l:"85%"},{v:90,l:"90%"},{v:95,l:"95%"}].map(q=>(
                      <button key={q.v} onClick={()=>setBatchOutputQ(q.v)}
                        style={{flex:1,padding:"6px",border:`1.5px solid ${batchOutputQ===q.v?"#6c63ff":cardBdr}`,background:batchOutputQ===q.v?cardBg:dm?'#1e1e1e':'#fff',borderRadius:"7px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:batchOutputQ===q.v?"#6c63ff":dm?'#ccc':'#555',fontFamily:"inherit"}}>
                        {q.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{padding:"14px",background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:"12px"}}>
                <SL>Filename Template</SL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"8px"}}>
                  <div>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",display:"block",marginBottom:"4px"}}>PREFIX</span>
                    <input type="text" value={batchPrefix} onChange={e=>setBatchPrefix(e.target.value)} placeholder="e.g. shop_" style={inputSt}/>
                  </div>
                  <div>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",display:"block",marginBottom:"4px"}}>SUFFIX</span>
                    <input type="text" value={batchSuffix} onChange={e=>setBatchSuffix(e.target.value)} placeholder="e.g. _v2" style={inputSt}/>
                  </div>
                </div>
                <div style={{padding:"8px 12px",background:dm?'#1e1e1e':'#f2f2f8',borderRadius:"7px",fontSize:"11px",color:dm?'#bbb':'#888',fontFamily:"monospace"}}>
                  {batchPrefix}photo001{batchSuffix}.{batchOutputFmt==="jpeg"?"jpg":batchOutputFmt}
                </div>
              </div>
            </div>
          )}

          {/* ── PROCESS BUTTON ── */}
          <div style={{position:"sticky",bottom:0,background:dm?'#1e1e1e':'#fff',paddingTop:"10px",paddingBottom:"4px",marginTop:"4px",borderTop:`1px solid ${cardBdr}`}}>
            {batchProcessing&&(
              <div style={{marginBottom:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                  <span style={{fontSize:"11px",color:"#bbb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"200px"}}>{batchProgress.currentFile}</span>
                  <span style={{fontSize:"11px",fontWeight:600,color:"#6c63ff"}}>{batchProgress.current}/{batchProgress.total}</span>
                </div>
                <div style={{height:"5px",background:dm?'#333':'#eee',borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(batchProgress.current/batchProgress.total)*100}%`,background:"linear-gradient(90deg,#6c63ff,#a78bfa)",transition:"width .3s",borderRadius:"3px"}}/>
                </div>
              </div>
            )}
            {batchDone&&!batchProcessing&&(
              <div style={{padding:"10px 12px",background:dm?'#1e3a1e':'#f0fff4',border:"1.5px solid #86efac",borderRadius:"9px",marginBottom:"8px",fontSize:"12px",fontWeight:600,color:"#16a34a",textAlign:"center"}}>
                ✅ Done! {batchImages.length} images processed.
              </div>
            )}
            <button onClick={handleBatchProcess}
              disabled={batchProcessing || !sourceHandle || !outputHandle || batchImages.length===0}
              style={{
                width:"100%", padding:"14px", border:"none", borderRadius:"10px",
                background: (batchProcessing||!sourceHandle||!outputHandle||batchImages.length===0)
                  ? (dm?'#333':'#e0e0e0')
                  : "linear-gradient(135deg,#6c63ff,#a78bfa)",
                color: (batchProcessing||!sourceHandle||!outputHandle||batchImages.length===0) ? (dm?'#666':'#bbb') : "#fff",
                fontWeight:700, fontSize:"14px", cursor:"pointer", fontFamily:"inherit",
                boxShadow: (batchProcessing||!sourceHandle||!outputHandle||batchImages.length===0) ? "none" : "0 2px 12px rgba(108,99,255,.3)",
                transition:"all .2s"
              }}>
              {batchProcessing ? <Row><Spin/>Processing {batchProgress.current}/{batchProgress.total}…</Row>
                : !sourceHandle ? "📁 Select source folder first"
                : !outputHandle ? "💾 Select output folder first"
                : batchImages.length===0 ? "No images found in folder"
                : `⚡ Process ${batchImages.length} Image${batchImages.length!==1?"s":""}`}
            </button>
          </div>
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
        .sl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;background:linear-gradient(to right,#6c63ff var(--v,50%),#e0e0e8 var(--v,50%));touch-action:none}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#6c63ff;border:3px solid #fff;box-shadow:0 1px 6px rgba(108,99,255,.4);cursor:grab}
        .sl::-webkit-slider-thumb:active{transform:scale(1.15)}
        .sl::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#6c63ff;border:3px solid #fff;cursor:grab}
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
        <div style={{display:"flex",height:"calc(100vh - 52px)"}}>
          <div style={{width:"310px",borderRight:`1px solid ${dm?'#333':'#eee'}`,overflowY:"auto",background:dm?'#1e1e1e':'#fff',flexShrink:0}}>
            <Panel/>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:dm?'#181818':'#f7f8fa',position:"relative",overflow:"hidden"}}>
            {activeTab==="batch"?(
              <div style={{textAlign:"center",color:dm?'#aaa':'#666'}}>
                <div style={{fontSize:"56px",marginBottom:"12px"}}>📦</div>
                <p style={{fontSize:"17px",fontWeight:700,color:dm?'#ddd':'#444',marginBottom:"6px"}}>Batch Processing Mode</p>
                <p style={{fontSize:"13px",color:dm?'#888':'#aaa',marginBottom:"20px"}}>Configure settings in the left panel, then process your folder</p>
                <div style={{display:"flex",gap:"10px",justifyContent:"center",flexWrap:"wrap"}}>
                  {[batchResizeMode!=="none"&&"📐 Resize",batchAutoContrast&&"⚡ Auto Contrast",batchAutoLevels&&"🎨 Auto Levels",batchDenoise&&"🌊 Denoise",batchSharpen&&"🔍 Sharpen",batchLogo&&"🏷 Watermark"].filter(Boolean).map(f=>(
                    <span key={f} style={{padding:"5px 12px",background:dm?'#2a2a3a':'#f0eeff',border:"1.5px solid #c4b5fd",borderRadius:"20px",fontSize:"12px",fontWeight:600,color:"#7c3aed"}}>{f}</span>
                  ))}
                  {[batchResizeMode!=="none",batchAutoContrast,batchAutoLevels,batchDenoise,batchSharpen,batchLogo].every(v=>!v)&&<span style={{fontSize:"12px",color:"#bbb"}}>No enhancements active — configure in the panel →</span>}
                </div>
              </div>
            ):(
              <Preview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,previewRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}}/>
            )}
          </div>
        </div>
      )}

      {/* MOBILE */}
      {isMobile&&(
        <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden"}}>
          <div style={{height:"42vh",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:dm?'#181818':'#f0f1f5',position:"relative",borderBottom:`1px solid ${dm?'#333':'#e8e8f0'}`}}>
            {activeTab==="batch"?(
              <div style={{textAlign:"center",color:dm?'#aaa':'#666'}}>
                <div style={{fontSize:"42px",marginBottom:"8px"}}>📦</div>
                <p style={{fontSize:"15px",fontWeight:600,color:dm?'#ddd':'#666'}}>Batch Mode</p>
                <p style={{fontSize:"12px",color:dm?'#888':'#aaa'}}>Use the panel below</p>
              </div>
            ):(
              <Preview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,previewRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}}/>
            )}
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

// ── Preview ───────────────────────────────────────────────────────────────────
function Preview({image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}) {
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
        style={{position:"relative",maxWidth:"100%",maxHeight:maxH,lineHeight:0,borderRadius:"14px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.12)",cursor:showSplit?"ew-resize":"default",userSelect:"none"}}>
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
              style={{position:"absolute",top:0,bottom:0,left:`${splitPos}%`,transform:"translateX(-50%)",width:"44px",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",cursor:"ew-resize"}}>
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
                  style={{position:"absolute",left:`${t.x}%`,top:`${t.y}%`,transform:"translate(-50%,-50%)",cursor:"move",userSelect:"none",
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
