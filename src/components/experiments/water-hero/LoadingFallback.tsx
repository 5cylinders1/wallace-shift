import './LoadingFallback.css'

/** Lightweight enough to appear before the scene's JavaScript arrives.
 * The same exact brand silhouette carries through asset/shader loading. */
export function LoadingFallback({ visible }: { visible: boolean }) {
  return (
    <div
      className="water-hero__loading"
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={!visible}
    >
      <div className="water-hero__loading-art" aria-hidden="true">
        <div className="water-hero__loading-orbit" />
        <div className="water-hero__loading-orbit water-hero__loading-orbit--echo" />
        <div className="water-hero__loading-mark">
          <img src="/brand/wallace-shift-logo-white.svg" alt="" width={168} height={100} fetchPriority="high" />
          <span className="water-hero__loading-light" />
        </div>
        <div className="water-hero__loading-reflection" />
      </div>
      <div className="water-hero__loading-caption" role="status" aria-live="polite">
        <span className="water-hero__loading-title">A shift is taking shape.</span>
        <span className="water-hero__loading-label">Preparing the experience</span>
      </div>
      <span className="water-hero__loading-track" aria-hidden="true" />
    </div>
  )
}
