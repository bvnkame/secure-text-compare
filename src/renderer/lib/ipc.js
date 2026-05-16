const api = typeof window !== "undefined" ? window.secureTextCompare : undefined;

export function hasNative() {
  return Boolean(api);
}

export function openTextFile() {
  return api?.openTextFile?.() ?? Promise.resolve(null);
}

export function saveSession(session) {
  return api?.saveSession?.(session) ?? Promise.resolve(null);
}

export function openSession() {
  return api?.openSession?.() ?? Promise.resolve(null);
}

export function saveHtmlReport(html, metadata) {
  return api?.saveHtmlReport?.(html, metadata) ?? Promise.resolve(null);
}

export function openPath(filePath) {
  return api?.openPath?.(filePath) ?? Promise.resolve({ ok: false, error: "Native bridge unavailable." });
}

export function checkForUpdates() {
  return api?.checkForUpdates?.() ?? Promise.resolve({ state: "disabled", message: "Update checks unavailable." });
}

export function installUpdate() {
  return api?.installUpdate?.() ?? Promise.resolve({ state: "disabled", message: "Updates unavailable." });
}

export function onUpdateStatus(callback) {
  return api?.onUpdateStatus?.(callback) ?? (() => {});
}
