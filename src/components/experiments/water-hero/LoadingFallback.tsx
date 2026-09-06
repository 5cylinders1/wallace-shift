/**
 * Shown while the GLB and the first compiled shaders land.
 *
 * A branded hold rather than a spinner or a blank frame: the route opens
 * on a near-black scene either way, so the loading state's job is only to
 * prove the page is alive.
 */
export function LoadingFallback({ visible }: { visible: boolean }) {
  return (
    <div
      className="water-hero__loading"
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={visible ? undefined : 'true'}
    >
      <img
        src="/brand/wallace-shift-logo-white.svg"
        alt=""
        width={34}
        height={20}
      />
      <span>Preparing the surface</span>
    </div>
  )
}
