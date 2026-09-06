/**
 * Writes the hero DOM layer's state straight from progress.
 *
 * Deliberately not React state and not a GSAP timeline: every element is
 * a pure function of the current progress, which is what makes scrolling
 * back up land on exactly the frame the user saw on the way down, and
 * what keeps a scrollbar jump from arriving mid-transition.
 *
 * Kept out of `HeroUI.tsx` so that file exports only a component and
 * stays eligible for fast refresh.
 */

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

  const elements = root.querySelectorAll<HTMLElement>('[data-in-start]')

  elements.forEach((element) => {
    if (still) {
      element.style.opacity = '1'
      element.style.transform = 'none'
      return
    }

    const inStart = Number(element.dataset.inStart)
    const inEnd = Number(element.dataset.inEnd)
    const outStart = element.dataset.outStart
      ? Number(element.dataset.outStart)
      : Number.POSITIVE_INFINITY
    const outEnd = element.dataset.outEnd
      ? Number(element.dataset.outEnd)
      : Number.POSITIVE_INFINITY
    const shift = element.dataset.shift ? Number(element.dataset.shift) : 20

    const appear = ease(
      clamp01((narrative - inStart) / Math.max(inEnd - inStart, 1e-6)),
    )
    const leave = Number.isFinite(outStart)
      ? ease(clamp01((narrative - outStart) / Math.max(outEnd - outStart, 1e-6)))
      : 0

    element.style.opacity = String(appear * (1 - leave))
    element.style.transform = `translate3d(0, ${
      (1 - appear) * shift - leave * shift * 0.5
    }px, 0)`
  })
}
