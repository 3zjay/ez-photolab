import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { readFileSync, cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundleCutout } from './scripts/model-assets.mjs';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(version) },
  worker: { format: 'es' },
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    (() => {
      const source = new URL('./node_modules/@xenova/transformers/node_modules/onnxruntime-web/dist/', import.meta.url);
      let output;
      let devCutout;
      return { name: 'local-transformers-runtime',
        configResolved(config) { output = resolve(config.root, config.build.outDir); },
        async closeBundle() {
          await bundleCutout(output);
          mkdirSync(resolve(output, 'transformers'), { recursive: true });
          for (const name of readdirSync(source).filter(name => name.endsWith('.wasm'))) cpSync(new URL(name, source), resolve(output, 'transformers', name));
          writeFileSync(resolve(output, 'sw.js'), readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8').replace(/photolab-cache-v[\d.]+/, `photolab-cache-v${version}`));
        },
        configureServer(server) {
          server.middlewares.use('/cutout', async (req, res, next) => {
            const name = (req.url || '').split('?')[0].replace(/^\//, '');
            if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return next();
            try {
              await (devCutout ||= bundleCutout(resolve('.model-assets/dev')));
              res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json' : 'application/octet-stream');
              res.end(readFileSync(resolve('.model-assets/dev/cutout', name)));
            } catch (error) { devCutout = null; next(error); }
          });
          server.middlewares.use('/transformers', (req, res, next) => {
          const name = (req.url || '').split('?')[0].replace(/^\//, '');
          if (!/^ort-wasm[-a-z]*\.wasm$/.test(name)) return next();
          try { res.setHeader('Content-Type', 'application/wasm'); res.end(readFileSync(new URL(name, source))); } catch { next(); }
        }); },
      };
    })(),
    (() => {
      let output;
      return { name: 'local-mediapipe-runtime',
        configResolved(config) { output = resolve(config.root, config.build.outDir); },
        closeBundle() { mkdirSync(resolve(output, 'mediapipe'), { recursive: true }); cpSync(new URL('./node_modules/@mediapipe/tasks-vision/wasm', import.meta.url), resolve(output, 'mediapipe/wasm'), { recursive: true }); },
        configureServer(server) { server.middlewares.use('/mediapipe/wasm', async (req, res, next) => {
          const name = (req.url || '').split('?')[0].replace(/^\//, '');
          if (!/^vision_wasm_[a-z_]+\.(js|wasm)$/.test(name)) return next();
          try { const data = readFileSync(new URL(`./node_modules/@mediapipe/tasks-vision/wasm/${name}`, import.meta.url)); res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'); res.end(data); } catch { next(); }
        }); },
      };
    })(),
    ...(mode === 'desktop' ? [{ name: 'desktop-html', transformIndexHtml: html => html.replace(/<link rel="manifest"[^>]*>/, '').replace(/<link[^>]+https:\/\/fonts\.(googleapis|gstatic)\.com[^>]*>/g, '').replace(/<title>.*?<\/title>/, '<title>PHOTOlab Desktop Preview</title>') }] : [])
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
    outDir: mode === 'desktop' ? 'dist-desktop' : 'dist',
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
}))
