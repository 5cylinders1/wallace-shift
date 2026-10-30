import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { services } from './content'
import { clamp, prefersMotion, roomyMotion, stepped } from './motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** How far apart the panels hang down the hall, and the scroll (in screen heights) between them. */
const DEPTH = 1500
const PER_STOP = 0.9
/** Matches `.is-hall .cp-hall-stage { perspective }`, so the floor lines up with the panels. */
const PERSPECTIVE = 1100
/** The floor's depth below eye level, its board width, and the length between board ends. */
const FLOOR = { drop: 360, board: 230, length: 640 }

/**
 * Floorboards in perspective, on a plain 2D canvas: boards run down the hall
 * to the vanishing point and their ends stream toward the viewer as the
 * camera moves. A real 3D plane would need a layer thousands of pixels deep.
 */
function drawFloor(canvas: HTMLCanvasElement, travel: number, header: number) {
  const width = canvas.offsetWidth
  const height = canvas.offsetHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }
  const ctx = canvas.getContext('2d')
  if (!ctx || height <= 0) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const cx = width / 2
  const horizon = height / 2 + header / 2
  const reach = (height - horizon) / FLOOR.drop

  const fade = ctx.createLinearGradient(0, horizon, 0, height)
  fade.addColorStop(0, 'rgba(255, 253, 248, 0)')
  fade.addColorStop(1, 'rgba(255, 253, 248, 0.16)')
  ctx.strokeStyle = fade
  ctx.lineWidth = 1
  ctx.beginPath()
  const boards = Math.ceil(cx / (FLOOR.board * reach)) + 1
  for (let k = -boards; k <= boards; k += 1) {
    ctx.moveTo(cx, horizon)
    ctx.lineTo(cx + k * FLOOR.board * reach, height)
  }
  ctx.stroke()

  const offset = ((travel % FLOOR.length) + FLOOR.length) % FLOOR.length
  for (let j = -2; j < 16; j += 1) {
    const distance = j * FLOOR.length - offset
    if (PERSPECTIVE + distance < 60) continue
    const y = horizon + (FLOOR.drop * PERSPECTIVE) / (PERSPECTIVE + distance)
    if (y > height) continue
    ctx.fillStyle = `rgba(255, 253, 248, ${(0.1 * clamp(1 - distance / 9000)).toFixed(3)})`
    ctx.fillRect(0, y, width, 1)
  }
}
const narrowMotion = '(prefers-reduced-motion: no-preference) and (max-width: 899px), (prefers-reduced-motion: no-preference) and (max-height: 599px)'

/**
 * Services as a walk down a hall. On wide screens the section pins and the
 * camera moves forward: each panel swings in from its wall, holds square to
 * the viewer, then passes by. Narrower screens list the panels and tilt each
 * one up into place; reduced motion gets the plain list.
 */
export default function Services() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const section = root.current
    if (!section) return
    const media = gsap.matchMedia()

    // A doorway: the dark hall opens out of a door-sized gap as it scrolls up.
    media.add(prefersMotion, () => {
      gsap.fromTo(section,
        { clipPath: 'inset(14vh 31vw 0vh 31vw round 30px 30px 0px 0px)' },
        { clipPath: 'inset(0vh 0vw 0vh 0vw round 0px 0px 0px 0px)', ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: true } })
    })

    media.add(roomyMotion, () => {
      const floor = section.querySelector<HTMLCanvasElement>('.cp-hall-floor')
      const header = () => Number.parseFloat(getComputedStyle(section).getPropertyValue('--cp-header')) || 76
      const planes = gsap.utils.toArray<HTMLElement>('.cp-hall-head, .cp-service', section)
      const marks = gsap.utils.toArray<HTMLElement>('.cp-hall-index li', section)
      section.classList.add('is-hall')
      const camera = { progress: 0 }

      const place = () => {
        const at = stepped(camera.progress, planes.length, 0.6)
        const spread = window.innerWidth * 0.8
        planes.forEach((plane, index) => {
          const ahead = Math.max(0, index - at)
          const behind = Math.max(0, at - index)
          // The title hangs in the middle of the hall; the panels alternate walls.
          const side = index === 0 ? 0 : index % 2 === 1 ? -1 : 1
          const swing = Math.min(ahead, 1)
          const gone = Math.min(behind / 0.6, 1)
          const x = ahead > 0 ? side * spread * swing * (1 + Math.max(0, ahead - 1) * 0.4) : side * spread * 0.6 * gone
          const z = ahead > 0 ? -ahead * DEPTH : behind * 650
          const turn = ahead > 0 ? -side * 24 * swing : -side * 38 * gone
          // The hall is dim: boards further down it fade into the dark.
          const opacity = ahead > 0 ? clamp(1 - ahead * 0.55) : clamp(1 - behind / 0.45)
          plane.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${turn.toFixed(2)}deg)`
          plane.style.opacity = opacity.toFixed(3)
          plane.style.visibility = opacity <= 0.001 ? 'hidden' : ''
        })
        if (floor) drawFloor(floor, at * DEPTH, header())
        const current = Math.round(at) - 1
        marks.forEach((mark, index) => mark.classList.toggle('is-on', index === current))
        section.style.setProperty('--hall', String(clamp((at - 1) / (planes.length - 2))))
      }

      const tween = gsap.to(camera, { progress: 1, ease: 'none', onUpdate: place })
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${(planes.length - 1) * PER_STOP * window.innerHeight}`,
        pin: true,
        scrub: 0.8,
        animation: tween,
        invalidateOnRefresh: true,
        onRefresh: place,
      })
      place()

      return () => {
        section.classList.remove('is-hall')
        section.style.removeProperty('--hall')
        planes.forEach((plane) => {
          plane.style.removeProperty('transform')
          plane.style.removeProperty('opacity')
          plane.style.removeProperty('visibility')
        })
      }
    })

    // Narrow screens: each panel tips up off the floor as it arrives.
    media.add(narrowMotion, () => {
      gsap.utils.toArray<HTMLElement>('.cp-service', section).forEach((panel) => {
        gsap.fromTo(panel,
          { autoAlpha: 0, rotationX: 32, z: -180, y: 60, transformPerspective: 900, transformOrigin: '50% 100%' },
          { autoAlpha: 1, rotationX: 0, z: 0, y: 0, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top 62%', scrub: 0.5 } })
      })
    })

    return () => media.revert()
  }, { scope: root })

  return (
    <section ref={root} id="services" className="cp-services" aria-labelledby="cp-services-title">
      <div className="cp-hall-stage">
        <canvas className="cp-hall-floor" aria-hidden="true" />
        <div className="cp-hall-world">
          <div className="cp-section-head cp-hall-head">
            <p className="cp-eyebrow" data-near>Services</p>
            <h2 id="cp-services-title" data-near>One crew for the <em>whole</em> job.</h2>
            <p data-near>Prep, repairs and paint handled together, so nothing falls between trades.</p>
          </div>
          {services.map((service, index) => (
            <article key={service.id} className="cp-service">
              <div className="cp-service-media">
                <img
                  src={service.image.src}
                  srcSet={`${service.image.src.replace('.webp', '-small.webp')} 720w, ${service.image.src} 1200w`}
                  sizes="(max-width: 899px) 100vw, 46vw"
                  alt={service.image.alt}
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="cp-service-copy">
                <p className="cp-service-index">0{index + 1} <span>/ 0{services.length}</span></p>
                <h3>{service.title}</h3>
                <p>{service.body}</p>
                <ul>{service.points.map((point) => <li key={point}>{point}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
        <ol className="cp-hall-index" aria-hidden="true">
          {services.map((service, index) => (
            <li key={service.id}><span>0{index + 1}</span>{service.short}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
