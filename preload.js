const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Overlay actions
  acceptCorrection: (text) => ipcRenderer.send('accept-correction', text),
  rejectCorrection: () => ipcRenderer.send('reject-correction'),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  closeSettings: () => ipcRenderer.send('close-settings'),
  
  // Event listeners
  onSetThinking: (callback) => ipcRenderer.on('set-thinking', (_, isThinking) => callback(isThinking)),
  onShowDiff: (callback) => ipcRenderer.on('show-diff', (_, data) => callback(data)),
  onShowError: (callback) => ipcRenderer.on('show-error', (_, message) => callback(message))
});
