import { useMemo, useState } from 'react'

/**
 * A floor-level survey of the sample home: readings every 4 ft relative to
 * a reference point at the front door, coloured by depth with contour lines
 * every quarter inch. The data is generated for the fictional sample.
 */

const W = 40, D = 28, STEP = 4
const COLS = W / STEP + 1, ROWS = D / STEP + 1

function wobble(x: number, y: number) {
  return Math.sin(x * 1.7 + y * 0.9) * 0.05 + Math.cos(x * 0.6 - y * 1.3) * 0.04
}

function reading(x: number, y: number, after: boolean) {
  const sag = (px: number, py: number) => -1.42 * Math.exp(-((px / 17) ** 2 + ((py - D) / 13) ** 2)) + wobble(px, py)
  const value = sag(x, y) - sag(W / 2, 0)
  return Math.round((after ? value * 0.12 + wobble(y, x) * 0.4 : value) * 100) / 100
}

/** Marching squares on the survey grid; returns line segments for one level. */
function contour(grid: number[][], level: number): [number, number, number, number][] {
  const segments: [number, number, number, number][] = []
  const lerp = (a: number, b: number) => (level - a) / (b - a)
  for (let j = 0; j < ROWS - 1; j++) for (let i = 0; i < COLS - 1; i++) {
    const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i]
    const code = (a < level ? 8 : 0) | (b < level ? 4 : 0) | (c < level ? 2 : 0) | (d < level ? 1 : 0)
    if (code === 0 || code === 15) continue
    const x = i * STEP, y = j * STEP
    const top: [number, number] = [x + lerp(a, b) * STEP, y]
    const right: [number, number] = [x + STEP, y + lerp(b, c) * STEP]
    const bottom: [number, number] = [x + lerp(d, c) * STEP, y + STEP]
    const left: [number, number] = [x, y + lerp(a, d) * STEP]
    const pairs: Record<number, [number, number][][]> = {
      1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[top, right]], 5: [[left, top], [bottom, right]],
      6: [[top, bottom]], 7: [[left, top]], 8: [[left, top]], 9: [[top, bottom]], 10: [[top, right], [left, bottom]],
      11: [[top, right]], 12: [[left, right]], 13: [[bottom, right]], 14: [[left, bottom]],
    }
    for (const [p, q] of pairs[code]) segments.push([p[0], p[1], q[0], q[1]])
  }
  return segments
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
function shadeRgb(value: number): number[] {
  const t = Math.max(0, Math.min(1, -value / 1.5))
  const stops = [[239, 233, 221], [236, 196, 150], [214, 120, 74], [176, 62, 32]]
  const scaled = t * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(scaled))
  return mix(stops[index], stops[index + 1], scaled - index)
}
const shade = (value: number) => `rgb(${shadeRgb(value).join(',')})`

const LEVELS = [-0.25, -0.5, -0.75, -1.0, -1.25]

const fmt = (value: number) => (value === 0 ? '0.0' : value.toFixed(2).replace('-0.', '−.').replace('0.', '.').replace('-', '−'))

export default function ElevationMap({ compact = false }: { compact?: boolean }) {
  const [after, setAfter] = useState(false)
  const grid = useMemo(() => Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => reading(i * STEP, D - j * STEP, after))), [after])
  const lowest = Math.min(...grid.flat())
  // A smooth heat map, interpolated between readings and painted once per survey.
  const heat = useMemo(() => {
    const scale = 6
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = D * scale
    const context = canvas.getContext('2d')!
    const image = context.createImageData(canvas.width, canvas.height)
    for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
      const gx = px / scale / STEP, gy = py / scale / STEP
      const i = Math.min(COLS - 2, Math.floor(gx)), j = Math.min(ROWS - 2, Math.floor(gy))
      const u = gx - i, v = gy - j
      const value = grid[j][i] * (1 - u) * (1 - v) + grid[j][i + 1] * u * (1 - v) + grid[j + 1][i] * (1 - u) * v + grid[j + 1][i + 1] * u * v
      const [r, g, b] = shadeRgb(value)
      const k = (py * canvas.width + px) * 4
      image.data[k] = r; image.data[k + 1] = g; image.data[k + 2] = b; image.data[k + 3] = 255
    }
    context.putImageData(image, 0, 0)
    return canvas.toDataURL('image/png')
  }, [grid])
  const lines = useMemo(() => LEVELS.map(level => ({ level, segments: contour(grid, level) })), [grid])

  return <figure className={`dt-elevation ${compact ? 'is-compact' : ''}`}>
    <div className="dt-elevation-bar">
      <div className="dt-toggle" role="group" aria-label="Survey">
        <button type="button" aria-pressed={!after} onClick={() => setAfter(false)}>As found</button>
        <button type="button" aria-pressed={after} onClick={() => setAfter(true)}>After lift (target)</button>
      </div>
      <p className="dt-mono" aria-live="polite">Lowest point {fmt(lowest)} in.</p>
    </div>
    <svg viewBox="-3 -6 46 40" className="dt-elevation-svg" role="img" aria-label={`Floor-level survey ${after ? 'after the planned lift' : 'as found'}: the rear left corner is ${fmt(lowest)} inches below the front door reference.`}>
      <image href={heat} x="0" y="0" width={W} height={D} preserveAspectRatio="none" />
      {lines.map(({ level, segments }) => <g key={level} stroke="var(--dt-ink)" strokeOpacity="0.55" strokeWidth="0.12">
        {segments.map(([x1, y1, x2, y2], index) => <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>)}
      <g fill="none" stroke="var(--dt-ink)" strokeWidth="0.35">
        <rect x="0" y="0" width={W} height={D} />
        <path d="M0 13 H17 M17 0 V13 M17 13 V28 M26 13 H40 M26 0 V13" strokeWidth="0.2" />
      </g>
      {!compact && grid.map((row, j) => row.map((value, i) => <g key={`${i}-${j}`}>
        <circle cx={i * STEP} cy={j * STEP} r="0.28" fill="var(--dt-ink)" />
        <text x={i * STEP + 0.45} y={j * STEP - 0.45} fontSize="1.05" fill="var(--dt-ink)" fontFamily="var(--dt-mono)">{fmt(value)}</text>
      </g>))}
      <g fontFamily="var(--dt-mono)" fontSize="1.15" fill="var(--dt-ink)">
        <path d={`M${W / 2 - 0.9} ${D + 1.1} h1.8 l-0.9 1.4 z`} fill="var(--dt-water)" />
        <text x={W / 2 + 1.4} y={D + 2.3}>Front door · 0.0</text>
        <text x="0" y="-1.8">Rear</text>
        <text x={W} y="-1.8" textAnchor="end">Readings every 4 ft, in inches</text>
      </g>
    </svg>
    <figcaption>
      <span className="dt-legend" aria-hidden="true"><i style={{ background: shade(0) }} /><i style={{ background: shade(-0.5) }} /><i style={{ background: shade(-1) }} /><i style={{ background: shade(-1.5) }} /></span>
      <span>0 to −1.5 in. · lines every ¼ in. Sample data for a fictional home.</span>
    </figcaption>
    {!compact && <details className="dt-table-details">
      <summary>Show the readings as a table</summary>
      <div className="dt-table-scroll">
        <table>
          <caption>Readings in inches, rear row first</caption>
          <tbody>{grid.map((row, j) => <tr key={j}><th scope="row">{D - j * STEP} ft</th>{row.map((value, i) => <td key={i}>{fmt(value)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>}
  </figure>
}
