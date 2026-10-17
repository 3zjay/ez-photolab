import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["libraw-wasm"]
  },
  resolve: {
    dedupe: ["react", "react-dom"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase") || id.includes("@firebase")) return "vendor-firebase";
            if (id.includes("@mediapipe")) return "vendor-mediapipe";
            if (id.includes("@xenova") || id.includes("@huggingface") || id.includes("onnxruntime")) return "vendor-ai";
            if (id.includes("react-dom") || id.includes("react/")) return "vendor-react";
          }
        }
      }
    }
  }
})
