import { useState, useRef, useEffect } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
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
  { name:"Restore Old Photo", icon:"🖼", values:{ brightness:110,contrast:115,saturation:115,exposure:15,sharpness:8, clarity:6, denoise:7,smooth:2,temperature:10,vignette:0, fade:0  }},
  { name:"Enhance Portrait",  icon:"👤", values:{ brightness:108,contrast:110,saturation:105,exposure:8, sharpness:5, clarity:8, denoise:4,smooth:5,temperature:5, vignette:20,fade:0  }},
  { name:"Clean & Sharp",     icon:"✨", values:{ brightness:105,contrast:120,saturation:100,exposure:5, sharpness:12,clarity:10,denoise:3,smooth:0,temperature:0, vignette:10,fade:0  }},
  { name:"Soft & Warm",       icon:"🌅", values:{ brightness:110,contrast:95, saturation:110,exposure:10,sharpness:2, clarity:3, denoise:5,smooth:6,temperature:30,vignette:25,fade:15 }},
];
const GROUPS=[{key:"basic",label:"Basic"},{key:"enhance",label:"Enhance"},{key:"style",label:"Style"}];

const EXPORT_FORMATS=[
  {id:"png", label:"PNG", desc:"Lossless · Best quality",    ext:"png", mime:"image/png"},
  {id:"webp",label:"WebP",desc:"Near-lossless · Smallest",   ext:"webp",mime:"image/webp"},
  {id:"jpg", label:"JPEG",desc:"Compressed · Universal",     ext:"jpg", mime:"image/jpeg"},
];
const SCALE_OPTIONS=[
  {value:1,   label:"1×",  desc:"Original"},
  {value:2,   label:"2×",  desc:"Double"},
  {value:4,   label:"4×",  desc:"Ultra HD"},
  {value:"8k",label:"8K",  desc:"7680px"},
  {value:"12k",label:"12K",desc:"12288px"},
];
const FB_MODES=[
  {id:"portrait", label:"Portrait Post",  desc:"1080 × 1350px",      w:1080,h:1350,quality:75},
  {id:"square",   label:"Square Post",    desc:"1080 × 1080px",      w:1080,h:1080,quality:75},
  {id:"landscape",label:"Landscape Post", desc:"2048px longest side", w:2048,h:null,quality:75},
  {id:"cover",    label:"Cover Photo",    desc:"851 × 315px",         w:851, h:315, quality:75},
];
const BG_COLORS=["#ffffff","#f0f0f0","#000000","#1a1a2e","#2d4a3e","#4a1a2e","#1a3a4a","#fff8e7"];

// ── Smart Auto-Enhance (no API needed) ───────────────────────────────────────
function analyzeAndEnhance(imgEl) {
  const c = document.createElement("canvas");
  const scale = Math.min(1, 400/Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
  c.width  = Math.round(imgEl.naturalWidth  * scale);
  c.height = Math.round(imgEl.naturalHeight * scale);
  const ctx = c.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;

  let rSum=0,gSum=0,bSum=0,n=0;
  let dark=0,bright=0,saturated=0;
  const histL = new Array(256).fill(0);

  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    rSum+=r; gSum+=g; bSum+=b; n++;
    const L = 0.299*r + 0.587*g + 0.114*b;
    histL[Math.round(L)]++;
    if(L<60)  dark++;
    if(L>200) bright++;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    if(max>0&&(max-min)/max>0.3) saturated++;
  }

  const avgL = (0.299*rSum + 0.587*gSum + 0.114*bSum) / n;
  const avgR = rSum/n, avgB = bSum/n;
  const darkRatio   = dark/n;
  const brightRatio = bright/n;
  const satRatio    = saturated/n;

  // Noise estimate: measure local variance in a sample
  let noiseScore = 0;
  const W=c.width, H=c.height;
  let noiseSamples=0;
  for(let y=1;y<H-1;y+=4){
    for(let x=1;x<W-1;x+=4){
      const idx=(y*W+x)*4;
      const idxU=((y-1)*W+x)*4, idxD=((y+1)*W+x)*4;
      const diff=Math.abs(data[idx]-data[idxU])+Math.abs(data[idx]-data[idxD]);
      noiseScore+=diff; noiseSamples++;
    }
  }
  noiseScore = noiseScore/noiseSamples;

  // Build adjustments based on analysis
  const adj = {...DEFAULT_STATE};

  // Exposure / brightness
  if(avgL < 80)       { adj.exposure = Math.round((80-avgL)*0.6);  adj.brightness = 115; }
  else if(avgL > 180) { adj.exposure = Math.round((180-avgL)*0.4); adj.brightness = 90; }
  else                { adj.brightness = Math.round(100 + (100-avgL)*0.15); }

  // Contrast — low contrast if histogram is clustered
  const spread = histL.reduce((a,v,i)=>a+(v>0?1:0),0);
  if(spread < 180) adj.contrast = 120;
  else if(spread > 220) adj.contrast = 95;
  else adj.contrast = 108;

  // Saturation
  if(satRatio < 0.15)      adj.saturation = 125;
  else if(satRatio > 0.6)  adj.saturation = 90;
  else adj.saturation = 108;

  // Warmth / temperature
  const warmBias = avgR - avgB;
  if(warmBias < -15)  adj.temperature = 20;   // too blue/cool → warm up
  else if(warmBias > 25) adj.temperature = -10; // too warm → cool down

  // Noise
  if(noiseScore > 12)       { adj.denoise = Math.min(8, Math.round(noiseScore/4)); adj.smooth = 3; }
  else if(noiseScore > 6)   { adj.denoise = 4; }

  // Sharpness & clarity
  if(noiseScore < 8)  { adj.sharpness = 6; adj.clarity = 7; }
  else                { adj.sharpness = 3; adj.clarity = 4; }

  // Analysis text
  const lines = [];
  if(avgL < 80)  lines.push("underexposed");
  if(avgL > 180) lines.push("overexposed");
  if(spread < 180) lines.push("low contrast");
  if(satRatio < 0.15) lines.push("desaturated colors");
  if(noiseScore > 10) lines.push("visible noise/grain");
  if(warmBias < -15) lines.push("cool color cast");
  if(warmBias > 25)  lines.push("warm color cast");

  const analysis = lines.length === 0
    ? "Photo looks well-balanced. Applied subtle sharpness and clarity boost."
    : `Detected: ${lines.join(", ")}. Adjustments applied automatically.`;

  return { adj, analysis };
}

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
  if(isHuge){if(filters.denoise>0)cssF+=` blur(${filters.denoise*0.06}px)`;if(filters.sharpness>0)cssF+=` contrast(${1+filters.sharpness*0.03})`;}
  ctx.filter=cssF;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(imgEl,0,0,W,H);ctx.filter="none";
  if(!isHuge){
    let data=ctx.getImageData(0,0,W,H).data;
    if(filters.denoise>0)data=gaussianBlur(data,W,H,filters.denoise*0.18);
    if(filters.smooth>0){const sm=gaussianBlur(data,W,H,filters.smooth*0.25);const op=filters.smooth/10*0.7;for(let i=0;i<data.length;i+=4){data[i]=data[i]*(1-op)+sm[i]*op;data[i+1]=data[i+1]*(1-op)+sm[i+1]*op;data[i+2]=data[i+2]*(1-op)+sm[i+2]*op;}}
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
  const [image,        setImage]        = useState(null);
  const [filters,      setFilters]      = useState(DEFAULT_STATE);
  const [activeTab,    setActiveTab]    = useState("edit");
  const [activeGroup,  setActiveGroup]  = useState("enhance");
  const [activeFilter, setActiveFilter] = useState(null);
  const [showBefore,   setShowBefore]   = useState(false);
  const [dragging,     setDragging]     = useState(false);
  const [autoMsg,      setAutoMsg]      = useState(null);
  const [autoLoading,  setAutoLoading]  = useState(false);
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
  const [bgStatus,     setBgStatus]     = useState("idle");
  const [bgProgress,   setBgProgress]   = useState(0);
  const [bgSubjectUrl, setBgSubjectUrl] = useState(null);
  const [bgMode,       setBgMode]       = useState("transparent");
  const [bgColor,      setBgColor]      = useState("#ffffff");
  const [bgBlur,       setBgBlur]       = useState(14);
  const [bgResult,     setBgResult]     = useState(null);

  const fileInputRef = useRef(null);
  const imgRef       = useRef(null);

  const loadImage = file=>{
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=e=>{setImage(e.target.result);setFilters(DEFAULT_STATE);setAutoMsg(null);setBgStatus("idle");setBgSubjectUrl(null);setBgResult(null);};
    reader.readAsDataURL(file);
  };

  useEffect(()=>{
    if(bgSubjectUrl&&bgStatus==="done") buildComposite(bgSubjectUrl,bgMode,bgColor,bgBlur);
  },[bgMode,bgColor,bgBlur,bgSubjectUrl]);

  // ── Smart Auto-Enhance ───────────────────────────────────────────────────
  const handleAutoEnhance = () => {
    const img = imgRef.current;
    if(!img) return;
    setAutoLoading(true);
    setAutoMsg(null);
    setTimeout(()=>{
      try {
        const {adj, analysis} = analyzeAndEnhance(img);
        setFilters({...DEFAULT_STATE,...adj});
        setAutoMsg(analysis);
      } catch(e) {
        setAutoMsg("Could not analyze — try a preset instead.");
      }
      setAutoLoading(false);
    }, 50);
  };

  // ── Background Removal ───────────────────────────────────────────────────
  const handleRemoveBg = async()=>{
    if(!image||bgStatus==="loading")return;
    setBgStatus("loading");setBgProgress(0);setBgSubjectUrl(null);setBgResult(null);
    try{
      const{removeBackground}=await import("@imgly/background-removal");
      const res=await fetch(image);
      const blob=await res.blob();
      const resultBlob=await removeBackground(blob,{progress:(key,cur,total)=>setBgProgress(Math.round(cur/total*100)),model:"medium"});
      const url=URL.createObjectURL(resultBlob);
      setBgSubjectUrl(url);setBgStatus("done");
      await buildComposite(url,bgMode,bgColor,bgBlur);
    }catch(e){console.error(e);setBgStatus("error");}
  };

  const buildComposite=async(subjectUrl,mode,color,blurPx)=>{
    const orig=imgRef.current;
    if(!orig||!subjectUrl)return;
    const W=orig.naturalWidth,H=orig.naturalHeight;
    const sub=new Image();sub.src=subjectUrl;
    await new Promise(r=>{sub.onload=r;if(sub.complete)r();});
    const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext("2d");
    if(mode==="transparent"){ctx.drawImage(sub,0,0,W,H);}
    else if(mode==="color"){ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.drawImage(sub,0,0,W,H);}
    else if(mode==="blur"){ctx.filter=`blur(${blurPx}px)`;ctx.drawImage(orig,-30,-30,W+60,H+60);ctx.filter="none";ctx.drawImage(sub,0,0,W,H);}
    setBgResult(canvas.toDataURL("image/png"));
  };

  const downloadBgResult=()=>{if(!bgResult)return;const a=document.createElement("a");a.download="photolab_bg.png";a.href=bgResult;a.click();};

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport=async()=>{
    if(!imgRef.current)return;
    setExporting(true);setExportDone(false);setExportInfo(null);
    try{
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
  const handleFbExport=async()=>{
    if(!imgRef.current)return;
    setFbExporting(true);setFbDone(false);
    try{
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

  // ── Render ───────────────────────────────────────────────────────────────
  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:"#f7f8fa",minHeight:"100vh",color:"#1a1a1a"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#f0f0f0}::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:2px}
        .sl{-webkit-appearance:none;appearance:none;width:100%;height:3px;border-radius:2px;outline:none;cursor:pointer;background:linear-gradient(to right,#6c63ff var(--v,50%),#e0e0e8 var(--v,50%))}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#6c63ff;border:2px solid #fff;box-shadow:0 1px 4px rgba(108,99,255,.4);cursor:grab;transition:transform .15s}
        .sl::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.3)}
        .btn{border:none;cursor:pointer;transition:all .18s;font-family:inherit;letter-spacing:0}
        .btn:hover{opacity:.88}.btn:active{transform:scale(.97)}
        .drop{border:2px dashed #d8d8e8;cursor:pointer;transition:all .25s;border-radius:16px}
        .drop:hover,.drop.on{border-color:#6c63ff;background:rgba(108,99,255,.03)}
        .pset{transition:all .18s;cursor:pointer;border:1.5px solid #e8e8f0;background:#fff;text-align:left;padding:10px 12px;border-radius:10px}
        .pset:hover{border-color:#6c63ff44;background:#faf9ff;transform:translateY(-1px);box-shadow:0 2px 8px rgba(108,99,255,.08)}
        .fmt{transition:all .18s;cursor:pointer;padding:11px 14px;border:1.5px solid #e8e8f0;background:#fff;text-align:left;border-radius:10px;width:100%}
        .fmt:hover{border-color:#6c63ff44}.fmt.on{border-color:#6c63ff;background:#faf9ff}
        .sc{transition:all .18s;cursor:pointer;padding:8px 4px;border:1.5px solid #e8e8f0;background:#fff;text-align:center;border-radius:8px;flex:1}
        .sc:hover{border-color:#6c63ff44}.sc.on{border-color:#6c63ff;background:#faf9ff}
        .tool-opt{width:100%;padding:11px 14px;margin-bottom:7px;border:1.5px solid #e8e8f0;background:#fff;border-radius:10px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .18s;font-family:inherit}
        .tool-opt:hover{border-color:#6c63ff44;transform:translateY(-1px)}.tool-opt.on{border-color:#6c63ff;background:#faf9ff}
        .checker{background-image:linear-gradient(45deg,#e0e0e0 25%,transparent 25%),linear-gradient(-45deg,#e0e0e0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e0e0e0 75%),linear-gradient(-45deg,transparent 75%,#e0e0e0 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}
        .tab-btn{padding:7px 18px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;transition:all .18s;border-radius:8px;letter-spacing:0}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
      `}</style>

      {/* ── Header ── */}
      <div style={{background:"#fff",borderBottom:"1px solid #eeeef4",padding:"0 24px",height:"58px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"32px",height:"32px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>✨</div>
          <div>
            <div style={{fontSize:"16px",fontWeight:700,color:"#1a1a2e",letterSpacing:"-.3px"}}>PHOTOlab</div>
            <div style={{fontSize:"10px",color:"#aaa",letterSpacing:".05em",marginTop:"-1px"}}>Enhance · Restore · Export</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{display:"flex",background:"#f2f2f8",borderRadius:"10px",padding:"3px",gap:"2px"}}>
            {["EDIT","TOOLS"].map(t=>(
              <button key={t} className="tab-btn" onClick={()=>setActiveTab(t.toLowerCase())}
                style={{background:activeTab===t.toLowerCase()?"#fff":"transparent",color:activeTab===t.toLowerCase()?"#6c63ff":"#888",boxShadow:activeTab===t.toLowerCase()?"0 1px 4px rgba(0,0,0,.1)":"none"}}>
                {t==="EDIT"?"✏️ Edit":"🛠 Tools"}
              </button>
            ))}
          </div>
          {image&&<>
            <button className="btn" onClick={()=>setFilters(DEFAULT_STATE)} style={{background:"#f2f2f8",color:"#666",padding:"7px 14px",borderRadius:"8px",fontSize:"13px",fontWeight:500}}>Reset</button>
            <button className="btn" onClick={()=>setShowExport(true)} style={{background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",padding:"7px 18px",borderRadius:"8px",fontSize:"13px",fontWeight:600,boxShadow:"0 2px 8px rgba(108,99,255,.3)"}}>↓ Export</button>
          </>}
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 58px)"}}>

        {/* ── Left Panel ── */}
        <div style={{width:"280px",borderRight:"1px solid #eeeef4",overflowY:"auto",padding:"18px 16px",flexShrink:0,display:"flex",flexDirection:"column",gap:"20px",background:"#fff"}}>

          {/* ══ TOOLS TAB ══ */}
          {activeTab==="tools"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              <div>
                <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"6px"}}>Background Removal</div>
                <div style={{fontSize:"12px",color:"#aaa",lineHeight:1.6,marginBottom:"12px"}}>AI runs in your browser — no uploads, completely private.</div>
                <button className="btn" onClick={handleRemoveBg} disabled={!image||bgStatus==="loading"}
                  style={{width:"100%",padding:"12px",background:bgStatus==="done"?"#f0fff4":image?"linear-gradient(135deg,#6c63ff,#a78bfa)":"#f2f2f8",color:bgStatus==="done"?"#22c55e":image?"#fff":"#bbb",fontSize:"13px",fontWeight:600,borderRadius:"10px",boxShadow:image&&bgStatus!=="done"?"0 2px 8px rgba(108,99,255,.25)":"none",marginBottom:"8px"}}>
                  {bgStatus==="loading"
                    ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                        <span style={{display:"inline-block",width:"12px",height:"12px",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                        Processing... {bgProgress}%
                      </span>
                    : bgStatus==="done"?"✓ Done — Remove Again":"✂ Remove Background"}
                </button>
                {bgStatus==="loading"&&(
                  <div style={{height:"4px",background:"#f0f0f8",borderRadius:"2px",marginBottom:"10px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${bgProgress}%`,background:"linear-gradient(90deg,#6c63ff,#a78bfa)",transition:"width .3s",borderRadius:"2px"}}/>
                  </div>
                )}
                {bgStatus==="error"&&<div style={{fontSize:"12px",color:"#ef4444",marginBottom:"8px"}}>⚠ Failed. Try a JPG or PNG.</div>}
                {!image&&<div style={{fontSize:"12px",color:"#bbb",textAlign:"center",padding:"20px",border:"2px dashed #eee",borderRadius:"10px"}}>Upload a photo first</div>}
              </div>

              {bgStatus==="done"&&bgSubjectUrl&&(
                <div style={{animation:"fadein .3s ease"}}>
                  <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"10px"}}>Background Style</div>
                  {[{id:"transparent",label:"Transparent",icon:"◻",desc:"PNG with no background"},{id:"color",label:"Solid Color",icon:"🎨",desc:"Choose any color"},{id:"blur",label:"Blur Original",icon:"✦",desc:"Bokeh blur effect"}].map(opt=>(
                    <button key={opt.id} className={`tool-opt ${bgMode===opt.id?"on":""}`} onClick={()=>setBgMode(opt.id)}>
                      <span style={{fontSize:"18px"}}>{opt.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:"13px",fontWeight:600,color:bgMode===opt.id?"#6c63ff":"#333"}}>{opt.label}</div>
                        <div style={{fontSize:"11px",color:"#aaa",marginTop:"1px"}}>{opt.desc}</div>
                      </div>
                      {bgMode===opt.id&&<span style={{color:"#6c63ff",fontSize:"16px"}}>✓</span>}
                    </button>
                  ))}
                  {bgMode==="color"&&(
                    <div style={{padding:"14px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",marginBottom:"8px"}}>
                      <div style={{fontSize:"11px",fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"10px"}}>Pick Color</div>
                      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"10px"}}>
                        {BG_COLORS.map(c=>(
                          <div key={c} onClick={()=>setBgColor(c)} style={{width:"26px",height:"26px",borderRadius:"6px",background:c,border:`2.5px solid ${bgColor===c?"#6c63ff":"#ddd"}`,cursor:"pointer",transition:"border .15s",boxShadow:"0 1px 3px rgba(0,0,0,.1)"}}/>
                        ))}
                      </div>
                      <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{width:"100%",height:"34px",border:"1.5px solid #e8e8f0",borderRadius:"8px",background:"#fff",cursor:"pointer"}}/>
                    </div>
                  )}
                  {bgMode==="blur"&&(
                    <div style={{padding:"14px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",marginBottom:"8px"}}>
                      <div style={{fontSize:"11px",fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"8px",display:"flex",justifyContent:"space-between"}}>
                        <span>Blur Amount</span><span style={{color:"#6c63ff"}}>{bgBlur}px</span>
                      </div>
                      <input type="range" className="sl" min={2} max={40} step={1} value={bgBlur} style={{"--v":`${((bgBlur-2)/38)*100}%`}} onChange={e=>setBgBlur(parseInt(e.target.value))}/>
                    </div>
                  )}
                  {bgResult&&(
                    <div style={{marginTop:"4px"}}>
                      <div style={{position:"relative",borderRadius:"10px",overflow:"hidden",marginBottom:"10px",border:"1.5px solid #eee"}}>
                        {bgMode==="transparent"&&<div className="checker" style={{position:"absolute",inset:0}}/>}
                        <img src={bgResult} alt="result" style={{width:"100%",display:"block",position:"relative"}}/>
                      </div>
                      <button className="btn" onClick={downloadBgResult} style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontSize:"13px",fontWeight:600,borderRadius:"10px",boxShadow:"0 2px 8px rgba(108,99,255,.25)"}}>
                        ↓ Download PNG
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ EDIT TAB ══ */}
          {activeTab==="edit"&&(<>

            {/* Smart Auto-Enhance — no API, no rate limits */}
            {image&&(
              <div>
                <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"8px"}}>Auto Enhance</div>
                <button className="btn" onClick={handleAutoEnhance} disabled={autoLoading}
                  style={{width:"100%",padding:"13px",background:autoLoading?"#f2f2f8":"linear-gradient(135deg,#6c63ff,#a78bfa)",color:autoLoading?"#aaa":"#fff",fontSize:"13px",fontWeight:600,borderRadius:"10px",boxShadow:autoLoading?"none":"0 2px 10px rgba(108,99,255,.3)",marginBottom:"8px"}}>
                  {autoLoading
                    ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                        <span style={{display:"inline-block",width:"12px",height:"12px",border:"2px solid #ddd",borderTopColor:"#6c63ff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                        Analysing...
                      </span>
                    : "✨ Smart Auto-Enhance"}
                </button>
                {autoMsg&&(
                  <div style={{padding:"10px 12px",background:"#f0f0ff",border:"1.5px solid #d8d4ff",borderRadius:"8px",animation:"fadein .3s ease"}}>
                    <div style={{fontSize:"11px",color:"#6c63ff",fontWeight:600,marginBottom:"3px"}}>Analysis complete</div>
                    <div style={{fontSize:"11px",color:"#555",lineHeight:1.5}}>{autoMsg}</div>
                  </div>
                )}
              </div>
            )}

            {/* Presets */}
            <div>
              <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"8px"}}>Presets</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px"}}>
                {PRESETS.map(p=>(
                  <button key={p.name} className="pset" onClick={()=>setFilters({...DEFAULT_STATE,...p.values})}>
                    <div style={{fontSize:"18px",marginBottom:"4px"}}>{p.icon}</div>
                    <div style={{fontSize:"11px",fontWeight:600,color:"#444",lineHeight:1.3}}>{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div>
              <div style={{display:"flex",gap:"3px",marginBottom:"14px",background:"#f2f2f8",padding:"3px",borderRadius:"10px"}}>
                {GROUPS.map(g=>(
                  <button key={g.key} className="btn" onClick={()=>setActiveGroup(g.key)}
                    style={{flex:1,padding:"6px 4px",fontSize:"12px",fontWeight:500,background:activeGroup===g.key?"#fff":"transparent",color:activeGroup===g.key?"#6c63ff":"#999",borderRadius:"8px",boxShadow:activeGroup===g.key?"0 1px 4px rgba(0,0,0,.08)":"none"}}>
                    {g.label}
                  </button>
                ))}
              </div>
              {FILTERS.filter(f=>f.group===activeGroup).map(f=>{
                const val=filters[f.key];
                const pct=((val-f.min)/(f.max-f.min))*100;
                const changed=val!==f.default;
                return(
                  <div key={f.key} style={{marginBottom:"18px"}} onMouseEnter={()=>setActiveFilter(f.key)} onMouseLeave={()=>setActiveFilter(null)}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                      <span style={{fontSize:"12px",fontWeight:500,color:changed?"#6c63ff":"#666"}}>{f.label}</span>
                      <span style={{fontSize:"12px",color:activeFilter===f.key?"#6c63ff":"#bbb",fontVariantNumeric:"tabular-nums"}}>
                        {val>0&&f.default===0?"+":""}{Number.isInteger(val)?val:val.toFixed(1)}{f.unit}
                      </span>
                    </div>
                    <input type="range" className="sl" min={f.min} max={f.max} step={f.max<=20?.5:1}
                      value={val} style={{"--v":`${pct}%`}} onChange={e=>setFilters(p=>({...p,[f.key]:parseFloat(e.target.value)}))}/>
                  </div>
                );
              })}
            </div>

            {isEdited&&(
              <div style={{fontSize:"11px",color:"#bbb",textAlign:"center",paddingTop:"4px",borderTop:"1px solid #f0f0f4"}}>
                {Object.entries(filters).filter(([k,v])=>v!==DEFAULT_STATE[k]).length} adjustments active
              </div>
            )}
          </>)}
        </div>

        {/* ── Preview ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px",background:"#f7f8fa",position:"relative",overflow:"hidden"}}>
          {!image?(
            <div className={`drop ${dragging?"on":""}`}
              style={{width:"100%",maxWidth:"500px",aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,.06)"}}
              onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);loadImage(e.dataTransfer.files[0]);}}
              onClick={()=>fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadImage(e.target.files[0])}/>
              <div style={{fontSize:"48px",marginBottom:"16px",animation:"pulse 2s infinite"}}>🖼</div>
              <div style={{fontSize:"16px",fontWeight:600,color:"#555",marginBottom:"6px"}}>Drop your photo here</div>
              <div style={{fontSize:"13px",color:"#bbb",marginBottom:"20px"}}>or click to browse</div>
              <div style={{display:"flex",gap:"8px"}}>
                {["JPG","PNG","WEBP","HEIC"].map(x=>(
                  <span key={x} style={{padding:"3px 10px",background:"#f2f2f8",borderRadius:"20px",fontSize:"11px",fontWeight:500,color:"#999"}}>{x}</span>
                ))}
              </div>
            </div>
          ):(
            <>
              {activeTab==="edit"&&(
                <div style={{position:"absolute",top:"18px",right:"18px",display:"flex",background:"#fff",border:"1.5px solid #eee",zIndex:10,borderRadius:"10px",padding:"3px",gap:"2px",boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
                  {["After","Before"].map(label=>(
                    <button key={label} className="btn" onClick={()=>setShowBefore(label==="Before")}
                      style={{padding:"5px 14px",fontSize:"12px",fontWeight:500,background:(label==="Before")===showBefore?"linear-gradient(135deg,#6c63ff,#a78bfa)":"transparent",color:(label==="Before")===showBefore?"#fff":"#999",borderRadius:"7px"}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {activeTab==="tools"&&bgStatus==="done"&&(
                <div style={{position:"absolute",top:"18px",right:"18px",padding:"5px 12px",background:"#f0fff4",border:"1.5px solid #86efac",borderRadius:"20px",fontSize:"12px",fontWeight:600,color:"#16a34a",zIndex:10}}>
                  ✓ Background Removed
                </div>
              )}
              {isEdited&&!showBefore&&activeTab==="edit"&&(
                <div style={{position:"absolute",top:"18px",left:"18px",padding:"5px 12px",background:"#f0f0ff",border:"1.5px solid #c4b5fd",borderRadius:"20px",fontSize:"12px",fontWeight:600,color:"#6c63ff",zIndex:10}}>
                  ✨ Edited
                </div>
              )}

              <div style={{position:"relative",maxWidth:"100%",maxHeight:"calc(100vh - 160px)",lineHeight:0,borderRadius:"12px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.12)"}}>
                {activeTab==="tools"&&bgResult?(
                  <>
                    {bgMode==="transparent"&&<div className="checker" style={{position:"absolute",inset:0}}/>}
                    <img src={bgResult} alt="result" style={{maxWidth:"100%",maxHeight:"calc(100vh - 160px)",objectFit:"contain",display:"block",position:"relative"}}/>
                  </>
                ):(
                  <>
                    <img ref={imgRef} src={image} alt="photo"
                      style={{maxWidth:"100%",maxHeight:"calc(100vh - 160px)",objectFit:"contain",display:"block",
                        filter:showBefore||activeTab==="tools"?"none":cssFilter,transition:"filter .1s ease"}}/>
                    {!showBefore&&activeTab==="edit"&&filters.temperature!==0&&(
                      <div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none"}}/>
                    )}
                    {!showBefore&&activeTab==="edit"&&filters.fade>0&&(
                      <div style={{position:"absolute",inset:0,background:`rgba(255,255,255,${filters.fade/180})`,mixBlendMode:"screen",pointerEvents:"none"}}/>
                    )}
                    {!showBefore&&activeTab==="edit"&&filters.vignette>0&&(
                      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none"}}/>
                    )}
                  </>
                )}
              </div>

              <div style={{position:"absolute",bottom:"18px"}}>
                <button className="btn" onClick={()=>{setImage(null);setAutoMsg(null);setBgStatus("idle");setBgSubjectUrl(null);setBgResult(null);}}
                  style={{background:"#fff",color:"#999",padding:"7px 16px",border:"1.5px solid #eee",borderRadius:"8px",fontSize:"12px",fontWeight:500,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                  ← New Photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Export Modal ── */}
      {showExport&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowExport(false);}}>
          <div style={{background:"#fff",borderRadius:"16px",width:"480px",maxHeight:"90vh",overflowY:"auto",padding:"28px",boxShadow:"0 20px 60px rgba(0,0,0,.2)",animation:"slideup .25s ease"}}>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"22px"}}>
              <div>
                <div style={{fontSize:"20px",fontWeight:700,color:"#1a1a2e",marginBottom:"3px"}}>Export Photo</div>
                <div style={{fontSize:"12px",color:"#aaa"}}>Pixel-perfect · Up to 12K · Facebook optimized</div>
              </div>
              <button className="btn" onClick={()=>setShowExport(false)} style={{background:"#f2f2f8",color:"#888",width:"32px",height:"32px",borderRadius:"8px",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            <div style={{display:"flex",gap:"3px",marginBottom:"22px",background:"#f2f2f8",padding:"3px",borderRadius:"10px"}}>
              <button className="btn" onClick={()=>setExportTab("standard")}
                style={{flex:1,padding:"9px",fontSize:"13px",fontWeight:500,background:exportTab==="standard"?"#fff":"transparent",color:exportTab==="standard"?"#6c63ff":"#999",borderRadius:"8px",boxShadow:exportTab==="standard"?"0 1px 4px rgba(0,0,0,.08)":"none"}}>
                Standard
              </button>
              <button className="btn" onClick={()=>setExportTab("facebook")}
                style={{flex:1,padding:"9px",fontSize:"13px",fontWeight:500,background:exportTab==="facebook"?"#1877f2":"transparent",color:exportTab==="facebook"?"#fff":"#999",borderRadius:"8px",boxShadow:exportTab==="facebook"?"0 1px 4px rgba(24,119,242,.3)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
            </div>

            {exportTab==="standard"&&(<>
              <div style={{marginBottom:"18px"}}>
                <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"10px"}}>Format</div>
                <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                  {EXPORT_FORMATS.map(f=>(
                    <button key={f.id} className={`fmt ${exportFormat===f.id?"on":""}`} onClick={()=>setExportFormat(f.id)}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <span style={{fontSize:"13px",fontWeight:600,color:exportFormat===f.id?"#6c63ff":"#444"}}>{f.label}</span>
                          <span style={{fontSize:"11px",color:"#bbb",marginLeft:"10px"}}>{f.desc}</span>
                        </div>
                        {exportFormat===f.id&&<span style={{color:"#6c63ff",fontSize:"16px"}}>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {exportFormat!=="png"&&(
                <div style={{marginBottom:"18px"}}>
                  <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"8px",display:"flex",justifyContent:"space-between"}}>
                    <span>Quality</span><span style={{color:"#6c63ff"}}>{exportQuality}%</span>
                  </div>
                  <input type="range" className="sl" min={60} max={100} step={1} value={exportQuality}
                    style={{"--v":`${((exportQuality-60)/40)*100}%`}} onChange={e=>setExportQuality(parseInt(e.target.value))}/>
                </div>
              )}
              <div style={{marginBottom:"22px"}}>
                <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"10px"}}>Resolution</div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {SCALE_OPTIONS.map(s=>{
                    const pro=s.value==="8k"||s.value==="12k";
                    return(
                      <button key={s.value} className={`sc ${exportScale===s.value?"on":""}`} onClick={()=>setExportScale(s.value)} style={{minWidth:"64px"}}>
                        <div style={{fontSize:"15px",fontWeight:700,color:exportScale===s.value?"#6c63ff":pro?"#c4b5fd":"#666",marginBottom:"2px"}}>{s.label}</div>
                        <div style={{fontSize:"9px",color:"#bbb"}}>{s.desc}</div>
                        {pro&&<div style={{fontSize:"9px",color:"#a78bfa",marginTop:"1px",fontWeight:600}}>PRO</div>}
                      </button>
                    );
                  })}
                </div>
                {natW>0&&(
                  <div style={{marginTop:"10px",padding:"10px 14px",background:"#f8f8fd",borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:"12px",color:"#aaa"}}>Output size</span>
                    <span style={{fontSize:"13px",fontWeight:600,color:"#6c63ff"}}>{previewW.toLocaleString()} × {previewH.toLocaleString()}px</span>
                  </div>
                )}
              </div>
              <button className="btn" onClick={handleExport} disabled={exporting}
                style={{width:"100%",padding:"14px",background:exportDone?"#f0fff4":"linear-gradient(135deg,#6c63ff,#a78bfa)",color:exportDone?"#16a34a":"#fff",fontSize:"14px",fontWeight:700,borderRadius:"12px",boxShadow:exportDone?"none":"0 4px 14px rgba(108,99,255,.35)"}}>
                {exporting
                  ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}><span style={{display:"inline-block",width:"14px",height:"14px",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Processing...</span>
                  : exportDone?`✓ Saved — ${exportInfo||""}`:`↓ Export ${EXPORT_FORMATS.find(f=>f.id===exportFormat)?.label} · ${exportScale.toString().toUpperCase()}`}
              </button>
            </>)}

            {exportTab==="facebook"&&(<>
              <div style={{marginBottom:"18px",padding:"14px",background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:"10px"}}>
                <div style={{fontSize:"12px",fontWeight:600,color:"#1d4ed8",marginBottom:"6px"}}>Why this matters</div>
                <div style={{fontSize:"12px",color:"#3b82f6",lineHeight:1.6}}>Facebook compresses photos that are the wrong size. These presets use exact dimensions, JPEG 75%, and sRGB to prevent their compression algorithm from ruining your photo.</div>
              </div>
              <div style={{marginBottom:"18px"}}>
                <div style={{fontSize:"11px",fontWeight:600,color:"#888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:"10px"}}>Post Type</div>
                {FB_MODES.map(mode=>(
                  <button key={mode.id} onClick={()=>setFbMode(mode.id)}
                    style={{width:"100%",padding:"13px 14px",border:`1.5px solid ${fbMode===mode.id?"#1877f2":"#eee"}`,background:fbMode===mode.id?"#eff6ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",marginBottom:"7px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:"13px",fontWeight:600,color:fbMode===mode.id?"#1877f2":"#444",marginBottom:"2px"}}>{mode.label}</div>
                      <div style={{fontSize:"12px",color:fbMode===mode.id?"#3b82f6":"#aaa"}}>{mode.desc}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px"}}>
                      {fbMode===mode.id&&<span style={{color:"#1877f2",fontSize:"18px"}}>✓</span>}
                      <span style={{fontSize:"10px",color:"#bbb",background:"#f2f2f8",padding:"2px 7px",borderRadius:"4px",fontWeight:500}}>JPEG 75%</span>
                    </div>
                  </button>
                ))}
              </div>
              <button className="btn" onClick={handleFbExport} disabled={fbExporting}
                style={{width:"100%",padding:"14px",background:fbDone?"#f0fff4":fbExporting?"#e0edff":"#1877f2",color:fbDone?"#16a34a":"#fff",fontSize:"14px",fontWeight:700,borderRadius:"12px",boxShadow:fbDone||fbExporting?"none":"0 4px 14px rgba(24,119,242,.35)",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
                {fbExporting
                  ? <><span style={{display:"inline-block",width:"14px",height:"14px",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Optimising for Facebook...</>
                  : fbDone?`✓ Saved — ${exportInfo||""}`
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>Export for Facebook · {FB_MODES.find(m=>m.id===fbMode)?.desc}</>}
              </button>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
