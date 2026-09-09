/** Direct progress writes keep the HTML and WebGL compositions synchronized. */
import { sampleOpeningReveal } from './openingReveal'

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function ease(t: number): number {
  return t * t * (3 - 2 * t)
}

export function applyHeroUiProgress(
  root: HTMLElement | null,
  narrative: number,
  still: boolean,
) {
  if (!root) return

  // Emphasis is purely visual: both words remain semantic, selectable text.
  // Their parent controls the existing visibility/accessibility exit behavior.
  const { prominence } = sampleOpeningReveal(narrative, still)
  const before = root.querySelector<HTMLElement>('[data-opening-word="before"]')
  const after = root.querySelector<HTMLElement>('[data-opening-word="after"]')
  if (before) before.style.opacity = String(.90 - .45 * prominence)
  if (after) after.style.opacity = String(.38 + .62 * prominence)

  const elements = root.querySelectorAll<HTMLElement>('[data-in-start]')

  elements.forEach((element) => {
    const inStart = Number(element.dataset.inStart)
    const inEnd = Number(element.dataset.inEnd)
    const outStart = Number(element.dataset.outStart ?? Infinity)
    const outEnd = Number(element.dataset.outEnd ?? Infinity)
    const shift = Number(element.dataset.shift ?? 20)
    const appear = still
      ? 1
      : ease(clamp01((narrative - inStart) / Math.max(inEnd - inStart, 1e-6)))
    const leave = still || !Number.isFinite(outStart)
      ? 0
      : ease(clamp01((narrative - outStart) / Math.max(outEnd - outStart, 1e-6)))
    const opacity = appear * (1 - leave)
    const hidden = opacity <= 0.001

    element.style.opacity = String(opacity)
    element.style.transform = still
      ? 'none'
      : `translate3d(0, ${(1 - appear) * shift - leave * shift * 0.5}px, 0)`
    element.style.visibility = hidden ? 'hidden' : 'visible'
    element.inert = hidden
    element.setAttribute('aria-hidden', String(hidden))
    if (hidden && element.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur()
    }
  })
}
