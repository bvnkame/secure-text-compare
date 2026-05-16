export default function ReportPreviewModal({ open, html, metadata, onClose, onSave }) {
  if (!open) return null;

  const summary = metadata?.summary || { added: 0, removed: 0, changedGroups: 0 };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal report-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reportPreviewTitle"
      >
        <header className="modal-header">
          <div>
            <h2 id="reportPreviewTitle">Report preview</h2>
            <p>
              {metadata?.leftName || "Left"} vs {metadata?.rightName || "Right"} ·{" "}
              {summary.changedGroups} changes · +{summary.added} / -{summary.removed}
            </p>
          </div>
          <button className="panel-action" type="button" title="Close preview" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="report-preview-body">
          <iframe
            title="Report preview"
            srcDoc={html}
            sandbox=""
            className="report-preview-frame"
          />
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-action" onClick={onSave}>
            Save report...
          </button>
        </footer>
      </section>
    </div>
  );
}
