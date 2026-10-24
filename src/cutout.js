import { cutoutConfig } from './cutoutConfig';
let worker, sequence = 0;
const pending = new Map();
function request(action, input, progress) {
  if (!worker) {
    worker = new Worker(new URL('./cutout-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const entry = pending.get(data.id); if (!entry) return;
      if (data.progress) { entry.progress?.(...data.progress); return; }
      pending.delete(data.id); data.error ? entry.reject(new Error(data.error)) : entry.resolve(data.result);
    };
    worker.onerror = event => {
      for (const entry of pending.values()) entry.reject(new Error(event.message || 'Background removal stopped. Retry AI setup.'));
      pending.clear(); worker.terminate(); worker = null;
    };
  }
  return new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject, progress });
    worker.postMessage({ id, action, input, publicPath: cutoutConfig().publicPath });
  });
}
export const prepareCutout = () => request('prepare');
export const removeBackground = (input, config = {}) => request('remove', input, config.progress);
