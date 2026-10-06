const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('photoLab', Object.freeze({
  desktop: true,
  environment: 'preview',
  pickFolder: options => invoke('files:folder', options),
  openPhoto: () => invoke('files:open'),
  list: id => invoke('files:list', id),
  child: (id, name, kind, create) => invoke('files:child', id, name, kind, create),
  read: id => invoke('files:read', id),
  write: (id, bytes, options) => invoke('files:write', id, bytes, options),
  saveImage: (name, bytes) => invoke('files:save', name, bytes),
  saveProject: data => invoke('project:save', data),
  openProject: () => invoke('project:open'),
  autosave: data => invoke('project:autosave', data),
  recovery: () => invoke('project:recovery'),
  setDirty: dirty => invoke('window:dirty', Boolean(dirty)),
  onMenu: callback => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('menu:command', listener);
    return () => ipcRenderer.removeListener('menu:command', listener);
  },
}));
