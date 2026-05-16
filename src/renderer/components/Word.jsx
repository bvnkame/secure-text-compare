import { sideKind, wordTooltip } from "../diff/group.js";

export default function Word({ row, side, highlight }) {
  const text = side === "left" ? row.left : row.right;
  const index = side === "left" ? row.leftIndex : row.rightIndex;
  if (!text) return null;

  const kind = sideKind(row, side);
  const shouldHighlight = highlight && kind !== "equal";
  const cls = ["word", kind, shouldHighlight ? "highlight" : ""].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      data-kind={kind}
      data-info={wordTooltip(row, side)}
      data-index={index || ""}
    >
      {text}
    </span>
  );
}
