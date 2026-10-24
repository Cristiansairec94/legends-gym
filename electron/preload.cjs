const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  toggleFullScreen: () => ipcRenderer.send('window:toggle-fullscreen'),
  exitFullScreen: () => ipcRenderer.send('window:exit-fullscreen'),
  enterFullScreen: () => ipcRenderer.send('window:enter-fullscreen'),
  isFullScreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  onFullscreenChange: (callback) => {
    const handler = (_event, isFull) => {
      try { callback(isFull); } catch {}
    };
    ipcRenderer.on('window:fullscreen-changed', handler);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', handler);
  },
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  appMode: process.env.APP_MODE || 'main',
});
