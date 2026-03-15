import { useState, useRef, useEffect, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { key:"brightness", label:"Brightness",  min:0,    max:200, default:100, unit:"%", group:"basic" },
  { key:"contrast",   label:"Contrast",    min:0,    max:200, default:100, unit:"%", group:"basic" },
  { key:"saturation", label:"Saturation",  min:0,    max:200, default:100, unit:"%", group:"basic" },
  { key:"exposure",   label:"Exposure",    min:-100, max:100, default:0,   unit:"",  group:"basic" },
  { key:"temperature",label:"Warmth",      min:-100, max:100, default:0,   unit:"",  group:"basic" },
  { key:"sharpness",  label:"Sharpness",   min:0,    max:20,  default:0,   unit:"",  group:"enhance" },
  { key:"clarity",    label:"Clarity",     min:0,    max:20,  default:0,   unit:"",  group:"enhance" },
  { key:"denoise",    label:"Smooth",      min:0,    max:10,  default:0,   unit:"",  group:"enhance" },
  { key:"vignette",   label:"Vignette",    min:0,    max:100, default:0,   unit:"%", group:"style" },
  { key:"fade",       label:"Fade",        min:0,    max:100, default:0,   unit:"%", group:"style" },
];
const DEFAULT_STATE = Object.fromEntries(FILTERS.map(f => [f.key, f.default]));

const PRESETS = [
  { name:"Portrait",   icon:"👤", values:{ denoise:4, clarity:5, sharpness:3, contrast:106, saturation:104, temperature:8,  vignette:12 }},
  { name:"Vivid",      icon:"🌈", values:{ contrast:114, saturation:120, clarity:6, sharpness:4, brightness:103 }},
  { name:"Soft",       icon:"☁️", values:{ denoise:3, brightness:104, contrast:96, saturation:105, fade:8, temperature:6 }},
  { name:"B&W",        icon:"⚫", values:{ saturation:0, contrast:118, clarity:7, sharpness:3 }},
  { name:"Warm",       icon:"🌅", values:{ temperature:35, saturation:108, brightness:103, contrast:104, fade:5 }},
  { name:"Cool",       icon:"❄️", values:{ temperature:-30, saturation:106, brightness:102, contrast:104 }},
  { name:"Restore",    icon:"🖼", values:{ denoise:4, clarity:5, sharpness:3, contrast:108, saturation:108, exposure:5 }},
  { name:"Sharp",      icon:"✨", values:{ sharpness:9, clarity:10, contrast:112 }},
];

const GROUPS = [
  { key:"basic",   label:"Basic" },
  { key:"enhance", label:"Enhance" },
  { key:"style",   label:"Style" },
];

const EXPORT_FORMATS = [
  { id:"jpg", label:"JPEG", desc:"Best for photos",   ext:"jpg",  mime:"image/jpeg" },
  { id:"png", label:"PNG",  desc:"Lossless quality",  ext:"png",  mime:"image/png"  },
  { id:"webp",label:"WebP", desc:"Smallest file size",ext:"webp", mime:"image/webp" },
];

const SCALE_OPTIONS = [
  { value:1,    label:"1×", desc:"Original" },
  { value:2,    label:"2×", desc:"Double" },
  { value:3,    label:"3×", desc:"Triple" },
  { value:4,    label:"4×", desc:"Ultra HD" },
  { value:"8k", label:"8K", desc:"7680px" },
];

const FB_MODES = [
  { id:"portrait",  label:"Portrait Post",  desc:"1080 × 1350px",      w:1080, h:1350, quality:0.82 },
  { id:"square",    label:"Square Post",    desc:"1080 × 1080px",      w:1080, h:1080, quality:0.82 },
  { id:"landscape", label:"Landscape Post", desc:"2048px wide",        w:2048, h:null, quality:0.82 },
  { id:"cover",     label:"Cover Photo",    desc:"851 × 315px",        w:851,  h:315,  quality:0.82 },
];

const BG_COLORS = ["#ffffff","#f5f5f5","#000000","#1a1a2e","#2d4a3e","#4a1a2e","#1a3a4a","#fff8e7"];

// ── CSS filter string ─────────────────────────────────────────────────────────
function toCSSFilter(f) {
  const ev = 1 + f.exposure / 100;
  const bv = (f.brightness / 100) * ev;
  let s = `brightness(${bv.toFixed(3)}) contrast(${(f.contrast/100).toFixed(3)}) saturate(${(f.saturation/100).toFixed(3)})`;
  if (f.denoise   > 0) s += ` blur(${(f.denoise * 0.05).toFixed(2)}px)`;
  if (f.sharpness > 0) s += ` contrast(${(1 + f.sharpness * 0.022).toFixed(3)})`;
  if (f.clarity   > 0) s += ` contrast(${(1 + f.clarity   * 0.016).toFixed(3)})`;
  return s;
}

// ── Save file — Web Share API on mobile, download on desktop ─────────────────
async function saveFile(blob, name) {
  if (navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: blob.type })] })) {
    try { await navigator.share({ files: [new File([blob], name, { type: blob.type })], title: "PHOTOlab" }); return; }
    catch(e) { if (e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise(resolve => {
    if (canvas.toBlob) { canvas.toBlob(resolve, mime, quality); return; }
    const d=canvas.toDataURL(mime,quality),arr=d.split(","),bstr=atob(arr[1]);
    let n=bstr.length; const u=new Uint8Array(n);
    while(n--) u[n]=bstr.charCodeAt(n);
    resolve(new Blob([u],{type:mime}));
  });
}

// ── Export render — uses same CSS filter as preview ───────────────────────────
async function renderForExport(imgEl, cssFilterStr, filters, W, H) {
  // Cap at browser safe limit
  const MAX = 16_000_000;
  if (W * H > MAX) { const s = Math.sqrt(MAX/(W*H)); W=Math.floor(W*s); H=Math.floor(H*s); }
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = cssFilterStr;
  ctx.drawImage(imgEl, 0, 0, W, H);
  ctx.filter = "none";
  // Warmth overlay
  if (filters.temperature !== 0) {
    const a = Math.abs(filters.temperature)/300;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = filters.temperature>0?`rgba(255,140,0,${a})`:`rgba(100,149,237,${a})`;
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
    g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,`rgba(0,0,0,${filters.vignette/100})`);
    ctx.globalCompositeOperation = "multiply"; ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation = "source-over";
  }
  return { canvas, W, H };
}

function getExportWH(natW, natH, scaleVal) {
  let W, H;
  if (scaleVal === "8k") { const s = 7680/Math.max(natW,natH); W=Math.round(natW*s); H=Math.round(natH*s); }
  else { W=Math.round(natW*scaleVal); H=Math.round(natH*scaleVal); }
  return { W, H };
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
  const [isMobile,     setIsMobile]     = useState(false);
  // Export
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
  // BG removal
  const [bgStatus,     setBgStatus]     = useState("idle");
  const [bgProgress,   setBgProgress]   = useState(0);
  const [bgSubjectUrl, setBgSubjectUrl] = useState(null);
  const [bgMode,       setBgMode]       = useState("transparent");
  const [bgColor,      setBgColor]      = useState("#ffffff");
  const [bgBlur,       setBgBlur]       = useState(14);
  const [bgResult,     setBgResult]     = useState(null);

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

  // Split drag
  const onSplitMove = useCallback((clientX) => {
    if (!splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    setSplitPos(Math.min(95, Math.max(5, ((clientX-rect.left)/rect.width)*100)));
  }, []);
  useEffect(() => {
    if (!isDraggingSplit) return;
    const mm=e=>onSplitMove(e.clientX);
    const tm=e=>{e.preventDefault();onSplitMove(e.touches[0].clientX);};
    const up=()=>setIsDraggingSplit(false);
    window.addEventListener("mousemove",mm); window.addEventListener("mouseup",up);
    window.addEventListener("touchmove",tm,{passive:false}); window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mousemove",mm);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",tm);window.removeEventListener("touchend",up);};
  }, [isDraggingSplit, onSplitMove]);

  const loadImage = file => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result); setFilters(DEFAULT_STATE);
      setBgStatus("idle"); setBgSubjectUrl(null); setBgResult(null);
      setSplitPos(50); setShowBefore(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Background removal ────────────────────────────────────────────────────
  const handleRemoveBg = async () => {
    if (!image || bgStatus==="loading") return;
    setBgStatus("loading"); setBgProgress(0); setBgSubjectUrl(null); setBgResult(null);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await (await fetch(image)).blob();
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
    await saveFile(await (await fetch(bgResult)).blob(), "photolab_nobg.png");
  };

  // ── Standard export ───────────────────────────────────────────────────────
  const handleExport = async () => {
    const img = imgRef.current; if (!img) return;
    setExporting(true); setExportDone(false); setExportInfo("");
    try {
      const { W, H } = getExportWH(img.naturalWidth, img.naturalHeight, exportScale);
      const { canvas, W:rW, H:rH } = await renderForExport(img, cssFilter, filters, W, H);
      const fmt  = EXPORT_FORMATS.find(f=>f.id===exportFormat);
      const q    = exportFormat==="png" ? undefined : exportQuality/100;
      const blob = await canvasToBlob(canvas, fmt.mime, q);
      const kb   = Math.round(blob.size/1024);
      setExportInfo(`${rW.toLocaleString()}×${rH.toLocaleString()}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      await saveFile(blob, `photolab.${fmt.ext}`);
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
      if (!tH) { const sc=Math.min(1,tW/Math.max(img.naturalWidth,img.naturalHeight)); tW=Math.round(img.naturalWidth*sc); tH=Math.round(img.naturalHeight*sc); }
      const { canvas, W, H } = await renderForExport(img, cssFilter, filters, tW, tH);
      const blob = await canvasToBlob(canvas,"image/jpeg",mode.quality);
      const kb   = Math.round(blob.size/1024);
      setExportInfo(`${W}×${H}px · ${kb>1024?(kb/1024).toFixed(1)+"MB":kb+"KB"}`);
      await saveFile(blob,`facebook_${mode.id}.jpg`);
      setFbDone(true); setTimeout(()=>setFbDone(false),4000);
    } catch(e) { console.error(e); }
    setFbExporting(false);
  };

  const isEdited  = Object.entries(filters).some(([k,v])=>v!==DEFAULT_STATE[k]);
  const cssFilter = toCSSFilter(filters);
  const tempAlpha = Math.abs(filters.temperature)/300;
  const tempColor = filters.temperature>0?`rgba(255,140,0,${tempAlpha})`:`rgba(100,149,237,${tempAlpha})`;
  const showSplit = isEdited && activeTab==="edit";
  const natW = imgRef.current?.naturalWidth  || 0;
  const natH = imgRef.current?.naturalHeight || 0;
  const { W:expW, H:expH } = natW ? getExportWH(natW,natH,exportScale) : {W:0,H:0};

  // ── Panel ─────────────────────────────────────────────────────────────────
  const Panel = ({ inline=false }) => (
    <div style={{display:"flex",flexDirection:"column",gap:"18px",padding:inline?"12px 14px 32px":"16px"}}>

      {/* TOOLS */}
      {activeTab==="tools" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div>
            <SectionLabel>Background Removal</SectionLabel>
            <p style={{fontSize:"12px",color:"#aaa",lineHeight:1.6,marginBottom:"12px"}}>
              Runs entirely in your browser — private &amp; free.
            </p>
            <ActionBtn onClick={handleRemoveBg} disabled={!image||bgStatus==="loading"}
              color={bgStatus==="done"?"#f0fff4":image?"purple":"#f0f0f0"}
              textColor={bgStatus==="done"?"#16a34a":image?"#fff":"#bbb"}
              style={{width:"100%",padding:"12px",marginBottom:"8px"}}>
              {bgStatus==="loading" ? <Row><Spin/>Processing... {bgProgress}%</Row>
               : bgStatus==="done" ? "✓ Done — Remove Again" : "✂ Remove Background"}
            </ActionBtn>
            {bgStatus==="loading" && <ProgressBar value={bgProgress}/>}
            {bgStatus==="error"   && <p style={{fontSize:"12px",color:"#ef4444"}}>⚠ Failed — try a JPG or PNG</p>}
            {!image               && <Empty>Upload a photo first</Empty>}
          </div>

          {bgStatus==="done" && bgSubjectUrl && (
            <div style={{animation:"fadein .3s"}}>
              <SectionLabel>Background Style</SectionLabel>
              {[{id:"transparent",label:"Transparent",icon:"◻"},{id:"color",label:"Solid Color",icon:"🎨"},{id:"blur",label:"Blur Original",icon:"✦"}].map(o=>(
                <button key={o.id} onClick={()=>setBgMode(o.id)}
                  style={{width:"100%",padding:"11px 14px",marginBottom:"7px",border:`1.5px solid ${bgMode===o.id?"#6c63ff":"#e8e8f0"}`,background:bgMode===o.id?"#faf9ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",transition:"all .18s",fontFamily:"inherit"}}>
                  <span style={{fontSize:"16px"}}>{o.icon}</span>
                  <span style={{fontSize:"13px",fontWeight:600,color:bgMode===o.id?"#6c63ff":"#444"}}>{o.label}</span>
                  {bgMode===o.id&&<span style={{marginLeft:"auto",color:"#6c63ff"}}>✓</span>}
                </button>
              ))}
              {bgMode==="color" && (
                <div style={{padding:"12px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",marginBottom:"8px"}}>
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
              {bgMode==="blur" && (
                <div style={{padding:"12px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em"}}>Blur</span>
                    <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:600}}>{bgBlur}px</span>
                  </div>
                  <input type="range" className="sl" min={2} max={40} step={1} value={bgBlur}
                    style={{"--v":`${((bgBlur-2)/38)*100}%`}} onChange={e=>setBgBlur(+e.target.value)}/>
                </div>
              )}
              {bgResult && (
                <>
                  <div style={{position:"relative",borderRadius:"10px",overflow:"hidden",margin:"10px 0",border:"1.5px solid #eee"}}>
                    {bgMode==="transparent" && <div className="checker" style={{position:"absolute",inset:0}}/>}
                    <img src={bgResult} alt="result" style={{width:"100%",display:"block",position:"relative"}}/>
                  </div>
                  <ActionBtn onClick={downloadBgResult} color="purple" textColor="#fff" style={{width:"100%",padding:"11px"}}>
                    ↓ Download PNG
                  </ActionBtn>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* EDIT */}
      {activeTab==="edit" && (<>
        <div>
          <SectionLabel>Presets</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px"}}>
            {PRESETS.map(p=>(
              <button key={p.name} onClick={()=>setFilters({...DEFAULT_STATE,...p.values})}
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

        {isEdited && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"4px",borderTop:"1px solid #f0f0f4"}}>
            <span style={{fontSize:"11px",color:"#bbb"}}>
              {Object.entries(filters).filter(([k,v])=>v!==DEFAULT_STATE[k]).length} adjustments active
            </span>
            <button onClick={()=>setFilters(DEFAULT_STATE)}
              style={{fontSize:"11px",color:"#6c63ff",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
              Reset all
            </button>
          </div>
        )}
      </>)}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",background:"#f7f8fa",minHeight:"100vh",color:"#1a1a1a",WebkitTapHighlightColor:"transparent"}}>
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
      <header style={{background:"#fff",borderBottom:"1px solid #eee",height:"52px",padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
          <div style={{width:"30px",height:"30px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0}}>✨</div>
          <div style={{fontSize:"16px",fontWeight:700,color:"#1a1a2e",letterSpacing:"-.3px"}}>PHOTOlab</div>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <div style={{display:"flex",background:"#f2f2f8",borderRadius:"10px",padding:"3px",gap:"2px"}}>
            {["EDIT","TOOLS"].map(t=>(
              <button key={t} onClick={()=>setActiveTab(t.toLowerCase())}
                style={{padding:isMobile?"5px 12px":"5px 16px",fontSize:"12px",fontWeight:600,border:"none",cursor:"pointer",background:activeTab===t.toLowerCase()?"#fff":"transparent",color:activeTab===t.toLowerCase()?"#6c63ff":"#888",borderRadius:"8px",boxShadow:activeTab===t.toLowerCase()?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s"}}>
                {t==="EDIT"?"✏️ Edit":"🛠 Tools"}
              </button>
            ))}
          </div>
          {image && (
            <button onClick={()=>setShowExport(true)}
              style={{padding:"7px 14px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(108,99,255,.3)"}}>
              {isMobile?"↓ Save":"↓ Export"}
            </button>
          )}
        </div>
      </header>

      {/* Desktop */}
      {!isMobile && (
        <div style={{display:"flex",height:"calc(100vh - 52px)"}}>
          <div style={{width:"285px",borderRight:"1px solid #eee",overflowY:"auto",background:"#fff",flexShrink:0}}>
            <Panel/>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"#f7f8fa",position:"relative",overflow:"hidden"}}>
            <PhotoPreview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDraggingSplit,cssFilter,tempColor,filters,isEdited,setImage,setBgStatus,setBgSubjectUrl,setBgResult,isMobile}}/>
          </div>
        </div>
      )}

      {/* Mobile — photo top, controls bottom always visible */}
      {isMobile && (
        <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden"}}>
          <div style={{height:"42vh",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f1f5",position:"relative",borderBottom:"1px solid #e8e8f0"}}>
            <PhotoPreview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDraggingSplit,cssFilter,tempColor,filters,isEdited,setImage,setBgStatus,setBgSubjectUrl,setBgResult,isMobile}}/>
          </div>
          <div style={{flex:1,overflowY:"auto",background:"#fff",WebkitOverflowScrolling:"touch"}}>
            {/* Mobile sticky action bar */}
            {image && activeTab==="edit" && (
              <div style={{display:"flex",gap:"8px",padding:"10px 14px",borderBottom:"1px solid #f0f0f4",background:"#fff",position:"sticky",top:0,zIndex:10}}>
                <button onClick={()=>setFilters({...DEFAULT_STATE,...PRESETS[0].values})}
                  style={{flex:1,padding:"9px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"9px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>
                  👤 Portrait
                </button>
                <button onClick={()=>setFilters({...DEFAULT_STATE,...PRESETS[1].values})}
                  style={{flex:1,padding:"9px",background:"linear-gradient(135deg,#f59e0b,#ef4444)",color:"#fff",border:"none",borderRadius:"9px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>
                  🌈 Vivid
                </button>
                <button onClick={()=>setFilters({...DEFAULT_STATE,...PRESETS[6].values})}
                  style={{flex:1,padding:"9px",background:"linear-gradient(135deg,#059669,#34d399)",color:"#fff",border:"none",borderRadius:"9px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>
                  🖼 Restore
                </button>
                <button onClick={()=>setFilters(DEFAULT_STATE)}
                  style={{padding:"9px 11px",background:"#f2f2f8",border:"none",borderRadius:"9px",fontSize:"12px",fontWeight:600,color:"#888",cursor:"pointer"}}>
                  ↺
                </button>
              </div>
            )}
            <Panel inline/>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
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

            {/* Standard */}
            {exportTab==="standard" && (<>
              <SectionLabel>Format</SectionLabel>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"18px"}}>
                {EXPORT_FORMATS.map(f=>(
                  <button key={f.id} onClick={()=>setExportFormat(f.id)}
                    style={{padding:"11px 14px",border:`1.5px solid ${exportFormat===f.id?"#6c63ff":"#eee"}`,background:exportFormat===f.id?"#faf9ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                    <div>
                      <span style={{fontSize:"13px",fontWeight:600,color:exportFormat===f.id?"#6c63ff":"#444"}}>{f.label}</span>
                      <span style={{fontSize:"11px",color:"#bbb",marginLeft:"10px"}}>{f.desc}</span>
                    </div>
                    {exportFormat===f.id && <span style={{color:"#6c63ff",fontSize:"18px"}}>✓</span>}
                  </button>
                ))}
              </div>

              {exportFormat!=="png" && (<>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                  <SectionLabel>Quality</SectionLabel>
                  <span style={{fontSize:"13px",fontWeight:700,color:"#6c63ff"}}>{exportQuality}%</span>
                </div>
                <input type="range" className="sl" min={70} max={100} step={1} value={exportQuality}
                  style={{"--v":`${((exportQuality-70)/30)*100}%`,marginBottom:"18px"}}
                  onChange={e=>setExportQuality(+e.target.value)}/>
              </>)}

              <SectionLabel>Resolution</SectionLabel>
              <div style={{display:"flex",gap:"6px",marginBottom:"10px",flexWrap:"wrap"}}>
                {SCALE_OPTIONS.map(s=>(
                  <button key={s.value} onClick={()=>setExportScale(s.value)}
                    style={{flex:"1 1 56px",padding:"10px 4px",border:`1.5px solid ${exportScale===s.value?"#6c63ff":s.value==="8k"?"#e0d8ff":"#eee"}`,background:exportScale===s.value?"#faf9ff":s.value==="8k"?"#faf8ff":"#fff",borderRadius:"10px",textAlign:"center",cursor:"pointer",transition:"all .18s",fontFamily:"inherit"}}>
                    <div style={{fontSize:"14px",fontWeight:700,color:exportScale===s.value?"#6c63ff":s.value==="8k"?"#a78bfa":"#555",marginBottom:"2px"}}>{s.label}</div>
                    <div style={{fontSize:"9px",color:"#bbb"}}>{s.desc}</div>
                  </button>
                ))}
              </div>

              {natW>0 && (
                <div style={{padding:"10px 14px",background:"#f8f8fd",borderRadius:"8px",display:"flex",justifyContent:"space-between",marginBottom:"18px"}}>
                  <span style={{fontSize:"12px",color:"#bbb"}}>Output</span>
                  <span style={{fontSize:"13px",fontWeight:600,color:"#6c63ff"}}>{Math.min(expW,7680).toLocaleString()} × {Math.min(expH,7680).toLocaleString()}px</span>
                </div>
              )}

              {exportInfo && (
                <div style={{padding:"10px 14px",background:exportDone?"#f0fff4":"#fff8e7",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:exportDone?"#16a34a":"#92400e",fontWeight:500}}>
                  {exportDone?`✓ Saved — ${exportInfo}`:exportInfo}
                </div>
              )}

              <ActionBtn onClick={handleExport} disabled={exporting} color={exportDone?"#f0fff4":"purple"}
                textColor={exportDone?"#16a34a":"#fff"} style={{width:"100%",padding:"14px",fontSize:"14px",fontWeight:700}}>
                {exporting?<Row><Spin/>Processing...</Row>
                 :exportDone?"✓ Saved!"
                 :`↓ Download ${EXPORT_FORMATS.find(f=>f.id===exportFormat)?.label} · ${typeof exportScale==="string"?exportScale.toUpperCase():exportScale+"×"}`}
              </ActionBtn>
              <p style={{fontSize:"11px",color:"#bbb",textAlign:"center",marginTop:"8px"}}>
                iOS & Android: tap "Save Image" in the share sheet
              </p>
            </>)}

            {/* Facebook */}
            {exportTab==="facebook" && (<>
              <div style={{padding:"13px",background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:"10px",marginBottom:"18px"}}>
                <div style={{fontSize:"12px",fontWeight:600,color:"#1d4ed8",marginBottom:"5px"}}>Optimised for Facebook</div>
                <div style={{fontSize:"12px",color:"#3b82f6",lineHeight:1.6}}>Exact dimensions + JPEG 82% to bypass Facebook's compression algorithm.</div>
              </div>
              <SectionLabel>Post Type</SectionLabel>
              {FB_MODES.map(m=>(
                <button key={m.id} onClick={()=>setFbMode(m.id)}
                  style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${fbMode===m.id?"#1877f2":"#eee"}`,background:fbMode===m.id?"#eff6ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",marginBottom:"7px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:600,color:fbMode===m.id?"#1877f2":"#444",marginBottom:"2px"}}>{m.label}</div>
                    <div style={{fontSize:"12px",color:"#bbb"}}>{m.desc}</div>
                  </div>
                  {fbMode===m.id && <span style={{color:"#1877f2",fontSize:"18px"}}>✓</span>}
                </button>
              ))}
              {exportInfo && fbDone && (
                <div style={{padding:"10px 14px",background:"#f0fff4",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:"#16a34a",fontWeight:500}}>✓ Saved — {exportInfo}</div>
              )}
              <ActionBtn onClick={handleFbExport} disabled={fbExporting} color={fbDone?"#f0fff4":"#1877f2"}
                textColor={fbDone?"#16a34a":"#fff"} style={{width:"100%",padding:"14px",fontSize:"14px",fontWeight:700}}>
                {fbExporting?<Row><Spin color="rgba(255,255,255,.7)"/>Exporting...</Row>
                 :fbDone?"✓ Saved!"
                 :`↓ Export for Facebook · ${FB_MODES.find(m=>m.id===fbMode)?.desc}`}
              </ActionBtn>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Photo Preview ─────────────────────────────────────────────────────────────
function PhotoPreview({ image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDraggingSplit,cssFilter,tempColor,filters,isEdited,setImage,setBgStatus,setBgSubjectUrl,setBgResult,isMobile }) {
  const maxH = isMobile ? "40vh" : "calc(100vh - 130px)";

  if (!image) return (
    <div className={`drop ${dragging?"on":""}`}
      style={{width:"100%",maxWidth:"480px",aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,.06)",cursor:"pointer"}}
      onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);loadImage(e.dataTransfer.files[0]);}}
      onClick={()=>fileInputRef.current?.click()}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadImage(e.target.files[0])}/>
      <div style={{fontSize:"44px",marginBottom:"14px",animation:"pulse 2.5s infinite"}}>🖼</div>
      <div style={{fontSize:"16px",fontWeight:600,color:"#555",marginBottom:"6px"}}>{isMobile?"Tap to upload photo":"Drop photo here"}</div>
      {!isMobile && <div style={{fontSize:"13px",color:"#bbb",marginBottom:"20px"}}>or click to browse</div>}
      <div style={{display:"flex",gap:"8px"}}>
        {["JPG","PNG","WEBP","HEIC"].map(x=>(
          <span key={x} style={{padding:"3px 10px",background:"#f2f2f8",borderRadius:"20px",fontSize:"11px",fontWeight:500,color:"#999"}}>{x}</span>
        ))}
      </div>
    </div>
  );

  return (
    <>
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
      {activeTab==="tools" && bgResult && (
        <div style={{position:"absolute",top:"12px",right:"12px",padding:"4px 12px",background:"#f0fff4",border:"1.5px solid #86efac",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#16a34a",zIndex:10}}>✓ BG Removed</div>
      )}

      <div ref={splitRef}
        style={{position:"relative",maxWidth:"100%",maxHeight:maxH,lineHeight:0,borderRadius:"14px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.12)",cursor:showSplit?"ew-resize":"default",userSelect:"none"}}>

        {activeTab==="tools" && bgResult ? (
          <>
            {bgMode==="transparent" && <div className="checker" style={{position:"absolute",inset:0}}/>}
            <img src={bgResult} alt="result" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",position:"relative"}}/>
          </>
        ) : showSplit ? (
          <>
            <img ref={imgRef} src={image} alt="after" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:cssFilter}}/>
            {filters.temperature!==0 && <div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none",clipPath:`inset(0 ${100-splitPos}% 0 0)`}}/>}
            {filters.vignette>0 && <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none",clipPath:`inset(0 ${100-splitPos}% 0 0)`}}/>}
            <div style={{position:"absolute",inset:0,clipPath:`inset(0 0 0 ${splitPos}%)`}}>
              <img src={image} alt="before" style={{maxWidth:"100%",maxHeight:maxH,objectFit:"contain",display:"block",filter:"none"}}/>
            </div>
            <div onMouseDown={e=>{e.preventDefault();setIsDraggingSplit(true);}} onTouchStart={e=>{e.preventDefault();setIsDraggingSplit(true);}}
              style={{position:"absolute",top:0,bottom:0,left:`${splitPos}%`,transform:"translateX(-50%)",width:"44px",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",cursor:"ew-resize"}}>
              <div style={{width:"2px",height:"100%",background:"#fff",boxShadow:"0 0 6px rgba(0,0,0,.5)"}}/>
              <div style={{position:"absolute",width:"36px",height:"36px",borderRadius:"50%",background:"#fff",boxShadow:"0 2px 12px rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:"#6c63ff",fontWeight:700}}>⇄</div>
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
        <button onClick={()=>{setImage(null);setBgStatus("idle");setBgSubjectUrl(null);setBgResult(null);}}
          style={{background:"#fff",color:"#999",padding:"6px 14px",border:"1.5px solid #eee",borderRadius:"8px",fontSize:"12px",fontWeight:500,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          ← New Photo
        </button>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SectionLabel = ({children}) => <div style={{fontSize:"11px",fontWeight:600,color:"#aaa",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"8px"}}>{children}</div>;
const Empty = ({children}) => <div style={{fontSize:"12px",color:"#bbb",textAlign:"center",padding:"20px",border:"2px dashed #eee",borderRadius:"10px"}}>{children}</div>;
const Row   = ({children}) => <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>{children}</span>;
const Spin  = ({color="#fff"}) => <span style={{display:"inline-block",width:"14px",height:"14px",border:`2px solid ${color}44`,borderTopColor:color,borderRadius:"50%",animation:"spin .8s linear infinite",flexShrink:0}}/>;
const ProgressBar = ({value}) => <div style={{height:"4px",background:"#f0f0f8",borderRadius:"2px",margin:"8px 0 12px",overflow:"hidden"}}><div style={{height:"100%",width:`${value}%`,background:"linear-gradient(90deg,#6c63ff,#a78bfa)",transition:"width .3s",borderRadius:"2px"}}/></div>;

function ActionBtn({children,onClick,disabled,color="purple",textColor="#fff",style={}}) {
  const bg = color==="purple"?"linear-gradient(135deg,#6c63ff,#a78bfa)":color;
  const sh = color==="purple"?"0 2px 10px rgba(108,99,255,.3)":"none";
  return(
    <button onClick={onClick} disabled={disabled}
      style={{border:"none",cursor:disabled?"not-allowed":"pointer",borderRadius:"10px",fontSize:"13px",fontWeight:600,fontFamily:"inherit",transition:"all .18s",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",background:disabled?"#f0f0f0":bg,color:disabled?"#bbb":textColor,boxShadow:disabled?"none":sh,padding:"12px 16px",...style}}>
      {children}
    </button>
  );
}
