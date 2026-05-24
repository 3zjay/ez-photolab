# ✨ PHOTOlab V2

**A professional-grade, browser-based photo editor and batch processor with AI-powered tools.**  
Built with React + Vite — runs entirely in your browser with zero server costs and zero uploads.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![MediaPipe](https://img.shields.io/badge/AI-MediaPipe-orange?logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)


---

## 🚀 What's New in v2.8.0 (Sports LUT Packs & Guided Workflow Release)

- **🎨 Curated Top 30 Sports LUTs & 5 Packs**: Added 30 custom Looks modeled after trending sports media creators (e.g. Beyond the Game, Peter Sarellas, Luxe Lens). Categorized into 🏟️ Arena, 🏈 Action, 🎬 Cinematic, 🎽 Colors, and 🎞️ Vintage packs.
- **⚡ Sequential Pack Downloader**: Added a staggered (250ms interval) multi-file download controller that lets creators download all `.cube` LUT configurations for an active pack in one click.
- **📋 Guided Sports Media Workflow**: Added an interactive step-by-step pipeline section on the landing dashboard (Cull AI 🔍 → Studio Editor 🎨 → Batch Processor 📦) to streamline high-volume sports media workflows.
- **✨ Dynamic Grid Filtering & CSS wrapping**: Updated single-image edits and batch processors with wrapped tab rows and real-time category filtering.

---

## 🚀 What's New in v2.7.0 (Detail Zoom & Non-Destructive Workflow Release)

- **🔍 1:1 Detail Zoom Inspector**: Zoom in at actual pixel resolution to inspect fine details and sharpness. The preview panel dynamically switches to a scrollable canvas.
- **📐 Dynamic Resolution & Scale HUD**: Real-time resolution badge that details active photo width and height, plus a gradient label highlighting the exact AI upscale multiplier (e.g. `4x AI Upscaled`).
- **🔄 Non-Destructive AI Pipeline**: Smart Upscale, Face Restore, and Beauty filters now upscale the raw base photo directly and update the workspace image state without wiping out or resetting active sliders, custom LUTs, texts, rotations, or flips.
- **🎨 Combined Presets & LUTs Mobile Layout**: Streamlined editor view with custom lookups categorized for visual tiering. Added descriptive tooltips and best-use metadata for all color presets.
- **📦 LUTs in Batch Processor**: Enabled custom 3D LUT lookup tables and intensity sliders inside the Batch Processing engine.
- **💾 Unified "Save As" Download Flow**: Refactored the export options for standard downloads and AI upscaling to provide a unified, consistent native file download across all platforms.
- **⚡ Performance & Limits**: Boosted high-resolution export limit coordinates in the renderer up to 268 Megapixels for massive upscaled canvases.

---

## 🚀 What's New in v2.6.2 (RAW Orientation Priority Fix)

- **Fixed TIFF Directory Orientation Priority**: Resolved the bug where portrait Nikon `.NEF` (and other RAW) files loaded sideways (landscape) in both the workspace editor and RAW batch processor.
  - **Prioritize Rotated Orientation Tags**: Refactored `getOrientationFromTiff` to check and prioritize orientation tags with values `> 1` (e.g. `6` or `8` for rotation) from any directory (Exif, IFD0, SubIFDs) first before falling back to default/unrotated `1` values often stored in thumbnail IFD directories.
  - **JPEG Fallback Range Check**: Corrected the JPEG preview orientation decoder to correctly evaluate the master raw orientation if the preview orientation is `<=` 1.
- **Service Worker & Build Release**: Bumped release manifest to `v2.6.2` to force client cache invalidation and ensure the fixed orientation parser loads immediately.

---

## 🚀 What's New in v2.6.1 (RAW Orientation Hotfix)

- **Fixed RAW Orientation Ingestion**: Solved the layout bug where portrait-oriented camera RAW files (such as `.NEF` files) still loaded rotated sideways.
  - **Dynamic SHORT/LONG Tag Resolution**: Re-engineered the TIFF directory parser `getOrientationFromTiff` in `rawProcessor.js` to inspect EXIF tag data types, correctly reading values for both `SHORT` (16-bit) and `LONG` (32-bit) orientations, preventing big-endian decoding errors.
  - **IFD Priority Isolation**: Added directory context tracking (`IFD0`, `Exif`, `SubIFD`, `IFD1`) to ensure that default unrotated orientations (usually `1`) from thumbnail and preview directories do not overwrite the master image orientation.
- **WASM and Worker Build Updates**: Bumped the release manifest to `v2.6.1` and invalidates caches automatically.

---

## 🚀 What's New in v2.6.0 (3D LUT & RAW Ingestion Release)

- **Local 3D LUT (.CUBE) Shading Engine**: Fully client-side 3D Color Lookup Tables (LUTs) processed on the GPU via custom WebGL lookup shaders. Built-in presets include Fortra 400, Fuji Superia, Vintage Gold, Teal & Orange, and Tri-X B&W, with full support for custom `.cube` file uploads.
- **RAW & 3D LUT Pipelines**: Fully integrated 3D LUT Presets into RAW development pipeline to grade high-resolution raw digital negatives in the browser.
- **RAW Drag & Drop Ingestion**: Interactive "Drop Photo Here" supports direct ingestion of raw files (.NEF, .CR2, .ARW, etc.), launching studio workspace instantly.
- **Robust EXIF & TIFF Orientation Readers**: Decodes SubIFDs and multi-directory tags to auto-rotate portrait negatives upright during demosaicing.
- **Split-Screen Before/After Alignment**: Synchronized CSS scaling and rotation matrices across comparative A/B preview panels.
- **Deterministic URL Memory Lifespans**: Revokes blob URLs reactively to guarantee zero-leak, crash-free execution during large RAW batch cycles.

---

## 🚀 What's New in v2.3.0 (EZ-Cull AI Release)

- **Local AI Culling Engine (EZ-Cull AI)**: Fully client-side, 100% in-browser duplicate similarity grouping and face/eye quality scoring.
  - **dHash Perceptual Hashing**: Instantly (under 1ms) clusters consecutive similarity bursts using horizontal difference gradients.
  - **Laplacian Focus Scoring**: Measures local edge contrast sharpness over face regions or center crops to identify soft/blurry captures.
  - **Shared MediaPipe Landmarking**: Shared singleton FaceLandmarker integration with `faceRestore.js` optimizes memory and WebGL context load, detecting eye openness (blink warning) and smile ratios.
  - **High-Speed Comparison Dashboard**: Premium glassmorphic workspace featuring dual-pane split review, alternates deck, real-time quality HUD, and arrow/hotkey control loops (`Space` for Keeper, `S` to Swap Key Photos, numbers for ratings & color labels).
- **Direct Adobe-Compliant XMP Sidecars**: Writes non-destructive `.xmp` metadata (stars/colors) directly to your local hard drive using the File System Access API.

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
| **EZ-Cull AI** | In-browser similarity duplicate clustering, blur/blink analysis, and auto-keeper selection | dHash + Laplacian + MediaPipe (Shared WASM) |
| **Object Removal** | Paint a mask over anything to erase it with context-aware LaMa inpainting | Claid.ai API *(50 free credits)* |

---

### 📦 Batch Processor

Process an entire folder of standard photos **or RAW (.CR2, .CR3, .NEF, .ARW, .DNG, etc.) files** in one run.

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

#### Universal RAW Batch (.NEF / .CR2 / .CR3 / .ARW / .DNG / etc.)
- **Multi-Brand Embedded JPEG extraction** — pulls the full-resolution embedded preview from Canon, Nikon, Sony, and Adobe DNG files, preserving native camera color science and high-ISO sensor quality
- **WASM-Powered Development Fallback** — decodes and develops raw sensor data for over 800+ legacy formats using the high-performance `libraw-wasm` WebAssembly engine in a background Web Worker
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
| **RAW Decoding** | `libraw-wasm` WebAssembly + TIFF Embedded JPEG Extraction |
| **File System** | File System Access API (folder read/write, no uploads) |

### Key Design Decisions

**60fps Accessible SmoothSlider**  
Every slider in the app (`SmoothSlider` and `BatchFilterSlider`) operates as an *uncontrolled* input during drag. The CSS track fill (`--v`) and value label are updated imperatively via DOM refs — zero React re-renders. Full keyboard accessibility handles navigation (`ArrowLeft`/`Right`, `PageUp`/`Down`, `Home`/`End`) and commits changes immediately on `onKeyUp`. Drag pointer releases commit changes on `pointerUp`. Double-click resets to `defaultValue`.

**Two-layer Batch Preview**  
The batch live preview applies CSS filters (`brightness`, `contrast`, `saturation`, etc.) directly to the preview `<img>` tag at 60fps (GPU-accelerated, same as the Edit tab). Heavy operations — watermark compositing, AI effects — use a debounced (300ms) JPEG encoder that only fires when those settings change.

**Hybrid RAW Decoding Pipeline**  
Rather than decoding raw sensor data in the browser (slow, lossy), the RAW engine first deep-scans the TIFF structure to extract the full-resolution embedded JPEG. If no large preview is found, it falls back to developing raw sensor data via a custom background worker proxy compiling the `libraw-wasm` WebAssembly module.

**EXIF Orientation**  
The RAW engine reads the orientation tag directly from the TIFF IFD, then applies the correct canvas transform matrix before compositing — so portrait shots always appear correctly rotated.

**Deterministic Memory Revocation**  
To prevent progressive browser memory leaks from high-resolution image editing, we implement reactive hooks that cleanly execute `URL.revokeObjectURL` for single-image background removals and batch-queued RAW items. In addition, the JIT-processing loop uses `try-finally` blocks to guarantee immediate URL release as soon as preview canvas elements are painted.

---

## 📁 Project Structure

```
src/
├── App.jsx                    # Central state, processing pipelines, layout
├── BatchPage.jsx              # Batch processor — UI, settings, live preview
├── CullPage.jsx               # Cull workspace dashboard — UI, alternate comparison, hotkeys
├── Preview.jsx                # Single-photo preview with split-view & crop overlay
├── cullEngine.js              # Perceptual grouping, Laplacian focus, and blink/smile analytics
├── faceMasking.js             # MediaPipe Face Mesh → per-pixel skin mask
├── faceRestore.js             # Local multi-pass face enhancement pipeline
├── utils.js                   # Image processing: filters, sharpen, denoise, upscale, RAW decode
├── xmpExporter.js             # Adobe-compliant rating and color label XMP exporter
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
