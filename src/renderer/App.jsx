import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import Controls from "./components/Controls.jsx";
import EditorPane from "./components/EditorPane.jsx";
import DiffPage from "./components/DiffPage.jsx";
import MiniMap from "./components/MiniMap.jsx";
import ResultSearch from "./components/ResultSearch.jsx";
import ExportLogModal from "./components/ExportLogModal.jsx";
import ReportPreviewModal from "./components/ReportPreviewModal.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import Tooltip from "./components/Tooltip.jsx";
import { useSession } from "./state/useSession.js";
import { useExportLog } from "./state/useExportLog.js";
import { useDiff } from "./state/useDiff.js";
import { useUpdater } from "./state/useUpdater.js";
import { useLoading } from "./state/useLoading.js";
import { normalizeOneLine } from "./diff/tokenize.js";
import { buildHtmlReport, exportSummary } from "./diff/report.js";
import * as ipc from "./lib/ipc.js";

const ZOOM_MIN = 70;
const ZOOM_MAX = 180;
const MINIMAP_ZOOM_MIN = 100;
const MINIMAP_ZOOM_MAX = 3000;

export default function App() {
  const [session, patchSession, replaceSession] = useSession();
  const exportLog = useExportLog();
  const [updateStatus, setUpdateStatus] = useUpdater();
  const loading = useLoading();

  const [hint, setHint] = useState("Autosaved");
  const [fullscreenId, setFullscreenId] = useState(null);
  const [exportLogOpen, setExportLogOpen] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [searchPosition, setSearchPosition] = useState({ count: 0, index: 0 });
  const [viewport, setViewport] = useState({ top: 10, height: 60 });

  const diff = useDiff(session.leftText, session.rightText);

  const appShellRef = useRef(null);
  const editorsRef = useRef(null);
  const diffPagesRef = useRef(null);
  const leftDiffRef = useRef(null);
  const rightDiffRef = useRef(null);
  const miniMapRef = useRef(null);
  const syncLock = useRef(false);
  const searchMatchesRef = useRef([]);
  const searchIndexRef = useRef(0);

  useEffect(() => {
    document.body.classList.toggle("light-theme", session.themeMode === "light");
  }, [session.themeMode]);

  useEffect(() => {
    document.body.dataset.fontMode = session.fontMode || "system";
  }, [session.fontMode]);

  useEffect(() => {
    document.documentElement.style.setProperty("--text-zoom", `${session.zoom / 100}`);
  }, [session.zoom]);

  useEffect(() => {
    if (appShellRef.current) appShellRef.current.style.setProperty("--editors-height", `${session.editorsHeight}px`);
    if (editorsRef.current) editorsRef.current.style.setProperty("--left-pane", `${session.editorLeftSize}%`);
    if (diffPagesRef.current) diffPagesRef.current.style.setProperty("--left-pane", `${session.diffLeftSize}%`);
  }, [session.editorsHeight, session.editorLeftSize, session.diffLeftSize]);

  useEffect(() => {
    loading.finishInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateViewport = useCallback(() => {
    const page = leftDiffRef.current;
    const map = miniMapRef.current;
    if (!page || !map) return;
    const markers = map.querySelector(".minimap-markers");
    const trackHeight = markers?.offsetHeight ?? 0;
    const maxTop = page.scrollHeight - page.clientHeight;
    const top = maxTop > 0 ? (page.scrollTop / page.scrollHeight) * trackHeight : 0;
    const height = page.scrollHeight > 0
      ? Math.max(18, (page.clientHeight / page.scrollHeight) * trackHeight)
      : map.clientHeight;
    setViewport({
      top: 10 + top - map.scrollTop,
      height: Math.min(map.clientHeight - 20, height)
    });
  }, []);

  useLayoutEffect(() => {
    updateViewport();
  }, [diff, session.displayMode, session.miniMapZoom, updateViewport]);

  useEffect(() => {
    const onResize = () => updateViewport();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateViewport]);

  const syncScroll = useCallback((source, target) => {
    if (syncLock.current || !source || !target) return;
    syncLock.current = true;
    const sMaxTop = source.scrollHeight - source.clientHeight;
    const tMaxTop = target.scrollHeight - target.clientHeight;
    const sMaxLeft = source.scrollWidth - source.clientWidth;
    const tMaxLeft = target.scrollWidth - target.clientWidth;
    target.scrollTop = tMaxTop * (sMaxTop > 0 ? source.scrollTop / sMaxTop : 0);
    target.scrollLeft = tMaxLeft * (sMaxLeft > 0 ? source.scrollLeft / sMaxLeft : 0);
    requestAnimationFrame(() => {
      syncLock.current = false;
    });
    updateViewport();
  }, [updateViewport]);

  const scrollToRatio = useCallback((ratio, groupIndex = null) => {
    const page = leftDiffRef.current;
    if (!page) return;
    if (session.displayMode === "grouped" && groupIndex !== null) {
      const target = page.querySelector(`.group-block[data-group-index="${groupIndex}"]`);
      if (target) {
        page.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
        return;
      }
    }
    const maxTop = page.scrollHeight - page.clientHeight;
    page.scrollTo({ top: maxTop * ratio, behavior: "smooth" });
  }, [session.displayMode]);

  const applySearch = useCallback((keepIndex = false) => {
    const root = diffPagesRef.current;
    if (!root) return;
    const targets = [...root.querySelectorAll(".word")];
    for (const word of targets) word.classList.remove("search-hit", "search-active");
    const query = (session.searchQuery || "").trim().toLowerCase();
    if (!query) {
      searchMatchesRef.current = [];
      searchIndexRef.current = 0;
      setSearchPosition({ count: 0, index: 0 });
      return;
    }
    const terms = normalizeOneLine(query).split(" ").filter(Boolean);
    const matches = [];
    for (let i = 0; i < targets.length; i += 1) {
      const slice = targets.slice(i, i + terms.length);
      if (slice.length !== terms.length) continue;
      if (slice.every((w, off) => w.textContent.toLowerCase().includes(terms[off]))) {
        matches.push(slice);
      }
    }
    searchMatchesRef.current = matches;
    if (!keepIndex) searchIndexRef.current = 0;
    if (matches.length === 0) {
      setSearchPosition({ count: 0, index: 0 });
      return;
    }
    const idx = ((searchIndexRef.current % matches.length) + matches.length) % matches.length;
    searchIndexRef.current = idx;
    for (const match of matches) for (const w of match) w.classList.add("search-hit");
    for (const w of matches[idx]) w.classList.add("search-active");
    setSearchPosition({ count: matches.length, index: idx + 1 });
  }, [session.searchQuery]);

  useLayoutEffect(() => {
    applySearch();
  }, [applySearch, diff, session.displayMode, session.inlineWords]);

  const jumpSearch = useCallback((delta) => {
    const matches = searchMatchesRef.current;
    if (matches.length === 0) return;
    searchIndexRef.current = (searchIndexRef.current + delta + matches.length) % matches.length;
    applySearch(true);
    matches[searchIndexRef.current][0]?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [applySearch]);

  const startPaneResize = useCallback((event, scope) => {
    event.preventDefault();
    if (scope === "vertical") {
      const top = editorsRef.current.getBoundingClientRect().top;
      const shellBottom = appShellRef.current.getBoundingClientRect().bottom - 22;
      const move = (e) => {
        const maxH = Math.max(180, shellBottom - top - 260);
        patchSession({ editorsHeight: Math.min(maxH, Math.max(170, e.clientY - top)) });
      };
      const stop = () => {
        document.body.classList.remove("resizing-section");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      document.body.classList.add("resizing-section");
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      return;
    }
    const container = scope === "editors" ? editorsRef.current : diffPagesRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const move = (e) => {
      const raw = ((e.clientX - rect.left) / rect.width) * 100;
      const next = Math.min(78, Math.max(22, raw));
      patchSession(scope === "editors" ? { editorLeftSize: next } : { diffLeftSize: next });
    };
    const stop = () => {
      document.body.classList.remove("resizing-pane");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    document.body.classList.add("resizing-pane");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }, [patchSession]);

  const startViewportDrag = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const map = miniMapRef.current;
    if (!map) return;
    const markers = map.querySelector(".minimap-markers");
    const viewportRect = event.currentTarget.getBoundingClientRect();
    const grabOffset = event.clientY - viewportRect.top;
    const move = (e) => {
      const mapRect = map.getBoundingClientRect();
      const trackHeight = Math.max(markers.offsetHeight, 1);
      const yOnTrack = e.clientY - mapRect.top - grabOffset + map.scrollTop - 10;
      const ratio = Math.min(1, Math.max(0, yOnTrack / trackHeight));
      scrollToRatio(ratio);
    };
    const stop = () => {
      document.body.classList.remove("dragging-minimap-viewport");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    document.body.classList.add("dragging-minimap-viewport");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }, [scrollToRatio]);

  const handleMinimapWheel = useCallback((event) => {
    if (!event.metaKey) return;
    event.preventDefault();
    const map = miniMapRef.current;
    if (!map) return;
    const markers = map.querySelector(".minimap-markers");
    const trackRect = markers.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();
    const cursorTrackRatio = Math.min(1, Math.max(0, (event.clientY - trackRect.top) / Math.max(markers.offsetHeight, 1)));
    const cursorMapY = event.clientY - mapRect.top;
    const delta = event.deltaY < 0 ? 150 : -150;
    const nextZoom = Math.min(MINIMAP_ZOOM_MAX, Math.max(MINIMAP_ZOOM_MIN, session.miniMapZoom + delta));
    patchSession({ miniMapZoom: nextZoom });
    requestAnimationFrame(() => {
      map.scrollTop = markers.offsetHeight * cursorTrackRatio - cursorMapY;
      updateViewport();
    });
  }, [session.miniMapZoom, patchSession, updateViewport]);

  useEffect(() => {
    const map = miniMapRef.current;
    if (!map) return;
    map.addEventListener("wheel", handleMinimapWheel, { passive: false });
    return () => map.removeEventListener("wheel", handleMinimapWheel);
  }, [handleMinimapWheel]);

  const loadFile = useCallback(async (side) => {
    loading.show(side === "left" ? "Loading left document..." : "Loading right document...");
    let file;
    try {
      file = await ipc.openTextFile();
    } catch (error) {
      setHint(error?.message || "Could not load file.");
      loading.hide();
      return;
    }
    loading.hide();
    if (!file) return;
    patchSession(
      side === "left"
        ? { leftText: file.text, leftName: file.name, leftPath: file.path }
        : { rightText: file.text, rightName: file.name, rightPath: file.path }
    );
    setHint(
      file.type === "pdf"
        ? `Loaded PDF text from ${file.name}${file.pages ? ` (${file.pages} pages)` : ""}`
        : `Loaded text from ${file.name}`
    );
  }, [loading, patchSession]);

  const handleSave = useCallback(async () => {
    loading.show("Saving session...");
    let path;
    try {
      path = await ipc.saveSession(session);
    } finally {
      loading.hide();
    }
    if (path) setHint(`Saved: ${path}`);
  }, [loading, session]);

  const handleOpen = useCallback(async () => {
    loading.show("Opening session...");
    let result;
    try {
      result = await ipc.openSession();
    } finally {
      loading.hide();
    }
    if (result?.session) {
      replaceSession(result.session);
      setHint(`Opened: ${result.path}`);
    }
  }, [loading, replaceSession]);

  const handleExport = useCallback(() => {
    const summary = exportSummary(diff.rows);
    const metadata = {
      leftName: session.leftName,
      rightName: session.rightName,
      summary
    };
    setReportPreview({ html: buildHtmlReport(diff.rows), metadata });
  }, [diff.rows, session.leftName, session.rightName]);

  const handleConfirmExport = useCallback(async () => {
    if (!reportPreview) return;
    const { html, metadata } = reportPreview;
    setReportPreview(null);
    loading.show("Saving report...");
    let result;
    try {
      result = await ipc.saveHtmlReport(html, metadata);
    } catch (error) {
      setHint(error?.message || "Export failed.");
      loading.hide();
      return;
    }
    loading.hide();
    if (result) {
      exportLog.add(result, metadata);
      setHint(`Exported report: ${result.filePath}`);
    }
  }, [reportPreview, exportLog, loading]);

  const handleOpenExport = useCallback(async (item) => {
    const result = await ipc.openPath(item.filePath);
    setHint(result.ok ? `Opened export: ${item.fileName}` : `Could not open export: ${result.error}`);
  }, []);

  const handleUpdate = useCallback(async () => {
    const ready = updateStatus?.state === "downloaded";
    const status = ready ? await ipc.installUpdate() : await ipc.checkForUpdates();
    setUpdateStatus(status);
    if (status?.message) setHint(status.message);
  }, [updateStatus, setUpdateStatus]);

  useEffect(() => {
    if (updateStatus?.message) setHint(updateStatus.message);
  }, [updateStatus]);

  const togglePanelFullscreen = useCallback((id) => {
    setFullscreenId((current) => (current === id ? null : id));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (reportPreview) {
        setReportPreview(null);
        return;
      }
      if (exportLogOpen) {
        setExportLogOpen(false);
        return;
      }
      if (fullscreenId) setFullscreenId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [exportLogOpen, fullscreenId, reportPreview]);

  const hintText = useMemo(() => {
    if (hint) return hint;
    if (diff.changedRowCount) return "Autosaved · hover highlighted words for details";
    return "Autosaved · no differences found";
  }, [hint, diff.changedRowCount]);

  return (
    <>
      <LoadingScreen visible={loading.state.visible} message={loading.state.message} />
      <main ref={appShellRef} className="app-shell">
        <TopBar
          changeCount={diff.changedGroupCount}
          wordCount={Math.max(diff.leftWordCount, diff.rightWordCount)}
        />
        <Controls
          onCheck={() => setHint("Diff checked")}
          onLoadLeft={() => loadFile("left")}
          onLoadRight={() => loadFile("right")}
          onTrim={() =>
            patchSession({
              leftText: normalizeOneLine(session.leftText),
              rightText: normalizeOneLine(session.rightText)
            })
          }
          onSave={handleSave}
          onOpen={handleOpen}
          onExport={handleExport}
          onShowLogs={() => setExportLogOpen(true)}
          onCheckUpdate={handleUpdate}
          onSwap={() =>
            patchSession({
              leftText: session.rightText,
              rightText: session.leftText,
              leftName: session.rightName,
              rightName: session.leftName,
              leftPath: session.rightPath,
              rightPath: session.leftPath
            })
          }
          onClear={() =>
            patchSession({
              leftText: "",
              rightText: "",
              leftName: "Unsaved text",
              rightName: "Unsaved text",
              leftPath: "",
              rightPath: ""
            })
          }
          onZoomIn={() => patchSession({ zoom: Math.min(ZOOM_MAX, session.zoom + 10) })}
          onZoomOut={() => patchSession({ zoom: Math.max(ZOOM_MIN, session.zoom - 10) })}
          zoom={session.zoom}
          displayMode={session.displayMode}
          onDisplayMode={(v) => patchSession({ displayMode: v })}
          changeFilter={session.changeFilter}
          onChangeFilter={(v) => patchSession({ changeFilter: v })}
          themeMode={session.themeMode}
          onThemeMode={(v) => patchSession({ themeMode: v })}
          fontMode={session.fontMode}
          onFontMode={(v) => patchSession({ fontMode: v })}
          wordWrap={session.wordWrap}
          onWordWrap={(v) => patchSession({ wordWrap: v })}
          inlineWords={session.inlineWords}
          onInlineWords={(v) => patchSession({ inlineWords: v })}
          updateStatus={updateStatus}
        />

        <section ref={editorsRef} className="editors" aria-label="Source text editors">
          <EditorPane
            id="leftPanel"
            side="left"
            label="Left text"
            fileName={session.leftName}
            filePath={session.leftPath}
            value={session.leftText}
            onChange={(v) => patchSession({ leftText: v })}
            placeholder="Paste or load the original text..."
            isFullscreen={fullscreenId === "leftPanel"}
            onToggleFullscreen={() => togglePanelFullscreen("leftPanel")}
          />
          <div
            className="pane-resizer"
            data-resize-scope="editors"
            aria-label="Resize editor panes"
            onPointerDown={(e) => startPaneResize(e, "editors")}
          />
          <EditorPane
            id="rightPanel"
            side="right"
            label="Right text"
            fileName={session.rightName}
            filePath={session.rightPath}
            value={session.rightText}
            onChange={(v) => patchSession({ rightText: v })}
            placeholder="Paste or load the changed text..."
            isFullscreen={fullscreenId === "rightPanel"}
            onToggleFullscreen={() => togglePanelFullscreen("rightPanel")}
          />
        </section>

        <div
          className="section-resizer"
          data-resize-scope="vertical"
          aria-label="Resize editors and result panels"
          onPointerDown={(e) => startPaneResize(e, "vertical")}
        />

        <section
          id="diffFrame"
          className={`diff-frame ${fullscreenId === "diffFrame" ? "fullscreen-panel" : ""}`.trim()}
          aria-label="Rendered diff"
        >
          <div className="diff-toolbar">
            <span>Rendered two-page word diff</span>
            <ResultSearch
              value={session.searchQuery}
              onChange={(v) => patchSession({ searchQuery: v })}
              onPrev={() => jumpSearch(-1)}
              onNext={() => jumpSearch(1)}
              count={searchPosition.count}
              position={searchPosition.index}
            />
            <span id="hoverHint">{hintText}</span>
            <button
              className="panel-action"
              type="button"
              title="Toggle fullscreen"
              onClick={() => togglePanelFullscreen("diffFrame")}
            >
              ⛶
            </button>
          </div>
          <div
            ref={diffPagesRef}
            className={`diff-pages ${session.displayMode === "grouped" ? "grouped-mode" : ""} ${
              session.changeFilter !== "all" ? "filter-active" : ""
            }`.trim()}
            data-filter={session.changeFilter}
          >
            <DiffPage
              id="leftDiff"
              ref={leftDiffRef}
              rows={diff.rows}
              groups={diff.groups}
              side="left"
              mode={session.displayMode}
              wordWrap={session.wordWrap}
              highlight={session.inlineWords}
              sourceText={session.leftText}
              onScroll={() => syncScroll(leftDiffRef.current, rightDiffRef.current)}
              changeFilter={session.changeFilter}
            />
            <div
              className="pane-resizer"
              data-resize-scope="diff"
              aria-label="Resize diff panes"
              onPointerDown={(e) => startPaneResize(e, "diff")}
            />
            <DiffPage
              id="rightDiff"
              ref={rightDiffRef}
              rows={diff.rows}
              groups={diff.groups}
              side="right"
              mode={session.displayMode}
              wordWrap={session.wordWrap}
              highlight={session.inlineWords}
              sourceText={session.rightText}
              onScroll={() => syncScroll(rightDiffRef.current, leftDiffRef.current)}
              changeFilter={session.changeFilter}
              isHidden={session.displayMode === "grouped"}
            />
          </div>
          <MiniMap
            ref={miniMapRef}
            rows={diff.rows}
            groups={diff.groups}
            zoom={session.miniMapZoom}
            changeFilter={session.changeFilter}
            viewportTop={viewport.top}
            viewportHeight={viewport.height}
            onScroll={updateViewport}
            onMarkerClick={(ratio, groupIndex) => scrollToRatio(ratio, groupIndex)}
            onTrackClick={(ratio) => scrollToRatio(ratio)}
            onViewportPointerDown={startViewportDrag}
          />
        </section>
      </main>

      <ExportLogModal
        open={exportLogOpen}
        history={exportLog.history}
        onClose={() => setExportLogOpen(false)}
        onClear={exportLog.clear}
        onOpenItem={handleOpenExport}
      />
      <ReportPreviewModal
        open={Boolean(reportPreview)}
        html={reportPreview?.html || ""}
        metadata={reportPreview?.metadata}
        onClose={() => setReportPreview(null)}
        onSave={handleConfirmExport}
      />
      <Tooltip />
    </>
  );
}
