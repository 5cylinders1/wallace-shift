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
 * Layered mode. The three areas are a stack, each above the one before it.
 * An area to the right arrives from `OFF_STAGE`, travelling left across what
 * is showing; an area to the left is reached by sending everything above it
 * back out to `OFF_STAGE`, uncovering it. One edge, both directions — the
 * stack's own order is what makes them read as opposites.
 */
const OFF_STAGE = 'translateX(100%)'
const ON_STAGE = 'translateX(0)'
const SLIDE_MS = 520

/**
 * Whether the three areas are laid out as the horizontal deck right now.
 * Observed from the DOM rather than taken from the media-query hook, so
 * behaviour stays correct on the frames around a breakpoint change, before
 * React has been told about it.
 *
 * Read from the track's own `display`, which only the stylesheet ever sets.
 * Overflow is no good — the layered layout parks its inactive areas off to
 * the right, so `scrollWidth > clientWidth` is true there too. Nor is a
 * panel's position: an area held to the frame mid-slide is `fixed` rather
 * than `absolute`, and a detector that reads one would call the layout a deck
 * for exactly as long as a slide lasts, which is when it matters most.
 */
function isHorizontal(track: HTMLElement): boolean {
  return getComputedStyle(track).display === 'grid'
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
  /** The panel currently crossing the frame, so a second tab cannot leave
   *  one fixed and half-translated behind. */
  const slideRef = useRef<{ panels: HTMLElement[]; timer: number } | null>(null)
  /** Header plus bar: the top of the frame a package fills and holds in. */
  const frameTopRef = useRef(0)
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

  /**
   * The steady state of the layered areas: everything at or below the active
   * one rests on stage, everything above it waits off stage, and only the
   * active one is exposed. Both directions of travel end here, so neither has
   * to unwind itself.
   */
  const settlePanels = useCallback(() => {
    const track = trackRef.current
    if (!track || isHorizontal(track)) return
    const panels = Array.from(track.children) as HTMLElement[]
    panels.forEach((panel, i) => {
      panel.classList.remove(
        'pricing-deck__panel--sliding',
        'pricing-deck__panel--moving',
        'pricing-deck__panel--frozen',
      )
      panel.style.removeProperty('--pricing-freeze-top')
      panel.style.transform = i <= activeRef.current ? ON_STAGE : OFF_STAGE
      panel.dataset.active = i === activeRef.current ? 'true' : 'false'
    })
    const active = panels[activeRef.current]
    if (active) {
      track.style.setProperty('--pricing-track-lock', `${active.offsetHeight}px`)
    }
  }, [])

  /** Ends a slide early or on time; safe to call when none is running. */
  const endSlide = useCallback(() => {
    const pending = slideRef.current
    if (pending) {
      window.clearTimeout(pending.timer)
      slideRef.current = null
    }
    settlePanels()
  }, [settlePanels])

  useEffect(() => endSlide, [endSlide])

  /**
   * The second half of a tab change. The slide has landed, so the page can
   * now be taken to the top of the new area — instantly, and while that area
   * is still held to the frame at exactly the geometry the scroll arrives at,
   * so releasing it changes nothing on screen. The visitor sees one motion,
   * the slide, and is at the top of the new area when it finishes.
   */
  const land = useCallback(
    (destination: number) => {
      window.scrollTo({ top: destination, behavior: 'instant' })
      endSlide()
    },
    [endSlide],
  )

  /**
   * Where an area's first package begins. Read with the package's hold
   * neutralised: sticky is a form of relative positioning, so a held package
   * reports its stuck position from a bounding rect and from `offsetTop`
   * alike, and landing on one that was already holding drops the visitor into
   * the middle of it rather than at its first line.
   */
  const firstPackageTop = (panel: HTMLElement) => {
    const first = panel.querySelector<HTMLElement>('.tier')
    const box = first ?? panel
    const held = box.style.position
    box.style.position = 'static'
    const top = box.getBoundingClientRect().top + window.scrollY
    box.style.position = held
    return Math.max(0, top - frameTopRef.current)
  }


  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    // Layered mode. Areas change only by the bar, so there is no scroll to
    // follow; what the page does need is the frame's top, which is where a
    // package holds and how tall it has to be.
    if (!isDeck) {
      track.style.height = ''
      const panels = Array.from(track.children) as HTMLElement[]
      if (panels.length === 0) return

      const measure = () => {
        if (slideRef.current) return
        const header =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--site-header-height',
            ),
          ) || 0
        const nav = deckRef.current?.querySelector<HTMLElement>('.pricing-nav')
        frameTopRef.current = header + (nav?.offsetHeight ?? 0)
        deckRef.current?.style.setProperty(
          '--pricing-frame-top',
          `${frameTopRef.current}px`,
        )
        // A package holds once its own end reaches the bottom of the frame,
        // which is an offset only the package's own height can give. Read
        // here rather than in CSS because no CSS length knows it.
        for (const panel of panels) {
          for (const tier of panel.querySelectorAll<HTMLElement>('.tier')) {
            tier.style.setProperty(
              '--pricing-package-height',
              `${tier.offsetHeight}px`,
            )
          }
        }
        const active = panels[activeRef.current]
        if (active) {
          track.style.setProperty('--pricing-track-lock', `${active.offsetHeight}px`)
        }
      }

      measure()
      settlePanels()
      // Heights move on their own — fonts landing, a scope line wrapping —
      // and a stale height is a package that holds in the wrong place.
      const observer = new ResizeObserver(measure)
      for (const panel of panels) observer.observe(panel)
      window.addEventListener('resize', measure)
      return () => {
        observer.disconnect()
        window.removeEventListener('resize', measure)
        for (const panel of panels) {
          panel.style.transform = ''
          panel.style.removeProperty('--pricing-freeze-top')
          for (const tier of panel.querySelectorAll<HTMLElement>('.tier')) {
            tier.style.removeProperty('--pricing-package-height')
          }
          delete panel.dataset.active
        }
        track.style.removeProperty('--pricing-track-lock')
      }
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
  }, [isDeck, panels.length, applyHeight, commit, settlePanels])

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

  const goTo = (_id: string, index: number) => {
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

    // Below the deck breakpoint the three areas are layered, and the bar
    // slides one across the top of another. The page still has to arrive at
    // the chosen area, but the travel is what the visitor sees.
    if (!isHorizontal(track)) {
      const panels = Array.from(track.children) as HTMLElement[]
      const target = panels[index]
      if (!target || index === activeRef.current) {
        if (target) window.scrollTo({ top: firstPackageTop(target), behavior: 'auto' })
        return
      }
      endSlide()
      const from = activeRef.current
      const forward = index > from
      // Everything above the target has to leave; everything at or below it
      // belongs at rest. This is the whole state, applied either way.
      const leaving = forward ? [panels[from]] : panels.slice(index + 1, from + 1)

      // Measured before anything is frozen: a fixed panel's box is the
      // frame's, not its own.
      const destination = firstPackageTop(target)

      // The two motions are sequenced rather than run together, which is what
      // made a tab change from halfway down an area look like several things
      // happening at once. Nothing scrolls and no height changes while the
      // slide runs, so the area being left stays exactly where the visitor
      // left it rather than snapping to its own top underneath the incoming
      // one.
      //
      // That leaves the arriving area showing whatever happens to be at the
      // visitor's depth instead of its beginning, so it is held to the frame
      // at the position the page is about to take. Same geometry, so the
      // scroll that follows the slide is invisible and the release is silent.
      const trackTop = track.getBoundingClientRect().top + window.scrollY
      target.style.setProperty(
        '--pricing-freeze-top',
        `${trackTop - destination}px`,
      )
      target.classList.add('pricing-deck__panel--frozen')

      deck.style.setProperty('--pricing-slide-duration', `${SLIDE_MS}ms`)
      target.dataset.active = 'true'
      target.classList.add('pricing-deck__panel--sliding')
      target.style.transform = forward ? OFF_STAGE : ON_STAGE
      for (const panel of leaving) {
        panel.classList.add('pricing-deck__panel--sliding')
        panel.style.transform = ON_STAGE
      }
      // Intermediates on the way forward are simply at rest behind the
      // arriving area; they are never seen travelling.
      for (const panel of panels.slice(0, index)) panel.style.transform = ON_STAGE

      const moving = forward ? [target] : leaving
      slideRef.current = {
        panels: [target, ...leaving],
        // A timer rather than `transitionend` alone: a transition that never
        // starts would leave an area frozen to the frame for good.
        timer: window.setTimeout(() => land(destination), SLIDE_MS + 80),
      }

      commit(index)
      if (reducedMotion) {
        land(destination)
        return
      }
      // Commit the starting transform before the transition exists, or the
      // browser animates from wherever the area already was.
      void target.offsetWidth
      for (const panel of moving) {
        panel.classList.add('pricing-deck__panel--moving')
        panel.style.transform = forward ? ON_STAGE : OFF_STAGE
      }
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
      <p className="visually-hidden" role="status" aria-live="polite">
        {hasMoved && activeLabel
          ? `${activeLabel}, ${active + 1} of ${panels.length}`
          : ''}
      </p>

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
