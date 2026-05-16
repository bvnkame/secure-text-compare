export default function TopBar({ changeCount, wordCount }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">SC</div>
        <div>
          <h1>Secure Text Compare</h1>
          <p>Private two-page text comparison</p>
        </div>
      </div>
      <div className="metrics" aria-live="polite">
        <span>{changeCount} {changeCount === 1 ? "change" : "changes"}</span>
        <span>{wordCount} words</span>
      </div>
    </header>
  );
}
