export function sideKind(row, side) {
  if (row.type === "changed") return "changed";
  if (row.type === "removed" && side === "left") return "removed";
  if (row.type === "added" && side === "right") return "added";
  if ((side === "left" && !row.left) || (side === "right" && !row.right)) return "gap";
  return "equal";
}

export function wordTooltip(row, side) {
  if (row.type === "equal") {
    const index = side === "left" ? row.leftIndex : row.rightIndex;
    return `Unchanged word ${index}`;
  }

  const leftRange = row.removedCount
    ? `left words ${row.startLeft}-${row.startLeft + row.removedCount - 1}`
    : "left none";
  const rightRange = row.addedCount
    ? `right words ${row.startRight}-${row.startRight + row.addedCount - 1}`
    : "right none";

  if (row.type === "changed") {
    return `Changed block ${row.group}: ${row.removedCount} removed, ${row.addedCount} added (${leftRange}; ${rightRange})`;
  }

  if (row.type === "removed") {
    return `Removed block ${row.group}: ${row.removedCount} word(s) from ${leftRange}`;
  }

  return `Added block ${row.group}: ${row.addedCount} word(s) at ${rightRange}`;
}

export function groupRows(rows) {
  const groups = [];

  for (const row of rows) {
    const key = row.type === "equal" ? "equal" : `change-${row.group}`;
    const last = groups.at(-1);

    if (last && last.key === key) {
      last.rows.push(row);
      continue;
    }

    groups.push({
      key,
      type: row.type === "equal" ? "equal" : "diff",
      changeType: row.type,
      rows: [row]
    });
  }

  return groups;
}

export function markerKind(group) {
  const row = group.rows.find((item) => item.type !== "equal");
  return row ? row.type : "changed";
}

export function groupTitle(group, side) {
  if (group.type === "equal") {
    const first = group.rows[0];
    const last = group.rows.at(-1);
    const start = side === "left" ? first.leftIndex : first.rightIndex;
    const end = side === "left" ? last.leftIndex : last.rightIndex;
    return `Same words ${start}-${end}`;
  }

  const firstChanged = group.rows.find((row) => row.group);
  if (!firstChanged) return "Changed words";

  const leftEnd = firstChanged.startLeft + firstChanged.removedCount - 1;
  const rightEnd = firstChanged.startRight + firstChanged.addedCount - 1;
  return `Change ${firstChanged.group} · left ${firstChanged.startLeft}-${leftEnd} · right ${firstChanged.startRight}-${rightEnd}`;
}

export function buildWordMeta(rows, side) {
  const meta = new Map();
  for (const row of rows) {
    const index = side === "left" ? row.leftIndex : row.rightIndex;
    if (!index) continue;
    meta.set(index, { kind: sideKind(row, side), info: wordTooltip(row, side) });
  }
  return meta;
}
