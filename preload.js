const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  onMedia: (cb) => ipcRenderer.on('media', (_e, m) => cb(m)),
  cmd: (c) => ipcRenderer.send('cmd', c),
  lyrics: (q) => ipcRenderer.invoke('lyrics', q),
  fullscreen: () => ipcRenderer.send('fullscreen'),
  onTop: (v) => ipcRenderer.send('ontop', v),
  ytSearch: (q) => ipcRenderer.invoke('ytsearch', q),
  ytPort: () => ipcRenderer.invoke('ytport'),
  pickFile: () => ipcRenderer.invoke('pickFile')
});
