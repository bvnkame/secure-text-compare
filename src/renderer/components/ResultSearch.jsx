export default function ResultSearch({ value, onChange, onPrev, onNext, count, position }) {
  return (
    <div className="result-search" aria-label="Search result content">
      <input
        type="search"
        placeholder="Search result..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.shiftKey ? onPrev() : onNext();
          }
        }}
      />
      <button type="button" title="Previous match" onClick={onPrev}>
        ↑
      </button>
      <button type="button" title="Next match" onClick={onNext}>
        ↓
      </button>
      <span id="searchCount">{count === 0 ? "0/0" : `${position}/${count}`}</span>
    </div>
  );
}
