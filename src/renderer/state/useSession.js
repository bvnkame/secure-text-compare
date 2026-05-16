import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SESSION, STORAGE_KEY } from "./constants.js";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SESSION;
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SESSION;
  }
}

export function useSession() {
  const [session, setSession] = useState(loadInitial);
  const saveTimer = useRef(0);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {}
    }, 120);

    return () => window.clearTimeout(saveTimer.current);
  }, [session]);

  const patch = useCallback((partial) => {
    setSession((prev) => ({ ...prev, ...partial }));
  }, []);

  const replace = useCallback((next) => {
    setSession({ ...DEFAULT_SESSION, ...next });
  }, []);

  return [session, patch, replace];
}
