const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("secureTextCompare", {
  openTextFile: () => ipcRenderer.invoke("dialog:openTextFile"),
  saveSession: (session) => ipcRenderer.invoke("dialog:saveSession", session),
  openSession: () => ipcRenderer.invoke("dialog:openSession"),
  saveHtmlReport: (html, metadata) => ipcRenderer.invoke("dialog:saveHtmlReport", html, metadata),
  openPath: (filePath) => ipcRenderer.invoke("shell:openPath", filePath),
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  }
});
