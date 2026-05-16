import { forwardRef, useEffect, useRef } from "react";
import { groupTitle, markerKind } from "../diff/group.js";

const MiniMap = forwardRef(function MiniMap(
  { rows, groups, zoom, changeFilter, viewportTop, viewportHeight, onScroll, onMarkerClick, onTrackClick, onViewportPointerDown },
  ref
) {
  const markersRef = useRef(null);
  const totalRows = Math.max(rows.length, 1);
  const decoratedGroups = groups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => group.type !== "equal");

  useEffect(() => {
    if (ref?.current) ref.current.style.setProperty("--minimap-zoom", `${zoom / 100}`);
  }, [zoom, ref]);

  return (
    <aside
      ref={ref}
      className={`minimap ${changeFilter !== "all" ? "filter-active" : ""}`.trim()}
      data-filter={changeFilter}
      aria-label="Change minimap"
      onScroll={onScroll}
      onClick={(event) => {
        const marker = event.target.closest(".minimap-marker");
        if (marker) {
          onMarkerClick(Number(marker.dataset.ratio), Number(marker.dataset.groupIndex));
          return;
        }
        const rect = markersRef.current.getBoundingClientRect();
        const ratio = Math.min(
          1,
          Math.max(0, (event.clientY - rect.top) / markersRef.current.offsetHeight)
        );
        onTrackClick(ratio);
      }}
    >
      <div ref={markersRef} className="minimap-markers">
        {decoratedGroups.map(({ group, index }) => {
          const top = groups.length > 1 ? (index / (groups.length - 1)) * 100 : 0;
          const baseHeight = (group.rows.length / totalRows) * 100;
          const kind = markerKind(group);
          const firstChanged = group.rows.find((r) => r.group);
          const label =
            kind === "added"
              ? `+${firstChanged?.addedCount || group.rows.length}`
              : kind === "removed"
                ? `-${firstChanged?.removedCount || group.rows.length}`
                : "";
          const hide = changeFilter !== "all" && kind !== changeFilter;
          return (
            <button
              key={group.key}
              type="button"
              className={`minimap-marker ${kind} ${hide ? "filter-hidden" : ""}`.trim()}
              style={{ top: `${top}%`, "--marker-height": `${baseHeight}%` }}
              data-kind={kind}
              data-ratio={top / 100}
              data-group-index={index}
              title={groupTitle(group, "left")}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div
        className="minimap-viewport"
        style={{ top: `${viewportTop}px`, height: `${viewportHeight}px` }}
        onPointerDown={onViewportPointerDown}
        onClick={(e) => e.stopPropagation()}
      />
    </aside>
  );
});

export default MiniMap;
