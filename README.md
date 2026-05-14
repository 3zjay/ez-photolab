# 📸 PHOTOlab V2

A professional-grade, browser-based photo editor with AI-powered tools. Built with React + Vite — runs entirely in your browser with zero server costs.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🎨 Full Photo Editor
- **30+ Adjustments** — Brightness, contrast, saturation, vibrance, temperature, tint, highlights, shadows, HSL channels, grain, vignette, and more
- **Filter Presets** — One-click cinematic, vintage, B&W, warm, cool, and fade presets
- **Color Grading** — Split-tone highlights/shadows with full HSL control
- **Crop & Transform** — Rotate, flip, and crop with preset aspect ratios (1:1, 4:3, 16:9, etc.)
- **Text Overlays** — Add styled text with custom fonts, colors, shadows, and positioning

### 🧠 AI Tools (Free, In-Browser)
All AI features run **locally on your device** — no API keys, no cloud, no cost.

| Tool | Description | Technology |
|------|-------------|------------|
| **Background Removal** | One-click subject isolation with transparent/color/blur backgrounds | `@imgly/background-removal` (WebAssembly) |
| **Smart Upscale** | Multi-pass bicubic upscaling with inter-pass sharpening (2×, 3×, 4×) | Canvas API |
| **Beauty Filter** | Adaptive skin smoothing, clarity boost, and glow with optional face-targeted masking | MediaPipe Face Mesh + Canvas |
| **Face Restore** | AI face detection + multi-pass enhancement: noise reduction, detail sharpening, contrast boost, color correction | MediaPipe Face Landmarker + Canvas |
| **Object Removal** | Paint-to-remove with LaMa inpainting | Claid.ai API (50 free credits) |

### 📦 Batch Processor
Process entire folders of photos at once with:
- **Resize** — Preset sizes, custom dimensions, or long-edge scaling
- **Auto-enhance** — Auto levels, auto contrast, sharpen, denoise
- **Watermark** — Logo overlay with position, scale, opacity, and margin controls
- **AI Tools** — Smart Upscale, Beauty Filter, and Face Restore in batch
- **Color Filters** — Apply any adjustment preset across all images
- **Live Preview** — Before/after split-view comparison with slider
- **Export** — JPEG/PNG/WebP with quality control and custom naming

### 🎯 Additional Features
- 🌙 Dark mode / Light mode
- 📱 Fully responsive (desktop + mobile)
- 💾 Export at original resolution with all edits baked in
- 🔒 100% private — your photos never leave your browser

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ 
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/3zjay/ez-photolab.git
cd ez-photolab

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready to deploy anywhere (Vercel, Netlify, GitHub Pages, etc.).

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 |
| **Bundler** | Vite 5 |
| **Styling** | Vanilla CSS + Tailwind CSS 4 |
| **AI / ML** | MediaPipe Tasks Vision (WASM/GPU) |
| **Background Removal** | @imgly/background-removal |
| **Image Processing** | Canvas API, ImageData pixel manipulation |

---

## 📁 Project Structure

```
src/
├── App.jsx                  # Main app — state management, processing pipelines
├── BatchPage.jsx            # Batch processor UI and logic
├── Preview.jsx              # Image preview with zoom, pan, crop overlay
├── faceMasking.js           # MediaPipe face mesh → skin mask generation
├── faceRestore.js           # Local face restoration pipeline
├── utils.js                 # Image processing utilities (filters, sharpen, denoise)
├── constants.js             # Filter definitions, presets, defaults
├── index.css                # Global styles
├── main.jsx                 # React entry point
└── components/
    ├── panels/
    │   ├── EditPanel.jsx    # Color filters, AI tools UI
    │   ├── ToolsPanel.jsx   # BG removal, object removal, API keys
    │   ├── AdjustPanel.jsx  # Crop, rotate, flip controls
    │   └── OverlayPanel.jsx # Text overlay management
    └── ui/
        └── common.jsx       # Shared UI components (buttons, sliders, etc.)
```

---

## 🔑 API Keys (Optional)

Most features are **completely free** and run locally. Two optional cloud features require API keys:

| Service | Feature | Free Tier | Setup |
|---------|---------|-----------|-------|
| **Claid.ai** | Object Removal | 50 free credits | [Sign up](https://claid.ai) → Settings → API |
| **fal.ai** | Cloud Face Restore (advanced) | Pay-per-use | [Sign up](https://fal.ai) → Dashboard → Keys |

Enter keys in the **Tools** tab → **API Configuration** section.

---

## 📄 License

MIT — free for personal and commercial use.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/3zjay">3zjay</a>
</p>
