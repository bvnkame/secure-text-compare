import { app, ipcMain } from "electron";
import { getAutoUpdater, isUpdateCheckInProgress, setUpdateCheckInProgress } from "../updater.js";

export function registerUpdaterHandlers() {
  ipcMain.handle("updater:check", async () => {
    const autoUpdater = getAutoUpdater();
    if (!app.isPackaged) {
      return {
        state: "disabled",
        message: "Update checks are available in packaged builds."
      };
    }

    if (isUpdateCheckInProgress()) {
      return {
        state: "checking",
        message: "An update check is already running."
      };
    }

    try {
      setUpdateCheckInProgress(true);
      const result = await autoUpdater.checkForUpdates();
      return {
        state: "checking",
        message: result ? "Update check started." : "No update provider is configured."
      };
    } catch (error) {
      setUpdateCheckInProgress(false);
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

    getAutoUpdater().quitAndInstall(false, true);
    return {
      state: "installing",
      message: "Installing update..."
    };
  });
}
