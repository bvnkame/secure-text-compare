const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const fs = require("node:fs/promises");

let mainWindow = null;
let updateCheckInProgress = false;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateStatus(status) {
  mainWindow?.webContents.send("updater:status", status);
}

function setupAutoUpdater() {
  autoUpdater.on("checking-for-update", () => {
    updateCheckInProgress = true;
    sendUpdateStatus({ state: "checking", message: "Checking for updates..." });
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus({
      state: "available",
      message: `Downloading Secure Text Compare ${info.version}...`,
      version: info.version
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    updateCheckInProgress = false;
    sendUpdateStatus({
      state: "current",
      message: `Secure Text Compare ${info.version || app.getVersion()} is up to date.`,
      version: info.version || app.getVersion()
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({
      state: "downloading",
      message: `Downloading update ${Math.round(progress.percent)}%...`,
      percent: Math.round(progress.percent)
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateCheckInProgress = false;
    sendUpdateStatus({
      state: "downloaded",
      message: `Secure Text Compare ${info.version} is ready to install.`,
      version: info.version
    });
  });

  autoUpdater.on("error", (error) => {
    updateCheckInProgress = false;
    sendUpdateStatus({
      state: "error",
      message: error?.message ? `Update check failed: ${error.message}` : "Update check failed."
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 980,
    minHeight: 680,
    title: "Secure Text Compare",
    backgroundColor: "#090d14",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow = win;
  win.loadFile(path.join(__dirname, "..", "index.html"));

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

app.whenReady().then(() => {
  setupAutoUpdater();

  ipcMain.handle("updater:check", async () => {
    if (!app.isPackaged) {
      return {
        state: "disabled",
        message: "Update checks are available in packaged builds."
      };
    }

    if (updateCheckInProgress) {
      return {
        state: "checking",
        message: "An update check is already running."
      };
    }

    try {
      updateCheckInProgress = true;
      const result = await autoUpdater.checkForUpdates();
      return {
        state: "checking",
        message: result ? "Update check started." : "No update provider is configured."
      };
    } catch (error) {
      updateCheckInProgress = false;
      return {
        state: "error",
        message: error?.message ? `Update check failed: ${error.message}` : "Update check failed."
      };
    }
  });

  ipcMain.handle("updater:install", () => {
    if (!app.isPackaged) {
      return {
        state: "disabled",
        message: "Updates can only be installed from packaged builds."
      };
    }

    autoUpdater.quitAndInstall(false, true);
    return {
      state: "installing",
      message: "Installing update..."
    };
  });

  ipcMain.handle("dialog:openTextFile", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose a text file",
      properties: ["openFile"],
      filters: [
        { name: "Text files", extensions: ["txt", "md", "json", "csv", "log", "xml", "html", "css", "js", "ts"] },
        { name: "All files", extensions: ["*"] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const text = await fs.readFile(filePath, "utf8");
    return {
      name: path.basename(filePath),
      path: filePath,
      text
    };
  });

  ipcMain.handle("dialog:saveSession", async (_event, session) => {
    const result = await dialog.showSaveDialog({
      title: "Save Secure Text Compare session",
      defaultPath: "secure-text-compare-session.json",
      filters: [
        { name: "Secure Text Compare Session", extensions: ["json"] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.writeFile(result.filePath, JSON.stringify(session, null, 2), "utf8");
    return result.filePath;
  });

  ipcMain.handle("dialog:openSession", async () => {
    const result = await dialog.showOpenDialog({
      title: "Open Secure Text Compare session",
      properties: ["openFile"],
      filters: [
        { name: "Secure Text Compare Session", extensions: ["json"] },
        { name: "All files", extensions: ["*"] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const text = await fs.readFile(filePath, "utf8");
    return {
      path: filePath,
      session: JSON.parse(text)
    };
  });

  ipcMain.handle("dialog:saveHtmlReport", async (_event, html) => {
    const result = await dialog.showSaveDialog({
      title: "Export Secure Text Compare HTML report",
      defaultPath: "secure-text-compare-report.html",
      filters: [
        { name: "HTML Report", extensions: ["html"] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.writeFile(result.filePath, html, "utf8");
    return result.filePath;
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
