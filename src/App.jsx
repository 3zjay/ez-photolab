import { useState, useRef, useEffect } from "react";

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
const DEFAULT_STATE = Object.fromEntries(FILTERS.map(f=>[f.key,f.default]));

const PRESETS = [
  { name:"Restore Old Photo", icon:"◈", values:{ brightness:110,contrast:115,saturation:115,exposure:15,sharpness:8, clarity:6, denoise:7,smooth:2,temperature:10,vignette:0, fade:0  }},
  { name:"Enhance Portrait",  icon:"◉", values:{ brightness:108,contrast:110,saturation:105,exposure:8, sharpness:5, clarity:8, denoise:4,smooth:5,temperature:5, vignette:20,fade:0  }},
  { name:"Clean & Sharp",     icon:"◇", values:{ brightness:105,contrast:120,saturation:100,exposure:5, sharpness:12,clarity:10,denoise:3,smooth:0,temperature:0, vignette:10,fade:0  }},
  { name:"Soft & Warm",       icon:"◌", values:{ brightness:110,contrast:95, saturation:110,exposure:10,sharpness:2, clarity:3, denoise:5,smooth:6,temperature:30,vignette:25,fade:15 }},
];
const GROUPS=[{key:"basic",label:"BASIC"},{key:"enhance",label:"ENHANCE"},{key:"style",label:"STYLE"}];

const EXPORT_FORMATS=[
  {id:"png", label:"PNG", desc:"Lossless · Best for archiving",  ext:"png", mime:"image/png"},
  {id:"webp",label:"WebP",desc:"Near-lossless · Smallest size",  ext:"webp",mime:"image/webp"},
  {id:"jpg", label:"JPEG",desc:"Compressed · Universal",          ext:"jpg", mime:"image/jpeg"},
];
const SCALE_OPTIONS=[
  {value:1,   label:"1×",  desc:"Original"},
  {value:2,   label:"2×",  desc:"Double"},
  {value:4,   label:"4×",  desc:"Ultra HD"},
  {value:"8k",label:"8K",  desc:"7680px wide"},
  {value:"12k",label:"12K",desc:"12288px wide"},
];
const FB_MODES=[
  {id:"portrait", label:"Portrait Post",  desc:"1080 × 1350px",       tip:"Best for mobile",              w:1080,h:1350,quality:75},
  {id:"square",   label:"Square Post",    desc:"1080 × 1080px",       tip:"Universal square format",      w:1080,h:1080,quality:75},
  {id:"landscape",label:"Landscape Post", desc:"2048px longest side",  tip:"Max before compression",       w:2048,h:null,quality:75},
  {id:"cover",    label:"Cover Photo",    desc:"851 × 315px",          tip:"Exact Facebook cover dims",    w:851, h:315, quality:75},
];
const BG_COLORS=["#ffffff","#000000","#f5f5f0","#1a1a2e","#2d4a3e","#4a1a2e","#1a3a4a","#e8e0d0"];

// ── Pixel helpers ─────────────────────────────────────────────────────────────
function gaussianBlur(data,w,h,sigma){
  if(sigma<=0)return data;
  const r=Math.ceil(sigma*2),size=r*2+1;
  const k=new Float32Array(size*size);let s=0;
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const v=Math.exp(-(x*x+y*y)/(2*sigma*sigma));k[(y+r)*size+(x+r)]=v;s+=v;}
  for(let i=0;i<k.length;i++)k[i]/=s;
  const out=new Uint8ClampedArray(data.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let r2=0,g=0,b=0,a=0;
    for(let ky=0;ky<size;ky++)for(let kx=0;kx<size;kx++){
      const sy=Math.min(Math.max(y+ky-r,0),h-1),sx=Math.min(Math.max(x+kx-r,0),w-1);
      const kv=k[ky*size+kx],idx=(sy*w+sx)*4;
      r2+=data[idx]*kv;g+=data[idx+1]*kv;b+=data[idx+2]*kv;a+=data[idx+3]*kv;
    }
    const i=(y*w+x)*4;out[i]=r2;out[i+1]=g;out[i+2]=b;out[i+3]=a;
  }
  return out;
}
function unsharpMask(data,w,h,sigma,amount){
  const bl=gaussianBlur(data,w,h,sigma);
  const out=new Uint8ClampedArray(data.length);
  for(let i=0;i<data.length;i+=4){
    out[i]=Math.min(255,Math.max(0,data[i]+amount*(data[i]-bl[i])));
    out[i+1]=Math.min(255,Math.max(0,data[i+1]+amount*(data[i+1]-bl[i+1])));
    out[i+2]=Math.min(255,Math.max(0,data[i+2]+amount*(data[i+2]-bl[i+2])));
    out[i+3]=data[i+3];
  }
  return out;
}
function getScaleForTarget(imgW,imgH,v){
  if(v==="8k") return Math.max(1,7680/imgW);
  if(v==="12k")return Math.max(1,12288/imgW);
  return v;
}
async function renderHighQuality(imgEl,filters,scaleVal){
  const scale=getScaleForTarget(imgEl.naturalWidth,imgEl.naturalHeight,scaleVal);
  const W=Math.round(imgEl.naturalWidth*scale),H=Math.round(imgEl.naturalHeight*scale);
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  const isHuge=W*H>16_000_000;
  const ev=1+filters.exposure/100,bv=(filters.brightness/100)*ev;
  let cssF=`brightness(${bv}) contrast(${filters.contrast/100}) saturate(${filters.saturation/100})`;
  if(isHuge){
    if(filters.denoise>0)cssF+=` blur(${filters.denoise*0.06}px)`;
    if(filters.sharpness>0)cssF+=` contrast(${1+filters.sharpness*0.03})`;
    if(filters.clarity>0)cssF+=` contrast(${1+filters.clarity*0.025})`;
  }
  ctx.filter=cssF;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(imgEl,0,0,W,H);ctx.filter="none";
  if(!isHuge){
    let data=ctx.getImageData(0,0,W,H).data;
    if(filters.denoise>0)data=gaussianBlur(data,W,H,filters.denoise*0.18);
    if(filters.smooth>0){
      const sm=gaussianBlur(data,W,H,filters.smooth*0.25);const op=filters.smooth/10*0.7;
      for(let i=0;i<data.length;i+=4){data[i]=data[i]*(1-op)+sm[i]*op;data[i+1]=data[i+1]*(1-op)+sm[i+1]*op;data[i+2]=data[i+2]*(1-op)+sm[i+2]*op;}
    }
    if(filters.clarity>0)data=unsharpMask(data,W,H,8*Math.min(scale,2),filters.clarity*0.1);
    if(filters.sharpness>0)data=unsharpMask(data,W,H,1.2*Math.min(scale,2),filters.sharpness*0.12);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data),W,H),0,0);
  }
  if(filters.temperature!==0){const a=Math.abs(filters.temperature)/300;ctx.globalCompositeOperation="overlay";ctx.fillStyle=filters.temperature>0?`rgba(255,140,0,${a})`:`rgba(100,149,237,${a})`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  if(filters.fade>0){ctx.globalCompositeOperation="screen";ctx.fillStyle=`rgba(255,255,255,${filters.fade/180})`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  if(filters.vignette>0){const g=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.85);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(0,0,0,${filters.vignette/100})`);ctx.globalCompositeOperation="multiply";ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  return{canvas,W,H};
}
async function renderFacebook(imgEl,filters,fbMode){
  let tW=fbMode.w,tH=fbMode.h;
  const sW=imgEl.naturalWidth,sH=imgEl.naturalHeight;
  if(fbMode.id==="landscape"){const sc=Math.min(1,2048/Math.max(sW,sH));tW=Math.round(sW*sc);tH=Math.round(sH*sc);}
  else if(!tH)tH=Math.round(sH*(tW/sW));
  const canvas=document.createElement("canvas");canvas.width=tW;canvas.height=tH;
  const ctx=canvas.getContext("2d");
  const ev=1+filters.exposure/100,bv=(filters.brightness/100)*ev;
  ctx.filter=`brightness(${bv}) contrast(${filters.contrast/100}) saturate(${filters.saturation/100})`;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  const sA=sW/sH,tA=tW/tH;let sx=0,sy=0,sw=sW,sh=sH;
  if(sA>tA){sw=sH*tA;sx=(sW-sw)/2;}else{sh=sW/tA;sy=(sH-sh)/2;}
  ctx.drawImage(imgEl,sx,sy,sw,sh,0,0,tW,tH);ctx.filter="none";
  if(filters.temperature!==0){const a=Math.abs(filters.temperature)/300;ctx.globalCompositeOperation="overlay";ctx.fillStyle=filters.temperature>0?`rgba(255,140,0,${a})`:`rgba(100,149,237,${a})`;ctx.fillRect(0,0,tW,tH);ctx.globalCompositeOperation="source-over";}
  if(filters.vignette>0){const g=ctx.createRadialGradient(tW/2,tH/2,tW*0.3,tW/2,tH/2,tW*0.85);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(0,0,0,${filters.vignette/100})`);ctx.globalCompositeOperation="multiply";ctx.fillStyle=g;ctx.fillRect(0,0,tW,tH);ctx.globalCompositeOperation="source-over";}
  return{canvas,W:tW,H:tH};
}
function buildCSSFilter(f){
  const ev=1+f.exposure/100,bv=(f.brightness/100)*ev;
  let s=`brightness(${bv}) contrast(${f.contrast/100}) saturate(${f.saturation/100})`;
  if(f.denoise>0)s+=` blur(${f.denoise*0.07}px)`;
  return s;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function App(){
  // core
  const [image,        setImage]        = useState(null);
  const [filters,      setFilters]      = useState(DEFAULT_STATE);
  const [activeTab,    setActiveTab]    = useState("edit"); // edit | tools
  const [activeGroup,  setActiveGroup]  = useState("enhance");
  const [activeFilter, setActiveFilter] = useState(null);
  const [showBefore,   setShowBefore]   = useState(false);
  const [dragging,     setDragging]     = useState(false);
  // ai
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [apiKey,       setApiKey]       = useState("");
  const [keyError,     setKeyError]     = useState("");
  // export
  const [showExport,   setShowExport]   = useState(false);
  const [exportTab,    setExportTab]    = useState("standard");
  const [exportFormat, setExportFormat] = useState("png");
  const [exportScale,  setExportScale]  = useState(2);
  const [exportQuality,setExportQuality]= useState(97);
  const [exporting,    setExporting]    = useState(false);
  const [exportDone,   setExportDone]   = useState(false);
  const [exportInfo,   setExportInfo]   = useState(null);
  const [fbMode,       setFbMode]       = useState("portrait");
  const [fbExporting,  setFbExporting]  = useState(false);
  const [fbDone,       setFbDone]       = useState(false);
  // tools / bg removal
  const [bgStatus,     setBgStatus]     = useState("idle"); // idle|loading|done|error
  const [bgProgress,   setBgProgress]   = useState(0);
  const [bgSubjectUrl, setBgSubjectUrl] = useState(null); // transparent subject PNG
  const [bgMode,       setBgMode]       = useState("transparent");
  const [bgColor,      setBgColor]      = useState("#ffffff");
  const [bgBlur,       setBgBlur]       = useState(14);
  const [bgResult,     setBgResult]     = useState(null); // final composited data URL

  const fileInputRef = useRef(null);
  const imgRef       = useRef(null);

  // Load image
  const loadImage = file => {
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=e=>{
      setImage(e.target.result);
      setFilters(DEFAULT_STATE);
      setAiSuggestion(null);
      setBgStatus("idle");
      setBgSubjectUrl(null);
      setBgResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Rebuild composite whenever bg settings change
  useEffect(()=>{
    if(bgSubjectUrl&&bgStatus==="done") buildComposite(bgSubjectUrl,bgMode,bgColor,bgBlur);
  },[bgMode,bgColor,bgBlur,bgSubjectUrl]);

  // ── Background removal ──────────────────────────────────────────────────
  const handleRemoveBg = async () => {
    if(!image||bgStatus==="loading")return;
    setBgStatus("loading"); setBgProgress(0); setBgSubjectUrl(null); setBgResult(null);
    try {
      // Dynamically import the library (loaded via npm in build)
      const { removeBackground } = await import("@imgly/background-removal");
      // Convert data URL to blob
      const res = await fetch(image);
      const blob = await res.blob();
      const resultBlob = await removeBackground(blob, {
        progress:(key,cur,total)=>setBgProgress(Math.round(cur/total*100)),
        model:"medium",
      });
      const url = URL.createObjectURL(resultBlob);
      setBgSubjectUrl(url);
      setBgStatus("done");
      await buildComposite(url, bgMode, bgColor, bgBlur);
    } catch(e) {
      console.error(e);
      setBgStatus("error");
    }
  };

  const buildComposite = async (subjectUrl, mode, color, blurPx) => {
    const orig = imgRef.current;
    if(!orig||!subjectUrl)return;
    const W=orig.naturalWidth, H=orig.naturalHeight;
    const sub=new Image(); sub.src=subjectUrl;
    await new Promise(r=>{sub.onload=r;if(sub.complete)r();});
    const canvas=document.createElement("canvas");
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext("2d");
    if(mode==="transparent"){
      ctx.drawImage(sub,0,0,W,H);
    } else if(mode==="color"){
      ctx.fillStyle=color; ctx.fillRect(0,0,W,H);
      ctx.drawImage(sub,0,0,W,H);
    } else if(mode==="blur"){
      ctx.filter=`blur(${blurPx}px)`;
      ctx.drawImage(orig,-30,-30,W+60,H+60);
      ctx.filter="none";
      ctx.drawImage(sub,0,0,W,H);
    }
    setBgResult(canvas.toDataURL("image/png"));
  };

  const downloadBgResult = () => {
    if(!bgResult)return;
    const a=document.createElement("a");
    a.download="photolab_bg.png"; a.href=bgResult; a.click();
  };

  // ── AI Analysis ─────────────────────────────────────────────────────────
  const analyzeWithAI = async () => {
    if(!apiKey.trim()){setKeyError("Paste your Gemini key above first.");return;}
    setLoading(true); setAiSuggestion(null); setKeyError("");
    try {
      const img=imgRef.current;
      const maxDim=1024, scale=Math.min(1,maxDim/Math.max(img.naturalWidth,img.naturalHeight));
      const c=document.createElement("canvas");
      c.width=Math.round(img.naturalWidth*scale); c.height=Math.round(img.naturalHeight*scale);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      const base64=c.toDataURL("image/jpeg",0.85).split(",")[1];
      const body={
        contents:[{parts:[
          {inline_data:{mime_type:"image/jpeg",data:base64}},
          {text:`Analyze this photo for quality issues. Return ONLY raw JSON, no markdown:\n{"analysis":"2-3 sentences","adjustments":{"brightness":100,"contrast":100,"saturation":100,"exposure":0,"temperature":0,"sharpness":0,"clarity":0,"denoise":0,"smooth":0,"vignette":0,"fade":0},"tip":"one tip"}`}
        ]}],
        generationConfig:{temperature:0.1,maxOutputTokens:600}
      };
      let res,data,attempts=0;
      while(attempts<3){
        res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
          {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        data=await res.json();
        if(res.status===429){
          attempts++;
          if(attempts<3){setKeyError(`Rate limit — retrying in ${attempts*3}s...`);await new Promise(r=>setTimeout(r,attempts*3000));setKeyError("");}
          else{setKeyError("Rate limit — wait 30s and retry.");setLoading(false);return;}
        } else break;
      }
      if(!res.ok){
        const msg=data?.error?.message||`Error ${res.status}`;
        if(res.status===403||res.status===401)setKeyError("Invalid key — check aistudio.google.com");
        else setKeyError(msg);
        setLoading(false);return;
      }
      const text=data.candidates?.[0]?.content?.parts?.[0]?.text||"";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      setAiSuggestion(parsed);
    } catch(e){setKeyError(`Error: ${e.message||"Try again"}`);}
    setLoading(false);
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if(!imgRef.current)return;
    setExporting(true);setExportDone(false);setExportInfo(null);
    try {
      const{canvas,W,H}=await renderHighQuality(imgRef.current,filters,exportScale);
      const fmt=EXPORT_FORMATS.find(f=>f.id===exportFormat);
      const quality=exportFormat==="png"?undefined:exportQuality/100;
      const dataUrl=canvas.toDataURL(fmt.mime,quality);
      const bytes=Math.round((dataUrl.length*3)/4/1024);
      setExportInfo(`${W}×${H}px · ~${bytes>1024?(bytes/1024).toFixed(1)+"MB":bytes+"KB"}`);
      const a=document.createElement("a");a.download=`photolab_${exportScale}x.${fmt.ext}`;a.href=dataUrl;a.click();
      setExportDone(true);setTimeout(()=>setExportDone(false),3500);
    }catch(e){console.error(e);}
    setExporting(false);
  };
  const handleFbExport = async () => {
    if(!imgRef.current)return;
    setFbExporting(true);setFbDone(false);
    try {
      const mode=FB_MODES.find(m=>m.id===fbMode);
      const{canvas,W,H}=await renderFacebook(imgRef.current,filters,mode);
      const dataUrl=canvas.toDataURL("image/jpeg",mode.quality/100);
      const bytes=Math.round((dataUrl.length*3)/4/1024);
      setExportInfo(`${W}×${H}px · ~${bytes>1024?(bytes/1024).toFixed(1)+"MB":bytes+"KB"}`);
      const a=document.createElement("a");a.download=`facebook_${mode.id}.jpg`;a.href=dataUrl;a.click();
      setFbDone(true);setTimeout(()=>setFbDone(false),3500);
    }catch(e){console.error(e);}
    setFbExporting(false);
  };

  const isEdited=Object.entries(filters).some(([k,v])=>v!==DEFAULT_STATE[k]);
  const cssFilter=buildCSSFilter(filters);
  const tempAlpha=Math.abs(filters.temperature)/300;
  const tempColor=filters.temperature>0?`rgba(255,140,0,${tempAlpha})`:`rgba(100,149,237,${tempAlpha})`;
  const natW=imgRef.current?.naturalWidth||0,natH=imgRef.current?.naturalHeight||0;
  const ps=getScaleForTarget(natW||1,natH||1,exportScale);
  const previewW=Math.round(natW*ps),previewH=Math.round(natH*ps);

  return (
    <div style={{fontFamily:"'DM Mono','Courier New',monospace",background:"#0a0a0a",minHeight:"100vh",color:"#e8e8e0",overflow:"hidden"}}>
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
        .pset{transition:all .2s;cursor:pointer;border:1px solid #1e1e1e;background:transparent;text-align:left;padding:9px 8px;border-radius:2px}
        .pset:hover{border-color:#c8b89a44;background:rgba(200,184,154,.04)}
        .fmt{transition:all .2s;cursor:pointer;padding:10px 12px;border:1px solid #1e1e1e;background:transparent;text-align:left;border-radius:3px;width:100%}
        .fmt:hover{border-color:#c8b89a44}.fmt.on{border-color:#c8b89a;background:rgba(200,184,154,.07)}
        .sc{transition:all .2s;cursor:pointer;padding:8px 4px;border:1px solid #1e1e1e;background:transparent;text-align:center;border-radius:3px;flex:1}
        .sc:hover{border-color:#c8b89a44}.sc.on{border-color:#c8b89a;background:rgba(200,184,154,.07)}
        .ki{background:#0d0d0d;border:1px solid #2a2a2a;color:#e8e8e0;padding:9px 12px;font-family:inherit;font-size:11px;border-radius:3px;outline:none;letter-spacing:.04em}
        .ki:focus{border-color:#c8b89a44}
        .tool-opt{width:100%;padding:11px 12px;margin-bottom:6px;border:1px solid #1e1e1e;background:transparent;border-radius:3px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .2s;font-family:inherit}
        .tool-opt:hover{border-color:#c8b89a44}.tool-opt.on{border-color:#c8b89a;background:rgba(200,184,154,.07)}
        .checker{background-image:linear-gradient(45deg,#2a2a2a 25%,transparent 25%),linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2a 75%),linear-gradient(-45deg,transparent 75%,#2a2a2a 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── Header ── */}
      <div style={{borderBottom:"1px solid #141414",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:"20px",fontWeight:300,letterSpacing:"-.02em"}}>
            PHOTO<span style={{color:"#c8b89a",fontStyle:"italic"}}>lab</span>
          </div>
          <div style={{fontSize:"9px",color:"#333",letterSpacing:".2em",marginTop:"1px"}}>OPTIMIZE · RESTORE · ENHANCE</div>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          {/* Edit / Tools toggle */}
          <div style={{display:"flex",background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"3px",padding:"2px",gap:"2px"}}>
            {["EDIT","TOOLS"].map(t=>(
              <button key={t} className="btn" onClick={()=>setActiveTab(t.toLowerCase())}
                style={{padding:"5px 14px",fontSize:"9px",letterSpacing:".12em",background:activeTab===t.toLowerCase()?"#c8b89a":"transparent",color:activeTab===t.toLowerCase()?"#0a0a0a":"#555",borderRadius:"2px"}}>
                {t}
              </button>
            ))}
          </div>
          {image && <>
            <button className="btn" onClick={()=>setFilters(DEFAULT_STATE)} style={{background:"transparent",color:"#555",padding:"6px 13px",border:"1px solid #1e1e1e",fontSize:"10px"}}>RESET</button>
            <button className="btn" onClick={()=>setShowExport(true)} style={{background:"#c8b89a",color:"#0a0a0a",padding:"6px 16px",fontSize:"10px",fontWeight:500}}>↓ EXPORT</button>
          </>}
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 59px)"}}>

        {/* ── Left Panel ── */}
        <div style={{width:"272px",borderRight:"1px solid #141414",overflowY:"auto",padding:"18px 16px",flexShrink:0,display:"flex",flexDirection:"column",gap:"20px"}}>

          {/* ══ TOOLS TAB ══ */}
          {activeTab==="tools" && (
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

              {/* Background Removal */}
              <div>
                <div style={{fontSize:"9px",letterSpacing:".2em",color:"#383838",marginBottom:"4px"}}>BACKGROUND REMOVAL</div>
                <div style={{fontSize:"9px",color:"#2e2e2e",lineHeight:1.6,marginBottom:"12px"}}>Runs entirely in your browser using AI. No data sent to any server.</div>

                <button className="btn" onClick={handleRemoveBg} disabled={!image||bgStatus==="loading"}
                  style={{width:"100%",padding:"11px",background:bgStatus==="done"?"rgba(76,175,80,.07)":image?"rgba(200,184,154,.06)":"#111",border:`1px solid ${bgStatus==="done"?"#4caf5044":"#c8b89a22"}`,color:bgStatus==="done"?"#6abf6a":image?"#c8b89a":"#444",fontSize:"10px",borderRadius:"3px",marginBottom:"8px"}}>
                  {bgStatus==="loading"
                    ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                        <span style={{display:"inline-block",width:"10px",height:"10px",border:"1px solid #c8b89a44",borderTopColor:"#c8b89a",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                        PROCESSING... {bgProgress}%
                      </span>
                    : bgStatus==="done" ? "✓ DONE — REMOVE AGAIN" : "✂ REMOVE BACKGROUND"}
                </button>

                {/* Progress bar */}
                {bgStatus==="loading" && (
                  <div style={{height:"2px",background:"#1a1a1a",borderRadius:"1px",marginBottom:"12px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${bgProgress}%`,background:"#c8b89a",transition:"width .3s",borderRadius:"1px"}}/>
                  </div>
                )}
                {bgStatus==="error" && <div style={{fontSize:"9px",color:"#e07070",marginBottom:"8px"}}>⚠ Failed. Try a JPG or PNG image.</div>}
                {!image && <div style={{fontSize:"9px",color:"#2a2a2a",textAlign:"center",padding:"16px",border:"1px dashed #1a1a1a",borderRadius:"3px"}}>Upload a photo first</div>}
              </div>

              {/* BG Style Options — only after removal */}
              {bgStatus==="done" && bgSubjectUrl && (
                <div style={{animation:"fadein .3s ease"}}>
                  <div style={{fontSize:"9px",letterSpacing:".2em",color:"#383838",marginBottom:"10px"}}>BACKGROUND STYLE</div>

                  {[
                    {id:"transparent",label:"Transparent",icon:"◻",desc:"PNG with no background"},
                    {id:"color",      label:"Solid Color", icon:"◼",desc:"Choose any color"},
                    {id:"blur",       label:"Blur Original",icon:"◈",desc:"Bokeh-style blur"},
                  ].map(opt=>(
                    <button key={opt.id} className={`tool-opt ${bgMode===opt.id?"on":""}`} onClick={()=>setBgMode(opt.id)}>
                      <span style={{color:bgMode===opt.id?"#c8b89a":"#444",fontSize:"13px"}}>{opt.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:"10px",color:bgMode===opt.id?"#c8b89a":"#777",letterSpacing:".04em"}}>{opt.label}</div>
                        <div style={{fontSize:"8px",color:"#333",marginTop:"1px"}}>{opt.desc}</div>
                      </div>
                      {bgMode===opt.id && <span style={{color:"#c8b89a",fontSize:"11px",marginLeft:"auto"}}>✓</span>}
                    </button>
                  ))}

                  {/* Color picker */}
                  {bgMode==="color" && (
                    <div style={{padding:"12px",background:"#0a0a0a",border:"1px solid #161616",borderRadius:"3px",marginBottom:"8px"}}>
                      <div style={{fontSize:"9px",color:"#444",letterSpacing:".1em",marginBottom:"8px"}}>PICK COLOR</div>
                      <div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginBottom:"10px"}}>
                        {BG_COLORS.map(c=>(
                          <div key={c} onClick={()=>setBgColor(c)}
                            style={{width:"24px",height:"24px",borderRadius:"3px",background:c,border:`2px solid ${bgColor===c?"#c8b89a":"#2a2a2a"}`,cursor:"pointer",transition:"border .15s",flexShrink:0}}/>
                        ))}
                      </div>
                      <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                        style={{width:"100%",height:"30px",border:"1px solid #2a2a2a",borderRadius:"3px",background:"transparent",cursor:"pointer"}}/>
                    </div>
                  )}

                  {/* Blur slider */}
                  {bgMode==="blur" && (
                    <div style={{padding:"12px",background:"#0a0a0a",border:"1px solid #161616",borderRadius:"3px",marginBottom:"8px"}}>
                      <div style={{fontSize:"9px",color:"#444",letterSpacing:".1em",marginBottom:"8px",display:"flex",justifyContent:"space-between"}}>
                        <span>BLUR AMOUNT</span><span style={{color:"#c8b89a"}}>{bgBlur}px</span>
                      </div>
                      <input type="range" className="sl" min={2} max={40} step={1}
                        value={bgBlur} style={{"--v":`${((bgBlur-2)/38)*100}%`}} onChange={e=>setBgBlur(parseInt(e.target.value))}/>
                    </div>
                  )}

                  {/* Preview + Download */}
                  {bgResult && (
                    <div style={{marginTop:"4px"}}>
                      <div style={{position:"relative",borderRadius:"4px",overflow:"hidden",marginBottom:"10px",border:"1px solid #1a1a1a"}}>
                        {bgMode==="transparent" && <div className="checker" style={{position:"absolute",inset:0}}/>}
                        <img src={bgResult} alt="result" style={{width:"100%",display:"block",position:"relative"}}/>
                      </div>
                      <button className="btn" onClick={downloadBgResult}
                        style={{width:"100%",padding:"11px",background:"#c8b89a",color:"#0a0a0a",fontSize:"10px",letterSpacing:".1em",fontWeight:500,borderRadius:"3px"}}>
                        ↓ DOWNLOAD PNG
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ EDIT TAB ══ */}
          {activeTab==="edit" && (<>

            {/* Gemini key */}
            <div>
              <div style={{fontSize:"9px",letterSpacing:".2em",color:"#383838",marginBottom:"8px"}}>GEMINI API KEY</div>
              <div style={{display:"flex",gap:"6px"}}>
                <input className="ki" type="password" placeholder="AIza..." value={apiKey}
                  onChange={e=>{setApiKey(e.target.value);setKeyError("");}} style={{flex:1,minWidth:0,width:"100%"}}/>
                {apiKey && <span style={{color:"#4caf50",fontSize:"16px",display:"flex",alignItems:"center",flexShrink:0}}>✓</span>}
              </div>
              {keyError && <div style={{marginTop:"5px",fontSize:"9px",color:"#e07070",lineHeight:1.5}}>{keyError}</div>}
              <div style={{marginTop:"5px",fontSize:"8px",color:"#252525",letterSpacing:".05em"}}>
                Free 1,500/day ·{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color:"#c8b89a33",textDecoration:"none"}}>get key →</a>
              </div>
            </div>

            {/* Presets */}
            <div>
              <div style={{fontSize:"9px",letterSpacing:".2em",color:"#383838",marginBottom:"10px"}}>PRESETS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px"}}>
                {PRESETS.map(p=>(
                  <button key={p.name} className="pset" onClick={()=>setFilters({...DEFAULT_STATE,...p.values})}>
                    <div style={{fontSize:"13px",color:"#c8b89a",marginBottom:"3px"}}>{p.icon}</div>
                    <div style={{fontSize:"9px",color:"#666",letterSpacing:".04em",lineHeight:1.3}}>{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI */}
            {image && (
              <div>
                <div style={{fontSize:"9px",letterSpacing:".2em",color:"#383838",marginBottom:"10px"}}>AI ANALYSIS</div>
                <button className="btn" onClick={analyzeWithAI} disabled={loading}
                  style={{width:"100%",padding:"11px",background:loading?"#111":"rgba(200,184,154,.06)",border:"1px solid #c8b89a22",color:loading?"#444":"#c8b89a",fontSize:"10px",borderRadius:"2px"}}>
                  {loading
                    ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                        <span style={{display:"inline-block",width:"10px",height:"10px",border:"1px solid #c8b89a44",borderTopColor:"#c8b89a",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>ANALYZING...
                      </span>
                    : !apiKey ? "✦ SET KEY TO ANALYZE" : "✦ AUTO-OPTIMIZE WITH GEMINI"}
                </button>
                {!apiKey && <div style={{marginTop:"6px",fontSize:"9px",color:"#383838",textAlign:"center"}}>Add your Gemini key above</div>}
                {aiSuggestion && (
                  <div style={{marginTop:"10px",padding:"12px",border:"1px solid #161616",background:"#0c0c0c",borderRadius:"2px",animation:"fadein .3s ease"}}>
                    <p style={{fontSize:"10px",color:"#666",lineHeight:1.65,marginBottom:"10px"}}>{aiSuggestion.analysis}</p>
                    {aiSuggestion.tip && <p style={{fontSize:"9px",color:"#c8b89a66",fontStyle:"italic",marginBottom:"10px",lineHeight:1.5}}>✦ {aiSuggestion.tip}</p>}
                    {aiSuggestion.adjustments && (
                      <button className="btn" onClick={()=>setFilters({...DEFAULT_STATE,...aiSuggestion.adjustments})}
                        style={{width:"100%",padding:"8px",background:"#c8b89a",color:"#0a0a0a",fontSize:"9px",letterSpacing:".12em",borderRadius:"2px"}}>
                        APPLY SUGGESTIONS
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Filter sliders */}
            <div>
              <div style={{display:"flex",gap:"2px",marginBottom:"14px",background:"#0d0d0d",padding:"3px",borderRadius:"3px",border:"1px solid #141414"}}>
                {GROUPS.map(g=>(
                  <button key={g.key} className="btn" onClick={()=>setActiveGroup(g.key)}
                    style={{flex:1,padding:"6px 4px",fontSize:"9px",letterSpacing:".1em",background:activeGroup===g.key?"#c8b89a":"transparent",color:activeGroup===g.key?"#0a0a0a":"#555",borderRadius:"2px"}}>
                    {g.label}
                  </button>
                ))}
              </div>
              {FILTERS.filter(f=>f.group===activeGroup).map(f=>{
                const val=filters[f.key];
                const pct=((val-f.min)/(f.max-f.min))*100;
                const changed=val!==f.default;
                return(
                  <div key={f.key} style={{marginBottom:"17px"}} onMouseEnter={()=>setActiveFilter(f.key)} onMouseLeave={()=>setActiveFilter(null)}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"7px"}}>
                      <span style={{fontSize:"10px",letterSpacing:".04em",color:changed?"#c8b89a":"#555",transition:"color .2s"}}>{f.label}</span>
                      <span style={{fontSize:"10px",color:activeFilter===f.key?"#c8b89a":"#333",fontVariantNumeric:"tabular-nums"}}>
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
              <div style={{fontSize:"9px",color:"#2e2e2e",textAlign:"center",paddingTop:"4px",borderTop:"1px solid #141414"}}>
                {Object.entries(filters).filter(([k,v])=>v!==DEFAULT_STATE[k]).length} ADJUSTMENTS ACTIVE
              </div>
            )}
          </>)}
        </div>

        {/* ── Preview ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px",background:"#060606",position:"relative",overflow:"hidden"}}>
          {!image ? (
            <div className={`drop ${dragging?"on":""}`}
              style={{width:"100%",maxWidth:"480px",aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:"4px"}}
              onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);loadImage(e.dataTransfer.files[0]);}}
              onClick={()=>fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadImage(e.target.files[0])}/>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:"52px",color:"#181818",lineHeight:1,marginBottom:"14px"}}>⊕</div>
              <div style={{fontSize:"12px",color:"#333",letterSpacing:".12em",marginBottom:"6px"}}>DROP PHOTO HERE</div>
              <div style={{fontSize:"9px",color:"#1e1e1e",letterSpacing:".18em"}}>OR CLICK TO BROWSE</div>
              <div style={{marginTop:"22px",display:"flex",gap:"6px"}}>
                {["JPG","PNG","WEBP","HEIC"].map(x=>(
                  <span key={x} style={{padding:"2px 7px",border:"1px solid #1a1a1a",fontSize:"9px",letterSpacing:".1em",color:"#252525"}}>{x}</span>
                ))}
              </div>
            </div>
          ):(
            <>
              {/* Before/After — only in edit mode */}
              {activeTab==="edit" && (
                <div style={{position:"absolute",top:"18px",right:"18px",display:"flex",background:"#0d0d0d",border:"1px solid #1a1a1a",zIndex:10,borderRadius:"2px"}}>
                  {["AFTER","BEFORE"].map(label=>(
                    <button key={label} className="btn" onClick={()=>setShowBefore(label==="BEFORE")}
                      style={{padding:"6px 12px",fontSize:"9px",letterSpacing:".1em",background:(label==="BEFORE")===showBefore?"#c8b89a":"transparent",color:(label==="BEFORE")===showBefore?"#0a0a0a":"#444",borderRadius:"1px"}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {activeTab==="tools" && bgStatus==="done" && (
                <div style={{position:"absolute",top:"18px",right:"18px",fontSize:"9px",color:"#4caf8088",letterSpacing:".1em",zIndex:10}}>● BG REMOVED</div>
              )}

              {isEdited && !showBefore && activeTab==="edit" && (
                <div style={{position:"absolute",top:"18px",left:"18px",fontSize:"9px",color:"#c8b89a66",letterSpacing:".1em",zIndex:10}}>● EDITED</div>
              )}

              {/* Image display */}
              <div style={{position:"relative",maxWidth:"100%",maxHeight:"calc(100vh - 160px)",lineHeight:0}}>
                {/* Tools mode: show composite result */}
                {activeTab==="tools" && bgResult ? (
                  <>
                    {bgMode==="transparent" && <div className="checker" style={{position:"absolute",inset:0,borderRadius:"2px"}}/>}
                    <img src={bgResult} alt="result"
                      style={{maxWidth:"100%",maxHeight:"calc(100vh - 160px)",objectFit:"contain",display:"block",boxShadow:"0 24px 80px rgba(0,0,0,.9)",borderRadius:"2px",position:"relative"}}/>
                  </>
                ) : (
                  <>
                    <img ref={imgRef} src={image} alt="photo"
                      style={{maxWidth:"100%",maxHeight:"calc(100vh - 160px)",objectFit:"contain",display:"block",boxShadow:"0 24px 80px rgba(0,0,0,.9)",
                        filter:showBefore||activeTab==="tools"?"none":cssFilter,transition:"filter .08s ease",borderRadius:"2px"}}/>
                    {!showBefore && activeTab==="edit" && filters.temperature!==0 && (
                      <div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none"}}/>
                    )}
                    {!showBefore && activeTab==="edit" && filters.fade>0 && (
                      <div style={{position:"absolute",inset:0,background:`rgba(255,255,255,${filters.fade/180})`,mixBlendMode:"screen",pointerEvents:"none"}}/>
                    )}
                    {!showBefore && activeTab==="edit" && filters.vignette>0 && (
                      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none"}}/>
                    )}
                  </>
                )}
              </div>

              <div style={{position:"absolute",bottom:"18px"}}>
                <button className="btn" onClick={()=>{setImage(null);setAiSuggestion(null);setBgStatus("idle");setBgSubjectUrl(null);setBgResult(null);}}
                  style={{background:"transparent",color:"#333",padding:"6px 14px",border:"1px solid #181818",fontSize:"9px",letterSpacing:".1em",borderRadius:"2px"}}>
                  NEW PHOTO
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Export Modal ── */}
      {showExport && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",backdropFilter:"blur(10px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowExport(false);}}>
          <div style={{background:"#0e0e0e",border:"1px solid #1e1e1e",width:"480px",maxHeight:"90vh",overflowY:"auto",padding:"28px",borderRadius:"4px",animation:"slideup .25s ease"}}>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"22px"}}>
              <div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:"18px",fontWeight:300,color:"#e8e8e0",marginBottom:"4px"}}>Export Photo</div>
                <div style={{fontSize:"9px",color:"#444",letterSpacing:".14em"}}>PIXEL-PERFECT · UP TO 12K · FACEBOOK OPTIMIZED</div>
              </div>
              <button className="btn" onClick={()=>setShowExport(false)} style={{background:"transparent",color:"#555",fontSize:"16px",padding:"2px 6px"}}>✕</button>
            </div>

            {/* Tab */}
            <div style={{display:"flex",gap:"2px",marginBottom:"22px",background:"#0a0a0a",padding:"3px",borderRadius:"3px",border:"1px solid #141414"}}>
              <button className="btn" onClick={()=>setExportTab("standard")}
                style={{flex:1,padding:"9px",fontSize:"10px",letterSpacing:".1em",background:exportTab==="standard"?"#c8b89a":"transparent",color:exportTab==="standard"?"#0a0a0a":"#666",borderRadius:"2px"}}>
                STANDARD
              </button>
              <button className="btn" onClick={()=>setExportTab("facebook")}
                style={{flex:1,padding:"9px",fontSize:"10px",letterSpacing:".1em",background:exportTab==="facebook"?"#1877f2":"transparent",color:exportTab==="facebook"?"#fff":"#5890ff",borderRadius:"2px",display:"flex",alignItems:"center",justifyContent:"center",gap:"7px"}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                FACEBOOK
              </button>
            </div>

            {/* Standard tab */}
            {exportTab==="standard" && (<>
              <div style={{marginBottom:"18px"}}>
                <div style={{fontSize:"9px",letterSpacing:".18em",color:"#444",marginBottom:"10px"}}>FORMAT</div>
                <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                  {EXPORT_FORMATS.map(f=>(
                    <button key={f.id} className={`fmt ${exportFormat===f.id?"on":""}`} onClick={()=>setExportFormat(f.id)}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <span style={{fontSize:"11px",color:exportFormat===f.id?"#c8b89a":"#888",letterSpacing:".06em"}}>{f.label}</span>
                          <span style={{fontSize:"9px",color:"#444",marginLeft:"10px"}}>{f.desc}</span>
                        </div>
                        {exportFormat===f.id&&<span style={{color:"#c8b89a"}}>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {exportFormat!=="png"&&(
                <div style={{marginBottom:"18px"}}>
                  <div style={{fontSize:"9px",letterSpacing:".18em",color:"#444",marginBottom:"10px",display:"flex",justifyContent:"space-between"}}>
                    <span>QUALITY</span><span style={{color:"#c8b89a"}}>{exportQuality}%</span>
                  </div>
                  <input type="range" className="sl" min={60} max={100} step={1} value={exportQuality}
                    style={{"--v":`${((exportQuality-60)/40)*100}%`}} onChange={e=>setExportQuality(parseInt(e.target.value))}/>
                </div>
              )}
              <div style={{marginBottom:"20px"}}>
                <div style={{fontSize:"9px",letterSpacing:".18em",color:"#444",marginBottom:"10px"}}>RESOLUTION</div>
                <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                  {SCALE_OPTIONS.map(s=>{
                    const pro=s.value==="8k"||s.value==="12k";
                    return(
                      <button key={s.value} className={`sc ${exportScale===s.value?"on":""}`} onClick={()=>setExportScale(s.value)} style={{minWidth:"60px"}}>
                        <div style={{fontSize:"13px",color:exportScale===s.value?"#c8b89a":pro?"#c8b89a44":"#555",marginBottom:"2px",fontWeight:500}}>{s.label}</div>
                        <div style={{fontSize:"7px",color:"#333"}}>{s.desc}</div>
                        {pro&&<div style={{fontSize:"7px",color:"#c8b89a33",marginTop:"1px"}}>PRO</div>}
                      </button>
                    );
                  })}
                </div>
                {natW>0&&(
                  <div style={{marginTop:"8px",padding:"9px",background:"#0a0a0a",border:"1px solid #161616",borderRadius:"3px",display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:"9px",color:"#444"}}>OUTPUT</span>
                    <span style={{fontSize:"9px",color:"#c8b89a"}}>{previewW.toLocaleString()} × {previewH.toLocaleString()}px</span>
                  </div>
                )}
                {(exportScale==="8k"||exportScale==="12k")&&(
                  <div style={{marginTop:"6px",fontSize:"8px",color:"#3a3a3a",lineHeight:1.5}}>⚡ Fast CSS mode at this size — prevents browser freeze</div>
                )}
              </div>
              <button className="btn" onClick={handleExport} disabled={exporting}
                style={{width:"100%",padding:"13px",background:exportDone?"#1a2e1a":"#c8b89a",color:exportDone?"#6abf6a":"#0a0a0a",fontSize:"11px",letterSpacing:".1em",fontWeight:500,borderRadius:"3px"}}>
                {exporting
                  ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}><span style={{display:"inline-block",width:"12px",height:"12px",border:"2px solid #0a0a0a44",borderTopColor:"#0a0a0a",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>PROCESSING...</span>
                  : exportDone?`✓ SAVED · ${exportInfo||""}`:`↓ EXPORT ${EXPORT_FORMATS.find(f=>f.id===exportFormat)?.label} · ${exportScale.toString().toUpperCase()}`}
              </button>
            </>)}

            {/* Facebook tab */}
            {exportTab==="facebook" && (<>
              <div style={{marginBottom:"18px",padding:"13px",background:"rgba(24,119,242,.05)",border:"1px solid rgba(24,119,242,.15)",borderRadius:"3px"}}>
                <div style={{fontSize:"9px",color:"#5890ff",letterSpacing:".1em",marginBottom:"7px"}}>WHY THIS EXISTS</div>
                <p style={{fontSize:"9px",color:"#555",lineHeight:1.7}}>Facebook compresses images that are too large. These presets use <span style={{color:"#c8b89a"}}>exact accepted dimensions</span>, <span style={{color:"#c8b89a"}}>JPEG 75%</span>, and <span style={{color:"#c8b89a"}}>sRGB</span> — preventing their crusher algorithm.</p>
              </div>
              <div style={{marginBottom:"18px"}}>
                <div style={{fontSize:"9px",letterSpacing:".18em",color:"#444",marginBottom:"10px"}}>POST TYPE</div>
                {FB_MODES.map(mode=>(
                  <button key={mode.id} onClick={()=>setFbMode(mode.id)}
                    style={{width:"100%",padding:"12px",border:`1px solid ${fbMode===mode.id?"#1877f2":"#1e1e1e"}`,background:fbMode===mode.id?"rgba(24,119,242,.07)":"transparent",borderRadius:"3px",textAlign:"left",cursor:"pointer",transition:"all .2s",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:"10px",color:fbMode===mode.id?"#6ba3ff":"#666",marginBottom:"2px",fontFamily:"'DM Mono',monospace",letterSpacing:".04em"}}>{mode.label}</div>
                      <div style={{fontSize:"9px",color:fbMode===mode.id?"#c8b89a":"#444"}}>{mode.desc}</div>
                      <div style={{fontSize:"8px",color:"#333",marginTop:"1px"}}>{mode.tip}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px"}}>
                      {fbMode===mode.id&&<span style={{color:"#1877f2"}}>✓</span>}
                      <span style={{fontSize:"7px",color:"#383838",background:"#141414",padding:"2px 6px",borderRadius:"2px"}}>JPEG 75%</span>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{marginBottom:"18px",padding:"11px",background:"#0a0a0a",border:"1px solid #161616",borderRadius:"3px"}}>
                <div style={{fontSize:"9px",color:"#333",letterSpacing:".1em",marginBottom:"8px"}}>UPLOAD TIPS</div>
                {["Upload from desktop browser","Mobile: Settings → Media → High Quality","If pixelated, wait 1–2 min for FB to finish processing"].map((t,i)=>(
                  <div key={i} style={{display:"flex",gap:"8px",marginBottom:"5px"}}>
                    <span style={{fontSize:"9px",color:"#1877f2",flexShrink:0}}>→</span>
                    <span style={{fontSize:"9px",color:"#444",lineHeight:1.5}}>{t}</span>
                  </div>
                ))}
              </div>
              <button className="btn" onClick={handleFbExport} disabled={fbExporting}
                style={{width:"100%",padding:"13px",background:fbDone?"#1a2e1a":fbExporting?"#0e1e35":"#1877f2",color:fbDone?"#6abf6a":"#fff",fontSize:"11px",letterSpacing:".1em",fontWeight:500,borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
                {fbExporting
                  ? <><span style={{display:"inline-block",width:"12px",height:"12px",border:"2px solid rgba(255,255,255,.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>OPTIMIZING...</>
                  : fbDone?`✓ SAVED · ${exportInfo||""}`
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>EXPORT FOR FACEBOOK · {FB_MODES.find(m=>m.id===fbMode)?.desc}</>}
              </button>
            </>)}

          </div>
        </div>
      )}
    </div>
  );
}
