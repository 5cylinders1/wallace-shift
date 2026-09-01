import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { pricingNav } from '../../content/pricing'
import { PricingNav } from './PricingNav'
import './PricingDeck.css'

/** Below this the three panels return to an ordinary vertical stack. */
const DECK_QUERY = '(min-width: 1024px)'

/**
 * Largest gap the settle pass will close. Sized for the ~20px the site
 * header loses when it goes solid; anything wider means the visitor has
 * scrolled somewhere else themselves and must not be pulled back.
 */
const MAX_SETTLE_DRIFT = 32

/**
 * Whether the track is actually laid out as a horizontal deck right now.
 * Observed from the DOM rather than taken from the media-query hook, so
 * behaviour stays correct on the frames around a breakpoint change, before
 * React has been told about it.
 */
function isHorizontal(track: HTMLElement): boolean {
  return track.scrollWidth > track.clientWidth + 1
}

interface PricingDeckProps {
  /** One panel per pricing area, in `pricingNav.items` order. */
  panels: ReactNode[]
}

/**
 * Websites, Web Apps and Automation as three horizontal panels instead of
 * three stacked sections — the page costs the height of whichever one is
 * open rather than the sum of all three.
 *
 * Built on native CSS scroll snapping rather than a carousel dependency or
 * a pinned, scroll-jacked section: the page keeps scrolling vertically
 * through the open panel, and the track only owns its own horizontal axis.
 * Every panel stays in the DOM and in the accessibility tree, so nothing is
 * hidden behind the interaction.
 */
export function PricingDeck({ panels }: PricingDeckProps) {
  const deckRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  /** Pending settle pass, so a second click cannot leave one behind. */
  const settleRef = useRef<{ handler: () => void; timer: number } | null>(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  const [hasMoved, setHasMoved] = useState(false)
  const isDeck = useMediaQuery(DECK_QUERY)
  const reducedMotion = useReducedMotion()

  // The track is as tall as its tallest panel by default, which would
  // leave the two shorter ones sitting above several hundred pixels of
  // empty bone. Sizing it to the open panel keeps the page's height
  // honest. Written straight to the node: it is a measurement, so it
  // cannot be known during render, and a re-render would be wasted work.
  const applyHeight = useCallback(() => {
    const track = trackRef.current
    if (!track || !isHorizontal(track)) return
    const panel = track.children[activeRef.current] as HTMLElement | undefined
    if (panel) track.style.height = `${panel.offsetHeight}px`
  }, [])

  /**
   * Single place the open panel changes, so the bar, the announcement and
   * the track height can never disagree about which one it is. Called
   * directly by the bar rather than left to the scroll listener: the click
   * already knows its target, and waiting on a scroll event would make the
   * highlight trail the visitor's own action.
   */
  const commit = useCallback(
    (index: number) => {
      if (index === activeRef.current) return
      activeRef.current = index
      applyHeight()
      setActive(index)
      setHasMoved(true)
    },
    [applyHeight],
  )

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    if (!isDeck) {
      track.style.height = ''
      return
    }

    const items = Array.from(track.children) as HTMLElement[]
    if (items.length === 0) return

    /** Snap position of each panel, measured once rather than per scroll. */
    let offsets: number[] = []

    // Panels reflow on their own (fonts landing, a heading wrapping at a
    // new width), so both the offsets and the height follow the content
    // rather than one snapshot taken at mount.
    const measure = () => {
      const base = items[0].offsetLeft
      offsets = items.map((item) => item.offsetLeft - base)
      applyHeight()
    }

    // Covers the changes the bar does not make itself: a swipe, a trackpad
    // gesture, or focus moving into an off-screen panel. Reads one cheap
    // scroll property and `commit` returns immediately unless the panel
    // actually changed, so React state is touched about as often as the
    // visitor changes panel — not once per scroll frame. Derived from the
    // snap position rather than an IntersectionObserver because after a
    // snap this is exact.
    const syncActive = () => {
      const x = track.scrollLeft
      let nearest = 0
      for (let i = 1; i < offsets.length; i += 1) {
        if (Math.abs(offsets[i] - x) < Math.abs(offsets[nearest] - x)) {
          nearest = i
        }
      }
      commit(nearest)
    }

    measure()

    track.addEventListener('scroll', syncActive, { passive: true })
    const observer = new ResizeObserver(measure)
    items.forEach((item) => observer.observe(item))

    return () => {
      track.removeEventListener('scroll', syncActive)
      observer.disconnect()
    }
  }, [isDeck, panels.length, applyHeight, commit])

  /**
   * Vertical offset at which the bar comes to rest against the site
   * header — the exact moment it goes sticky. Landing the page here puts
   * the top of the open panel directly beneath the bar, so a panel is at
   * its most visible and nothing at its top is covered.
   */
  const barRestOffset = (deck: HTMLElement, headerHeight: number) =>
    deck.getBoundingClientRect().top + window.scrollY - headerHeight

  const cancelSettle = () => {
    const pending = settleRef.current
    if (!pending) return
    window.removeEventListener('scrollend', pending.handler)
    window.clearTimeout(pending.timer)
    settleRef.current = null
  }

  // A settle pass outliving the component would run against a detached
  // deck; the bounded drift check would ignore it, but it should not be
  // left armed at all.
  useEffect(() => cancelSettle, [])

  /**
   * The site header is about 20px shorter once the page has scrolled, so a
   * target worked out from its resting height stops just short of where
   * the bar finally sits. Closes that gap once scrolling has stopped,
   * rather than guessing the header's future height up front.
   */
  const settleBar = (deck: HTMLElement) => {
    const nav = deck.querySelector<HTMLElement>('.pricing-nav')
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!nav || !header) return

    const drift =
      nav.getBoundingClientRect().top - header.getBoundingClientRect().bottom
    // Above 2px, so sub-pixel rounding never triggers a pointless nudge.
    if (drift > 2 && drift <= MAX_SETTLE_DRIFT) {
      window.scrollBy({ top: drift, behavior: 'auto' })
    }
  }

  const goTo = (id: string, index: number) => {
    const deck = deckRef.current
    const track = trackRef.current
    if (!deck || !track) return

    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'
    // Read live rather than cached: the header is shorter once the page has
    // scrolled, and the bar's sticky offset follows it.
    const headerHeight =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--site-header-height',
        ),
      ) || 0

    // Below the deck breakpoint the panels are simply stacked, so the bar
    // falls back to being what it was: anchors down the page. The panel
    // itself is what has to clear the header and the bar.
    if (!isHorizontal(track)) {
      const panel = document.getElementById(id)
      if (!panel) return
      const nav = deck.querySelector<HTMLElement>('.pricing-nav')
      window.scrollTo({
        top:
          panel.getBoundingClientRect().top +
          window.scrollY -
          headerHeight -
          (nav?.offsetHeight ?? 0),
        behavior,
      })
      return
    }

    const items = Array.from(track.children) as HTMLElement[]
    const target = items[index]
    if (!target) return

    commit(index)

    // Measured from the first panel rather than assuming panel width plus
    // gap, so the jump stays correct at any viewport width.
    track.scrollTo({
      left: target.offsetLeft - items[0].offsetLeft,
      behavior,
    })

    // Always, not only when the deck has scrolled off the top: clicking a
    // panel from halfway down a long one should still present that panel
    // from its beginning.
    window.scrollTo({ top: barRestOffset(deck, headerHeight), behavior })

    // Only ever one pending pass. Left to accumulate, a listener from an
    // earlier click outlives its own scroll and fires on some unrelated
    // scroll of the visitor's later on.
    cancelSettle()
    const settle = () => {
      settleRef.current = null
      settleBar(deck)
    }
    // Hoisted out of the `if` so the `in` check does not narrow `window`
    // itself away in the fallback branch.
    const hasScrollEnd = 'onscrollend' in window
    let timer = 0
    if (hasScrollEnd) {
      window.addEventListener('scrollend', settle, { once: true })
    } else {
      timer = window.setTimeout(settle, 700)
    }
    settleRef.current = { handler: settle, timer }
  }

  const activeId = pricingNav.items[active]?.id ?? pricingNav.items[0].id
  const activeLabel = pricingNav.items[active]?.label

  return (
    <div className="pricing-deck" ref={deckRef}>
      <PricingNav activeId={activeId} onSelect={goTo} />

      {/* Moving the track changes what is on screen without moving focus,
          which a screen reader would otherwise report as nothing having
          happened. Empty until the deck has actually moved. */}
      {isDeck ? (
        <p className="visually-hidden" role="status" aria-live="polite">
          {hasMoved && activeLabel
            ? `${activeLabel}, ${active + 1} of ${panels.length}`
            : ''}
        </p>
      ) : null}

      <div className="pricing-deck__track" ref={trackRef}>
        {panels.map((panel, index) => (
          <div className="pricing-deck__panel" key={pricingNav.items[index].id}>
            {panel}
          </div>
        ))}
      </div>
    </div>
  )
}
