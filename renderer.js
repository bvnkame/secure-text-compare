const leftInput = document.querySelector("#leftInput");
const rightInput = document.querySelector("#rightInput");
const loadingScreen = document.querySelector("#loadingScreen");
const loadingMessage = document.querySelector("#loadingMessage");
const leftDiff = document.querySelector("#leftDiff");
const rightDiff = document.querySelector("#rightDiff");
const diffPages = document.querySelector(".diff-pages");
const editors = document.querySelector(".editors");
const appShell = document.querySelector(".app-shell");
const miniMap = document.querySelector("#miniMap");
const miniMapMarkers = document.querySelector("#miniMapMarkers");
const miniMapViewport = document.querySelector("#miniMapViewport");
const tooltip = document.querySelector("#tooltip");
const inlineWords = document.querySelector("#inlineWords");
const wordWrap = document.querySelector("#wordWrap");
const displayMode = document.querySelector("#displayMode");
const changeFilter = document.querySelector("#changeFilter");
const themeMode = document.querySelector("#themeMode");
const changeCount = document.querySelector("#changeCount");
const wordCount = document.querySelector("#lineCount");
const leftFileName = document.querySelector("#leftFileName");
const rightFileName = document.querySelector("#rightFileName");
const hoverHint = document.querySelector("#hoverHint");
const zoomValue = document.querySelector("#zoomValue");
const resultSearch = document.querySelector("#resultSearch");
const searchPrev = document.querySelector("#searchPrev");
const searchNext = document.querySelector("#searchNext");
const searchCount = document.querySelector("#searchCount");
const exportReport = document.querySelector("#exportReport");
const exportLogs = document.querySelector("#exportLogs");
const exportLogModal = document.querySelector("#exportLogModal");
const exportLogList = document.querySelector("#exportLogList");
const exportLogSummary = document.querySelector("#exportLogSummary");
const closeExportLogs = document.querySelector("#closeExportLogs");
const doneExportLogs = document.querySelector("#doneExportLogs");
const clearExportLogs = document.querySelector("#clearExportLogs");
const checkDiff = document.querySelector("#checkDiff");
const checkUpdate = document.querySelector("#checkUpdate");

const STORAGE_KEY = "secure-text-compare.session.v1";
const EXPORT_LOG_KEY = "secure-text-compare.export-log.v1";
const MAX_EXPORT_LOGS = 50;
const DEFAULT_ZOOM = 100;

let syncLock = false;
let renderTimer = 0;
let saveTimer = 0;
let zoom = DEFAULT_ZOOM;
let editorLeftSize = 50;
let diffLeftSize = 50;
let editorsHeight = 280;
let miniMapZoom = 100;
let searchIndex = 0;
let latestRows = [];
let searchMatches = [];
let updateReady = false;
let exportHistory = [];
let loadingDepth = 0;

const sampleLeft = `Release notes

Added project import from local text files.
Improved comparison rendering for longer documents.
Fixed a layout issue in the review sidebar.

Known issues
- Large binary files are not supported.
- iOS packaging needs a native wrapper.`;

const sampleRight = `Release notes

Added project import from local text and markdown files.
Improved comparison rendering for longer documents with synchronized scrolling.
Fixed a layout issue in the review panel.
Added hover metadata for changed words.

Known issues
- Large binary files are not supported.`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showLoading(message = "Working...") {
  loadingDepth += 1;
  loadingMessage.textContent = message;
  loadingScreen.classList.remove("hidden");
}

function hideLoading() {
  loadingDepth = Math.max(0, loadingDepth - 1);
  if (loadingDepth === 0) {
    loadingScreen.classList.add("hidden");
  }
}

function finishInitialLoading() {
  window.setTimeout(() => {
    loadingDepth = 0;
    loadingScreen.classList.add("hidden");
  }, 420);
}

function normalizeOneLine(text) {
  return text.trim().replace(/\s+/g, " ");
}

function splitWords(text) {
  const normalized = normalizeOneLine(text);
  return normalized ? normalized.split(" ") : [];
}

function splitSourceTokens(text) {
  return text.match(/(\s+|\S+)/g) || [];
}

function buildLcsMatrix(left, right) {
  const matrix = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = left[i] === right[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  return matrix;
}

function diffWords(left, right) {
  const matrix = buildLcsMatrix(left, right);
  const rows = [];
  let i = 0;
  let j = 0;
  let group = 0;

  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      rows.push({
        type: "equal",
        left: left[i],
        right: right[j],
        leftIndex: i + 1,
        rightIndex: j + 1
      });
      i += 1;
      j += 1;
      continue;
    }

    group += 1;
    const removed = [];
    const added = [];
    const startLeft = i + 1;
    const startRight = j + 1;

    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        break;
      }

      if (j >= right.length || (i < left.length && matrix[i + 1][j] >= matrix[i][j + 1])) {
        removed.push({ text: left[i], index: i + 1 });
        i += 1;
      } else {
        added.push({ text: right[j], index: j + 1 });
        j += 1;
      }
    }

    const max = Math.max(removed.length, added.length);
    for (let index = 0; index < max; index += 1) {
      const leftItem = removed[index] || null;
      const rightItem = added[index] || null;
      rows.push({
        type: leftItem && rightItem ? "changed" : leftItem ? "removed" : "added",
        group,
        startLeft,
        startRight,
        removedCount: removed.length,
        addedCount: added.length,
        left: leftItem ? leftItem.text : "",
        right: rightItem ? rightItem.text : "",
        leftIndex: leftItem ? leftItem.index : null,
        rightIndex: rightItem ? rightItem.index : null
      });
    }
  }

  return rows;
}

function wordTooltip(row, side) {
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

function sideKind(row, side) {
  if (row.type === "changed") {
    return "changed";
  }

  if (row.type === "removed" && side === "left") {
    return "removed";
  }

  if (row.type === "added" && side === "right") {
    return "added";
  }

  if ((side === "left" && !row.left) || (side === "right" && !row.right)) {
    return "gap";
  }

  return "equal";
}

function renderWord(row, side) {
  const text = side === "left" ? row.left : row.right;
  const index = side === "left" ? row.leftIndex : row.rightIndex;
  const kind = sideKind(row, side);

  if (!text) {
    return "";
  }

  const shouldHighlight = inlineWords.checked && kind !== "equal";
  const classes = ["word", kind, shouldHighlight ? "highlight" : ""].filter(Boolean).join(" ");
  return `<span class="${classes}" data-kind="${kind}" data-info="${escapeHtml(wordTooltip(row, side))}" data-index="${index || ""}">${escapeHtml(text)}</span>`;
}

function buildWordMeta(rows, side) {
  const meta = new Map();

  for (const row of rows) {
    const index = side === "left" ? row.leftIndex : row.rightIndex;
    if (!index) {
      continue;
    }

    meta.set(index, {
      kind: sideKind(row, side),
      info: wordTooltip(row, side)
    });
  }

  return meta;
}

function renderSourceText(text, meta) {
  let wordIndex = 0;
  const chunks = splitSourceTokens(text).map((token) => {
    if (/^\s+$/.test(token)) {
      return escapeHtml(token);
    }

    wordIndex += 1;
    const entry = meta.get(wordIndex) || { kind: "equal", info: `Unchanged word ${wordIndex}` };
    const shouldHighlight = inlineWords.checked && entry.kind !== "equal";
    const classes = ["word", entry.kind, shouldHighlight ? "highlight" : ""].filter(Boolean).join(" ");
    return `<span class="${classes}" data-kind="${entry.kind}" data-info="${escapeHtml(entry.info)}" data-index="${wordIndex}">${escapeHtml(token)}</span>`;
  });

  return chunks.join("");
}

function renderOneLine(rows, side) {
  return rows.map((row) => renderWord(row, side)).filter(Boolean).join(" ");
}

function groupRows(rows) {
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

function groupTitle(group, side) {
  if (group.type === "equal") {
    const first = group.rows[0];
    const last = group.rows.at(-1);
    const start = side === "left" ? first.leftIndex : first.rightIndex;
    const end = side === "left" ? last.leftIndex : last.rightIndex;
    return `Same words ${start}-${end}`;
  }

  const firstChanged = group.rows.find((row) => row.group);
  if (!firstChanged) {
    return "Changed words";
  }

  const leftEnd = firstChanged.startLeft + firstChanged.removedCount - 1;
  const rightEnd = firstChanged.startRight + firstChanged.addedCount - 1;
  return `Change ${firstChanged.group} · left ${firstChanged.startLeft}-${leftEnd} · right ${firstChanged.startRight}-${rightEnd}`;
}

function renderGroupedSide(group, side) {
  const content = group.rows.map((row) => renderWord(row, side)).filter(Boolean).join(" ");
  const empty = content ? "" : " empty";
  return `<div class="group-cell ${side}${empty}">${content || "&nbsp;"}</div>`;
}

function renderGrouped(rows) {
  return groupRows(rows).map((group, groupIndex) => {
    const kind = markerKind(group);
    return `
      <section class="group-block ${group.type}" data-kind="${kind}" data-group-index="${groupIndex}">
        <div class="group-title">${escapeHtml(groupTitle(group, "left"))}</div>
        <div class="group-row">
          ${renderGroupedSide(group, "left")}
          ${renderGroupedSide(group, "right")}
        </div>
      </section>
    `;
  }).join("");
}

function markerKind(group) {
  const row = group.rows.find((item) => item.type !== "equal");
  return row ? row.type : "changed";
}

function renderMiniMap(rows) {
  const groups = groupRows(rows);
  const markers = groups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => group.type !== "equal");

  miniMapMarkers.innerHTML = markers.map(({ group, index }) => {
    const top = groups.length > 1 ? (index / (groups.length - 1)) * 100 : 0;
    const baseHeight = (group.rows.length / Math.max(rows.length, 1)) * 100;
    const kind = markerKind(group);
    const title = escapeHtml(groupTitle(group, "left"));
    const firstChanged = group.rows.find((row) => row.group);
    const label = kind === "added"
      ? `+${firstChanged?.addedCount || group.rows.length}`
      : kind === "removed"
        ? `-${firstChanged?.removedCount || group.rows.length}`
        : "";

    return `<button class="minimap-marker ${kind}" type="button" style="top:${top}%;--marker-height:${baseHeight}%;" data-kind="${kind}" data-ratio="${top / 100}" data-group-index="${index}" title="${title}">${escapeHtml(label)}</button>`;
  }).join("");

  applyMiniMapZoom();
  updateMiniMapViewport({ syncMiniMap: true });
}

function applyDisplayClasses() {
  diffPages.classList.toggle("grouped-mode", displayMode.value === "grouped");
  diffPages.dataset.filter = changeFilter.value;

  for (const page of [leftDiff, rightDiff]) {
    page.classList.toggle("wrap", wordWrap.checked);
    page.classList.toggle("source-format", displayMode.value === "source");
    page.classList.toggle("one-line-format", displayMode.value === "one-line");
    page.classList.toggle("grouped-format", displayMode.value === "grouped");
  }
}

function renderDiff() {
  const leftWords = splitWords(leftInput.value);
  const rightWords = splitWords(rightInput.value);
  const rows = diffWords(leftWords, rightWords);
  latestRows = rows;
  const changedGroups = new Set(rows.filter((row) => row.group).map((row) => row.group)).size;
  const changedRows = rows.filter((row) => row.type !== "equal").length;

  applyDisplayClasses();

  if (displayMode.value === "source") {
    leftDiff.innerHTML = `<div class="diff-text">${renderSourceText(leftInput.value, buildWordMeta(rows, "left"))}</div>`;
    rightDiff.innerHTML = `<div class="diff-text">${renderSourceText(rightInput.value, buildWordMeta(rows, "right"))}</div>`;
  } else if (displayMode.value === "grouped") {
    leftDiff.innerHTML = `<div class="diff-text diff-groups">${renderGrouped(rows)}</div>`;
    rightDiff.innerHTML = "";
  } else {
    leftDiff.innerHTML = `<div class="diff-text">${renderOneLine(rows, "left")}</div>`;
    rightDiff.innerHTML = `<div class="diff-text">${renderOneLine(rows, "right")}</div>`;
  }

  changeCount.textContent = `${changedGroups} ${changedGroups === 1 ? "change" : "changes"}`;
  wordCount.textContent = `${Math.max(leftWords.length, rightWords.length)} words`;
  hoverHint.textContent = changedRows ? "Autosaved - hover highlighted words for details" : "Autosaved - no differences found";
  renderMiniMap(rows);
  applyChangeFilter();
  applyResultSearch();
  scheduleSave();
}

function getSession() {
  return {
    leftText: leftInput.value,
    rightText: rightInput.value,
    leftName: leftFileName.textContent,
    rightName: rightFileName.textContent,
    leftPath: leftFileName.title || "",
    rightPath: rightFileName.title || "",
    inlineWords: inlineWords.checked,
    wordWrap: wordWrap.checked,
    displayMode: displayMode.value,
    changeFilter: changeFilter.value,
    themeMode: themeMode.value,
    editorLeftSize,
    diffLeftSize,
    editorsHeight,
    miniMapZoom,
    searchQuery: resultSearch.value,
    zoom
  };
}

function applySession(session) {
  leftInput.value = session.leftText || "";
  rightInput.value = session.rightText || "";
  leftFileName.textContent = session.leftName || "Unsaved text";
  rightFileName.textContent = session.rightName || "Unsaved text";
  leftFileName.title = session.leftPath || "";
  rightFileName.title = session.rightPath || "";
  inlineWords.checked = session.inlineWords !== false;
  wordWrap.checked = session.wordWrap !== false;
  displayMode.value = session.displayMode || "one-line";
  changeFilter.value = session.changeFilter || "all";
  themeMode.value = session.themeMode || "dark";
  editorLeftSize = Number(session.editorLeftSize) || 50;
  diffLeftSize = Number(session.diffLeftSize) || 50;
  editorsHeight = Number(session.editorsHeight) || editorsHeight;
  miniMapZoom = Math.min(3000, Math.max(100, Number(session.miniMapZoom) || 100));
  resultSearch.value = session.searchQuery || "";
  zoom = Number(session.zoom) || DEFAULT_ZOOM;
  applyPaneSizes();
  applyTheme();
  applyZoom();
  applyMiniMapZoom();
  renderDiff();
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getSession()));
  }, 120);
}

function loadSavedSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    leftInput.value = sampleLeft;
    rightInput.value = sampleRight;
    return;
  }

  try {
    applySession(JSON.parse(raw));
  } catch {
    leftInput.value = sampleLeft;
    rightInput.value = sampleRight;
  }
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderDiff, 80);
}

function syncScroll(source, target) {
  if (syncLock) {
    return;
  }

  syncLock = true;
  const sourceMaxTop = source.scrollHeight - source.clientHeight;
  const targetMaxTop = target.scrollHeight - target.clientHeight;
  const sourceMaxLeft = source.scrollWidth - source.clientWidth;
  const targetMaxLeft = target.scrollWidth - target.clientWidth;

  target.scrollTop = targetMaxTop * (sourceMaxTop > 0 ? source.scrollTop / sourceMaxTop : 0);
  target.scrollLeft = targetMaxLeft * (sourceMaxLeft > 0 ? source.scrollLeft / sourceMaxLeft : 0);

  window.requestAnimationFrame(() => {
    syncLock = false;
  });

  updateMiniMapViewport();
}

function activeScrollPage() {
  return leftDiff;
}

function updateMiniMapViewport({ syncMiniMap = false } = {}) {
  const page = activeScrollPage();
  const maxTop = page.scrollHeight - page.clientHeight;
  const trackHeight = miniMapMarkers.offsetHeight;
  const top = maxTop > 0 ? (page.scrollTop / page.scrollHeight) * trackHeight : 0;
  const height = page.scrollHeight > 0 ? Math.max(18, (page.clientHeight / page.scrollHeight) * trackHeight) : miniMap.clientHeight;

  if (syncMiniMap) {
    const maxMiniTop = Math.max(0, miniMap.scrollHeight - miniMap.clientHeight);
    const nextMiniTop = Math.min(maxMiniTop, Math.max(0, top - miniMap.clientHeight * 0.45));
    miniMap.scrollTop = nextMiniTop;
  }

  miniMapViewport.style.top = `${10 + top - miniMap.scrollTop}px`;
  miniMapViewport.style.height = `${Math.min(miniMap.clientHeight - 20, height)}px`;
}

function scrollToMiniMapPosition(ratio, groupIndex = null) {
  const page = activeScrollPage();

  if (displayMode.value === "grouped" && groupIndex !== null) {
    const group = leftDiff.querySelector(`.group-block[data-group-index="${groupIndex}"]`);
    if (group) {
      page.scrollTo({ top: group.offsetTop - 12, behavior: "smooth" });
      return;
    }
  }

  const maxTop = page.scrollHeight - page.clientHeight;
  page.scrollTo({ top: maxTop * ratio, behavior: "smooth" });
}

function searchTargets() {
  return [...diffPages.querySelectorAll(".word")];
}

function applyResultSearch({ keepIndex = false } = {}) {
  const query = resultSearch.value.trim().toLowerCase();
  const targets = searchTargets();
  searchMatches = [];

  for (const word of targets) {
    word.classList.remove("search-hit", "search-active");
  }

  if (query) {
    const terms = normalizeOneLine(query).toLowerCase().split(" ").filter(Boolean);

    for (let index = 0; index < targets.length; index += 1) {
      const slice = targets.slice(index, index + terms.length);
      if (slice.length !== terms.length) {
        continue;
      }

      const matched = slice.every((word, offset) => word.textContent.toLowerCase().includes(terms[offset]));
      if (matched) {
        searchMatches.push(slice);
      }
    }
  }

  if (!keepIndex) {
    searchIndex = 0;
  }

  if (searchMatches.length === 0) {
    searchCount.textContent = query ? "0/0" : "0/0";
    return;
  }

  searchIndex = ((searchIndex % searchMatches.length) + searchMatches.length) % searchMatches.length;

  for (const match of searchMatches) {
    for (const word of match) {
      word.classList.add("search-hit");
    }
  }

  for (const word of searchMatches[searchIndex]) {
    word.classList.add("search-active");
  }

  searchCount.textContent = `${searchIndex + 1}/${searchMatches.length}`;
}

function jumpSearch(delta) {
  if (searchMatches.length === 0) {
    return;
  }

  searchIndex = (searchIndex + delta + searchMatches.length) % searchMatches.length;
  applyResultSearch({ keepIndex: true });
  searchMatches[searchIndex][0].scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
}

function textForRows(rows, side) {
  return rows
    .map((row) => side === "left" ? row.left : row.right)
    .filter(Boolean)
    .join(" ");
}

function collectReportRows(kind) {
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

function reportTable(title, rows, kind) {
  const body = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.group)}</td>
        <td>${escapeHtml(kind === "added" ? row.rightRange : row.leftRange)}</td>
        <td>${escapeHtml(kind === "added" ? row.added : row.removed)}</td>
      </tr>
    `).join("")
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

function buildHtmlReport() {
  const added = collectReportRows("added");
  const removed = collectReportRows("removed");
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

function loadExportHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(EXPORT_LOG_KEY) || "[]");
    exportHistory = Array.isArray(history) ? history : [];
  } catch {
    exportHistory = [];
  }
}

function saveExportHistory() {
  localStorage.setItem(EXPORT_LOG_KEY, JSON.stringify(exportHistory.slice(0, MAX_EXPORT_LOGS)));
}

function exportSummary() {
  const added = collectReportRows("added").length;
  const removed = collectReportRows("removed").length;
  const changedGroups = new Set(latestRows.filter((row) => row.group).map((row) => row.group)).size;
  return { added, removed, changedGroups };
}

function exportMetadata() {
  return {
    leftName: leftFileName.textContent,
    rightName: rightFileName.textContent,
    changeCount: changeCount.textContent,
    wordCount: wordCount.textContent,
    summary: exportSummary()
  };
}

function addExportLog(result, metadata) {
  const summary = metadata.summary || exportSummary();
  exportHistory = [{
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fileName: result.fileName,
    filePath: result.filePath,
    folderPath: result.folderPath,
    exportedAt: result.exportedAt || new Date().toISOString(),
    opened: Boolean(result.opened),
    leftName: metadata.leftName,
    rightName: metadata.rightName,
    added: summary.added,
    removed: summary.removed,
    changedGroups: summary.changedGroups
  }, ...exportHistory].slice(0, MAX_EXPORT_LOGS);
  saveExportHistory();
}

function formatExportDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

function renderExportLogs() {
  exportLogSummary.textContent = exportHistory.length
    ? `${exportHistory.length} exported ${exportHistory.length === 1 ? "report" : "reports"}`
    : "No exported reports yet";

  exportLogList.innerHTML = exportHistory.length
    ? exportHistory.map((item, index) => `
      <article class="export-log-item">
        <div>
          <strong>${escapeHtml(item.fileName || "Secure Text Compare report")}</strong>
          <span>${escapeHtml(formatExportDate(item.exportedAt))} · ${escapeHtml(item.changedGroups)} changes · +${escapeHtml(item.added)} / -${escapeHtml(item.removed)}</span>
          <small>${escapeHtml(item.leftName || "Left text")} vs ${escapeHtml(item.rightName || "Right text")}</small>
          <code>${escapeHtml(item.filePath || "")}</code>
        </div>
        <button type="button" data-open-export-index="${index}">Open</button>
      </article>
    `).join("")
    : `<div class="export-log-empty">Exported reports will appear here after you create them.</div>`;
}

function showExportLogs() {
  renderExportLogs();
  exportLogModal.hidden = false;
}

function hideExportLogs() {
  exportLogModal.hidden = true;
}

function applyChangeFilter() {
  const filter = changeFilter.value;
  const active = filter !== "all";

  diffPages.classList.toggle("filter-active", active);
  diffPages.dataset.filter = filter;
  miniMap.classList.toggle("filter-active", active);
  miniMap.dataset.filter = filter;

  for (const block of diffPages.querySelectorAll(".group-block")) {
    const hide = active && block.dataset.kind !== filter;
    block.classList.toggle("filter-hidden", hide);
  }

  for (const marker of miniMap.querySelectorAll(".minimap-marker")) {
    const hide = active && marker.dataset.kind !== filter;
    marker.classList.toggle("filter-hidden", hide);
  }

  updateMiniMapViewport();
}

function showTooltip(event) {
  const word = event.target.closest(".word.highlight");
  if (!word) {
    tooltip.classList.remove("visible");
    return;
  }

  tooltip.textContent = word.dataset.info;
  tooltip.style.left = `${Math.min(event.clientX + 16, window.innerWidth - 340)}px`;
  tooltip.style.top = `${event.clientY + 16}px`;
  tooltip.classList.add("visible");
}

function applyZoom() {
  document.documentElement.style.setProperty("--text-zoom", `${zoom / 100}`);
  zoomValue.textContent = `${zoom}%`;
  scheduleSave();
}

function applyPaneSizes() {
  editors.style.setProperty("--left-pane", `${editorLeftSize}%`);
  diffPages.style.setProperty("--left-pane", `${diffLeftSize}%`);
  appShell.style.setProperty("--editors-height", `${editorsHeight}px`);
  scheduleSave();
}

function updateZoom(delta) {
  zoom = Math.min(180, Math.max(70, zoom + delta));
  applyZoom();
}

function updateMiniMapZoom(delta) {
  miniMapZoom = Math.min(3000, Math.max(100, miniMapZoom + delta));
  applyMiniMapZoom();
}

function applyMiniMapZoom() {
  miniMap.style.setProperty("--minimap-zoom", `${miniMapZoom / 100}`);
  window.requestAnimationFrame(updateMiniMapViewport);
  scheduleSave();
}

function applyTheme() {
  document.body.classList.toggle("light-theme", themeMode.value === "light");
  scheduleSave();
}

function togglePanelFullscreen(targetId) {
  const target = document.querySelector(`#${targetId}`);
  if (!target) {
    return;
  }

  const active = document.querySelector(".fullscreen-panel");
  if (active && active !== target) {
    active.classList.remove("fullscreen-panel");
  }

  target.classList.toggle("fullscreen-panel");
}

function startPaneResize(event, scope) {
  if (scope === "vertical") {
    startSectionResize(event);
    return;
  }

  const container = scope === "editors" ? editors : diffPages;
  const rect = container.getBoundingClientRect();

  function resize(moveEvent) {
    const raw = ((moveEvent.clientX - rect.left) / rect.width) * 100;
    const next = Math.min(82, Math.max(18, raw));

    if (scope === "editors") {
      editorLeftSize = next;
    } else {
      diffLeftSize = next;
    }

    applyPaneSizes();
  }

  function stop() {
    document.body.classList.remove("resizing-pane");
    window.removeEventListener("pointermove", resize);
    window.removeEventListener("pointerup", stop);
  }

  document.body.classList.add("resizing-pane");
  window.addEventListener("pointermove", resize);
  window.addEventListener("pointerup", stop);
  event.preventDefault();
}

function startSectionResize(event) {
  const top = editors.getBoundingClientRect().top;
  const shellBottom = appShell.getBoundingClientRect().bottom - 22;

  function resize(moveEvent) {
    const maxHeight = Math.max(180, shellBottom - top - 260);
    editorsHeight = Math.min(maxHeight, Math.max(170, moveEvent.clientY - top));
    applyPaneSizes();
  }

  function stop() {
    document.body.classList.remove("resizing-section");
    window.removeEventListener("pointermove", resize);
    window.removeEventListener("pointerup", stop);
  }

  document.body.classList.add("resizing-section");
  window.addEventListener("pointermove", resize);
  window.addEventListener("pointerup", stop);
  event.preventDefault();
}

function startMiniMapViewportDrag(event) {
  const viewportRect = miniMapViewport.getBoundingClientRect();
  const grabOffset = event.clientY - viewportRect.top;

  function move(moveEvent) {
    const mapRect = miniMap.getBoundingClientRect();
    const trackHeight = Math.max(miniMapMarkers.offsetHeight, 1);
    const yOnTrack = moveEvent.clientY - mapRect.top - grabOffset + miniMap.scrollTop - 10;
    const ratio = Math.min(1, Math.max(0, yOnTrack / trackHeight));
    scrollToMiniMapPosition(ratio);
  }

  function stop() {
    document.body.classList.remove("dragging-minimap-viewport");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  }

  document.body.classList.add("dragging-minimap-viewport");
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  event.preventDefault();
  event.stopPropagation();
}

async function loadFile(side) {
  let file;
  showLoading(side === "left" ? "Loading left document..." : "Loading right document...");

  try {
    file = await window.secureTextCompare.openTextFile();
  } catch (error) {
    hoverHint.textContent = error?.message || "Could not load file.";
    return;
  } finally {
    hideLoading();
  }

  if (!file) {
    return;
  }

  if (side === "left") {
    leftInput.value = file.text;
    leftFileName.textContent = file.name;
    leftFileName.title = file.path;
  } else {
    rightInput.value = file.text;
    rightFileName.textContent = file.name;
    rightFileName.title = file.path;
  }

  renderDiff();
  hoverHint.textContent = file.type === "pdf"
    ? `Loaded PDF text from ${file.name}${file.pages ? ` (${file.pages} pages)` : ""}`
    : `Loaded text from ${file.name}`;
}

function setUpdateStatus(status) {
  if (!status) {
    return;
  }

  hoverHint.textContent = status.message || "Update status changed.";
  checkUpdate.classList.toggle("attention", status.state === "downloaded");
  checkUpdate.disabled = status.state === "checking" || status.state === "downloading";

  if (status.state === "downloaded") {
    updateReady = true;
    checkUpdate.querySelector("span").textContent = "⇧";
    checkUpdate.querySelector("small").textContent = "Install";
    return;
  }

  if (status.state === "checking" || status.state === "downloading") {
    checkUpdate.querySelector("span").textContent = "…";
    checkUpdate.querySelector("small").textContent = status.state === "checking" ? "Check" : "Get";
    return;
  }

  updateReady = false;
  checkUpdate.querySelector("span").textContent = "↻";
  checkUpdate.querySelector("small").textContent = "Update";
}

checkDiff.addEventListener("click", () => {
  renderDiff();
  hoverHint.textContent = "Diff checked";
});
document.querySelector("#loadLeft").addEventListener("click", () => loadFile("left"));
document.querySelector("#loadRight").addEventListener("click", () => loadFile("right"));
document.querySelector("#trimNewLines").addEventListener("click", () => {
  leftInput.value = normalizeOneLine(leftInput.value);
  rightInput.value = normalizeOneLine(rightInput.value);
  renderDiff();
});
document.querySelector("#saveSession").addEventListener("click", async () => {
  showLoading("Saving session...");
  let path;

  try {
    path = await window.secureTextCompare.saveSession(getSession());
  } finally {
    hideLoading();
  }

  if (path) {
    hoverHint.textContent = `Saved: ${path}`;
  }
});
document.querySelector("#loadSession").addEventListener("click", async () => {
  showLoading("Opening session...");
  let result;

  try {
    result = await window.secureTextCompare.openSession();
  } finally {
    hideLoading();
  }

  if (result && result.session) {
    applySession(result.session);
    hoverHint.textContent = `Opened: ${result.path}`;
  }
});
exportReport.addEventListener("click", async () => {
  const metadata = exportMetadata();
  let result;
  showLoading("Preparing export...");

  try {
    result = await window.secureTextCompare.saveHtmlReport(buildHtmlReport(), metadata);
  } catch (error) {
    hoverHint.textContent = error?.message || "Export failed.";
    return;
  } finally {
    hideLoading();
  }

  if (result) {
    addExportLog(result, metadata);
    hoverHint.textContent = `Exported report: ${result.filePath}`;
  }
});
exportLogs.addEventListener("click", showExportLogs);
closeExportLogs.addEventListener("click", hideExportLogs);
doneExportLogs.addEventListener("click", hideExportLogs);
clearExportLogs.addEventListener("click", () => {
  exportHistory = [];
  saveExportHistory();
  renderExportLogs();
});
exportLogModal.addEventListener("click", (event) => {
  if (event.target === exportLogModal) {
    hideExportLogs();
  }
});
exportLogList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-open-export-index]");
  if (!button) {
    return;
  }

  const item = exportHistory[Number(button.dataset.openExportIndex)];
  if (!item) {
    return;
  }

  const result = await window.secureTextCompare.openPath(item.filePath);
  hoverHint.textContent = result.ok ? `Opened export: ${item.fileName}` : `Could not open export: ${result.error}`;
});
checkUpdate.addEventListener("click", async () => {
  if (!window.secureTextCompare?.checkForUpdates) {
    hoverHint.textContent = "Update checks are unavailable in this build.";
    return;
  }

  const status = updateReady
    ? await window.secureTextCompare.installUpdate()
    : await window.secureTextCompare.checkForUpdates();

  setUpdateStatus(status);
});
document.querySelector("#swapSides").addEventListener("click", () => {
  [leftInput.value, rightInput.value] = [rightInput.value, leftInput.value];
  [leftFileName.textContent, rightFileName.textContent] = [rightFileName.textContent, leftFileName.textContent];
  [leftFileName.title, rightFileName.title] = [rightFileName.title, leftFileName.title];
  renderDiff();
});
document.querySelector("#clearAll").addEventListener("click", () => {
  leftInput.value = "";
  rightInput.value = "";
  leftFileName.textContent = "Unsaved text";
  rightFileName.textContent = "Unsaved text";
  leftFileName.removeAttribute("title");
  rightFileName.removeAttribute("title");
  renderDiff();
});
document.querySelector("#zoomOut").addEventListener("click", () => updateZoom(-10));
document.querySelector("#zoomIn").addEventListener("click", () => updateZoom(10));
document.querySelectorAll("[data-fullscreen-target]").forEach((button) => {
  button.addEventListener("click", () => togglePanelFullscreen(button.dataset.fullscreenTarget));
});
document.querySelectorAll("[data-resize-scope]").forEach((resizer) => {
  resizer.addEventListener("pointerdown", (event) => startPaneResize(event, resizer.dataset.resizeScope));
});
miniMap.addEventListener("click", (event) => {
  const marker = event.target.closest(".minimap-marker");
  if (marker) {
    scrollToMiniMapPosition(Number(marker.dataset.ratio), Number(marker.dataset.groupIndex));
    return;
  }

  const rect = miniMapMarkers.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientY - rect.top) / miniMapMarkers.offsetHeight));
  scrollToMiniMapPosition(ratio);
});
miniMap.addEventListener("wheel", (event) => {
  if (!event.metaKey) {
    return;
  }

  event.preventDefault();
  const trackRect = miniMapMarkers.getBoundingClientRect();
  const mapRect = miniMap.getBoundingClientRect();
  const cursorTrackRatio = Math.min(1, Math.max(0, (event.clientY - trackRect.top) / Math.max(miniMapMarkers.offsetHeight, 1)));
  const cursorMapY = event.clientY - mapRect.top;

  updateMiniMapZoom(event.deltaY < 0 ? 150 : -150);
  window.requestAnimationFrame(() => {
    miniMap.scrollTop = (miniMapMarkers.offsetHeight * cursorTrackRatio) - cursorMapY;
    updateMiniMapViewport();
  });
}, { passive: false });
miniMap.addEventListener("scroll", updateMiniMapViewport);
miniMapViewport.addEventListener("pointerdown", startMiniMapViewportDrag);
miniMapViewport.addEventListener("click", (event) => event.stopPropagation());
resultSearch.addEventListener("input", () => {
  applyResultSearch();
  scheduleSave();
});
resultSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    jumpSearch(event.shiftKey ? -1 : 1);
  }
});
searchPrev.addEventListener("click", () => jumpSearch(-1));
searchNext.addEventListener("click", () => jumpSearch(1));

leftInput.addEventListener("input", scheduleRender);
rightInput.addEventListener("input", scheduleRender);
inlineWords.addEventListener("change", renderDiff);
wordWrap.addEventListener("change", renderDiff);
displayMode.addEventListener("change", renderDiff);
changeFilter.addEventListener("change", () => {
  applyChangeFilter();
  scheduleSave();
});
themeMode.addEventListener("change", applyTheme);
leftDiff.addEventListener("scroll", () => syncScroll(leftDiff, rightDiff));
rightDiff.addEventListener("scroll", () => syncScroll(rightDiff, leftDiff));
document.addEventListener("mousemove", showTooltip);
document.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!exportLogModal.hidden) {
      hideExportLogs();
      return;
    }

    document.querySelector(".fullscreen-panel")?.classList.remove("fullscreen-panel");
  }
});

if (window.secureTextCompare?.onUpdateStatus) {
  window.secureTextCompare.onUpdateStatus(setUpdateStatus);
}

loadExportHistory();
loadSavedSession();
applyPaneSizes();
applyTheme();
applyZoom();
applyMiniMapZoom();
renderDiff();
finishInitialLoading();
