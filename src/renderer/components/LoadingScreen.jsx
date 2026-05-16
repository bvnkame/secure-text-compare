export default function LoadingScreen({ visible, message }) {
  return (
    <div
      className={`loading-screen ${visible ? "" : "hidden"}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="loading-panel">
        <div className="loading-mark">SC</div>
        <div>
          <strong>Secure Text Compare</strong>
          <span>{message}</span>
        </div>
        <div className="loading-bar" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
