/**
 * A scroll-scrubbed image sequence drawn to a canvas.
 *
 * Frames load coarse to fine (every 16th, then 8th, 4th, 2nd, then the rest),
 * so the film is usable early and sharpens as it loads; until a frame
 * arrives the nearest loaded one stands in. Between two frames the next one is
 * blended over the last, so slow scrubbing never steps.
 */
export type Frame = ImageBitmap | HTMLImageElement

export function frameUrl(base: string, index: number) {
  return `${base}/f_${String(index).padStart(3, '0')}.webp`
}

function loadOrder(count: number): number[] {
  const order: number[] = []
  const seen = new Set<number>()
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < count; i += step) {
      if (!seen.has(i)) { seen.add(i); order.push(i) }
    }
    if (!seen.has(count - 1)) { seen.add(count - 1); order.push(count - 1) }
  }
  return order
}

async function decode(url: string, signal: AbortSignal): Promise<Frame> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`frame ${url}: ${response.status}`)
  const blob = await response.blob()
  if ('createImageBitmap' in window) return createImageBitmap(blob)
  const img = new Image()
  const src = URL.createObjectURL(blob)
  img.src = src
  try {
    await img.decode()
  } finally {
    URL.revokeObjectURL(src)
  }
  return img
}

export class FrameSequence {
  readonly base: string
  readonly count: number
  readonly frames: (Frame | undefined)[]
  private readonly controller = new AbortController()
  private onLoad?: () => void

  constructor(base: string, count: number) {
    this.base = base
    this.count = count
    this.frames = new Array(count)
  }

  /** Starts loading with a few requests in flight; calls back as frames land. */
  load(onLoad?: () => void, concurrency = 6) {
    this.onLoad = onLoad
    const queue = loadOrder(this.count)
    const next = async (): Promise<void> => {
      const index = queue.shift()
      if (index === undefined || this.controller.signal.aborted) return
      try {
        this.frames[index] = await decode(frameUrl(this.base, index), this.controller.signal)
        this.onLoad?.()
      } catch {
        if (this.controller.signal.aborted) return
      }
      return next()
    }
    for (let i = 0; i < concurrency; i++) void next()
  }

  /** The loaded frame nearest to index (searching both ways). */
  nearest(index: number): Frame | undefined {
    const i = Math.max(0, Math.min(this.count - 1, Math.round(index)))
    for (let d = 0; d < this.count; d++) {
      const a = this.frames[i - d]
      if (a) return a
      const b = this.frames[i + d]
      if (b) return b
    }
    return undefined
  }

  dispose() {
    this.controller.abort()
    for (const frame of this.frames) if (frame && 'close' in frame) frame.close()
    this.onLoad = undefined
  }
}

/** Draw frame position f (fractional) into ctx, covering the canvas. */
export function drawFrame(ctx: CanvasRenderingContext2D, seq: FrameSequence, f: number, focusX = 0.5) {
  const { width: W, height: H } = ctx.canvas
  const i0 = Math.floor(f)
  const t = f - i0
  const a = seq.frames[i0] ?? seq.nearest(f)
  if (!a) return false
  const b = t > 0.02 ? seq.frames[i0 + 1] : undefined
  const iw = a.width
  const ih = a.height
  const scale = Math.max(W / iw, H / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = (W - dw) * focusX
  const dy = (H - dh) / 2
  ctx.globalAlpha = 1
  ctx.drawImage(a, dx, dy, dw, dh)
  if (b && b !== a) {
    ctx.globalAlpha = t
    ctx.drawImage(b, dx, dy, dw, dh)
    ctx.globalAlpha = 1
  }
  return true
}
