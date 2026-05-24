
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
  { key:"watermark", label:"🏷 Logo" },
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

export const LUT_PRESETS = [
  {
    id: 'none',
    icon: '⊘',
    name: 'None',
    description: 'No color lookup curves applied.',
    bestFor: 'Neutral editing',
    tier: 'free',
    pack: 'all'
  },
  // --- PACK 1: Indoor Arena & Rec Gym Correction (arena) ---
  {
    id: 'arena_lights',
    icon: '💡',
    name: 'Arena Spotlight',
    description: 'Desaturates crowd backgrounds, boosts highlights on players, and adds a soft cool rim light.',
    bestFor: 'Spotlighted tournament games (NBA style)',
    tier: 'premium',
    pack: 'arena'
  },
  {
    id: 'ymca',
    icon: '🏢',
    name: 'Rec-Gym Fluorescent',
    description: 'Neutralizes muddy yellow-green casts from old overhead tubes; shifts highlights to clean daylight white.',
    bestFor: 'YMCA/High School basketball & volleyball',
    tier: 'premium',
    pack: 'arena'
  },
  {
    id: 'hardwood_tones',
    icon: '🪵',
    name: 'Hardwood Glow',
    description: 'Enriches warm amber/yellow wood grains, adding contrast to player shoe reflections.',
    bestFor: 'Basketball courts with varnished maple floors',
    tier: 'premium',
    pack: 'arena'
  },
  {
    id: 'ice_rink',
    icon: '❄️',
    name: 'Ice Cold Rink',
    description: 'Cools down white balances, cleans up yellowed ice sheets to bright ice-white, and punches blue hockey lines.',
    bestFor: 'Hockey, figure skating, curling',
    tier: 'premium',
    pack: 'arena'
  },
  {
    id: 'matte_gym',
    icon: '🤸',
    name: 'Matte Gym Cast',
    description: 'Reduces glare off gymnastics and wrestling mats; increases contrast in player midtones.',
    bestFor: 'Wrestling mats, martial arts, gymnastics',
    tier: 'premium',
    pack: 'arena'
  },
  {
    id: 'msg',
    icon: '🏟️',
    name: 'Stadium Night',
    description: 'Increases shadows to hide empty dark stadium seats, highlighting player catch-lights.',
    bestFor: 'Indoor stadium soccer & track',
    tier: 'premium',
    pack: 'arena'
  },
  // --- PACK 2: Dynamic Game-Day Action (action) ---
  {
    id: 'mvp_sport',
    icon: '🏆',
    name: 'Clarity Punch',
    description: 'Heavy contrast curves, slightly pulled-back blacks, and a sharp boost to micro-details in jerseys and sweat.',
    bestFor: 'Close-up basketball and football action',
    tier: 'premium',
    pack: 'action'
  },
  {
    id: 'hyper_active',
    icon: '⚡',
    name: 'Hyper-Active',
    description: 'Boosts dynamic range, controls clipping highlights, and adds high-frequency edge definition.',
    bestFor: 'Fast-motion athletics, sprinting, hurdles',
    tier: 'premium',
    pack: 'action'
  },
  {
    id: 'mud_grit',
    icon: '🚜',
    name: 'Mud & Grit',
    description: 'Enhances earthy browns and grassy greens while crushing shadows for a dirty, battle-tested aesthetic.',
    bestFor: 'Rugby, motocross, outdoor soccer',
    tier: 'premium',
    pack: 'action'
  },
  {
    id: 'velodrome',
    icon: '🚴',
    name: 'Velodrome Speed',
    description: 'Pushes colors slightly warm and adds linear speed motion-blur highlights.',
    bestFor: 'Cycling, track cycling, speed skating',
    tier: 'premium',
    pack: 'action'
  },
  {
    id: 'sweat_steel',
    icon: '🏋️',
    name: 'Sweat & Steel',
    description: 'Desaturates general environments, but highlights metallic shine and wet specular highlights on skin.',
    bestFor: 'Weightlifting, bodybuilding, training reels',
    tier: 'premium',
    pack: 'action'
  },
  {
    id: 'extreme_peak',
    icon: '🏂',
    name: 'Extreme Peak',
    description: 'High exposure highlight roll-offs with crisp white point normalization.',
    bestFor: 'Skiing, snowboarding, extreme snow sports',
    tier: 'premium',
    pack: 'action'
  },
  // --- PACK 3: Cinematic Narrative & Storytelling (cinematic) ---
  {
    id: 'doc_30_30',
    icon: '🎥',
    name: '30 for 30 Gritty',
    description: 'Highly desaturated, heavy black crush, and a cold blue/slate-tint shadow profile.',
    bestFor: 'Locker rooms, emotional pre-game segments',
    tier: 'premium',
    pack: 'cinematic'
  },
  {
    id: 'drive_survive',
    icon: '🏎️',
    name: 'Drive to Survive',
    description: 'Modern cinema look with deep, rich greens, high-contrast reds, and cinematic warm skin tones.',
    bestFor: 'Motorsports, high-end commercial athletic promos',
    tier: 'premium',
    pack: 'cinematic'
  },
  {
    id: 'underdog',
    icon: '🥊',
    name: 'Underdog Story',
    description: 'Dark, moody shadows with a subtle warm olive/green undertone in the midtones.',
    bestFor: 'Behind-the-scenes, practice reels, coaching',
    tier: 'premium',
    pack: 'cinematic'
  },
  {
    id: 'friday_lights',
    icon: '🏈',
    name: 'Friday Night Lights',
    description: 'Amber highlights, faded deep-blue shadows, and high contrast under stadium light posts.',
    bestFor: 'Night football games, outdoor stadium sports',
    tier: 'premium',
    pack: 'cinematic'
  },
  {
    id: 'locker_room',
    icon: '🚪',
    name: 'Locker Room Shadow',
    description: 'Deep, dark shadows with flat ambers. Puts focus on single key lights.',
    bestFor: 'Cinematic pre-game locker talk',
    tier: 'premium',
    pack: 'cinematic'
  },
  {
    id: 'victory_glow',
    icon: '🥇',
    name: 'Victory Glow',
    description: 'Warm, golden-hour highlights with soft matte blacks and clean, rich skin tones.',
    bestFor: 'Post-game celebrations, trophy lifts',
    tier: 'premium',
    pack: 'cinematic'
  },
  // --- PACK 4: Color Isolation & Brand Aesthetics (colors) ---
  {
    id: 'red_storm',
    icon: '🔴',
    name: 'Red Storm',
    description: 'Desaturates background greens and ambers, making team primary reds pop intensely.',
    bestFor: 'Teams with Red/Scarlet jerseys',
    tier: 'premium',
    pack: 'colors'
  },
  {
    id: 'royal_pride',
    icon: '🔵',
    name: 'Royal Pride',
    description: 'Vibrates primary blues and deep cyans while keeping basketball courts from looking too yellow.',
    bestFor: 'Teams with Blue/Navy uniforms',
    tier: 'premium',
    pack: 'colors'
  },
  {
    id: 'green_field',
    icon: '🌱',
    name: 'Green Field Clear',
    description: 'Stabilizes grass colors to a deep hunter green rather than neon yellow-green; cleans up background turf.',
    bestFor: 'Soccer, American football, baseball',
    tier: 'premium',
    pack: 'colors'
  },
  {
    id: 'carbon_clean',
    icon: '💎',
    name: 'Carbon Commercial',
    description: 'Modern clean look with linear color replication and a matte dark crowd shadow curve.',
    bestFor: 'Social media graphic headers & brand ads',
    tier: 'premium',
    pack: 'colors'
  },
  {
    id: 'court_gold',
    icon: '🪙',
    name: 'Court Gold',
    description: 'Selectively pulls out gold, yellow, and copper frequencies for premium spotlighting.',
    bestFor: 'Teams with yellow/gold uniform accents',
    tier: 'premium',
    pack: 'colors'
  },
  {
    id: 'neon_high',
    icon: '🎽',
    name: 'High-Key Neon',
    description: 'Saturates fluorescent colors (neon green, pink, bright orange) for a fast-paced streetwear style.',
    bestFor: 'Running gear, activewear promos, skate parks',
    tier: 'premium',
    pack: 'colors'
  },
  // --- PACK 5: Vintage Sports & Film Emulation (vintage) ---
  {
    id: 'kodachrome',
    icon: '🎞️',
    name: 'Kodachrome Retro',
    description: 'Warm nostalgic film curves, rich red saturation, amber highlights, and soft matte blacks.',
    bestFor: 'Player lifestyle profiles & retro hoops',
    tier: 'premium',
    pack: 'vintage'
  },
  {
    id: 'fuji',
    icon: '🌿',
    name: 'Fuji Superia 400',
    description: 'Cool green/cyan highlight shift with organic midtone contrast.',
    bestFor: 'Outdoor courts, bright daylight training sessions',
    tier: 'premium',
    pack: 'vintage'
  },
  {
    id: 'vintage',
    icon: '🌇',
    name: 'Streetball Gold',
    description: 'Golden-yellow wash with heavily faded shadows and bright, soft highlights.',
    bestFor: 'Vintage streetball, asphalt courts, summer sunset play',
    tier: 'premium',
    pack: 'vintage'
  },
  {
    id: 'trix',
    icon: '🖤',
    name: 'Tri-X High Contrast B&W',
    description: 'High-contrast black and white curve modeled after Ilford Tri-X film; high grain texture.',
    bestFor: 'Timeless action shots, dramatic grit',
    tier: 'premium',
    pack: 'vintage'
  },
  {
    id: 'portra',
    icon: '📷',
    name: 'Portra 160 Lifestyle',
    description: 'Soft contrast, warm skin rendering, and highlight compression.',
    bestFor: 'Athlete portraits, post-game media calls',
    tier: 'premium',
    pack: 'vintage'
  },
  {
    id: 'rucker_park',
    icon: '🏀',
    name: 'Rucker Park Faded',
    description: 'Heavily desaturated retro look with warm concrete grays and faded orange hoops.',
    bestFor: 'Nostalgic urban sports captures',
    tier: 'premium',
    pack: 'vintage'
  }
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
