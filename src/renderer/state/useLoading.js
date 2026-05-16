import { useCallback, useRef, useState } from "react";

export function useLoading() {
  const [state, setState] = useState({ visible: true, message: "Preparing workspace..." });
  const depth = useRef(1);

  const show = useCallback((message = "Working...") => {
    depth.current += 1;
    setState({ visible: true, message });
  }, []);

  const hide = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setState((s) => ({ ...s, visible: false }));
  }, []);

  const finishInitial = useCallback(() => {
    window.setTimeout(() => {
      depth.current = 0;
      setState((s) => ({ ...s, visible: false }));
    }, 420);
  }, []);

  return { state, show, hide, finishInitial };
}
