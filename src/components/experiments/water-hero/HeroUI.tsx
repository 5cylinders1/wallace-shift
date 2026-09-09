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
      <header
        className="water-hero__masthead"
        data-in-start="-1"
        data-in-end="0"
        data-out-start="0.25"
        data-out-end="0.35"
        data-shift="0"
      >
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
          data-in-start="-1"
          data-in-end="0"
          data-out-start="0.25"
          data-out-end="0.35"
          data-shift="14"
        >
          A shift in perspective
        </p>

        <h1
          className="water-hero__statement"
          data-in-start="-1"
          data-in-end="0"
          data-out-start="0.25"
          data-out-end="0.35"
          data-shift="22"
        >
          <span className="water-hero__word" data-opening-word="before" style={{ opacity: still ? .45 : .90 }}>Overlooked</span>
          <span className="water-hero__arrow" aria-hidden="true">
            →
          </span>
          <span className="water-hero__word water-hero__word--lit" data-opening-word="after" style={{ opacity: still ? 1 : .38 }}>
            Unforgettable
          </span>
        </h1>
      </div>

      {!still && (
        <p
          className="water-hero__cue"
          data-in-start="-1"
          data-in-end="0"
          data-out-start="0.10"
          data-out-end="0.16"
          data-shift="8"
        >
          Scroll
        </p>
      )}
    </div>
  )
}
