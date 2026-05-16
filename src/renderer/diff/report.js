import { escapeHtml } from "./tokenize.js";
import { groupRows, markerKind } from "./group.js";

function textForRows(rows, side) {
  return rows
    .map((row) => (side === "left" ? row.left : row.right))
    .filter(Boolean)
    .join(" ");
}

export function collectReportRows(latestRows, kind) {
  return groupRows(latestRows)
    .filter((group) => markerKind(group) === kind)
    .map((group) => {
      const first = group.rows.find((row) => row.group);
      return {
        group: first?.group || "",
        leftRange: first ? `${first.startLeft}-${first.startLeft + first.removedCount - 1}` : "",
        rightRange: first ? `${first.startRight}-${first.startRight + first.addedCount - 1}` : "",
        removed: textForRows(group.rows, "left"),
        added: textForRows(group.rows, "right")
      };
    });
}

export function exportSummary(latestRows) {
  const added = collectReportRows(latestRows, "added").length;
  const removed = collectReportRows(latestRows, "removed").length;
  const changedGroups = new Set(latestRows.filter((row) => row.group).map((row) => row.group)).size;
  return { added, removed, changedGroups };
}

function reportTable(title, rows, kind) {
  const body = rows.length
    ? rows
        .map(
          (row) => `
      <tr>
        <td>${escapeHtml(row.group)}</td>
        <td>${escapeHtml(kind === "added" ? row.rightRange : row.leftRange)}</td>
        <td>${escapeHtml(kind === "added" ? row.added : row.removed)}</td>
      </tr>
    `
        )
        .join("")
    : `<tr><td colspan="3" class="empty">No ${escapeHtml(title.toLowerCase())}</td></tr>`;

  return `
    <section class="${kind}">
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr><th>Group</th><th>Word range</th><th>Text</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `;
}

export function buildHtmlReport(latestRows) {
  const added = collectReportRows(latestRows, "added");
  const removed = collectReportRows(latestRows, "removed");
  const generatedAt = new Date().toLocaleString();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Secure Text Compare Report</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #090d14; color: #e7edf7; padding: 28px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    p { margin: 0 0 24px; color: #95a3b8; }
    section { margin: 0 0 28px; }
    h2 { margin: 0 0 10px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; background: #101722; border: 1px solid #243248; }
    th, td { border-bottom: 1px solid #243248; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { color: #95a3b8; font-size: 12px; text-transform: uppercase; }
    td { font: 13px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    th:first-child, td:first-child { width: 90px; }
    th:nth-child(2), td:nth-child(2) { width: 140px; }
    section.added h2, section.added tbody td { color: #62d394; }
    section.removed h2, section.removed tbody td { color: #ff7185; }
    .empty { color: #95a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>Secure Text Compare Report</h1>
  <p>Generated ${escapeHtml(generatedAt)} · ${added.length} green additions · ${removed.length} red removals</p>
  ${reportTable("Green additions", added, "added")}
  ${reportTable("Red removals", removed, "removed")}
</body>
</html>`;
}
