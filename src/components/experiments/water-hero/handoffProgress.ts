import { SPLIT_START, smoothRange } from './sceneDirector'
import type { LogoRevealContour } from './waterHeroTypes'

/** Bounds of the heading box relative to the canvas viewport. */
export interface RevealBounds { left: number; top: number; width: number; height: number }

const CLOSED_REVEAL = 'polygon(50% 0%, 50% 100%, 50% 100%, 50% 0%)'

/** Keep the real projected metal contour when mapping into HTML coordinates.
 * The two traces bound only the space between the pieces, so text outside
 * their outer edges cannot appear early. */
export function logoRevealClip(contour: LogoRevealContour | null | undefined, bounds: RevealBounds) {
  if (contour?.complete) return 'none'
  if (!contour?.open || bounds.width <= 0 || bounds.height <= 0) return CLOSED_REVEAL
  const points: string[] = []
  const point = (x: number, y: number) => {
    const localX = ((x + 1) * .5 - bounds.left) / bounds.width * 100
    const localY = ((1 - y) * .5 - bounds.top) / bounds.height * 100
    return `${Number(localX.toFixed(4))}% ${Number(localY.toFixed(4))}%`
  }
  for (let i = 0; i < contour.rows.length; i++) points.push(point(contour.left[i], contour.rows[i]))
  for (let i = contour.rows.length - 1; i >= 0; i--) points.push(point(contour.right[i], contour.rows[i]))
  return `polygon(${points.join(', ')})`
}

/** One persistent HTML composition, revealed through the opening between
 * the two halves. Offset tracks its section after the hero releases. */
export function applyHandoffProgress(root: HTMLElement, narrative: number, offset: number,
  still: boolean, heroTravel = 5, inspecting = false, contour?: LogoRevealContour | null,
  bounds: RevealBounds = { left: 0, top: 0, width: 1, height: 1 }) {
  // The contour determines where type can appear; a separate scroll-bound
  // fade lets it gather brightness as the halves first begin moving apart.
  const headingReveal = still ? 1 : smoothRange(SPLIT_START, .90, narrative)
  const active = still || (headingReveal > .001 && Boolean(contour?.open || contour?.complete) && (offset <= .002 || inspecting))
  const stage = root.querySelector<HTMLElement>('.water-hero-handoff__stage')
  if (stage) {
    stage.style.visibility = active ? 'visible' : 'hidden'
    const release = heroTravel * (1 - SPLIT_START)
    stage.style.backgroundColor = `rgba(4, 6, 10, ${still ? 1 : smoothRange(release, release + .75, -offset)})`
  }
  root.inert = !active
  root.setAttribute('aria-hidden', String(!active))
  root.setAttribute('data-inspection', String(inspecting))

  const aperture = root.querySelector<HTMLElement>('[data-split-aperture]')
  if (aperture) {
    aperture.style.clipPath = still ? 'none' : logoRevealClip(contour, bounds)
    aperture.style.opacity = String(active ? headingReveal : 0)
    aperture.style.visibility = active ? 'visible' : 'hidden'
    aperture.setAttribute('aria-hidden', String(!active))
  }

  root.querySelectorAll<HTMLElement>('[data-handoff-start]').forEach(element => {
    const reveal = still ? 1 : smoothRange(Number(element.dataset.handoffStart), Number(element.dataset.handoffEnd), narrative)
    const opacity = active ? reveal : 0
    const hidden = opacity <= .001
    element.style.opacity = String(opacity)
    element.style.transform = still ? 'none' : `translate3d(0, ${(1 - reveal) * Number(element.dataset.handoffShift ?? 8)}px, 0)`
    element.style.visibility = hidden ? 'hidden' : 'visible'
    element.inert = hidden
    element.setAttribute('aria-hidden', String(hidden))
    if (hidden && element.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur()
    }
  })
}
