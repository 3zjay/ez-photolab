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
    // tint approximated via sepia + hue
    const tintSign = f.tint > 0 ? 120 : 300; // green vs magenta
    const tintAmt  = Math.abs(f.tint)/400;
    s += ` sepia(${tintAmt.toFixed(3)}) hue-rotate(${tintSign}deg) sepia(0)`;
  }
  return s;
}

// ── Transform CSS ─────────────────────────────────────────────────────────────
function toTransformCSS(rotation, flipH, flipV) {
  return `rotate(${rotation}deg) scaleX(${flipH?-1:1}) scaleY(${flipV?-1:1})`;
}

// ── Save helper ───────────────────────────────────────────────────────────────
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

// ── Final export render ───────────────────────────────────────────────────────
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
  // Warmth overlay
  if(filters.temperature!==0){const a=Math.abs(filters.temperature)/300;ctx.globalCompositeOperation="overlay";ctx.fillStyle=filters.temperature>0?`rgba(255,140,0,${a})`:`rgba(100,149,237,${a})`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  // Fade
  if(filters.fade>0){ctx.globalCompositeOperation="screen";ctx.fillStyle=`rgba(255,255,255,${filters.fade/180})`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  // Vignette
  if(filters.vignette>0){const g=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.85);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(0,0,0,${filters.vignette/100})`);ctx.globalCompositeOperation="multiply";ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="source-over";}
  // Grain
  if(filters.grain>0){
    const grainCanvas=document.createElement("canvas"); grainCanvas.width=W; grainCanvas.height=H;
    const gc=grainCanvas.getContext("2d"); const id=gc.createImageData(W,H); const d=id.data;
    for(let i=0;i<d.length;i+=4){const v=(Math.random()-0.5)*filters.grain*2.5;d[i]=d[i+1]=d[i+2]=128+v;d[i+3]=255;}
    gc.putImageData(id,0,0);
    ctx.globalCompositeOperation="overlay"; ctx.globalAlpha=0.35;
    ctx.drawImage(grainCanvas,0,0); ctx.globalCompositeOperation="source-over"; ctx.globalAlpha=1;
  }
  // Text overlays
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
  // transform
  const [rotation,    setRotation]   = useState(0);
  const [flipH,       setFlipH]      = useState(false);
  const [flipV,       setFlipV]      = useState(false);
  // crop
  const [cropMode,    setCropMode]   = useState(false);
  const [cropBox,     setCropBox]    = useState({x:0,y:0,w:100,h:100}); // %
  const [cropAspect,  setCropAspect] = useState("free");
  // text
  const [texts,       setTexts]      = useState([]);
  const [selText,     setSelText]    = useState(null);
  const [draggingTxt, setDraggingTxt]= useState(null);
  // ui
  const [activeTab,   setActiveTab]  = useState("edit");
  const [filterGroup, setFilterGroup]= useState("basic");
  const [showBefore,  setShowBefore] = useState(false);
  const [splitPos,    setSplitPos]   = useState(50);
  const [isDragSplit, setIsDragSplit]= useState(false);
  const [dragging,    setDragging]   = useState(false);
  const [isMobile,    setIsMobile]   = useState(false);
  // export
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
  // bg removal
  const [bgStatus,    setBgStatus]   = useState("idle");
  const [bgProgress,  setBgProgress] = useState(0);
  const [bgSubUrl,    setBgSubUrl]   = useState(null);
  const [bgMode,      setBgMode]     = useState("transparent");
  const [bgColor,     setBgColor]    = useState("#ffffff");
  const [bgBlur,      setBgBlur]     = useState(14);
  const [bgResult,    setBgResult]   = useState(null);

  const fileInputRef = useRef(null);
  const imgRef       = useRef(null);
  const splitRef     = useRef(null);
  const previewRef   = useRef(null);

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    check(); window.addEventListener("resize",check);
    return()=>window.removeEventListener("resize",check);
  },[]);

  useEffect(()=>{
    if(bgSubUrl&&bgStatus==="done") buildBgComposite(bgSubUrl,bgMode,bgColor,bgBlur);
  },[bgMode,bgColor,bgBlur,bgSubUrl]);

  // Split drag
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

  // ── Crop helpers ──────────────────────────────────────────────────────────
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

  // ── Text helpers ──────────────────────────────────────────────────────────
  const addText=()=>{
    const id=Date.now();
    setTexts(p=>[...p,{id,content:"Tap to edit",x:50,y:50,fontSize:48,color:"#ffffff",font:"System",bold:false,italic:false,stroke:true}]);
    setSelText(id);
  };
  const updateText=(id,key,val)=>setTexts(p=>p.map(t=>t.id===id?{...t,[key]:val}:t));
  const deleteText=id=>{setTexts(p=>p.filter(t=>t.id!==id));setSelText(null);};
  const selectedText=texts.find(t=>t.id===selText);

  // ── BG removal ────────────────────────────────────────────────────────────
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

  // ── Export ────────────────────────────────────────────────────────────────
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

  // ── PANEL ─────────────────────────────────────────────────────────────────
  const Panel=({inline=false})=>(
    <div style={{display:"flex",flexDirection:"column",gap:"16px",padding:inline?"10px 14px 40px":"14px"}}>

      {/* TOOLS */}
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
                  style={{width:"100%",padding:"10px 12px",marginBottom:"6px",border:`1.5px solid ${bgMode===o.id?"#6c63ff":"#e8e8f0"}`,background:bgMode===o.id?"#faf9ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",transition:"all .18s",fontFamily:"inherit"}}>
                  <span style={{fontSize:"15px"}}>{o.i}</span>
                  <span style={{fontSize:"13px",fontWeight:600,color:bgMode===o.id?"#6c63ff":"#444"}}>{o.l}</span>
                  {bgMode===o.id&&<span style={{marginLeft:"auto",color:"#6c63ff"}}>✓</span>}
                </button>
              ))}
              {bgMode==="color"&&(
                <div style={{padding:"12px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",marginBottom:"8px"}}>
                  <div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginBottom:"10px"}}>
                    {BG_COLORS.map(c=><div key={c} onClick={()=>setBgColor(c)} style={{width:"26px",height:"26px",borderRadius:"6px",background:c,border:`2.5px solid ${bgColor===c?"#6c63ff":"#ddd"}`,cursor:"pointer",flexShrink:0}}/>)}
                  </div>
                  <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{width:"100%",height:"32px",border:"1.5px solid #e8e8f0",borderRadius:"8px",cursor:"pointer"}}/>
                </div>
              )}
              {bgMode==="blur"&&(
                <div style={{padding:"12px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",marginBottom:"8px"}}>
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
          {/* AI placeholder — fal.ai coming soon */}
          <div style={{padding:"14px",background:"linear-gradient(135deg,#f3e8ff,#ede9fe)",border:"1.5px solid #c4b5fd",borderRadius:"12px"}}>
            <div style={{fontSize:"13px",fontWeight:700,color:"#7c3aed",marginBottom:"4px"}}>🪄 AI Features — Coming Soon</div>
            <div style={{fontSize:"11px",color:"#9d6fb5",lineHeight:1.6,marginBottom:"10px"}}>AI Beauty, AI Enhance, Object Removal powered by fal.ai. Users bring their own free key.</div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {["✨ AI Beauty","🔍 AI Enhance","🧹 Remove Object","⬆️ AI Upscale"].map(f=>(
                <span key={f} style={{padding:"4px 10px",background:"rgba(124,58,237,.1)",borderRadius:"20px",fontSize:"11px",fontWeight:600,color:"#7c3aed"}}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADJUST */}
      {activeTab==="adjust"&&(<>
        {!image&&<Empty>Upload a photo first</Empty>}
        {image&&(<>
          {/* Rotate */}
          <div>
            <SL>Rotate & Flip</SL>
            <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
              {[{l:"↺ -90°",a:()=>setRotation(r=>(r-90+360)%360)},{l:"↻ +90°",a:()=>setRotation(r=>(r+90)%360)},{l:"↔ Flip H",a:()=>setFlipH(v=>!v),active:flipH},{l:"↕ Flip V",a:()=>setFlipV(v=>!v),active:flipV}].map(b=>(
                <button key={b.l} onClick={b.a}
                  style={{flex:1,padding:"9px 4px",border:`1.5px solid ${b.active?"#6c63ff":"#e8e8f0"}`,background:b.active?"#faf9ff":"#fff",borderRadius:"9px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:b.active?"#6c63ff":"#555",fontFamily:"inherit"}}>
                  {b.l}
                </button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
              <span style={{fontSize:"13px",fontWeight:500,color:rotation!==0?"#6c63ff":"#666"}}>Fine Rotate</span>
              <span style={{fontSize:"12px",color:"#bbb"}}>{rotation}°</span>
            </div>
            <input type="range" className="sl" min={-180} max={180} step={1} value={rotation} style={{"--v":`${((rotation+180)/360)*100}%`}} onChange={e=>setRotation(+e.target.value)}/>
            {rotation!==0&&<button onClick={()=>setRotation(0)} style={{marginTop:"6px",fontSize:"11px",color:"#6c63ff",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Reset rotation</button>}
          </div>

          {/* Crop */}
          <div>
            <SL>Crop</SL>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"10px"}}>
              {["free","1:1","4:3","16:9","9:16","3:4"].map(r=>(
                <button key={r} onClick={()=>{setCropAspectRatio(r);setCropMode(true);}}
                  style={{padding:"7px 10px",border:`1.5px solid ${cropAspect===r&&cropMode?"#6c63ff":"#e8e8f0"}`,background:cropAspect===r&&cropMode?"#faf9ff":"#fff",borderRadius:"8px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:cropAspect===r&&cropMode?"#6c63ff":"#555",fontFamily:"inherit"}}>
                  {r==="free"?"✦ Free":r}
                </button>
              ))}
            </div>
            {cropMode&&(
              <div style={{display:"flex",gap:"8px"}}>
                <AB onClick={applyCrop} color="purple" textColor="#fff" style={{flex:1,padding:"10px"}}>✓ Apply Crop</AB>
                <AB onClick={()=>{setCropMode(false);setCropBox({x:0,y:0,w:100,h:100});setCropAspect("free");}} color="#f2f2f8" textColor="#666" style={{flex:1,padding:"10px"}}>Cancel</AB>
              </div>
            )}
            {!cropMode&&<p style={{fontSize:"11px",color:"#bbb",lineHeight:1.5}}>Select a ratio above to enter crop mode. Drag the handles on the image to adjust.</p>}
          </div>
        </>)}
      </>)}

      {/* OVERLAY */}
      {activeTab==="overlay"&&(<>
        {!image&&<Empty>Upload a photo first</Empty>}
        {image&&(<>
          {/* Text */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <SL>Text Overlays</SL>
              <button onClick={addText} style={{padding:"6px 12px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>+ Add Text</button>
            </div>
            {texts.length===0&&<Empty>Tap "+ Add Text" to add text to your photo</Empty>}
            {texts.map(t=>(
              <div key={t.id} onClick={()=>setSelText(t.id)}
                style={{padding:"10px 12px",border:`1.5px solid ${selText===t.id?"#6c63ff":"#e8e8f0"}`,background:selText===t.id?"#faf9ff":"#fff",borderRadius:"10px",marginBottom:"7px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"13px",fontWeight:500,color:"#444",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.content}</span>
                  <button onClick={e=>{e.stopPropagation();deleteText(t.id);}} style={{background:"#fee2e2",border:"none",borderRadius:"6px",padding:"3px 7px",fontSize:"11px",color:"#ef4444",cursor:"pointer",fontWeight:600}}>✕</button>
                </div>
              </div>
            ))}
            {selectedText&&(
              <div style={{padding:"14px",background:"#f8f8fd",border:"1.5px solid #e8e8f0",borderRadius:"10px",animation:"fadein .2s",marginTop:"4px"}}>
                <div style={{marginBottom:"10px"}}>
                  <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:"5px"}}>Text</span>
                  <input value={selectedText.content} onChange={e=>updateText(selText,"content",e.target.value)}
                    style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e8e8f0",borderRadius:"8px",fontSize:"13px",fontFamily:"inherit",outline:"none"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                  <div>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:"5px"}}>Font</span>
                    <select value={selectedText.font} onChange={e=>updateText(selText,"font",e.target.value)}
                      style={{width:"100%",padding:"7px 8px",border:"1.5px solid #e8e8f0",borderRadius:"8px",fontSize:"12px",fontFamily:"inherit",outline:"none",background:"#fff"}}>
                      {FONTS.map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:"5px"}}>Color</span>
                    <input type="color" value={selectedText.color} onChange={e=>updateText(selText,"color",e.target.value)}
                      style={{width:"100%",height:"34px",border:"1.5px solid #e8e8f0",borderRadius:"8px",cursor:"pointer"}}/>
                  </div>
                </div>
                <div style={{marginBottom:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em"}}>Size</span>
                    <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:600}}>{selectedText.fontSize}px</span>
                  </div>
                  <input type="range" className="sl" min={12} max={200} step={2} value={selectedText.fontSize}
                    style={{"--v":`${((selectedText.fontSize-12)/188)*100}%`}} onChange={e=>updateText(selText,"fontSize",+e.target.value)}/>
                </div>
                <div style={{marginBottom:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"11px",fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em"}}>Position Y</span>
                    <span style={{fontSize:"12px",color:"#6c63ff",fontWeight:600}}>{selectedText.y}%</span>
                  </div>
                  <input type="range" className="sl" min={5} max={95} step={1} value={selectedText.y}
                    style={{"--v":`${((selectedText.y-5)/90)*100}%`}} onChange={e=>updateText(selText,"y",+e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  {[{k:"bold",l:"Bold"},{k:"italic",l:"Italic"},{k:"stroke",l:"Outline"}].map(o=>(
                    <button key={o.k} onClick={()=>updateText(selText,o.k,!selectedText[o.k])}
                      style={{flex:1,padding:"7px",border:`1.5px solid ${selectedText[o.k]?"#6c63ff":"#e8e8f0"}`,background:selectedText[o.k]?"#faf9ff":"#fff",borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer",color:selectedText[o.k]?"#6c63ff":"#777",fontFamily:"inherit"}}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>)}
      </>)}

      {/* EDIT */}
      {activeTab==="edit"&&(<>
        <div>
          <SL>Presets</SL>
          <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"4px"}}>
            {PRESETS.map(p=>(
              <button key={p.name} onClick={()=>setFilters({...DEFAULT_FILTERS,...p.values})}
                style={{flexShrink:0,padding:"8px 12px",border:"1.5px solid #e8e8f0",background:"#fff",borderRadius:"10px",textAlign:"center",cursor:"pointer",transition:"all .18s",fontFamily:"inherit",minWidth:"70px"}}>
                <div style={{fontSize:"18px",marginBottom:"2px"}}>{p.icon}</div>
                <div style={{fontSize:"10px",fontWeight:600,color:"#666"}}>{p.name}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{display:"flex",gap:"2px",marginBottom:"14px",background:"#f2f2f8",padding:"3px",borderRadius:"10px",overflowX:"auto"}}>
            {FILTER_GROUPS.map(g=>(
              <button key={g.key} onClick={()=>setFilterGroup(g.key)}
                style={{flex:"1 0 auto",padding:"6px 8px",fontSize:"11px",fontWeight:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:filterGroup===g.key?"#fff":"transparent",color:filterGroup===g.key?"#6c63ff":"#999",borderRadius:"8px",boxShadow:filterGroup===g.key?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .18s",whiteSpace:"nowrap"}}>
                {g.label}
              </button>
            ))}
          </div>
          {COLOR_FILTERS.filter(f=>f.group===filterGroup).map(f=>{
            const val=filters[f.key]; const pct=((val-f.min)/(f.max-f.min))*100; const changed=val!==f.default;
            return(
              <div key={f.key} style={{marginBottom:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"13px",fontWeight:500,color:changed?"#6c63ff":"#666"}}>{f.label}</span>
                  <span style={{fontSize:"12px",color:"#bbb",fontVariantNumeric:"tabular-nums"}}>{val>0&&f.default===0?"+":""}{Number.isInteger(val)?val:val.toFixed(1)}{f.unit}</span>
                </div>
                <input type="range" className="sl" min={f.min} max={f.max} step={f.max<=20?.5:1} value={val}
                  style={{"--v":`${pct}%`}} onChange={e=>setFilters(p=>({...p,[f.key]:parseFloat(e.target.value)}))}/>
              </div>
            );
          })}
        </div>
        {isEdited&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"4px",borderTop:"1px solid #f0f0f4"}}>
            <span style={{fontSize:"11px",color:"#bbb"}}>{Object.entries(filters).filter(([k,v])=>v!==DEFAULT_FILTERS[k]).length + (rotation!==0?1:0) + (flipH?1:0) + (flipV?1:0)} adjustments</span>
            <button onClick={resetAll} style={{fontSize:"11px",color:"#6c63ff",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Reset all</button>
          </div>
        )}
      </>)}
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",background:"#f7f8fa",minHeight:"100vh",color:"#1a1a1a",WebkitTapHighlightColor:"transparent"}}>
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
      <header style={{background:"#fff",borderBottom:"1px solid #eee",height:"52px",padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
          <div style={{width:"30px",height:"30px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0}}>✨</div>
          <div style={{fontSize:"16px",fontWeight:700,color:"#1a1a2e",letterSpacing:"-.3px"}}>PHOTOlab</div>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          {/* Tab nav */}
          <div style={{display:"flex",background:"#f2f2f8",borderRadius:"10px",padding:"3px",gap:"2px",overflowX:"auto"}}>
            {[["edit","✏️","Edit"],["adjust","✂️","Adjust"],["overlay","🔤","Overlay"],["tools","🛠","Tools"]].map(([id,ic,lb])=>(
              <button key={id} onClick={()=>setActiveTab(id)}
                style={{padding:isMobile?"5px 8px":"5px 12px",fontSize:"12px",fontWeight:600,border:"none",cursor:"pointer",background:activeTab===id?"#fff":"transparent",color:activeTab===id?"#6c63ff":"#888",borderRadius:"8px",boxShadow:activeTab===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s",whiteSpace:"nowrap"}}>
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
          <div style={{width:"290px",borderRight:"1px solid #eee",overflowY:"auto",background:"#fff",flexShrink:0}}>
            <Panel/>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"#f7f8fa",position:"relative",overflow:"hidden"}}>
            <Preview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,previewRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}}/>
          </div>
        </div>
      )}

      {/* MOBILE */}
      {isMobile&&(
        <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden"}}>
          <div style={{height:"42vh",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f1f5",position:"relative",borderBottom:"1px solid #e8e8f0"}}>
            <Preview {...{image,dragging,setDragging,loadImage,fileInputRef,imgRef,splitRef,previewRef,activeTab,bgResult,bgMode,showBefore,setShowBefore,showSplit,splitPos,setIsDragSplit,cssFilter,transformCSS,filters,texts,selText,setSelText,updateText,cropMode,cropBox,setCropBox,cropAspect,isEdited,setImage,setBgStatus,setBgSubUrl,setBgResult,isMobile,rotation,flipH,flipV}}/>
          </div>
          <div style={{flex:1,overflowY:"auto",background:"#fff",WebkitOverflowScrolling:"touch"}}>
            {image&&activeTab==="edit"&&(
              <div style={{display:"flex",gap:"6px",padding:"10px 12px",borderBottom:"1px solid #f0f0f4",background:"#fff",position:"sticky",top:0,zIndex:10,overflowX:"auto"}}>
                {PRESETS.slice(0,5).map(p=>(
                  <button key={p.name} onClick={()=>setFilters({...DEFAULT_FILTERS,...p.values})}
                    style={{flexShrink:0,padding:"7px 10px",border:"1.5px solid #e8e8f0",background:"#fff",borderRadius:"9px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:"#555",fontFamily:"inherit"}}>
                    {p.icon} {p.name}
                  </button>
                ))}
                <button onClick={resetAll} style={{flexShrink:0,padding:"7px 10px",background:"#f2f2f8",border:"none",borderRadius:"9px",fontSize:"11px",fontWeight:600,color:"#888",cursor:"pointer"}}>↺</button>
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
          <div style={{background:"#fff",borderRadius:isMobile?"16px 16px 0 0":"16px",width:"100%",maxWidth:"460px",maxHeight:"90vh",overflowY:"auto",padding:"22px",animation:"slideup .25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
              <div>
                <div style={{fontSize:"18px",fontWeight:700,color:"#1a1a2e"}}>Export Photo</div>
                <div style={{fontSize:"12px",color:"#bbb",marginTop:"2px"}}>High quality · All platforms</div>
              </div>
              <button onClick={()=>setShowExport(false)} style={{background:"#f2f2f8",border:"none",width:"34px",height:"34px",borderRadius:"8px",cursor:"pointer",fontSize:"18px",color:"#888"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:"3px",marginBottom:"18px",background:"#f2f2f8",padding:"3px",borderRadius:"10px"}}>
              {[["standard","Standard"],["facebook","📘 Social"]].map(([id,lb])=>(
                <button key={id} onClick={()=>setExportTab(id)}
                  style={{flex:1,padding:"9px",fontSize:"13px",fontWeight:600,border:"none",cursor:"pointer",background:exportTab===id?(id==="facebook"?"#1877f2":"#fff"):"transparent",color:exportTab===id?(id==="facebook"?"#fff":"#6c63ff"):"#999",borderRadius:"8px",boxShadow:exportTab===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .18s"}}>
                  {lb}
                </button>
              ))}
            </div>

            {exportTab==="standard"&&(<>
              <SL>Format</SL>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"16px"}}>
                {[{id:"jpg",l:"JPEG",d:"Best for photos"},{id:"png",l:"PNG",d:"Lossless"},{id:"webp",l:"WebP",d:"Smallest size"}].map(f=>(
                  <button key={f.id} onClick={()=>setExportFmt(f.id)}
                    style={{padding:"10px 14px",border:`1.5px solid ${exportFmt===f.id?"#6c63ff":"#eee"}`,background:exportFmt===f.id?"#faf9ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                    <div><span style={{fontSize:"13px",fontWeight:600,color:exportFmt===f.id?"#6c63ff":"#444"}}>{f.l}</span><span style={{fontSize:"11px",color:"#bbb",marginLeft:"10px"}}>{f.d}</span></div>
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
                    style={{flex:"1 1 56px",padding:"9px 4px",border:`1.5px solid ${exportScale===s.v?"#6c63ff":s.v==="8k"?"#e0d8ff":"#eee"}`,background:exportScale===s.v?"#faf9ff":s.v==="8k"?"#faf8ff":"#fff",borderRadius:"10px",textAlign:"center",cursor:"pointer",transition:"all .18s",fontFamily:"inherit"}}>
                    <div style={{fontSize:"14px",fontWeight:700,color:exportScale===s.v?"#6c63ff":s.v==="8k"?"#a78bfa":"#555",marginBottom:"1px"}}>{s.l}</div>
                    <div style={{fontSize:"9px",color:"#bbb"}}>{s.d}</div>
                  </button>
                ))}
              </div>
              {natW>0&&<div style={{padding:"10px 14px",background:"#f8f8fd",borderRadius:"8px",display:"flex",justifyContent:"space-between",marginBottom:"16px"}}><span style={{fontSize:"12px",color:"#bbb"}}>Output</span><span style={{fontSize:"13px",fontWeight:600,color:"#6c63ff"}}>{expW.toLocaleString()} × {expH.toLocaleString()}px</span></div>}
              {exportInfo&&<div style={{padding:"10px 14px",background:exportDone?"#f0fff4":"#fff8e7",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:exportDone?"#16a34a":"#92400e",fontWeight:500}}>{exportDone?`✓ Saved — ${exportInfo}`:exportInfo}</div>}
              <AB onClick={handleExport} disabled={exporting} color={exportDone?"#f0fff4":"purple"} textColor={exportDone?"#16a34a":"#fff"} style={{width:"100%",padding:"14px",fontSize:"14px",fontWeight:700}}>
                {exporting?<Row><Spin/>Processing...</Row>:exportDone?"✓ Saved!":`↓ Download ${({jpg:"JPEG",png:"PNG",webp:"WebP"})[exportFmt]} · ${typeof exportScale==="string"?exportScale.toUpperCase():exportScale+"×"}`}
              </AB>
              <p style={{fontSize:"11px",color:"#bbb",textAlign:"center",marginTop:"8px"}}>iOS/Android: tap "Save Image" in the share sheet</p>
            </>)}

            {exportTab==="facebook"&&(<>
              <div style={{padding:"12px",background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:"10px",marginBottom:"16px"}}>
                <div style={{fontSize:"12px",fontWeight:600,color:"#1d4ed8",marginBottom:"4px"}}>Optimised for Social Media</div>
                <div style={{fontSize:"12px",color:"#3b82f6",lineHeight:1.6}}>Exact dimensions + JPEG 82% — bypasses compression on Facebook, Instagram &amp; more.</div>
              </div>
              <SL>Platform / Format</SL>
              {FB_MODES.map(m=>(
                <button key={m.id} onClick={()=>setFbMode(m.id)}
                  style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${fbMode===m.id?"#1877f2":"#eee"}`,background:fbMode===m.id?"#eff6ff":"#fff",borderRadius:"10px",textAlign:"left",cursor:"pointer",transition:"all .18s",marginBottom:"7px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                  <div><div style={{fontSize:"13px",fontWeight:600,color:fbMode===m.id?"#1877f2":"#444",marginBottom:"2px"}}>{m.label}</div><div style={{fontSize:"12px",color:"#bbb"}}>{m.desc}</div></div>
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
              {/* Color overlays */}
              {!showBefore&&activeTab==="edit"&&filters.temperature!==0&&<div style={{position:"absolute",inset:0,background:tempColor,mixBlendMode:"overlay",pointerEvents:"none"}}/>}
              {!showBefore&&activeTab==="edit"&&filters.fade>0&&<div style={{position:"absolute",inset:0,background:`rgba(255,255,255,${filters.fade/180})`,mixBlendMode:"screen",pointerEvents:"none"}}/>}
              {!showBefore&&activeTab==="edit"&&filters.vignette>0&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette/100}) 100%)`,pointerEvents:"none"}}/>}
              {/* Grain overlay */}
              {!showBefore&&activeTab==="edit"&&filters.grain>0&&(
                <div style={{position:"absolute",inset:0,pointerEvents:"none",mixBlendMode:"overlay",opacity:0.4,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`}}/>
              )}
              {/* Text overlays */}
              {!showBefore&&texts.map(t=>(
                <div key={t.id}
                  onMouseDown={e=>startDragText(e,t.id)}
                  onClick={()=>setSelText(t.id)}
                  style={{position:"absolute",left:`${t.x}%`,top:`${t.y}%`,transform:"translate(-50%,-50%)",cursor:"move",userSelect:"none",
                    fontFamily:FONT_MAP[t.font]||FONT_MAP.System,
                    fontSize:`clamp(12px,${t.fontSize/8}vw,${t.fontSize}px)`,
                    fontWeight:t.bold?"700":"400",fontStyle:t.italic?"italic":"normal",color:t.color,
                    textShadow:t.stroke?"0 0 8px rgba(0,0,0,.8), 1px 1px 2px rgba(0,0,0,.6)":"none",
                    border:selText===t.id?"2px dashed rgba(108,99,255,.6)":"2px dashed transparent",
                    padding:"4px 6px",borderRadius:"4px",whiteSpace:"nowrap",zIndex:5}}>
                  {t.content}
                </div>
              ))}
              {/* Crop overlay */}
              {cropMode&&(
                <div style={{position:"absolute",inset:0,zIndex:10}}>
                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
                  <div style={{position:"absolute",left:`${cropBox.x}%`,top:`${cropBox.y}%`,width:`${cropBox.w}%`,height:`${cropBox.h}%`,
                    border:"2px solid #fff",boxShadow:"0 0 0 9999px rgba(0,0,0,.5)",cursor:"move"}}>
                    {/* Grid lines */}
                    <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gridTemplateRows:"1fr 1fr 1fr",pointerEvents:"none"}}>
                      {Array(9).fill(0).map((_,i)=><div key={i} style={{border:"0.5px solid rgba(255,255,255,.3)"}}/>)}
                    </div>
                    {/* Handles */}
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
