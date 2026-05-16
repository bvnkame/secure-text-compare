# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install deps (Node >= 20 required).
- `npm run dev` / `npm start` — launch Electron app locally. Auto-updater is disabled in unpackaged dev runs (`app.isPackaged` gates `updater:check`).
- `npm run pack` — `electron-builder --dir`, unpacked build for local smoke test.
- `npm run dist` / `dist:mac` / `dist:win` / `dist:linux` — distributable installers via `electron-builder`. CI uses `-- --publish never`.

No test runner, no linter — there is no `test` or `lint` script. Don't invent one.

## Branch & release flow

- `dev` = integration branch. Feature/fix PRs target `dev`.
- `main` = release branch. Releases are cut by merging `dev` → `main`, then tagging `vX.Y.Z` on `main`.
- Tagging `vX.Y.Z` triggers `.github/workflows/release.yml` which builds per-platform and publishes to GitHub Releases. `electron-builder.build.publish` is set to `github`, so packaged apps fetch updates from GitHub Releases via `electron-updater`. If repo owner/name change, update `repository`, `homepage`, `bugs` in [package.json](package.json) or auto-update breaks.
- Hotfixes may branch from `main` and PR to `main`, but must also be merged into `dev`.

## Architecture

Three-file Electron app — no bundler, no framework, no transpile step. Files ship as-is per `build.files` in package.json.

**Main process** — [src/main.js](src/main.js)
- Owns the `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`. All Node access flows through preload.
- IPC handlers (`ipcMain.handle`): `dialog:openTextFile`, `dialog:saveSession`, `dialog:openSession`, `dialog:saveHtmlReport`, `shell:openPath`, `updater:check`, `updater:install`. Renderer-facing channel for status push: `updater:status`.
- PDF reading uses `pdf-parse`'s `PDFParse` class — `extractPdfText` rejects scanned/image-only PDFs ("This PDF does not contain extractable text...").
- `buildExportFileName` sanitizes left/right filenames into `secure-text-compare_<left>_vs_<right>_<timestamp>.html`.
- Auto-updater wiring is set up at `app.whenReady`; `setupAutoUpdater` forwards every `electron-updater` event into one `sendUpdateStatus({state, message, ...})` shape consumed by renderer.

**Preload bridge** — [src/preload.js](src/preload.js)
- Exposes `window.secureTextCompare` via `contextBridge`. This is the only surface the renderer should use — never add `require` to renderer.js.
- `onUpdateStatus(cb)` returns an unsubscribe function; status events arrive on `updater:status`.

**Renderer** — [renderer.js](renderer.js) (~1200 lines, all globals, no modules)
- Diff engine: `splitWords`/`splitSourceTokens` → `buildLcsMatrix` (O(n*m) DP) → `diffWords` walks the LCS matrix producing rows of `{type: equal|added|removed|changed, group, startLeft, startRight, leftIndex, rightIndex, removedCount, addedCount, ...}`. Every render starts from this row array.
- Three display modes share that row array: `renderOneLine`, `renderSourceText` (via `buildWordMeta`), `renderGrouped` (`groupRows` collapses runs). Toggle via `#displayMode` select.
- `renderMiniMap` paints change markers from the same rows; `updateMiniMapViewport` and `scrollToMiniMapPosition` keep the minimap viewport, the two diff panes, and the scroll state in sync via the `syncLock` guard.
- Persistence: localStorage keys `secure-text-compare.session.v1` (`STORAGE_KEY`) for text/settings/zoom/filenames, and `secure-text-compare.export-log.v1` (`EXPORT_LOG_KEY`, capped at `MAX_EXPORT_LOGS = 50`) for export history. `scheduleSave` debounces writes; `scheduleRender` debounces diff recompute.
- HTML export: `buildHtmlReport` assembles a standalone HTML doc from `collectReportRows` + `reportTable`, handed to main via `saveHtmlReport(html, metadata)`.

Stylesheet [styles.css](styles.css) drives theme (`#themeMode` dark/light), font family (`#fontMode` system/rounded/serif/mono), and the resizer behavior used by `startPaneResize`/`startSectionResize`.

## Conventions to respect when editing

- Renderer must stay sandboxed — add new native capabilities by extending preload + a new `ipcMain.handle` in main.js, then call via `window.secureTextCompare.*`.
- Diff data model is the row array. New display features should derive from rows rather than re-tokenize the input.
- Privacy is the product premise (see README "private local"). Don't add network calls outside of `electron-updater` GitHub Releases checks.
- iOS is explicitly out of scope for the Electron shell (README "iOS Note"). Don't add platform branches for it.
- Don't commit `node_modules/`, `dist/`, or local logs (CONTRIBUTING).
