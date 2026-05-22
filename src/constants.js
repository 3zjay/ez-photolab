
export const COLOR_FILTERS = [
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
export const DEFAULT_FILTERS = Object.fromEntries(COLOR_FILTERS.map(f=>[f.key,f.default]));

export const FILTER_GROUPS = [
  { key:"basic",   label:"Basic" },
  { key:"lut",     label:"🎬 LUT" },
  { key:"enhance", label:"Enhance" },
  { key:"hsl",     label:"Color" },
  { key:"style",   label:"Style" },
  { key:"ai",      label:"✨ AI" },
];

export const PRESETS = [
  { name:"Portra",     icon:"🎞️", values:{ contrast:90,saturation:85,temperature:10,fade:15,grain:30,vignette:20 }},
  { name:"Cinematic",  icon:"🎬", values:{ contrast:115,saturation:95,temperature:-5,tint:-10,shadows:-25,highlights:10,vignette:35 }},
  { name:"Warm Noir",  icon:"🖤", values:{ saturation:0,contrast:130,temperature:20,clarity:15,sharpness:10,vignette:40,shadows:-20 }},
  { name:"Analog",     icon:"📸", values:{ brightness:105,contrast:95,saturation:90,temperature:5,fade:25,grain:20 }},
  { name:"Fuji 400H",  icon:"🌿", values:{ contrast:105,saturation:105,temperature:-10,tint:10,highlights:-15,shadows:10 }},
  { name:"Moody",      icon:"🌑", values:{ contrast:120,saturation:80,temperature:-5,vignette:40,shadows:-30,fade:10 }},
  { name:"Aesthetic",  icon:"✨", values:{ contrast:110,saturation:115,temperature:15,tint:5,highlights:10,shadows:15 }},
  { name:"Soft Matte", icon:"🌫️", values:{ contrast:80,saturation:90,fade:40,shadows:15,highlights:-15,clarity:-10 }},
  { name:"Golden",     icon:"🌇", values:{ temperature:35,saturation:120,highlights:15,shadows:-5,vibrance:125 }},
  { name:"Neo-Tokyo",  icon:"🌃", values:{ contrast:130,saturation:150,temperature:-30,tint:30,clarity:10,vignette:25 }},
];

export const FB_MODES = [
  { id:"portrait",  label:"Portrait",      desc:"1080 × 1350",  w:1080, h:1350 },
  { id:"square",    label:"Square",        desc:"1080 × 1080",  w:1080, h:1080 },
  { id:"landscape", label:"Landscape",     desc:"2048px wide",  w:2048, h:null  },
  { id:"cover",     label:"Cover Photo",   desc:"851 × 315",    w:851,  h:315   },
  { id:"story",     label:"Story/Reel",    desc:"1080 × 1920",  w:1080, h:1920  },
];

export const FONTS = ["System","Serif","Mono","Impact","Georgia","Arial Black"];
export const FONT_MAP = { System:"-apple-system,sans-serif", Serif:"Georgia,serif", Mono:"'Courier New',monospace", Impact:"Impact,sans-serif", Georgia:"Georgia,serif", "Arial Black":"'Arial Black',sans-serif" };
export const BG_COLORS = ["#ffffff","#f5f5f5","#000000","#1a1a2e","#2d4a3e","#4a1a2e","#1a3a4a","#fff8e7"];

export const BATCH_RESIZE_PRESETS = [
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
