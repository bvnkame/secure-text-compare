import { useEffect, useState } from "react";
import { onUpdateStatus } from "../lib/ipc.js";

export function useUpdater() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const unsubscribe = onUpdateStatus(setStatus);
    return () => unsubscribe?.();
  }, []);

  return [status, setStatus];
}
