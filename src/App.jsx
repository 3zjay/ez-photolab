import { useState, useRef, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const FILTERS = [
  { key:"brightness", label:"Brightness",  min:0,    max:200, default:100, unit:"%", group:"basic" },
  { key:"contrast",   label:"Contrast",    min:0,    max:200, default:100, unit:"%", group:"basic" },
  { key:"saturation", label:"Saturation",  min:0,    max:200, default:100, unit:"%", group:"basic" },
  { key:"exposure",   label:"Exposure",    min:-100, max:100, default:0,   unit:"",  group:"basic" },
  { key:"temperature",label:"Warmth",      min:-100, max:100, default:0,   unit:"",  group:"basic" },
  { key:"sharpness",  label:"Sharpness",   min:0,    max:20,  default:0,   unit:"",  group:"enhance" },
  { key:"clarity",    label:"Clarity",     min:0,    max:20,  default:0,   unit:"",  group:"enhance" },
  { key:"denoise",    label:"Denoise",     min:0,    max:10,  default:0,   unit:"",  group:"enhance" },
  { key:"smooth",     label:"Skin Smooth", min:0,    max:10,  default:0,   unit:"",  group:"enhance" },
  { key:"vignette",   label:"Vignette",    min:0,    max:100, default:0,   unit:"%", group:"style" },
  { key:"fade",       label:"Fade",        min:0,    max:100, default:0,   unit:"%", group:"style" },
];
const DEFAULT_STATE = Object.fromEntries(FILTERS.map(f => [f.key, f.default]));

// Gentle presets — subtle improvements, never distort
const PRESETS = [
  { name:"Portrait",    icon:"👤", values:{ smooth:5, clarity:5, sharpness:3, contrast:105, saturation:104, temperature:8,  vignette:12, fade:0 }},
  { name:"Vivid",       icon:"🌈", values:{ contrast:112, saturation:118, clarity:6, sharpness:4, brightness:103, exposure:3 }},
  { name:"Soft",        icon:"☁️", values:{ smooth:4, brightness:104, contrast:96, saturation:105, fade:8, temperature:6 }},
  { name:"B&W",         icon:"⚫", values:{ saturation:0, contrast:115, clarity:7, sharpness:3, brightness:102 }},
  { name:"Warm",        icon:"🌅", values:{ temperature:35, saturation:108, brightness:103, contrast:103, fade:5 }},
  { name:"Cool",        icon:"❄️", values:{ temperature:-30, saturation:106, brightness:102, contrast:104 }},
  { name:"Restore",     icon:"🖼", values:{ denoise:4, smooth:2, clarity:5, sharpness:3, contrast:108, saturation:108, exposure:5 }},
  { name:"Sharp",       icon:"✨", values:{ sharpness:8, clarity:9, contrast:110, denoise:0 }},
];

const GROUPS = [{ key:"basic",label:"Basic" },{ key:"enhance",label:"Enhance" },{ key:"style",label:"Style" }];

const EXPORT_FORMATS = [
  { id:"jpg", label:"JPEG", desc:"Best for photos",    ext:"jpg",  mime:"image/jpeg" },
  { id:"png", label:"PNG",  desc:"Lossless",            ext:"png",  mime:"image/png"  },
  { id:"webp",label:"WebP", desc:"Smallest file size",  ext:"webp", mime:"image/webp" },
];

const FB_MODES = [
  { id:"portrait",  label:"Portrait Post",  desc:"1080 × 1350px",     w:1080, h:1350, quality:0.82 },
  { id:"square",    label:"Square Post",    desc:"1080 × 1080px",     w:1080, h:1080, quality:0.82 },
  { id:"landscape", label:"Landscape Post", desc:"2048px wide",        w:2048, h:null, quality:0.82 },
  { id:"cover",     label:"Cover Photo",    desc:"851 × 315px",        w:851,  h:315,  quality:0.82 },
];

const BG_COLORS = ["#ffffff","#f5f5f5","#000000","#1a1a2e","#2d4a3e","#4a1a2e","#1a3a4a","#fff8e7"];

// ── CSS filter string from values ────────────────────────────────────────────
function toCSSFilter(f) {
  const ev = 1 + f.exposure / 100;
  const bv = (f.brightness / 100) * ev;
  let s = `brightness(${bv.toFixed(3)}) contrast(${(f.contrast/100).toFixed(3)}) saturate(${(f.saturation/100).toFixed(3)})`;
  if (f.denoise > 0) s += ` blur(${(f.denoise * 0.06).toFixed(2)}px)`;
  if (f.sharpness > 0) s += ` contrast(${(1 + f.sharpness * 0.025).toFixed(3)})`;
  if (f.clarity   > 0) s += ` contrast(${(1 + f.clarity   * 0.018).toFixed(3)})`;
  return s;
}

// ── Beauty / Auto-Enhance ────────────────────────────────────────────────────
function autoEnhance(imgEl) {
  const c = document.createElement("canvas");
  const scale = Math.min(1, 200 / Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
  c.width  = Math.round(imgEl.naturalWidth  * scale);
  c.height = Math.round(imgEl.naturalHeight * scale);
  const ctx = c.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;

  let rSum=0, gSum=0, bSum=0, skin=0, dark=0, blown=0, total=0;
  for (let i=0; i<data.length; i+=4) {
    const r=data[i], g=data[i+1], b=data[i+2];
    rSum+=r; gSum+=g; bSum+=b; total++;
    const L = 0.299*r+0.587*g+0.114*b;
    if (L < 25)  dark++;
    if (L > 248) blown++;
    if (r>90&&g>40&&b>20&&r>g&&r>b&&(r-b)>20&&L>45&&L<225) skin++;
  }

  const hasPerson = (skin/total) > 0.04;
  const isDark    = (dark/total)  > 0.35;
  const isBlown   = (blown/total) > 0.18;
  const isWarm    = (rSum-bSum)/total > 28;
  const isCool    = (bSum-rSum)/total > 20;

  const adj = { ...DEFAULT_STATE };

  if (hasPerson) {
    // Beauty portrait mode
    adj.smooth      = 5;
    adj.clarity     = 5;
    adj.sharpness   = 3;
    adj.contrast    = 106;
    adj.saturation  = 105;
    adj.temperature = 8;
    adj.vignette    = 15;
    if (isDark)  { adj.exposure = 8;  adj.brightness = 106; }
    if (isBlown) { adj.brightness = 96; }
    return { adj, label:"beauty", msg:"Beauty filter applied — portrait enhanced." };
  } else {
    // Scene mode
    adj.clarity    = 6;
    adj.sharpness  = 4;
    adj.contrast   = 108;
    adj.saturation = 106;
    if (isDark)  { adj.exposure = 10; adj.brightness = 107; }
    if (isBlown) { adj.brightness = 95; }
    if (isWarm)  adj.temperature = -8;
    if (isCool)  adj.temperature =  12;
    return { adj, label:"scene", msg:"Scene enhanced — clarity and colour boost applied." };
  }
}

// ── Cross-platform download ───────────────────────────────────────────────────
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) { window.location.href = url; setTimeout(()=>URL.revokeObjectURL(url),10000); return; }
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise(resolve => {
    if (canvas.toBlob) { canvas.toBlob(resolve, mime, quality); return; }
    const d=canvas.toDataURL(mime,quality), arr=d.split(","), bstr=atob(arr[1]);
    let n=bstr.length; const u=new Uint8Array(n);
    while(n--) u[n]=bstr.charCodeAt(n);
    resolve(new Blob([u],{type:mime}));
  });
}

// ── Export rendering (canvas — only used when saving) ───────────────────────
async function renderForExport(imgEl, filters, targetW, targetH) {
  // Cap at safe browser canvas limit (~16MP)
  const MAX_PX = 16_000_000;
  let W = targetW, H = targetH;
  if (W * H > MAX_PX) {
    const s = Math.sqrt(MAX_PX / (W * H));
    W = Math.floor(W * s); H = Math.floor(H * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Draw with CSS filters
  const ev = 1+filters.exposure/100, bv = (filters.brightness/100)*ev;
  ctx.filter = `brightness(${bv}) contrast(${filters.contrast/100}) saturate(${filters.saturation/100})`;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Smart-crop for exact dimensions
  const sW=imgEl.naturalWidth, sH=imgEl.naturalHeight;
  const sA=sW/sH, tA=W/H;
  let sx=0,sy=0,sw=sW,sh=sH;
  if (Math.abs(sA-tA) > 0.01) {
    if (sA>tA) { sw=sH*tA; sx=(sW-sw)/2; }
    else       { sh=sW/tA; sy=(sH-sh)/2; }
  }
  ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, W, H);
  ctx.filter = "none";

  // Warmth overlay
  if (filters.temperature !== 0) {
    const a = Math.abs(filters.temperature)/300;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = filters.temperature>0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
    ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation = "source-over";
  }
  // Fade
  if (filters.fade > 0) {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255,255,255,${filters.fade/180})`;
    ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation = "source-over";
  }
  // Vignette
  if (filters.vignette > 0) {
    const g = ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.85);
    g.addColorStop(0,"rgba(0,0,0,0)");
    g.addColorStop(1,`rgba(0,0,0,${filters.vignette/100})`);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation = "source-over";
  }
  return { canvas, W, H };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function App() {
  const [image,        setImage]        = useState(null);
  const [filters,      setFilters]      = useState(DEFAULT_STATE);
  const [activeTab,    setActiveTab]    = useState("edit");
  const [activeGroup,  setActiveGroup]  = useState("basic");
  const [showBefore,   setShowBefore]   = useState(false);
  const [splitPos,     setSplitPos]     = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [dragging,     setDragging]     = useState(false);
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [autoMsg,      setAutoMsg]      = useState(null);
  const [autoLoading,  setAutoLoading]  = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [exportTab,    setExportTab]    = useState("standard");
  const [exportFormat, setExportFormat] = useState("jpg");
  const [exportQuality,setExportQuality]= useState(92);
  const [exportScale,  setExportScale]  = useState(2);
  const [exporting,    setExporting]    = useState(false);
  const [exportDone,   setExportDone]   = useState(false);
  const [exportInfo,   setExportInfo]   = useState("");
  const [fbMode,       setFbMode]       = useState("portrait");
  const [fbExporting,  setFbExporting]  = useState(false);
  const [fbDone,       setFbDone]       = useState(false);
  const [bgStatus,     setBgStatus]     = useState("idle");
  const [bgProgress,   setBgProgress]   = useState(0);
  const [bgSubjectUrl, setBgSubjectUrl] = useState(null);
  const [bgMode,       setBgMode]       = useState("transparent");
  const [bgColor,      setBgColor]      = useState("#ffffff");
  const [bgBlur,       setBgBlur]       = useState(14);
  const [bgResult,     setBgResult]     = useState(null);
  const [isMobile,     setIsMobile]     = useState(false);

  const fileInputRef = useRef(null);
  const imgRef       = useRef(null);
  const splitRef     = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (bgSubjectUrl && bgStatus==="done") buildComposite(bgSubjectUrl, bgMode, bgColor, bgBlur);
  }, [bgMode, bgColor, bgBlur, bgSubjectUrl]);

  // Split drag handling
  const onSplitMove = useCallback((clientX) => {
    if (!splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    setSplitPos(Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    if (!isDraggingSplit) return;
    const mm = e => onSplitMove(e.clientX);
    const tm = e => { e.preventDefault(); onSplitMove(e.touches[0].clientX); };
    const up = () => setIsDraggingSplit(false);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", tm, { passive:false });
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove",mm); window.removeEventListener("mouseup",up); window.removeEventListener("touchmove",tm); window.removeEventListener("touchend",up); };
  }, [isDraggingSplit, onSplitMove]);

  const loadImage = file => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result);
      setFilters(DEFAULT_STATE);
      setAutoMsg(null);
      setBgStatus("idle"); setBgSubjectUrl(null); setBgResult(null);
      setSplitPos(50); setShowBefore(false);
      if (isMobile) setPanelOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // ── Auto-Enhance ──────────────────────────────────────────────────────────
  const handleAutoEnhance = () => {
    const img = imgRef.current; if (!img) return;
    setAutoLoading(true); setAutoMsg(null);
    setTimeout(() => {
      try {
        const { adj, msg } = autoEnhance(img);
        setFilters({ ...DEFAULT_STATE, ...adj });
        setAutoMsg(msg);
        setSplitPos(50); // reset split to center
      } catch(e) { setAutoMsg("Could not analyse — try a preset."); }
      setAutoLoading(false);
    }, 30);
  };

  // ── Background removal ────────────────────────────────────────────────────
  const handleRemoveBg = async () => {
    if (!image || bgStatus==="loading") return;
    setBgStatus("loading"); setBgProgress(0); setBgSubjectUrl(null); setBgResult(null);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const res = await fetch(image);
      const blob = await res.blob();
      const out  = await removeBackground(blob, { progress:(k,c,t)=>setBgProgress(Math.round(c/t*100)), model:"medium" });
      const url  = URL.createObjectURL(out);
      setBgSubjectUrl(url); setBgStatus("done");
      await buildComposite(url, bgMode, bgColor, bgBlur);
    } catch(e) { console.error(e); setBgStatus("error"); }
  };

  const buildComposite = async (subUrl, mode, color, blur) => {
    const orig = imgRef.current; if (!orig || !subUrl) return;
    const W=orig.naturalWidth, H=orig.naturalHeight;
    const sub = new Image(); sub.src = subUrl;
    await new Promise(r => { sub.onload=r; if(sub.complete) r(); });
    const c = document.createElement("canvas"); c.width=W; c.height=H;
    const ctx = c.getContext("2d");
    if (mode==="transparent") ctx.drawImage(sub,0,0,W,H);
    else if (mode==="color")  { ctx.fillStyle=color; ctx.fillRect(0,0,W,H); ctx.drawImage(sub,0,0,W,H); }
    else if (mode==="blur")   { ctx.filter=`blur(${blur}px)`; ctx.drawImage(orig,-30,-30,W+60,H+60); ctx.filter="none"; ctx.drawImage(sub,0,0,W,H); }
    setBgResult(c.toDataURL("image/png"));
  };

  const downloadBgResult = async () => {
    if (!bgResult) return;
    const blob = await (await fetch(bgResult)).blob();
    downloadBlob(blob, "photolab_nobg.png");
  };

  // ── Standard export ───────────────────────────────────────────────────────
  const handleExport = async () => {
    const img = imgRef.current; if (!img) return;
    setExporting(true); setExportDone(false); setExportInfo("");
    try {
      const { w: W, h: H } = getExportDimensions();
      const { canvas, W:rW, H:rH } = await renderForExport(img, filters, W, H);
      const fmt = EXPORT_FORMATS.find(f=>f.id===exportFormat);
      const q   = exportFormat==="png" ? undefined : exportQuality/100;
      const blob = await canvasToBlob(canvas, fmt.mime, q);
      const kb = Math.round(blob.size/1024);
      setExportInfo(`${rW.toLocaleString()} × ${rH.toLocaleString()}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      downloadBlob(blob, `photolab.${fmt.ext}`);
      setExportDone(true); setTimeout(()=>setExportDone(false),4000);
    } catch(e) { console.error(e); setExportInfo("Export failed — try a lower scale."); }
    setExporting(false);
  };

  // ── Facebook export ───────────────────────────────────────────────────────
  const handleFbExport = async () => {
    const img = imgRef.current; if (!img) return;
    setFbExporting(true); setFbDone(false);
    try {
      const mode = FB_MODES.find(m=>m.id===fbMode);
      let tW=mode.w, tH=mode.h;
      const sW=img.naturalWidth, sH=img.naturalHeight;
      if (!tH) { const sc=Math.min(1,tW/Math.max(sW,sH)); tW=Math.round(sW*sc); tH=Math.round(sH*sc); }
      const { canvas, W, H } = await renderForExport(img, filters, tW, tH);
      const blob = await canvasToBlob(canvas,"image/jpeg",mode.quality);
      const kb   = Math.round(blob.size/1024);
      setExportInfo(`${W}×${H}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      downloadBlob(blob,`facebook_${mode.id}.jpg`);
      setFbDone(true); setTimeout(()=>setFbDone(false),4000);
    } catch(e) { console.error(e); }
    setFbExporting(false);
  };

  const isEdited     = Object.entries(filters).some(([k,v])=>v!==DEFAULT_STATE[k]);
  const cssFilter    = toCSSFilter(filters);
  const tempAlpha    = Math.abs(filters.temperature)/300;
  const tempColor    = filters.temperature>0?`rgba(255,140,0,${tempAlpha})`:`rgba(100,149,237,${tempAlpha})`;
  const showSplit    = isEdited && activeTab==="edit";
  const natW         = imgRef.current?.naturalWidth  || 0;
  const natH         = imgRef.current?.naturalHeight || 0;
  const getExportDimensions = () => {
    if (!natW || !natH) return { w: 0, h: 0 };
    const MAX_PX = 16_000_000;
    let scale;
    if (exportScale === "8k")       scale = 7680  / Math.max(natW, natH);
    else if (exportScale === "12k") scale = 12288 / Math.max(natW, natH);
    else                            scale = exportScale;
    let w = Math.round(natW * scale);
    let h = Math.round(natH * scale);
    if (w * h > MAX_PX) { const s = Math.sqrt(MAX_PX / (w*h)); w = Math.floor(w*s); h = Math.floor(h*s); }
    return { w, h };
  };
  const { w: exportW, h: exportH } = getExportDimensions();

  // ── Panel content (shared desktop/mobile) ────────────────────────────────
  const Panel = () => (
    <div style={{display:"flex",flexDirection:"column",gap:"18px",padding:isMobile?"16px 16px 80px":"16px"}}>

      {/* TOOLS */}
      {activeTab==="tools" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div>
            <Label>Background Removal</Label>
            <p style={{fontSize:"12px",color:"#aaa",lineHeight:1.6,marginBottom:"12px"}}>AI runs in your browser — private &amp; offline.</p>
            <Btn onClick={handleRemoveBg} disabled={!image||bgStatus==="loading"}
              color={bgStatus==="done"?"#f0fff4":image?"purple":"#f0f0f0"}
              textColor={bgStatus==="done"?"#16a34a":image?"#fff":"#bbb"}>
              {bgStatus==="loading"?<Row><Spin/>Processing... {bgProgress}%</Row>
               :bgStatus==="done"?"✓ Done — Remove Again":"✂ Remove Background"}
            </Btn>
            {bgStatus==="loading"&&<Bar value={bgProgress}/>}
            {bgStatus==="error"&&<p style={{fontSize:"12px",color:"#ef4444",marginTop:"6px"}}>⚠ Failed — try a JPG or PNG</p>}
            {!image&&<Empty>Upload a photo first</Empty>}
          </div>

          {bgStatus==="done"&&bgSubjectUrl&&(
            <div style={{animation:"fadein .3s"}}>
              <Label>Background Style</Label>
              {[{id:"transparent",label:"Transparent",icon:"◻"},{id:"color",label:"Solid Color",icon:"🎨"},{id:"blur",label:"Blur Original",icon:"✦"}].map(o=>(
                <button key={o.id} onClick={()=>setBgMode(o.id)}
                  style={{...toolOpt,border:`1.5px solid ${bgMode===o.id?"#6c63ff":"#e8e8f0"}`,background:bgMode===o.id?"#faf9ff":"#fff"}}>
                  <span style={{fontSize:"16px"}}>{o.icon}</span>
                  <span style={{fontSize:"13px",fontWeight:600,color:bgMode===o.id?"#6c63ff":"#444"}}>{o.label}</span>
                  {bgMode===o.id&&<span style={{marginLeft:"auto",color:"#6c63ff"}}>✓</span>}
                </button>
              ))}
              {bgMode==="color"&&(
                <div style={subPanel}>
                  <SubLabel>Color</SubLabel>
                  <div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginBottom:"10px"}}>
                    {BG_COLORS.map(c=>(
                      <div key={c} onClick={()=>setBgColor(c)}
                        style={{width:"26px",height:"26px",borderRadius:"6px",background:c,border:`2.5px solid ${bgColor===c?"#6c63ff":"#ddd"}`,cursor:"pointer",flexShrink:0}}/>
                    ))}
                  </div>
                  <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                    style={{width:"100%",height:"34px",border:"1.5px solid #e8e8f0",borderRadius:"8px",cursor:"pointer"}}/>
                </div>
              )}
              {bgMode==="blur"&&(
                <div style={subPanel}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                    <SubLabel>Blur</SubLabel><span style={{fontSize:"12px",color:"#6c63ff",fontWeight:600}}>{bgBlur}px</span>
                  </div>
                  <input type="range" className="sl" min={2} max={40} step={1} value={bgBlur}
                    style={{"--v":`${((bgBlur-2)/38)*100}%`}} onChange={e=>setBgBlur(+e.target.value)}/>
                </div>
              )}
              {bgResult&&(
                <>
                  <div style={{position:"relative",borderRadius:"10px",overflow:"hidden",margin:"10px 0",border:"1.5px solid #eee"}}>
                    {bgMode==="transparent"&&<div className="checker" style={{position:"absolute",inset:0}}/>}
                    <img src={bgResult} alt="result" style={{width:"100%",display:"block",position:"relative"}}/>
                  </div>
                  <Btn onClick={downloadBgResult} color="purple" textColor="#fff">↓ Download PNG</Btn>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* EDIT */}
      {activeTab==="edit"&&(<>
        {image&&(
          <div>
            <Label>Auto Enhance & Beauty Filter</Label>
            <Btn onClick={handleAutoEnhance} disabled={autoLoading} color="purple" textColor="#fff"
              style={{marginBottom:"8px"}}>
              {autoLoading?<Row><Spin color="#fff"/>Analysing...</Row>:"✨ Auto-Enhance & Beauty Filter"}
            </Btn>
            {autoMsg&&(
              <div style={{padding:"10px 12px",background:"#f0f0ff",border:"1.5px solid #d8d4ff",borderRadius:"8px",animation:"fadein .3s"}}>
                <div style={{fontSize:"12px",color:"#555",lineHeight:1.5}}>{autoMsg}</div>
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Presets</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px"}}>
            {PRESETS.map(p=>(
              <button key={p.name} onClick={()=>{ setFilters({...DEFAULT_STATE,...p.values}); setAutoMsg(null); }}
                style={{padding:"10px 12px",border:"1.5px solid #e8e8f0",background:"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",fontFamily:"inherit"}}>
                <div style={{fontSize:"16px",marginBottom:"3px"}}>{p.icon}</div>
                <div style={{fontSize:"11px",fontWeight:600,color:"#555"}}>{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{display:"flex",gap:"3px",marginBottom:"14px",background:"#f2f2f8",padding:"3px",borderRadius:"10px"}}>
            {GROUPS.map(g=>(
              <button key={g.key} onClick={()=>setActiveGroup(g.key)}
                style={{flex:1,padding:"7px 4px",fontSize:"12px",fontWeight:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:activeGroup===g.key?"#fff":"transparent",color:activeGroup===g.key?"#6c63ff":"#999",borderRadius:"8px",boxShadow:activeGroup===g.key?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .18s"}}>
                {g.label}
              </button>
            ))}
          </div>
          {FILTERS.filter(f=>f.group===activeGroup).map(f=>{
            const val=filters[f.key];
            const pct=((val-f.min)/(f.max-f.min))*100;
            const changed=val!==f.default;
            return(
              <div key={f.key} style={{marginBottom:"18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                  <span style={{fontSize:"13px",fontWeight:500,color:changed?"#6c63ff":"#666"}}>{f.label}</span>
                  <span style={{fontSize:"12px",color:"#bbb",fontVariantNumeric:"tabular-nums"}}>
                    {val>0&&f.default===0?"+":""}{Number.isInteger(val)?val:val.toFixed(1)}{f.unit}
                  </span>
                </div>
                <input type="range" className="sl" min={f.min} max={f.max} step={f.max<=20?.5:1}
                  value={val} style={{"--v":`${pct}%`}}
                  onChange={e=>setFilters(p=>({...p,[f.key]:parseFloat(e.target.value)}))}/>
              </div>
            );
          })}
        </div>

        {isEdited&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"4px",borderTop:"1px solid #f0f0f4"}}>
            <span style={{fontSize:"11px",color:"#bbb"}}>
              {Object.entries(filters).filter(([k,v])=>v!==DEFAULT_STATE[k]).length} adjustments
            </span>
            <button onClick={()=>{setFilters(DEFAULT_STATE);setAutoMsg(null);}}
              style={{fontSize:"11px",color:"#6c63ff",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
              Reset all
            </button>
          </div>
        )}
      </>)}
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",background:"#f7f8fa",minHeight:"100vh",WebkitTapHighlightColor:"transparent",color:"#1a1a1a"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
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
        @keyframes slidein{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
      `}</style>

      {/* Header */}
      <header style={{background:"#fff",borderBottom:"1px solid #eee",height:"56px",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"32px",height:"32px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>✨</div>
          <div>
            <div style={{fontSize:"16px",fontWeight:700,color:"#1a1a2e",letterSpacing:"-.3px"}}>PHOTOlab</div>
            {!isMobile&&<div style={{fontSize:"10px",color:"#bbb",marginTop:"-1px"}}>Enhance · Restore · Export</div>}
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <div style={{display:"flex",background:"#f2f2f8",borderRadius:"10px",padding:"3px",gap:"2px"}}>
            {["EDIT","TOOLS"].map(t=>(
              <button key={t} onClick={()=>{setActiveTab(t.toLowerCase());if(isMobile)setPanelOpen(true);}}
                style={{padding:isMobile?"6px 12px":"6px 16px",fontSize:"12px",fontWeight:600,border:"none",cursor:"pointer",background:activeTab===t.toLowerCase()?"#fff":"transparent",color:activeTab===t.toLowerCase()?"#6c63ff":"#888",borderRadius:"8px",boxShadow:activeTab===t.toLowerCase()?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s"}}>
                {t==="EDIT"?"✏️ Edit":"🛠 Tools"}
              </button>
            ))}
          </div>
          {image&&(
            <button onClick={()=>setShowExport(true)}
              style={{padding:"8px 16px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(108,99,255,.3)"}}>
              {isMobile?"↓ Save":"↓ Export"}
            </button>
          )}
        </div>
      </header>

      {/* Desktop */}
      {!isMobile&&(
        <div style={{display:"flex",height:"calc(100vh - 56px)"}}>
          <div style={{width:"290px",borderRight:"1px solid #eee",overflowY:"auto",background:"#fff",flexShrink:0}}>
            <Panel/>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"#f7f8fa",position:"relative",overflow:"hidden"}}>
            <PhotoPreview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setSplitPos,setIsDraggingSplit,cssFilter,tempColor,tempAlpha,filters,isEdited,setImage,setAutoMsg,setBgStatus,setBgSubjectUrl,setBgResult,isMobile}}/>
          </div>
        </div>
      )}

      {/* Mobile */}
      {isMobile&&(
        <div style={{display:"flex",flexDirection:"column",minHeight:"calc(100vh - 56px)"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"#f7f8fa",position:"relative",minHeight:"50vh"}}>
            <PhotoPreview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setSplitPos,setIsDraggingSplit,cssFilter,tempColor,tempAlpha,filters,isEdited,setImage,setAutoMsg,setBgStatus,setBgSubjectUrl,setBgResult,isMobile}}/>
          </div>
          {image&&(
            <div style={{background:"#fff",borderTop:"1px solid #eee",padding:"10px 16px",display:"flex",gap:"8px"}}>
              <button onClick={()=>setPanelOpen(true)}
                style={{flex:1,padding:"11px",background:"#f2f2f8",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,color:"#6c63ff",cursor:"pointer"}}>⚙️ Adjust</button>
              <button onClick={()=>{setFilters(DEFAULT_STATE);setAutoMsg(null);}}
                style={{padding:"11px 16px",background:"#f2f2f8",border:"none",borderRadius:"10px",fontSize:"13px",color:"#888",cursor:"pointer",fontWeight:500}}>Reset</button>
            </div>
          )}
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile&&panelOpen&&(
        <>
          <div onClick={()=>setPanelOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",zIndex:80}}/>
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(320px,92vw)",background:"#fff",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",zIndex:90,overflowY:"auto",animation:"slidein .25s ease"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
              <span style={{fontWeight:700,fontSize:"15px",color:"#1a1a2e"}}>{activeTab==="edit"?"Adjust":"Tools"}</span>
              <button onClick={()=>setPanelOpen(false)} style={{background:"#f2f2f8",border:"none",width:"32px",height:"32px",borderRadius:"8px",cursor:"pointer",fontSize:"16px",color:"#888"}}>✕</button>
            </div>
            <Panel/>
          </div>
        </>
      )}

      {/* Export Modal */}
      {showExport&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:isMobile?"0":"20px"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowExport(false);}}>
          <div style={{background:"#fff",borderRadius:isMobile?"16px 16px 0 0":"16px",width:"100%",maxWidth:"460px",maxHeight:"90vh",overflowY:"auto",padding:"24px",animation:"slideup .25s ease"}}>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div>
                <div style={{fontSize:"18px",fontWeight:700,color:"#1a1a2e"}}>Export Photo</div>
                <div style={{fontSize:"12px",color:"#bbb",marginTop:"2px"}}>High quality · All platforms</div>
              </div>
              <button onClick={()=>setShowExport(false)} style={{background:"#f2f2f8",border:"none",width:"34px",height:"34px",borderRadius:"8px",cursor:"pointer",fontSize:"18px",color:"#888"}}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{display:"flex",gap:"3px",marginBottom:"20px",background:"#f2f2f8",padding:"3px",borderRadius:"10px"}}>
              {[["standard","Standard"],["facebook","📘 Facebook"]].map(([id,label])=>(
                <button key={id} onClick={()=>setExportTab(id)}
                  style={{flex:1,padding:"9px",fontSize:"13px",fontWeight:600,border:"none",cursor:"pointer",background:exportTab===id?(id==="facebook"?"#1877f2":"#fff"):"transparent",color:exportTab===id?(id==="facebook"?"#fff":"#6c63ff"):"#999",borderRadius:"8px",boxShadow:exportTab===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s"}}>
                  {label}
                </button>
              ))}
            </div>

            {exportTab==="standard"&&(<>
              {/* Format */}
              <Label>Format</Label>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"18px"}}>
                {EXPORT_FORMATS.map(f=>(
                  <button key={f.id} onClick={()=>setExportFormat(f.id)}
                    style={{padding:"11px 14px",border:`1.5px solid ${exportFormat===f.id?"#6c63ff":"#eee"}`,background:exportFormat===f.id?"#faf9ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                    <div>
                      <span style={{fontSize:"13px",fontWeight:600,color:exportFormat===f.id?"#6c63ff":"#444"}}>{f.label}</span>
                      <span style={{fontSize:"11px",color:"#bbb",marginLeft:"10px"}}>{f.desc}</span>
                    </div>
                    {exportFormat===f.id&&<span style={{color:"#6c63ff",fontSize:"18px"}}>✓</span>}
                  </button>
                ))}
              </div>

              {exportFormat!=="png"&&(<>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                  <Label>Quality</Label><span style={{fontSize:"13px",fontWeight:700,color:"#6c63ff"}}>{exportQuality}%</span>
                </div>
                <input type="range" className="sl" min={70} max={100} step={1} value={exportQuality}
                  style={{"--v":`${((exportQuality-70)/30)*100}%`,marginBottom:"18px"}}
                  onChange={e=>setExportQuality(+e.target.value)}/>
              </>)}

              {/* Scale */}
              <Label>Resolution</Label>
              <div style={{display:"flex",gap:"6px",marginBottom:"6px",flexWrap:"wrap"}}>
                {[1,2,3,4,"8k","12k"].map(s=>{
                  const isPro = s==="8k"||s==="12k";
                  const label = s==="8k"?"8K":s==="12k"?"12K":`${s}×`;
                  const desc  = s===1?"Original":s===2?"Double":s===3?"3×":s===4?"4×":s==="8k"?"7680px":s==="12k"?"12288px":"";
                  return(
                    <button key={s} onClick={()=>setExportScale(s)}
                      style={{flex:"1 1 60px",padding:"10px 4px",border:`1.5px solid ${exportScale===s?"#6c63ff":isPro?"#e0d8ff":"#eee"}`,background:exportScale===s?"#faf9ff":isPro?"#faf8ff":"#fff",borderRadius:"10px",textAlign:"center",cursor:"pointer",transition:"all .18s",fontFamily:"inherit"}}>
                      <div style={{fontSize:"14px",fontWeight:700,color:exportScale===s?"#6c63ff":isPro?"#a78bfa":"#555",marginBottom:"2px"}}>{label}</div>
                      <div style={{fontSize:"9px",color:"#bbb"}}>{desc}</div>
                      {isPro&&<div style={{fontSize:"8px",color:"#a78bfa",fontWeight:700,marginTop:"1px"}}>PRO</div>}
                    </button>
                  );
                })}
              </div>
              <p style={{fontSize:"10px",color:"#bbb",marginBottom:"14px",lineHeight:1.5}}>
                {(exportScale==="8k"||exportScale==="12k") ? "⚡ Large exports may take 10–30s. Uses fast CSS rendering at this size." : ""}
              </p>
              {natW>0&&(
                <div style={{padding:"10px 14px",background:"#f8f8fd",borderRadius:"8px",display:"flex",justifyContent:"space-between",marginBottom:"18px"}}>
                  <span style={{fontSize:"12px",color:"#bbb"}}>Output</span>
                  <span style={{fontSize:"13px",fontWeight:600,color:"#6c63ff"}}>{exportW.toLocaleString()} × {exportH.toLocaleString()}px</span>
                </div>
              )}

              {exportInfo&&(
                <div style={{padding:"10px 14px",background:exportDone?"#f0fff4":"#fff8e7",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:exportDone?"#16a34a":"#92400e",fontWeight:500}}>
                  {exportDone?`✓ Saved — ${exportInfo}`:exportInfo}
                </div>
              )}

              <Btn onClick={handleExport} disabled={exporting} color={exportDone?"#f0fff4":"purple"}
                textColor={exportDone?"#16a34a":"#fff"} style={{width:"100%",padding:"15px",fontSize:"15px",fontWeight:700}}>
                {exporting?<Row><Spin/>Processing...</Row>
                 :exportDone?"✓ Saved!"
                 :`↓ Download ${EXPORT_FORMATS.find(f=>f.id===exportFormat)?.label} · ${exportScale}×`}
              </Btn>
              <p style={{fontSize:"11px",color:"#bbb",textAlign:"center",marginTop:"8px"}}>
                iOS: tap Share → Save to Photos after download
              </p>
            </>)}

            {exportTab==="facebook"&&(<>
              <div style={{padding:"13px",background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:"10px",marginBottom:"18px"}}>
                <div style={{fontSize:"12px",fontWeight:600,color:"#1d4ed8",marginBottom:"5px"}}>Optimised for Facebook</div>
                <div style={{fontSize:"12px",color:"#3b82f6",lineHeight:1.6}}>Exact dimensions + JPEG 82% to avoid Facebook's compression algorithm.</div>
              </div>
              <Label>Post Type</Label>
              {FB_MODES.map(m=>(
                <button key={m.id} onClick={()=>setFbMode(m.id)}
                  style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${fbMode===m.id?"#1877f2":"#eee"}`,background:fbMode===m.id?"#eff6ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",marginBottom:"7px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:600,color:fbMode===m.id?"#1877f2":"#444",marginBottom:"2px"}}>{m.label}</div>
                    <div style={{fontSize:"12px",color:"#bbb"}}>{m.desc}</div>
                  </div>
                  {fbMode===m.id&&<span style={{color:"#1877f2",fontSize:"18px"}}>✓</span>}
                </button>
              ))}

              {exportInfo&&fbDone&&(
                <div style={{padding:"10px 14px",background:"#f0fff4",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:"#16a34a",fontWeight:500}}>
                  ✓ Saved — {exportInfo}
                </div>
              )}

              <Btn onClick={handleFbExport} disabled={fbExporting} color={fbDone?"#f0fff4":"#1877f2"}
                textColor={fbDone?"#16a34a":"#fff"} style={{width:"100%",padding:"15px",fontSize:"15px",fontWeight:700}}>
                {fbExporting?<Row><Spin color="rgba(255,255,255,.7)"/>Exporting...</Row>
                 :fbDone?"✓ Saved!"
                 :`↓ Export for Facebook · ${FB_MODES.find(m=>m.id===fbMode)?.desc}`}
              </Btn>
              <p style={{fontSize:"11px",color:"#bbb",textAlign:"center",marginTop:"8px"}}>
                iOS: tap Share → Save to Photos after download
              </p>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Photo Preview ─────────────────────────────────────────────────────────────
function PhotoPreview({ image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setSplitPos,setIsDraggingSplit,cssFilter,tempColor,tempAlpha,filters,isEdited,setImage,setAutoMsg,setBgStatus,setBgSubjectUrl,setBgResult,isMobile }) {
  const maxH = isMobile ? "48vh" : "calc(100vh - 140px)";

  if (!image) return (
    <div className={`drop ${dragging?"on":""}`}
      style={{width:"100%",maxWidth:"480px",aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,.06)",cursor:"pointer"}}
      onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);loadImage(e.dataTransfer.files[0]);}}
      onClick={()=>fileInputRef.current?.click()}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadImage(e.target.files[0])}/>
      <div style={{fontSize:"44px",marginBottom:"14px",animation:"pulse 2.5s infinite"}}>🖼</div>
      <div style={{fontSize:"16px",fontWeight:600,color:"#555",marginBottom:"6px"}}>{isMobile?"Tap to select photo":"Drop photo here"}</div>
      {!isMobile&&<div style={{fontSize:"13px",color:"#bbb",marginBottom:"20px"}}>or click to browse</div>}
      <div style={{display:"flex",gap:"8px"}}>
        {["JPG","PNG","WEBP","HEIC"].map(x=>(
          <span key={x} style={{padding:"3px 10px",background:"#f2f2f8",borderRadius:"20px",fontSize:"11px",fontWeight:500,color:"#999"}}>{x}</span>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Controls top-right */}
      {activeTab==="edit" && !showSplit && (
        <div style={{position:"absolute",top:"12px",right:"12px",display:"flex",background:"#fff",border:"1.5px solid #eee",zIndex:10,borderRadius:"10px",padding:"3px",gap:"2px",boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
          {["After","Before"].map(l=>(
            <button key={l} onClick={()=>setShowBefore(l==="Before")}
              style={{padding:"5px 14px",fontSize:"12px",fontWeight:600,border:"none",cursor:"pointer",background:(l==="Before")===showBefore?"linear-gradient(135deg,#6c63ff,#a78bfa)":"transparent",color:(l==="Before")===showBefore?"#fff":"#999",borderRadius:"7px",transition:"all .18s"}}>
              {l}
            </button>
          ))}
        </div>
      )}
      {showSplit && (
        <div style={{position:"absolute",top:"12px",right:"12px",zIndex:10,padding:"5px 12px",background:"rgba(108,99,255,.9)",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#fff"}}>
          ← Drag to compare →
        </div>
      )}
      {activeTab==="tools"&&bgResult&&(
        <div style={{position:"absolute",top:"12px",right:"12px",padding:"4px 12px",background:"#f0fff4",border:"1.5px solid #86efac",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#16a34a",zIndex:10}}>✓ BG Removed</div>
      )}

      {/* Image container */}
      <div ref={splitRef}
        style={{position:"relative",maxWidth:"100%",maxHeight:maxH,lineHeight:0,borderRadius:"14px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.12)",cursor:showSplit?"ew-resize":"default",userSelect:"none"}}>

        {activeTab==="tools"&&bgResult ? (
          <>
            {bgMode==="transparent"&&<div className="checker" style={{position:"absolute",inset:0}}/>}
            <img src={bgResult} alt="result" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",position:"relative"}}/>
          </>
        ) : showSplit ? (
          <>
            {/* After (full, clipped) */}
            <img ref={imgRef} src={image} alt="after"
              style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:cssFilter}}/>
            {/* Warmth/vignette overlays — clipped to after side */}
            {filters.temperature!==0&&<div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none",clipPath:`inset(0 ${100-splitPos}% 0 0)`}}/>}
            {filters.vignette>0&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none",clipPath:`inset(0 ${100-splitPos}% 0 0)`}}/>}
            {/* Before side overlay */}
            <div style={{position:"absolute",inset:0,clipPath:`inset(0 0 0 ${splitPos}%)`}}>
              <img src={image} alt="before" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:"none"}}/>
            </div>
            {/* Divider */}
            <div onMouseDown={e=>{e.preventDefault();setIsDraggingSplit(true);}} onTouchStart={e=>{e.preventDefault();setIsDraggingSplit(true);}}
              style={{position:"absolute",top:0,bottom:0,left:`${splitPos}%`,transform:"translateX(-50%)",width:"44px",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",cursor:"ew-resize"}}>
              <div style={{width:"2px",height:"100%",background:"#fff",boxShadow:"0 0 6px rgba(0,0,0,.5)"}}/>
              <div style={{position:"absolute",width:"38px",height:"38px",borderRadius:"50%",background:"#fff",boxShadow:"0 2px 12px rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",color:"#6c63ff",fontWeight:700}}>⇄</div>
            </div>
            <div style={{position:"absolute",bottom:"12px",left:"12px",padding:"3px 10px",background:"rgba(108,99,255,.85)",borderRadius:"20px",fontSize:"11px",fontWeight:700,color:"#fff"}}>AFTER</div>
            <div style={{position:"absolute",bottom:"12px",right:"12px",padding:"3px 10px",background:"rgba(0,0,0,.5)",borderRadius:"20px",fontSize:"11px",fontWeight:700,color:"#fff"}}>BEFORE</div>
          </>
        ) : (
          <>
            <img ref={imgRef} src={image} alt="photo"
              style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:showBefore||activeTab==="tools"?"none":cssFilter,transition:"filter .08s ease"}}/>
            {!showBefore&&activeTab==="edit"&&filters.temperature!==0&&<div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none"}}/>}
            {!showBefore&&activeTab==="edit"&&filters.fade>0&&<div style={{position:"absolute",inset:0,background:`rgba(255,255,255,${filters.fade/180})`,mixBlendMode:"screen",pointerEvents:"none"}}/>}
            {!showBefore&&activeTab==="edit"&&filters.vignette>0&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none"}}/>}
          </>
        )}
      </div>

      <div style={{position:"absolute",bottom:"12px",left:"50%",transform:"translateX(-50%)"}}>
        <button onClick={()=>{setImage(null);setAutoMsg(null);setBgStatus("idle");setBgSubjectUrl(null);setBgResult(null);}}
          style={{background:"#fff",color:"#999",padding:"6px 14px",border:"1.5px solid #eee",borderRadius:"8px",fontSize:"12px",fontWeight:500,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          ← New Photo
        </button>
      </div>
    </>
  );
}

// ── Tiny helpers ─────────────────────────────────────────────────────────────
const Label    = ({children,style={}})=><div style={{fontSize:"11px",fontWeight:600,color:"#aaa",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"8px",...style}}>{children}</div>;
const SubLabel = ({children})=><div style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"8px"}}>{children}</div>;
const Empty    = ({children})=><div style={{fontSize:"12px",color:"#bbb",textAlign:"center",padding:"20px",border:"2px dashed #eee",borderRadius:"10px"}}>{children}</div>;
const Row      = ({children})=><span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>{children}</span>;
const Spin     = ({color="#fff"})=><span style={{display:"inline-block",width:"14px",height:"14px",border:`2px solid ${color}44`,borderTopColor:color,borderRadius:"50%",animation:"spin .8s linear infinite",flexShrink:0}}/>;
const Bar      = ({value})=><div style={{height:"4px",background:"#f0f0f8",borderRadius:"2px",margin:"8px 0 12px",overflow:"hidden"}}><div style={{height:"100%",width:`${value}%`,background:"linear-gradient(90deg,#6c63ff,#a78bfa)",transition:"width .3s",borderRadius:"2px"}}/></div>;

function Btn({children,onClick,disabled,color="purple",textColor="#fff",style={}}) {
  const bg = color==="purple" ? "linear-gradient(135deg,#6c63ff,#a78bfa)" : color;
  const shadow = color==="purple" ? "0 2px 10px rgba(108,99,255,.3)" : "none";
  return(
    <button onClick={onClick} disabled={disabled}
      style={{border:"none",cursor:disabled?"not-allowed":"pointer",borderRadius:"10px",fontSize:"13px",fontWeight:600,fontFamily:"inherit",transition:"all .18s",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",background:disabled?"#f0f0f0":bg,color:disabled?"#bbb":textColor,boxShadow:disabled?"none":shadow,padding:"12px 16px",...style}}>
      {children}
    </button>
  );
}

const subPanel = {padding:"13px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",marginBottom:"8px"};
const toolOpt  = {width:"100%",padding:"11px 14px",marginBottom:"7px",borderRadius:"10px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",transition:"all .18s",fontFamily:"inherit",fontSize:"inherit",border:"none"};
