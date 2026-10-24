const states = new Map();
const pending = new Map();
const listeners = new Set();
export function modelStates() { return Object.fromEntries(states); }
export function subscribeModels(callback) { listeners.add(callback); return () => listeners.delete(callback); }
function update(id, status, detail = '') { states.set(id, { status, detail }); for (const callback of listeners) callback(modelStates()); }
export function loadModel(id, loader) {
  if (!pending.has(id)) {
    update(id, 'loading', 'Downloading or loading cached model…');
    pending.set(id, Promise.resolve().then(loader).then(value => { update(id, 'ready', 'Ready on this device'); return value; }, error => { pending.delete(id); update(id, 'error', error.message); throw error; }));
  }
  return pending.get(id);
}
