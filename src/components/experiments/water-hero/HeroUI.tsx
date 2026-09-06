/**
 * The DOM layer.
 *
 * Everything that carries meaning is real HTML — the statement, the link
 * back to the site, the heading structure. Nothing here is drawn into the
 * canvas, so it stays selectable, translatable, and reachable by a screen
 * reader that will never see the WebGL behind it.
 */
interface HeroUIProps {
  /** Reduced motion holds every element at rest instead of animating it. */
  still: boolean
}

export function HeroUI({ still }: HeroUIProps) {
  return (
    <div className="water-hero__ui">
      <header className="water-hero__masthead">
        <a className="water-hero__brand" href="/">
          <img
            src="/brand/wallace-shift-logo-white.svg"
            alt=""
            width={26}
            height={16}
          />
          <span>Wallace Shift</span>
        </a>
        <a className="water-hero__back" href="/">
          Back to wallaceshift.com
        </a>
      </header>

      <div className="water-hero__copy">
        <p
          className="water-hero__eyebrow"
          data-in-start="0.003"
          data-in-end="0.03"
          data-out-start="0.46"
          data-out-end="0.60"
          data-shift="14"
        >
          Realtime experiment
        </p>

        <h1
          className="water-hero__statement"
          data-in-start="0.008"
          data-in-end="0.055"
          data-out-start="0.48"
          data-out-end="0.63"
          data-shift="22"
        >
          <span className="water-hero__word">Overlooked</span>
          <span className="water-hero__arrow" aria-hidden="true">
            →
          </span>
          <span className="water-hero__word water-hero__word--lit">
            Unforgettable
          </span>
        </h1>
      </div>

      {!still && (
        <p
          className="water-hero__cue"
          data-in-start="0.004"
          data-in-end="0.03"
          data-out-start="0.06"
          data-out-end="0.13"
          data-shift="8"
        >
          Scroll
        </p>
      )}
    </div>
  )
}
