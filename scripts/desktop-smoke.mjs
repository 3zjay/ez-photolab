import { build } from 'vite';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
await build({ mode: 'desktop', build: { outDir: '.desktop-test/build', rollupOptions: { input: ['index.html', 'tests/renderer.html'] } } });
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), ['.', '--smoke-test'], { stdio: 'inherit', env, windowsHide: true });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
