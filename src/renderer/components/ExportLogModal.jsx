function formatExportDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

export default function ExportLogModal({ open, history, onClose, onClear, onOpenItem }) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="exportLogTitle">
        <header className="modal-header">
          <div>
            <h2 id="exportLogTitle">Export logs</h2>
            <p>
              {history.length
                ? `${history.length} exported ${history.length === 1 ? "report" : "reports"}`
                : "No exported reports yet"}
            </p>
          </div>
          <button className="panel-action" type="button" title="Close export logs" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="export-log-list">
          {history.length === 0 ? (
            <div className="export-log-empty">Exported reports will appear here after you create them.</div>
          ) : (
            history.map((item, index) => (
              <article key={item.id || `${item.filePath}-${index}`} className="export-log-item">
                <div>
                  <strong>{item.fileName || "Secure Text Compare report"}</strong>
                  <span>
                    {formatExportDate(item.exportedAt)} · {item.changedGroups} changes · +{item.added} / -{item.removed}
                  </span>
                  <small>
                    {item.leftName || "Left text"} vs {item.rightName || "Right text"}
                  </small>
                  <code>{item.filePath || ""}</code>
                </div>
                <button type="button" onClick={() => onOpenItem(item)}>
                  Open
                </button>
              </article>
            ))
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={onClear}>
            Clear logs
          </button>
          <button type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
