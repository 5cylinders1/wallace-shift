import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import './pool-water.css'

type Point = readonly [number, number]
type Quad = readonly [Point, Point, Point, Point]

export interface PoolWaterHandle {
  setProgress: (value: number) => void
}

interface PoolWaterProps {
  reducedMotion: boolean
}

const PHOTO_WIDTH = 1672
const PHOTO_HEIGHT = 941
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const mix = (a: Point, b: Point, value: number): Point => [a[0] + (b[0] - a[0]) * value, a[1] + (b[1] - a[1]) * value]

// Coordinates are in the source photograph, so the surface and the photograph
// share the same cover transform at every viewport size.
const POOL_RIM: Quad = [[604, 451], [1032, 451], [1448, 858], [237, 858]]
const POOL_FLOOR: Quad = [[660, 546], [1068, 533], [1320, 858], [372, 858]]
const SPA_RIM: Quad = [[1106, 450], [1248, 450], [1346, 476], [1128, 476]]
const SPA_FLOOR: Quad = [[1122, 469], [1278, 469], [1326, 476], [1137, 476]]

// The raised spa projects into the pool. This is a permanent occlusion, not
// part of the moving surface, and must remain dry throughout the fill.
const POOL_OPENING: readonly Point[] = [
  [604, 451], [1032, 451], [1052, 469], [1072, 492],
  [1103, 506], [1105, 530], [1448, 858], [237, 858],
]

const STAIRS: { level: number; points: readonly Point[] }[] = [
  { level: .96, points: [[600, 449], [691, 449], [691, 465], [599, 474]] },
  { level: .79, points: [[597, 469], [690, 458], [728, 462], [728, 479], [593, 495]] },
  { level: .62, points: [[592, 489], [727, 477], [755, 482], [755, 501], [588, 518]] },
  { level: .4, points: [[588, 513], [753, 494], [776, 498], [776, 532], [587, 555]] },
]

function polygon(path: Path2D | CanvasRenderingContext2D, points: readonly Point[]) {
  path.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, y]) => path.lineTo(x, y))
  path.closePath()
}

function pointOnPlane(quad: Quad, u: number, v: number): Point {
  return mix(mix(quad[0], quad[1], u), mix(quad[3], quad[2], u), v)
}

function triangle(context: CanvasRenderingContext2D, image: HTMLImageElement, source: readonly Point[], target: readonly Point[]) {
  const sx1 = source[1][0] - source[0][0]
  const sy1 = source[1][1] - source[0][1]
  const sx2 = source[2][0] - source[0][0]
  const sy2 = source[2][1] - source[0][1]
  const determinant = sx1 * sy2 - sx2 * sy1
  if (Math.abs(determinant) < .001) return
  const dx1 = target[1][0] - target[0][0]
  const dy1 = target[1][1] - target[0][1]
  const dx2 = target[2][0] - target[0][0]
  const dy2 = target[2][1] - target[0][1]
  const a = (dx1 * sy2 - dx2 * sy1) / determinant
  const b = (dy1 * sy2 - dy2 * sy1) / determinant
  const c = (sx1 * dx2 - sx2 * dx1) / determinant
  const d = (sx1 * dy2 - sx2 * dy1) / determinant
  const e = target[0][0] - a * source[0][0] - c * source[0][1]
  const f = target[0][1] - b * source[0][0] - d * source[0][1]
  const center: Point = [(target[0][0] + target[1][0] + target[2][0]) / 3, (target[0][1] + target[1][1] + target[2][1]) / 3]
  context.save()
  context.beginPath()
  // A fraction of a source pixel of overlap prevents hairline mesh seams.
  polygon(context, target.map((point) => {
    const distance = Math.hypot(point[0] - center[0], point[1] - center[1]) || 1
    return [point[0] + (point[0] - center[0]) / distance * .35, point[1] + (point[1] - center[1]) / distance * .35]
  }))
  context.clip()
  context.transform(a, b, c, d, e, f)
  const sourceLeft = Math.floor(Math.min(...source.map((point) => point[0]))) - 2
  const sourceTop = Math.floor(Math.min(...source.map((point) => point[1]))) - 2
  const sourceWidth = Math.ceil(Math.max(...source.map((point) => point[0]))) - sourceLeft + 2
  const sourceHeight = Math.ceil(Math.max(...source.map((point) => point[1]))) - sourceTop + 2
  context.drawImage(image, sourceLeft, sourceTop, sourceWidth, sourceHeight, sourceLeft, sourceTop, sourceWidth, sourceHeight)
  context.restore()
}

function texturePlane(context: CanvasRenderingContext2D, image: HTMLImageElement, source: Quad, destination: Quad, time: number, spa: boolean) {
  const columns = spa ? 1 : 3
  const rows = spa ? 5 : 16
  const sourceAt = (u: number, v: number): Point => {
    const point = pointOnPlane(source, u, v)
    const edge = Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
    return [
      point[0] + Math.sin(v * 39 + u * 11 + time * .78) * 2.3 * edge,
      point[1] + Math.cos(v * 49 - u * 7 + time * .61) * 1.25 * edge,
    ]
  }
  for (let row = 0; row < rows; row += 1) {
    const v0 = row / rows
    const v1 = (row + 1) / rows
    for (let column = 0; column < columns; column += 1) {
      const u0 = column / columns
      const u1 = (column + 1) / columns
      const sourcePoints = [sourceAt(u0, v0), sourceAt(u1, v0), sourceAt(u1, v1), sourceAt(u0, v1)]
      const destinationPoints = [pointOnPlane(destination, u0, v0), pointOnPlane(destination, u1, v0), pointOnPlane(destination, u1, v1), pointOnPlane(destination, u0, v1)]
      triangle(context, image, [sourcePoints[0], sourcePoints[1], sourcePoints[2]], [destinationPoints[0], destinationPoints[1], destinationPoints[2]])
      triangle(context, image, [sourcePoints[0], sourcePoints[2], sourcePoints[3]], [destinationPoints[0], destinationPoints[2], destinationPoints[3]])
    }
  }
}

function drawSurface(context: CanvasRenderingContext2D, image: HTMLImageElement | null, amount: number, time: number, spa: boolean) {
  if (amount <= 0) return
  const floor = spa ? SPA_FLOOR : POOL_FLOOR
  const rim = spa ? SPA_RIM : POOL_RIM
  const spread = clamp(amount / .09)
  const rise = clamp((amount - .09) / .91)
  const center = pointOnPlane(floor, .5, .73)
  const plane = floor.map((point, index) => mix(center, mix(point, rim[index], rise), spread)) as unknown as Quad
  context.save()
  const opening = new Path2D()
  polygon(opening, spa ? SPA_RIM : POOL_OPENING)
  context.clip(opening)
  const surface = new Path2D()
  polygon(surface, plane)
  context.clip(surface)
  if (!spa) {
    // The steps emerge from the surface until water reaches their own level.
    // Shrinking each exposed face keeps the submergence continuous.
    const waterAndSteps = new Path2D()
    polygon(waterAndSteps, plane)
    STAIRS.forEach(({ level, points }) => {
      const exposed = clamp((level - rise) / .075)
      if (!exposed) return
      const top = Math.min(...points.map((point) => point[1]))
      polygon(waterAndSteps, points.map(([x, y]) => [x, top + (y - top) * exposed]))
    })
    context.clip(waterAndSteps, 'evenodd')
  }
  const depth = context.createLinearGradient(0, plane[0][1], 0, plane[3][1])
  depth.addColorStop(0, '#184e4d')
  depth.addColorStop(.6, '#298d97')
  depth.addColorStop(1, '#54bdc1')
  context.fillStyle = depth
  context.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT)
  if (image) texturePlane(context, image, rim, plane, time, spa)
  if (!spa) {
    // Low contrast glints travel across the surface even after scrolling stops.
    context.lineWidth = .7
    for (let index = 0; index < 12; index += 1) {
      const v = .22 + index * .061
      const drift = Math.sin(time * .35 + index * 1.9) * .025
      const start = pointOnPlane(plane, .18 + drift, v)
      const end = pointOnPlane(plane, .72 + drift, v + .003)
      const control = pointOnPlane(plane, .45, v + Math.sin(time * .6 + index) * .009)
      context.strokeStyle = `rgba(220,255,240,${.025 + Math.sin(time * .8 + index * 2) * .015})`
      context.beginPath()
      context.moveTo(...start)
      context.quadraticCurveTo(control[0], control[1], end[0], end[1])
      context.stroke()
    }
  }
  context.restore()
  context.save()
  context.clip(opening)
  context.beginPath()
  polygon(context, plane)
  context.strokeStyle = 'rgba(166,232,215,.25)'
  context.lineWidth = .8
  context.stroke()
  context.restore()
}

const PoolWater = forwardRef<PoolWaterHandle, PoolWaterProps>(function PoolWater({ reducedMotion }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const progress = useRef(0)
  const requestDraw = useRef<() => void>(() => {})

  useImperativeHandle(ref, () => ({
    setProgress(value: number) {
      progress.current = Number.isFinite(value) ? clamp(value) : 0
      requestDraw.current()
    },
  }), [])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const context = element.getContext('2d', { alpha: true })
    if (!context) return
    let width = 0
    let height = 0
    let ratio = 1
    let frame = 0
    let lastFrame = -Infinity
    let dirty = true
    let isVisible = true
    let destroyed = false
    let readyImage: HTMLImageElement | null = null
    const image = new Image()
    image.decoding = 'async'
    const draw = (now: number) => {
      frame = 0
      if (destroyed || document.hidden || !isVisible) return
      if (dirty || now - lastFrame >= 1000 / 30 || reducedMotion) {
        dirty = false
        lastFrame = now
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, element.width, element.height)
        if (progress.current > 0 && width && height) {
          const scale = Math.max(width / PHOTO_WIDTH, height / PHOTO_HEIGHT)
          context.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * (width - PHOTO_WIDTH * scale) / 2, ratio * (height - PHOTO_HEIGHT * scale) / 2)
          const time = reducedMotion ? 0 : now / 1000
          drawSurface(context, readyImage, progress.current, time, false)
          drawSurface(context, readyImage, clamp((progress.current - .11) / .89), time, true)
        }
      }
      if (!reducedMotion && progress.current > 0) frame = requestAnimationFrame(draw)
    }
    const schedule = () => {
      dirty = true
      if (!frame && !destroyed && !document.hidden && isVisible) frame = requestAnimationFrame(draw)
    }
    requestDraw.current = schedule
    const resize = () => {
      const bounds = element.getBoundingClientRect()
      // The parent scene may have a camera scale. Client dimensions avoid
      // applying that CSS transform a second time to the water coordinates.
      width = element.clientWidth || bounds.width
      height = element.clientHeight || bounds.height
      ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      element.width = Math.round(width * ratio)
      element.height = Math.round(height * ratio)
      lastFrame = -Infinity
      schedule()
    }
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0 }
      else { lastFrame = -Infinity; schedule() }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const intersection = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      if (isVisible) { lastFrame = -Infinity; schedule() }
      else { cancelAnimationFrame(frame); frame = 0 }
    })
    intersection.observe(element)
    document.addEventListener('visibilitychange', onVisibility)
    image.onload = () => { readyImage = image; lastFrame = -Infinity; schedule() }
    image.onerror = () => { lastFrame = -Infinity; schedule() }
    image.src = '/demos/pools/pool-complete.webp'
    resize()
    return () => {
      destroyed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      image.onload = null
      image.onerror = null
      requestDraw.current = () => {}
    }
  }, [reducedMotion])

  return <canvas ref={canvas} className="sw-water-layer" aria-hidden="true" />
})

export default PoolWater
