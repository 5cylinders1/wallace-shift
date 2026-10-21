import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(useGSAP, CustomEase, Flip, ScrollTrigger, SplitText)

/**
 * Tambour's three curves, from cabinet hardware (scripts/cabinetry/easing.py,
 * docs/demos/cabinetry-motion.md). `drawer` is measured from footage of a
 * drawer closing; `hinge` and `tambour` are physical models. tambour.css
 * carries the same values as CSS custom properties.
 */
export const CURVES = {
  drawer: [0.604, 0.326, 0.836, 1],
  hinge: [0.192, 1, 0, 0.743],
  tambour: [0.379, 0, 0.524, 0.968],
} as const
for (const [name, [x1, y1, x2, y2]] of Object.entries(CURVES)) CustomEase.create(name, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`)

/** Seconds. The measured drawer took 2.9 s; the screen runs at about a third of real time. */
export const DUR = { quick: 0.32, rise: 0.9, reveal: 1.2, roll: 1.4 } as const
export const STAGGER = { lines: 0.08, items: 0.12 } as const
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'
export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const DRIFT_SCALE = 1.08
const all = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => Array.from(root.querySelectorAll<T>(selector)) as T[]

/**
 * Wires the motion map for whatever page is rendered, from data attributes:
 *
 *   data-split     headline or paragraph lines rise into place (drawer)
 *   data-reveal    an item rises into place; items arriving together stagger (drawer)
 *   data-uncover   a photo frame uncovers from the bottom while the photo settles (hinge)
 *   data-drift     the photo inside a frame drifts with scroll (linear, scrubbed)
 *   data-settle    a full-bleed photo eases from 1.12x to 1x as it arrives (scrubbed);
 *                  "load" settles it once on page load instead
 *   data-draw      a rule draws left to right (tambour)
 *   data-survey    hotspots inside appear one after another (hinge)
 *   data-process   a gold line runs across the steps and lights each one (scrubbed)
 *
 * Each section is wired only when it comes within a screen of the viewport
 * (sections already on screen are wired at once), so splitting text and
 * measuring triggers is spread over the visit instead of piling into the first
 * frame. Nothing runs under reduced motion: everything stays in its final state.
 */
export function usePageMotion(page: string) {
  useGSAP(() => {
    const root = document.querySelector<HTMLElement>('.tb-site main')
    if (!root) return
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, context => {
      const lit: HTMLElement[] = []
      const queued = { reveal: [] as HTMLElement[], uncover: [] as HTMLElement[], frame: 0 }
      const flush = () => {
        queued.frame = 0
        const reveal = queued.reveal.splice(0)
        const uncover = queued.uncover.splice(0)
        context.add(() => {
          if (reveal.length) gsap.to(reveal, { autoAlpha: 1, y: 0, duration: DUR.rise, ease: 'drawer', stagger: STAGGER.items, overwrite: true })
          uncover.forEach((frame, n) => {
            const photo = frame.querySelector('img')
            const timeline = gsap.timeline({ delay: n * STAGGER.items })
            timeline.to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.reveal, ease: 'hinge' }, 0)
            const rest = frame.hasAttribute('data-drift') ? DRIFT_SCALE : 1
            if (photo) timeline.fromTo(photo, { scale: rest + 0.16 }, { scale: rest, duration: DUR.reveal * 1.5, ease: 'hinge' }, 0)
          })
        })
      }
      const enqueue = (list: HTMLElement[], el: HTMLElement) => { list.push(el); queued.frame ||= requestAnimationFrame(flush) }

      const wire = (section: HTMLElement) => {
        for (const el of all(section, '[data-split]')) {
          SplitText.create(el, {
            type: 'lines', mask: 'lines', linesClass: 'tb-line', autoSplit: true,
            onSplit: self => gsap.from(self.lines, {
              yPercent: 110, duration: DUR.rise, ease: 'drawer', stagger: STAGGER.lines,
              scrollTrigger: { trigger: el, start: 'top 92%', once: true },
            }),
          })
        }
        for (const el of all(section, '[data-reveal]')) {
          gsap.set(el, { autoAlpha: 0, y: 34 })
          ScrollTrigger.create({ trigger: el, start: 'top 94%', once: true, onEnter: () => enqueue(queued.reveal, el) })
        }
        for (const frame of all(section, '[data-uncover]')) {
          gsap.set(frame, { clipPath: 'inset(100% 0% 0% 0%)' })
          ScrollTrigger.create({ trigger: frame, start: 'top 90%', once: true, onEnter: () => enqueue(queued.uncover, frame) })
        }
        for (const frame of all(section, '[data-drift]')) {
          const photo = frame.querySelector('img')
          if (!photo) continue
          // Drifting photos sit at 1.08x so the frame never shows an edge.
          if (!frame.hasAttribute('data-uncover')) gsap.set(photo, { scale: DRIFT_SCALE })
          gsap.fromTo(photo, { yPercent: -3.5 }, { yPercent: 3.5, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } })
        }
        for (const el of all(section, '[data-settle]')) {
          if (el.dataset.settle === 'load') gsap.fromTo(el, { scale: 1.1 }, { scale: 1, duration: 2.2, ease: 'hinge' })
          else gsap.fromTo(el, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'top 15%', scrub: true } })
        }
        for (const el of all(section, '[data-draw]')) {
          gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: DUR.roll, ease: 'tambour', scrollTrigger: { trigger: el, start: 'top 92%', once: true } })
        }
        for (const el of all(section, '[data-survey]')) {
          gsap.from(all(el, '.tb-hotspot'), { scale: 0.2, autoAlpha: 0, duration: 0.7, ease: 'hinge', stagger: 0.11, scrollTrigger: { trigger: el, start: 'top 70%', once: true } })
        }
        for (const list of all(section, '[data-process]')) {
          const steps = all(list, ':scope > li')
          const fill = list.parentElement?.querySelector<HTMLElement>('.tb-process-line i')
          list.dataset.armed = ''
          lit.push(list)
          gsap.timeline({
            scrollTrigger: {
              trigger: list, start: 'top 82%', end: 'bottom 62%', scrub: 0.6,
              onUpdate: self => steps.forEach((step, n) => step.classList.toggle('is-lit', self.progress >= (n + 0.3) / steps.length)),
            },
          }).fromTo(fill ?? {}, { scaleX: 0 }, { scaleX: 1, ease: 'none' })
        }
      }

      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          observer.unobserve(entry.target)
          context.add(() => wire(entry.target as HTMLElement))
        }
      }, { rootMargin: '0px 0px 100% 0px' })
      const seen = new WeakSet<Element>()
      const adopt = () => {
        const sections = all(root, ':scope > section').filter(section => !seen.has(section))
        const tops = sections.map(section => section.getBoundingClientRect().top)
        sections.forEach((section, n) => { seen.add(section); if (tops[n] < window.innerHeight * 1.25) wire(section); else observer.observe(section) })
      }
      adopt()
      // Sections that render a moment later (the home page renders the hero first) are adopted as they arrive.
      const added = new MutationObserver(() => context.add(adopt))
      added.observe(root, { childList: true })

      return () => {
        added.disconnect()
        observer.disconnect()
        cancelAnimationFrame(queued.frame)
        lit.forEach(list => { delete list.dataset.armed; all(list, ':scope > li').forEach(step => step.classList.remove('is-lit')) })
      }
    })
  }, { dependencies: [page], revertOnUpdate: true })
}
