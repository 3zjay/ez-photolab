const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('photoLab', Object.freeze({
  desktop: true,
  environment: 'connected',
  signIn: () => invoke('auth:sign-in'),
  openBilling: url => invoke('billing:open', url),
  pickFolder: options => invoke('files:folder', options),
  openPhoto: () => invoke('files:open'),
  list: id => invoke('files:list', id),
  child: (id, name, kind, create) => invoke('files:child', id, name, kind, create),
  read: id => invoke('files:read', id),
  write: (id, bytes, options) => invoke('files:write', id, bytes, options),
  copyFile: (sourceId, targetDirId, newName) => invoke('files:copy', sourceId, targetDirId, newName),
  moveFile: (sourceId, targetDirId, newName) => invoke('files:move', sourceId, targetDirId, newName),
  saveImage: (name, bytes) => invoke('files:save', name, bytes),
  saveProject: data => invoke('project:save', data),
  openProject: () => invoke('project:open'),
  autosave: data => invoke('project:autosave', data),
  recovery: () => invoke('project:recovery'),
  saveWorkspace: data => invoke('workspace:save', data),
  recoverWorkspace: () => invoke('workspace:recover'),
  setDirty: dirty => invoke('window:dirty', Boolean(dirty)),
  preventSleep: enable => invoke('power:prevent-sleep', Boolean(enable)),
  setProgress: ratio => invoke('window:progress', ratio),
  onFlush: callback => {
    const listener = async (_event, id) => {
      try { await callback(); await invoke('workspace:flushed', id, true); }
      catch { await invoke('workspace:flushed', id, false); }
    };
    ipcRenderer.on('workspace:flush', listener);
    return () => ipcRenderer.removeListener('workspace:flush', listener);
  },
  onMenu: callback => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('menu:command', listener);
    return () => ipcRenderer.removeListener('menu:command', listener);
  },
}));
