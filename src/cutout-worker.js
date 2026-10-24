import { preload, removeBackground } from '@imgly/background-removal';

self.onmessage = async ({ data: { id, action, input, publicPath } }) => {
  try {
    const config = { model: 'medium', publicPath, progress: (key, current, total) => self.postMessage({ id, progress: [key, current, total] }) };
    const result = action === 'prepare' ? await preload(config) : await removeBackground(input, config);
    self.postMessage({ id, result: result || true });
  } catch (error) { self.postMessage({ id, error: error.message }); }
};
