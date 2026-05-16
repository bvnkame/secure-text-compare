const api = typeof window !== "undefined" ? window.secureTextCompare : undefined;

export function hasNative() {
  return Boolean(api);
}

const TEXT_EXTENSIONS = ["txt", "md", "json", "csv", "log", "xml", "html", "css", "js", "ts"];

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0] || null;
        input.remove();
        resolve(file);
      },
      { once: true }
    );
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    });
    input.click();
  });
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  });
}

async function webOpenTextFile() {
  const accept = "." + TEXT_EXTENSIONS.join(",.") + ",text/plain,application/json,application/pdf";
  const file = await pickFile(accept);
  if (!file) return null;
  if (file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("PDF text extraction is desktop-only. Install the app to compare PDFs.");
  }
  const text = await readAsText(file);
  return { name: file.name, path: file.name, text, type: "text", pages: null };
}

async function webOpenSession() {
  const file = await pickFile("application/json,.json");
  if (!file) return null;
  const text = await readAsText(file);
  let session;
  try {
    session = JSON.parse(text);
  } catch {
    throw new Error("Selected file is not a valid Secure Text Compare session JSON.");
  }
  return { path: file.name, session };
}

async function webSaveSession(session) {
  const filename = "secure-text-compare-session.json";
  downloadBlob(JSON.stringify(session, null, 2), filename, "application/json");
  return filename;
}

async function webSaveHtmlReport(html, metadata) {
  const sanitize = (v) => String(v || "").replace(/[^\w.-]+/g, "-").slice(0, 40);
  const left = sanitize(metadata?.leftName);
  const right = sanitize(metadata?.rightName);
  const compared = [left, right].filter(Boolean).join("_vs_");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
  const fileName = compared
    ? `secure-text-compare_${compared}_${stamp}.html`
    : `secure-text-compare-report_${stamp}.html`;
  downloadBlob(html, fileName, "text/html");
  return {
    fileName,
    filePath: fileName,
    folderPath: "Downloads",
    opened: false,
    exportedAt: new Date().toISOString()
  };
}

export function openTextFile() {
  return api?.openTextFile ? api.openTextFile() : webOpenTextFile();
}

export function saveSession(session) {
  return api?.saveSession ? api.saveSession(session) : webSaveSession(session);
}

export function openSession() {
  return api?.openSession ? api.openSession() : webOpenSession();
}

export function saveHtmlReport(html, metadata) {
  return api?.saveHtmlReport ? api.saveHtmlReport(html, metadata) : webSaveHtmlReport(html, metadata);
}

export function openPath(filePath) {
  if (api?.openPath) return api.openPath(filePath);
  return Promise.resolve({ ok: false, error: "Open path is desktop-only." });
}

export function checkForUpdates() {
  return api?.checkForUpdates?.() ?? Promise.resolve({ state: "disabled", message: "Update checks unavailable on web." });
}

export function installUpdate() {
  return api?.installUpdate?.() ?? Promise.resolve({ state: "disabled", message: "Updates unavailable on web." });
}

export function onUpdateStatus(callback) {
  return api?.onUpdateStatus?.(callback) ?? (() => {});
}
