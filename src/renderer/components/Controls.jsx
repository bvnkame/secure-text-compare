import { useState } from "react";

function ToolButton({ id, icon, label, onClick, className = "", disabled = false }) {
  return (
    <button
      id={id}
      className={`tool-button ${className}`.trim()}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="select-control">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function Controls({
  onCheck,
  onLoadLeft,
  onLoadRight,
  onTrim,
  onSave,
  onOpen,
  onExport,
  onShowLogs,
  onCheckUpdate,
  onSwap,
  onClear,
  onZoomIn,
  onZoomOut,
  zoom,
  displayMode,
  onDisplayMode,
  changeFilter,
  onChangeFilter,
  themeMode,
  onThemeMode,
  fontMode,
  onFontMode,
  wordWrap,
  onWordWrap,
  inlineWords,
  onInlineWords,
  updateStatus
}) {
  const [expanded, setExpanded] = useState(false);
  const downloaded = updateStatus?.state === "downloaded";
  const inflight = updateStatus?.state === "checking" || updateStatus?.state === "downloading";
  const updateIcon = downloaded ? "⇧" : inflight ? "…" : "↻";
  const updateLabel = downloaded ? "Install" : inflight ? (updateStatus.state === "checking" ? "Check" : "Get") : "Update";

  return (
    <section
      className={`controls ${expanded ? "expanded" : ""}`.trim()}
      aria-label="Diff controls"
    >
      <div className="controls-primary">
        <ToolButton icon="✓" label="Check" onClick={onCheck} />
        <ToolButton icon="L" label="Load left" onClick={onLoadLeft} />
        <ToolButton icon="R" label="Load right" onClick={onLoadRight} />
        <ToolButton icon="1" label="One line" onClick={onTrim} />
        <ToolButton icon="S" label="Save" onClick={onSave} />
        <ToolButton icon="O" label="Open" onClick={onOpen} />
        <ToolButton icon="H" label="Report" onClick={onExport} />
        <ToolButton icon="≡" label="Logs" onClick={onShowLogs} />
        <ToolButton
          icon={updateIcon}
          label={updateLabel}
          onClick={onCheckUpdate}
          className={`update-button ${downloaded ? "attention" : ""}`.trim()}
          disabled={inflight}
        />
        <ToolButton icon="⇄" label="Swap" onClick={onSwap} />
        <ToolButton icon="×" label="Clear" onClick={onClear} />
        <div className="zoom-controls" aria-label="Zoom controls">
          <button type="button" onClick={onZoomOut}>-</button>
          <span id="zoomValue">{zoom}%</span>
          <button type="button" onClick={onZoomIn}>+</button>
        </div>
      </div>

      <button
        className="menu-toggle"
        type="button"
        aria-expanded={expanded}
        aria-label="Toggle advanced controls"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide" : "More"}
      </button>

      <div className="controls-secondary">
        <Select
          label="Format"
          value={displayMode}
          onChange={onDisplayMode}
          options={[
            { value: "one-line", label: "One line" },
            { value: "source", label: "Source format" },
            { value: "grouped", label: "Grouped" }
          ]}
        />
        <Select
          label="Show"
          value={changeFilter}
          onChange={onChangeFilter}
          options={[
            { value: "all", label: "All" },
            { value: "added", label: "Green" },
            { value: "changed", label: "Yellow" },
            { value: "removed", label: "Red" }
          ]}
        />
        <Select
          label="Theme"
          value={themeMode}
          onChange={onThemeMode}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" }
          ]}
        />
        <Select
          label="Font"
          value={fontMode}
          onChange={onFontMode}
          options={[
            { value: "system", label: "System" },
            { value: "rounded", label: "Rounded" },
            { value: "serif", label: "Serif" },
            { value: "mono", label: "Mono" }
          ]}
        />
        <Toggle label="Wrap" checked={wordWrap} onChange={onWordWrap} />
        <Toggle label="Word highlights" checked={inlineWords} onChange={onInlineWords} />
      </div>
    </section>
  );
}
