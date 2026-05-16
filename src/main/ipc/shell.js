import { ipcMain, shell } from "electron";

export function registerShellHandlers() {
  ipcMain.handle("shell:openPath", async (_event, filePath) => {
    if (!filePath) {
      return { ok: false, error: "No file path provided." };
    }

    const error = await shell.openPath(filePath);
    return error ? { ok: false, error } : { ok: true };
  });
}
