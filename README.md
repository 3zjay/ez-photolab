# ✨ PHOTOlab V2

**A professional-grade, browser-based photo editor and batch processor with AI-powered tools.**  
Built with React + Vite — runs entirely in your browser with zero server costs and zero uploads.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![MediaPipe](https://img.shields.io/badge/AI-MediaPipe-orange?logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🖼️ What It Does

PHOTOlab V2 is a full-featured photo editing suite that runs 100% inside your web browser. No accounts, no uploads, no cloud — your photos stay on your device. From single-photo retouching to processing hundreds of Nikon RAW files in one click, PHOTOlab covers the entire photography workflow.

---

## ✨ Features

### 🎨 Single Photo Editor

- **30+ Adjustments** — Brightness, contrast, saturation, vibrance, exposure, temperature, tint, highlights, shadows, clarity, sharpness, denoise, hue, fade, grain, vignette
- **Filter Presets** — One-click cinematic, vintage, B&W, warm, cool, fade and more
- **Crop & Transform** — Free-rotate slider, 90° step buttons, flip H/V, and preset aspect-ratio crop (1:1, 4:3, 16:9, 9:16, 3:4)
- **Text Overlays** — Drag-to-position text with custom fonts, colors, bold/italic/outline styles
- **Live Before/After** — Animated split-view comparison and toggle
- **60fps Smooth Sliders** — All sliders use GPU-accelerated CSS rendering with zero React re-renders during drag; double-click any slider to instantly reset it to default

---

### 🧠 AI Tools — Free, In-Browser

All AI tools run **locally on your device** using WebAssembly and the Canvas API — no API key required.

| Tool | What It Does | Engine |
|------|-------------|--------|
| **Background Removal** | One-click subject isolation with transparent, solid color, or blurred background output | `@imgly/background-removal` (WASM) |
| **Smart Upscale** | Multi-pass bicubic upscaling (2×, 3×, 4×) with unsharp mask sharpening between each pass | Canvas API |
| **Beauty Filter** | Adaptive skin smoothing, edge clarity, and glow — with optional face-targeted skin masking | MediaPipe Face Mesh + Canvas |
| **Face Restore** | Multi-pass local face enhancement: noise reduction, detail sharpening, contrast & color correction | MediaPipe Face Landmarker + Canvas |
| **Object Removal** | Paint a mask over anything to erase it with context-aware LaMa inpainting | Claid.ai API *(50 free credits)* |

---

### 📦 Batch Processor

Process an entire folder of standard photos **or Nikon RAW (.NEF/.sRAW) files** in one run.

#### Standard Batch (JPEG / PNG / WebP)
- **Folder-based** — select an input folder and output folder via the File System Access API
- **Resize modes** — preset sizes (Web, HD, 4K, Instagram, etc.), custom W×H, or long-edge scaling
- **Auto-enhance** — Auto levels, auto contrast, sharpen (amount + radius), denoise
- **Watermark / Logo** — Upload a PNG logo with independent scale controls for **Landscape** and **Portrait** orientations, plus opacity, position (9-point grid), and margin
- **Color Filters** — Apply any of the 30+ adjustments across the entire batch
- **AI Pipeline** — Smart Upscale (2× / 4×), Beauty Filter with skin masking, AI Face Restore per image
- **Live Preview** — Just-in-time before/after split-view for any image in the queue — color sliders update the preview at 60fps via CSS, heavier effects debounce at 300ms
- **Output** — JPEG/PNG/WebP with quality slider, custom filename prefix/suffix
- **Quick Combos** — One-click "Product", "Portrait", "Landscape", "Low-Light" presets

#### Nikon RAW Batch (.NEF / .sRAW)
- **Embedded JPEG extraction** — pulls the full-resolution embedded preview from each NEF file, preserving Nikon's native colour science and high-ISO quality
- **EXIF orientation correction** — reads the master TIFF/EXIF header to auto-rotate portrait shots with no user intervention
- **Dual-scale watermarking** — independent logo width % controls for Landscape vs. Portrait images, auto-detected at render time
- **Full pipeline** — same resize, sharpen, denoise, watermark, and AI enhancement stack as standard batch
- **Processing log** — live status log with per-file success/error reporting
- **Non-blocking** — runs in a dedicated worker thread so the UI stays responsive during large batches

---

### 🎯 General

- 🌙 **Dark / Light mode** — persisted across sessions
- 📱 **Fully responsive** — desktop and mobile layouts
- 💾 **Lossless export** — edits baked into a full-resolution canvas at export time
- 🔒 **100% private** — photos never leave your device
- ⚡ **No backend** — pure client-side; deploy anywhere as a static site

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- npm

### Install & Run

```bash
# Clone
git clone https://github.com/3zjay/ez-photolab.git
cd ez-photolab

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output lands in `dist/` — drop it on Vercel, Netlify, GitHub Pages, or any static host.

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 |
| **Bundler** | Vite 5 |
| **Styling** | Vanilla CSS + Tailwind CSS 4 |
| **AI / ML** | MediaPipe Tasks Vision (WASM / WebGPU) |
| **Background Removal** | `@imgly/background-removal` |
| **Image Processing** | Canvas API — pixel-level ImageData manipulation |
| **RAW Decoding** | Embedded JPEG extraction from NEF TIFF structure |
| **File System** | File System Access API (folder read/write, no uploads) |

### Key Design Decisions

**60fps SmoothSlider**  
Every slider in the app uses a shared `SmoothSlider` component that operates as an *uncontrolled* input during drag. The CSS track fill (`--v`) and value label are updated imperatively via DOM refs — zero React re-renders. State is committed on `pointerUp` only. Double-click resets to `defaultValue`.

**Two-layer Batch Preview**  
The batch live preview applies CSS filters (`brightness`, `contrast`, `saturation`, etc.) directly to the preview `<img>` tag at 60fps (GPU-accelerated, same as the Edit tab). Heavy operations — watermark compositing, AI effects — use a debounced (300ms) JPEG encoder that only fires when those settings change.

**Embedded Preview RAW Pipeline**  
Rather than decoding raw sensor data in the browser (slow, lossy), the RAW engine finds and extracts the full-resolution embedded JPEG from the NEF file's TIFF structure. This gives Nikon's native colour science at full speed.

**EXIF Orientation**  
The RAW engine reads the orientation tag directly from the TIFF IFD, then applies the correct canvas transform matrix before compositing — so portrait shots always appear correctly rotated.

---

## 📁 Project Structure

```
src/
├── App.jsx                    # Central state, processing pipelines, layout
├── BatchPage.jsx              # Batch processor — UI, settings, live preview
├── Preview.jsx                # Single-photo preview with split-view & crop overlay
├── faceMasking.js             # MediaPipe Face Mesh → per-pixel skin mask
├── faceRestore.js             # Local multi-pass face enhancement pipeline
├── utils.js                   # Image processing: filters, sharpen, denoise, upscale, RAW decode
├── constants.js               # Filter definitions, group metadata, presets, defaults
├── index.css                  # Global styles, CSS custom properties
├── main.jsx                   # React entry point
└── components/
    ├── panels/
    │   ├── EditPanel.jsx       # Color filter sliders, presets, AI tool UI
    │   ├── ToolsPanel.jsx      # BG removal, object removal, API key config
    │   ├── AdjustPanel.jsx     # Rotate, flip, crop controls
    │   ├── OverlayPanel.jsx    # Text overlay management & positioning
    │   └── RawBatchPanel.jsx   # Nikon RAW batch queue, logs, controls
    └── ui/
        └── common.jsx          # Shared: SmoothSlider, AB button, SL label,
                                #         Spin, PBar, Row, Empty
```

---

## 🔑 API Keys (Optional)

The vast majority of features are **completely free** and run locally. Two optional cloud features require keys:

| Service | Feature | Free Tier | Where to Get |
|---------|---------|-----------|--------------|
| **Claid.ai** | Object Removal (LaMa inpainting) | 50 free credits | [claid.ai](https://claid.ai) → Settings → API |
| **fal.ai** | Cloud Face Restore (advanced, queue-based) | Pay-per-use | [fal.ai](https://fal.ai) → Dashboard → Keys |

Enter keys in **Tools** tab → **API Configuration** section. Keys are saved to `localStorage` and never sent anywhere except the respective API.

---

## 📄 License

MIT — free for personal and commercial use.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/3zjay">3zjay</a>
</p>
