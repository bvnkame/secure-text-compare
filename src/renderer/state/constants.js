export const STORAGE_KEY = "secure-text-compare.session.v1";
export const EXPORT_LOG_KEY = "secure-text-compare.export-log.v1";
export const MAX_EXPORT_LOGS = 50;
export const DEFAULT_ZOOM = 100;

export const SAMPLE_LEFT = `Release notes

Added project import from local text files.
Improved comparison rendering for longer documents.
Fixed a layout issue in the review sidebar.

Known issues
- Large binary files are not supported.
- iOS packaging needs a native wrapper.`;

export const SAMPLE_RIGHT = `Release notes

Added project import from local text and markdown files.
Improved comparison rendering for longer documents with synchronized scrolling.
Fixed a layout issue in the review panel.
Added hover metadata for changed words.

Known issues
- Large binary files are not supported.`;

export const DEFAULT_SESSION = {
  leftText: SAMPLE_LEFT,
  rightText: SAMPLE_RIGHT,
  leftName: "Unsaved text",
  rightName: "Unsaved text",
  leftPath: "",
  rightPath: "",
  inlineWords: true,
  wordWrap: true,
  displayMode: "one-line",
  changeFilter: "all",
  themeMode: "dark",
  fontMode: "system",
  editorLeftSize: 50,
  diffLeftSize: 50,
  editorsHeight: 280,
  miniMapZoom: 100,
  searchQuery: "",
  zoom: DEFAULT_ZOOM
};
