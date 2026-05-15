const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("localDiff", {
  openTextFile: () => ipcRenderer.invoke("dialog:openTextFile"),
  saveSession: (session) => ipcRenderer.invoke("dialog:saveSession", session),
  openSession: () => ipcRenderer.invoke("dialog:openSession"),
  saveHtmlReport: (html) => ipcRenderer.invoke("dialog:saveHtmlReport", html)
});
