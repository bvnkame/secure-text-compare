import { useEffect, useState } from "react";

export default function Tooltip() {
  const [state, setState] = useState({ visible: false, text: "", x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event) => {
      const word = event.target.closest?.(".word.highlight");
      if (!word) {
        setState((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }
      setState({
        visible: true,
        text: word.dataset.info || "",
        x: Math.min(event.clientX + 16, window.innerWidth - 340),
        y: event.clientY + 16
      });
    };
    const onLeave = () => setState((s) => ({ ...s, visible: false }));
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      role="tooltip"
      className={state.visible ? "tooltip visible" : "tooltip"}
      style={{ left: state.x, top: state.y }}
    >
      {state.text}
    </div>
  );
}
