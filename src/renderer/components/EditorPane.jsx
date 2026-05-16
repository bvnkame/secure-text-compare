export default function EditorPane({
  id,
  side,
  label,
  fileName,
  filePath,
  value,
  onChange,
  placeholder,
  isFullscreen,
  onToggleFullscreen
}) {
  return (
    <article id={id} className={`editor-panel ${isFullscreen ? "fullscreen-panel" : ""}`.trim()}>
      <div className="panel-title">
        <span>{label}</span>
        <strong title={filePath || undefined}>{fileName}</strong>
        <button
          className="panel-action"
          type="button"
          title="Toggle fullscreen"
          onClick={onToggleFullscreen}
        >
          ⛶
        </button>
      </div>
      <textarea
        spellCheck="false"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-side={side}
      />
    </article>
  );
}
