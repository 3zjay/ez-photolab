import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    ...(mode === 'desktop' ? [{ name: 'desktop-html', transformIndexHtml: html => html.replace(/<link rel="manifest"[^>]*>/, '').replace(/<link[^>]+https:\/\/fonts\.(googleapis|gstatic)\.com[^>]*>/g, '').replace(/<title>.*?<\/title>/, '<title>PHOTOlab Desktop Preview</title>') }] : [])
  ],
  build: { outDir: mode === 'desktop' ? 'dist-desktop' : 'dist' },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["libraw-wasm"]
  },
  resolve: {
    dedupe: ["react", "react-dom"]
  }
}))
