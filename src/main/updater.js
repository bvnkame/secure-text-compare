import { app } from "electron";
import pkg from "electron-updater";

let updateCheckInProgress = false;
let cachedAutoUpdater = null;

export function getAutoUpdater() {
  if (!cachedAutoUpdater) {
    cachedAutoUpdater = pkg.autoUpdater;
  }
  return cachedAutoUpdater;
}

export function isUpdateCheckInProgress() {
  return updateCheckInProgress;
}

export function setUpdateCheckInProgress(value) {
  updateCheckInProgress = value;
}

export function setupAutoUpdater(getWindow) {
  const autoUpdater = getAutoUpdater();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (status) => {
    const win = getWindow();
    win?.webContents.send("updater:status", status);
  };

  autoUpdater.on("checking-for-update", () => {
    updateCheckInProgress = true;
    send({ state: "checking", message: "Checking for updates..." });
  });

  autoUpdater.on("update-available", (info) => {
    send({
      state: "available",
      message: `Downloading Secure Text Compare ${info.version}...`,
      version: info.version
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    updateCheckInProgress = false;
    send({
      state: "current",
      message: `Secure Text Compare ${info.version || app.getVersion()} is up to date.`,
      version: info.version || app.getVersion()
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    send({
      state: "downloading",
      message: `Downloading update ${Math.round(progress.percent)}%...`,
      percent: Math.round(progress.percent)
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateCheckInProgress = false;
    send({
      state: "downloaded",
      message: `Secure Text Compare ${info.version} is ready to install.`,
      version: info.version
    });
  });

  autoUpdater.on("error", (error) => {
    updateCheckInProgress = false;
    send({
      state: "error",
      message: error?.message ? `Update check failed: ${error.message}` : "Update check failed."
    });
  });
}
