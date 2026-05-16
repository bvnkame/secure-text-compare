import { forwardRef, Fragment } from "react";
import Word from "./Word.jsx";
import { buildWordMeta, groupTitle, markerKind } from "../diff/group.js";
import { splitSourceTokens } from "../diff/tokenize.js";

function OneLine({ rows, side, highlight }) {
  const items = [];
  rows.forEach((row, i) => {
    const text = side === "left" ? row.left : row.right;
    if (!text) return;
    if (items.length > 0) items.push(<span key={`s-${i}`}> </span>);
    items.push(<Word key={`w-${i}`} row={row} side={side} highlight={highlight} />);
  });
  return <div className="diff-text">{items}</div>;
}

function Source({ text, meta, highlight }) {
  let wordIndex = 0;
  const chunks = splitSourceTokens(text).map((token, i) => {
    if (/^\s+$/.test(token)) return <Fragment key={i}>{token}</Fragment>;
    wordIndex += 1;
    const entry = meta.get(wordIndex) || { kind: "equal", info: `Unchanged word ${wordIndex}` };
    const shouldHighlight = highlight && entry.kind !== "equal";
    const cls = ["word", entry.kind, shouldHighlight ? "highlight" : ""].filter(Boolean).join(" ");
    return (
      <span
        key={i}
        className={cls}
        data-kind={entry.kind}
        data-info={entry.info}
        data-index={wordIndex}
      >
        {token}
      </span>
    );
  });
  return <div className="diff-text">{chunks}</div>;
}

function Grouped({ groups, highlight, changeFilter }) {
  return (
    <div className="diff-text diff-groups">
      {groups.map((group, groupIndex) => {
        const kind = markerKind(group);
        const hide = changeFilter !== "all" && group.type !== "equal" && kind !== changeFilter;
        return (
          <section
            key={group.key}
            className={`group-block ${group.type} ${hide ? "filter-hidden" : ""}`.trim()}
            data-kind={kind}
            data-group-index={groupIndex}
          >
            <div className="group-title">{groupTitle(group, "left")}</div>
            <div className="group-row">
              {["left", "right"].map((side) => {
                const words = [];
                group.rows.forEach((row, i) => {
                  const text = side === "left" ? row.left : row.right;
                  if (!text) return;
                  if (words.length > 0) words.push(<span key={`s${i}`}> </span>);
                  words.push(<Word key={`w${i}`} row={row} side={side} highlight={highlight} />);
                });
                return (
                  <div key={side} className={`group-cell ${side} ${words.length ? "" : "empty"}`.trim()}>
                    {words.length ? words : " "}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const DiffPage = forwardRef(function DiffPage(
  { id, rows, groups, side, mode, wordWrap, highlight, sourceText, onScroll, changeFilter, isHidden },
  ref
) {
  const classes = [
    "diff-page",
    wordWrap ? "wrap" : "",
    mode === "source" ? "source-format" : "",
    mode === "one-line" ? "one-line-format" : "",
    mode === "grouped" ? "grouped-format" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id={id}
      ref={ref}
      className={classes}
      style={isHidden ? { display: "none" } : undefined}
      aria-label={`${side} diff output`}
      onScroll={onScroll}
    >
      {mode === "source" ? (
        <Source text={sourceText} meta={buildWordMeta(rows, side)} highlight={highlight} />
      ) : mode === "grouped" ? (
        <Grouped groups={groups} highlight={highlight} changeFilter={changeFilter} />
      ) : (
        <OneLine rows={rows} side={side} highlight={highlight} />
      )}
    </div>
  );
});

export default DiffPage;
