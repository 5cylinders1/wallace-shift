import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { AmbientLoop } from '../AmbientLoop/AmbientLoop'
import type { AmbientMediaAsset } from '../../content/mediaAssets'
import './OutcomeField.css'

// Field-local percentages (relative to the field's own box, not the row).
// HIDDEN collapses the leading edge fully against the right side (zero
// width, invisible). ACTIVE matches the brief's suggested clip-path:
// polygon(28% 0, 0 100%, 100% 100%, 100% 0).
const HIDDEN = { xTop: 100, xBottom: 100 }
const ACTIVE = { xTop: 28, xBottom: 0 }
const FALLBACK_HIGHLIGHT_PCT = 2
// Mobile: the field sits in normal flow below the copy, so the row must
// grow to make room for it — desktop instead overlays it absolutely with
// no effect on row height. Tall enough for the generated scene to read as
// a window, not a sliver.
const MOBILE_FIELD_HEIGHT = 200

function fieldClip(xTop: number, xBottom: number): string {
  return `polygon(${xTop}% 0%, ${xBottom}% 100%, 100% 100%, 100% 0%)`
}

function highlightClip(xTop: number, xBottom: number, hw: number): string {
  return `polygon(${xTop}% 0%, ${xTop + hw}% 0%, ${xBottom + hw}% 100%, ${xBottom}% 100%)`
}

interface OutcomeFieldProps {
  word: string
  isActive: boolean
  reducedMotion: boolean
  isMobile: boolean
  media?: AmbientMediaAsset
}

export function OutcomeField({ word, isActive, reducedMotion, isMobile, media }: OutcomeFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const edgeRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const ruleRefs = useRef<(HTMLSpanElement | null)[]>([])

  const lastAppliedRef = useRef<boolean | null>(null)
  const proxy = useRef({ xTop: HIDDEN.xTop, xBottom: HIDDEN.xBottom })
  const highlightPct = useRef(FALLBACK_HIGHLIGHT_PCT)
  const revealObserver = useRef<IntersectionObserver | null>(null)
  const activeTimeline = useRef<gsap.core.Timeline | null>(null)

  useGSAP(
    (_context, contextSafe) => {
      revealObserver.current?.disconnect()
      activeTimeline.current?.kill()
      const field = fieldRef.current
      const edge = edgeRef.current
      const wordEl = wordRef.current
      if (!field || !edge || !wordEl) return
      // Returning from mobile restores the full-height desktop panel.
      if (!isMobile && rootRef.current) gsap.set(rootRef.current, { clearProps: 'height' })

      const width = field.clientWidth
      if (width > 0) highlightPct.current = (2.5 / width) * 100

      const applyClip = () => {
        field.style.clipPath = fieldClip(proxy.current.xTop, proxy.current.xBottom)
        edge.style.clipPath = highlightClip(
          proxy.current.xTop,
          proxy.current.xBottom,
          highlightPct.current,
        )
      }

      const setInstant = (active: boolean) => {
        const target = active ? ACTIVE : HIDDEN
        proxy.current.xTop = target.xTop
        proxy.current.xBottom = target.xBottom
        applyClip()
        gsap.set(edge, { opacity: active ? 1 : 0 })
        if (mediaRef.current) gsap.set(mediaRef.current, { scale: 1 })
        gsap.set(wordEl, { yPercent: active ? 0 : 110, opacity: active ? 1 : 0, filter: 'blur(0px)' })
        const rules = ruleRefs.current.filter((el): el is HTMLSpanElement => !!el)
        gsap.set(rules, { opacity: 0, scaleX: 1, scaleY: 1, x: 0 })
        if (active) applyRuleRestingState(word, ruleRefs.current)
        if (isMobile && rootRef.current) {
          gsap.set(rootRef.current, { height: active ? MOBILE_FIELD_HEIGHT : 0 })
        }
      }

      const playEnter = () => {
        const tl = gsap.timeline()
        activeTimeline.current = tl

        if (isMobile && rootRef.current) {
          tl.to(rootRef.current, { height: MOBILE_FIELD_HEIGHT, duration: 0.6, ease: 'power3.inOut' }, 0)
        }
        tl.to(proxy.current, { xTop: ACTIVE.xTop, xBottom: ACTIVE.xBottom, duration: 0.7, ease: 'power3.inOut', onUpdate: applyClip }, 0)
        tl.to(edge, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
        if (mediaRef.current) {
          // Slight settle-in drift on the revealed scene. The media layer is
          // generated imagery, never the WS mark, so it's allowed to move.
          tl.fromTo(
            mediaRef.current,
            { scale: 1.07 },
            { scale: 1, duration: 1.1, ease: 'power2.out' },
            0,
          )
        }
        tl.fromTo(
          wordEl,
          { yPercent: 110, opacity: 0, filter: 'blur(3px)' },
          { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.68, ease: 'power3.out' },
          0.15,
        )
        animateRulesEnter(word, ruleRefs.current, tl)

        return tl
      }

      const playExit = () => {
        const tl = gsap.timeline()
        activeTimeline.current = tl

        tl.to(wordEl, { yPercent: -40, opacity: 0, duration: 0.32, ease: 'power2.in' }, 0)
        tl.to(
          proxy.current,
          { xTop: HIDDEN.xTop, xBottom: HIDDEN.xBottom, duration: 0.55, ease: 'power3.inOut', onUpdate: applyClip },
          0.05,
        )
        tl.to(edge, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0.05)
        const rules = ruleRefs.current.filter((el): el is HTMLSpanElement => !!el)
        tl.to(rules, { opacity: 0, duration: 0.2, ease: 'power1.in' }, 0)
        if (isMobile && rootRef.current) {
          tl.to(rootRef.current, { height: 0, duration: 0.5, ease: 'power3.inOut' }, 0.05)
        }

        return tl
      }

      const isFirstOrRedundant =
        lastAppliedRef.current === null || lastAppliedRef.current === isActive
      lastAppliedRef.current = isActive

      if (reducedMotion) {
        setInstant(isActive)
        return
      }

      if (isFirstOrRedundant) {
        if (!isActive) {
          setInstant(false)
          return
        }

        // First-ever mount with isActive already true (service 01): gate the
        // reveal behind intersection so it plays once, only once the section
        // is actually visible, rather than immediately at mount.
        setInstant(false)
        // The mobile field begins at zero height; observe its row so the
        // first reveal can open it without waiting on invisible media.
        const target = rootRef.current?.closest('.service-row') ?? rootRef.current
        if (!target) return

        const observer = new IntersectionObserver(
          contextSafe!((entries: IntersectionObserverEntry[]) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              playEnter()
              observer.unobserve(target)
            }
          }),
          { threshold: 0.3 },
        )
        observer.observe(target)
        revealObserver.current = observer
        return () => observer.disconnect()
      }

      if (isActive) playEnter()
      else playExit()
    },
    { scope: rootRef, dependencies: [isActive, reducedMotion, word, isMobile] },
  )

  return (
    <div className={`outcome-field outcome-field--${word.toLowerCase()}`} ref={rootRef}>
      <div className="outcome-field__field" ref={fieldRef}>
        {media && (
          <div className="outcome-field__media" ref={mediaRef}>
            <AmbientLoop media={media} active={isActive} />
            <div className="outcome-field__media-scrim" />
          </div>
        )}
        <span className="outcome-field__word" ref={wordRef} aria-hidden="true">
          {word}
        </span>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`outcome-field__rule outcome-field__rule--${i}`}
            ref={(el) => {
              ruleRefs.current[i] = el
            }}
          />
        ))}
        <div className="outcome-field__edge" ref={edgeRef} />
      </div>
    </div>
  )
}

function applyRuleRestingState(word: string, refs: (HTMLSpanElement | null)[]) {
  const active = rulesForWord(word, refs)
  gsap.set(active, { opacity: 0.4, scaleX: 1, scaleY: 1, x: 0 })
}

function rulesForWord(word: string, refs: (HTMLSpanElement | null)[]): HTMLSpanElement[] {
  const indices = word === 'TRUST' ? [0, 1] : word === 'FLOW' ? [0, 1, 2] : [0, 1, 2, 3]
  return indices.map((i) => refs[i]).filter((el): el is HTMLSpanElement => !!el)
}

function animateRulesEnter(
  word: string,
  refs: (HTMLSpanElement | null)[],
  tl: gsap.core.Timeline,
) {
  if (word === 'TRUST') {
    const [hLine, vLine] = rulesForWord(word, refs)
    if (hLine) tl.fromTo(hLine, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 0.45, duration: 0.4, ease: 'power2.out' }, 0.25)
    if (vLine) tl.fromTo(vLine, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 0.45, duration: 0.4, ease: 'power2.out' }, 0.3)
    return
  }

  if (word === 'FLOW') {
    const lines = rulesForWord(word, refs)
    tl.fromTo(
      lines,
      { x: -22, opacity: 0 },
      { x: 0, opacity: 0.4, duration: 0.45, stagger: 0.07, ease: 'power2.out' },
      0.25,
    )
    return
  }

  // TIME: short ticks resolve, then consolidate into one line.
  const [tick1, tick2, tick3, line] = rulesForWord(word, refs)
  const ticks = [tick1, tick2, tick3].filter((el): el is HTMLSpanElement => !!el)
  if (ticks.length) {
    tl.fromTo(
      ticks,
      { opacity: 0, scaleY: 0.4 },
      { opacity: 0.5, scaleY: 1, duration: 0.18, stagger: 0.05, ease: 'power2.out' },
      0.25,
    )
    tl.to(ticks, { opacity: 0, duration: 0.2, ease: 'power1.in' }, 0.5)
  }
  if (line) {
    tl.fromTo(
      line,
      { scaleX: 0, opacity: 0 },
      { scaleX: 1, opacity: 0.45, duration: 0.3, ease: 'power2.out' },
      0.48,
    )
  }
}
