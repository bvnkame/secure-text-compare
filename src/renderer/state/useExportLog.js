import { useCallback, useEffect, useState } from "react";
import { EXPORT_LOG_KEY, MAX_EXPORT_LOGS } from "./constants.js";

function loadInitial() {
  try {
    const raw = JSON.parse(localStorage.getItem(EXPORT_LOG_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function useExportLog() {
  const [history, setHistory] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(EXPORT_LOG_KEY, JSON.stringify(history.slice(0, MAX_EXPORT_LOGS)));
    } catch {}
  }, [history]);

  const add = useCallback((result, metadata) => {
    setHistory((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          fileName: result.fileName,
          filePath: result.filePath,
          folderPath: result.folderPath,
          exportedAt: result.exportedAt || new Date().toISOString(),
          opened: Boolean(result.opened),
          leftName: metadata.leftName,
          rightName: metadata.rightName,
          added: metadata.summary?.added ?? 0,
          removed: metadata.summary?.removed ?? 0,
          changedGroups: metadata.summary?.changedGroups ?? 0
        },
        ...prev
      ].slice(0, MAX_EXPORT_LOGS)
    );
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, add, clear };
}
