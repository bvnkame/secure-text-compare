const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 980,
    minHeight: 680,
    title: "LocalDiff",
    backgroundColor: "#090d14",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
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
      title: "Save LocalDiff session",
      defaultPath: "localdiff-session.json",
      filters: [
        { name: "LocalDiff Session", extensions: ["json"] }
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
      title: "Open LocalDiff session",
      properties: ["openFile"],
      filters: [
        { name: "LocalDiff Session", extensions: ["json"] },
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
      title: "Export LocalDiff HTML report",
      defaultPath: "localdiff-report.html",
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
