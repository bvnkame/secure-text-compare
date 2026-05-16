import { app, BrowserWindow } from "electron";
import { createMainWindow, getMainWindow } from "./window.js";
import { setupAutoUpdater } from "./updater.js";
import { registerUpdaterHandlers } from "./ipc/updater-handlers.js";
import { registerFileHandlers } from "./ipc/files.js";
import { registerReportHandlers } from "./ipc/report.js";
import { registerShellHandlers } from "./ipc/shell.js";

app.whenReady().then(() => {
  setupAutoUpdater(() => getMainWindow());
  registerUpdaterHandlers();
  registerFileHandlers();
  registerReportHandlers(() => getMainWindow());
  registerShellHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
