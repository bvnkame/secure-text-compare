import { dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { readComparableFile } from "./pdf.js";

const TEXT_EXTENSIONS = ["txt", "md", "json", "csv", "log", "xml", "html", "css", "js", "ts"];

export function registerFileHandlers() {
  ipcMain.handle("dialog:openTextFile", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose a text or PDF file",
      properties: ["openFile"],
      filters: [
        { name: "Text and PDF files", extensions: [...TEXT_EXTENSIONS, "pdf"] },
        { name: "PDF files", extensions: ["pdf"] },
        { name: "Text files", extensions: TEXT_EXTENSIONS },
        { name: "All files", extensions: ["*"] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const comparable = await readComparableFile(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      text: comparable.text,
      type: comparable.type,
      pages: comparable.pages
    };
  });

  ipcMain.handle("dialog:saveSession", async (_event, session) => {
    const result = await dialog.showSaveDialog({
      title: "Save Secure Text Compare session",
      defaultPath: "secure-text-compare-session.json",
      filters: [{ name: "Secure Text Compare Session", extensions: ["json"] }]
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
    return { path: filePath, session: JSON.parse(text) };
  });
}
