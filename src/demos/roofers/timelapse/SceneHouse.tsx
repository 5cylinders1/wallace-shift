import {
  CHALK_MARKS,
  CHIMNEY,
  DORMERS,
  EAVE_Y,
  GARAGE,
  GROUND_Y,
  ICE_TOP,
  LADDER,
  LEFT_GABLE,
  PIPE_BOOTS,
  RIDGE_Y,
  ROOF_X0,
  ROOF_X1,
  ROTTEN_SHEETS,
  STONE_GABLE,
  WINDOW_PANES,
} from './geometry'
import { seeded } from './math'

type Pt = readonly [number, number]

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                     */
/* ------------------------------------------------------------------ */

function intersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt {
  const d = (a1[0] - a2[0]) * (b1[1] - b2[1]) - (a1[1] - a2[1]) * (b1[0] - b2[0])
  const t = ((a1[0] - b1[0]) * (b1[1] - b2[1]) - (a1[1] - b1[1]) * (b1[0] - b2[0])) / d
  return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])]
}

/**
 * The outline of a gable's rake, pushed outward by `d` and run past each
 * eave by `ext` — the fascia and the shingle edge are two of these.
 */
function rakePath(a: Pt, peak: Pt, b: Pt, d: number, ext: number): string {
  const normal = (p: Pt, q: Pt): Pt => {
    const dx = q[0] - p[0]
    const dy = q[1] - p[1]
    const len = Math.hypot(dx, dy)
    return [dy / len, -dx / len]
  }
  const n1 = normal(a, peak)
  const n2 = normal(peak, b)
  const a1: Pt = [a[0] + n1[0] * d, a[1] + n1[1] * d]
  const p1: Pt = [peak[0] + n1[0] * d, peak[1] + n1[1] * d]
  const p2: Pt = [peak[0] + n2[0] * d, peak[1] + n2[1] * d]
  const b1: Pt = [b[0] + n2[0] * d, b[1] + n2[1] * d]
  const top = intersect(a1, p1, p2, b1)
  const len1 = Math.hypot(peak[0] - a[0], peak[1] - a[1])
  const len2 = Math.hypot(b[0] - peak[0], b[1] - peak[1])
  const start: Pt = [a1[0] - ((peak[0] - a[0]) / len1) * ext, a1[1] - ((peak[1] - a[1]) / len1) * ext]
  const end: Pt = [b1[0] + ((b[0] - peak[0]) / len2) * ext, b1[1] + ((b[1] - peak[1]) / len2) * ext]
  return `M${start[0].toFixed(1)} ${start[1].toFixed(1)}L${top[0].toFixed(1)} ${top[1].toFixed(1)}L${end[0].toFixed(1)} ${end[1].toFixed(1)}`
}

/** Shingle edge colour is shared by every rake and follows the job. */
const RAKE_STYLE = { stroke: 'var(--rf-rake, #8a867d)' }

function Rake({ a, peak, b }: { a: Pt; peak: Pt; b: Pt }) {
  return (
    <g fill="none" strokeLinejoin="miter">
      <path d={rakePath(a, peak, b, 5, 6)} stroke="#f4f3ef" strokeWidth="10" />
      <path d={rakePath(a, peak, b, 14, 12)} style={RAKE_STYLE} strokeWidth="10" />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Openings                                                             */
/* ------------------------------------------------------------------ */

function Muntins({
  x,
  y,
  w,
  h,
  cols,
  rows,
  stroke = '#f2f1ec',
}: {
  x: number
  y: number
  w: number
  h: number
  cols: number
  rows: number
  stroke?: string
}) {
  const lines: string[] = []
  for (let c = 1; c < cols; c += 1) lines.push(`M${x + (w * c) / cols} ${y}V${y + h}`)
  for (let r = 1; r < rows; r += 1) lines.push(`M${x} ${y + (h * r) / rows}H${x + w}`)
  return <path d={lines.join('')} stroke={stroke} strokeWidth="2.2" />
}

function Pane({ x, y, w, h, cols = 2, rows = 3 }: { x: number; y: number; w: number; h: number; cols?: number; rows?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="url(#rf-glass)" />
      {/* A single diagonal glint keeps glass from reading as flat paint. */}
      <path d={`M${x + w * 0.15} ${y + h}L${x + w * 0.75} ${y}H${x + w * 0.95}L${x + w * 0.35} ${y + h}Z`} fill="#ffffff" opacity="0.08" />
      <Muntins x={x} y={y} w={w} h={h} cols={cols} rows={rows} />
    </g>
  )
}

function Shutter({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const louvers: string[] = []
  for (let ly = y + 8; ly < y + h - 4; ly += 7) louvers.push(`M${x + 4} ${ly}H${x + w - 4}`)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#1f2428" />
      <path d={louvers.join('')} stroke="#33393e" strokeWidth="2" />
    </g>
  )
}

function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 3} y={y - 30} width="6" height="8" fill="#16191c" />
      <path d={`M${x - 9} ${y - 22}H${x + 9}L${x + 7} ${y}H${x - 7}Z`} fill="#16191c" />
      <rect x={x - 5} y={y - 18} width="10" height="14" fill="#e9c98b" opacity="0.85" />
      <path d={`M${x - 10} ${y - 22}L${x} ${y - 30}L${x + 10} ${y - 22}Z`} fill="#16191c" />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Plantings                                                            */
/* ------------------------------------------------------------------ */

type Blob = { cx: number; cy: number; r: number; fill: string }

function shrub(seed: number, cx: number, w: number, h: number, kind: 'box' | 'hydrangea'): Blob[] {
  const random = seeded(seed)
  const blobs: Blob[] = []
  const tones =
    kind === 'box' ? ['#22401f', '#2f5428', '#3e6a32', '#56853f'] : ['#5d7d3a', '#7f9b4b', '#a9bf6c', '#c9d68f']
  const baseY = GROUND_Y + 4
  for (let pass = 0; pass < 4; pass += 1) {
    const count = kind === 'box' ? 7 - pass : 9 - pass
    for (let i = 0; i < count; i += 1) {
      const t = random()
      blobs.push({
        cx: cx + (t - 0.5) * w * (1 - pass * 0.18) - pass * 3,
        cy: baseY - h * 0.45 - random() * h * 0.35 - pass * 4,
        r: (h * 0.32 + random() * h * 0.18) * (1 - pass * 0.16),
        fill: tones[pass],
      })
    }
  }
  if (kind === 'hydrangea') {
    for (let i = 0; i < 14; i += 1) {
      blobs.push({
        cx: cx + (random() - 0.5) * w * 0.85,
        cy: baseY - h * 0.35 - random() * h * 0.55,
        r: 7 + random() * 6,
        fill: random() > 0.4 ? '#eef0d4' : '#dfe6b4',
      })
    }
  }
  return blobs
}

const plantings: Blob[] = [
  ...shrub(1, 610, 110, 70, 'hydrangea'),
  ...shrub(2, 700, 90, 62, 'hydrangea'),
  ...shrub(3, 790, 80, 56, 'box'),
  ...shrub(4, 900, 70, 58, 'box'),
  ...shrub(5, 1100, 70, 58, 'box'),
  ...shrub(6, 1215, 90, 44, 'box'),
  ...shrub(7, 1385, 90, 46, 'box'),
  ...shrub(8, 1490, 100, 72, 'hydrangea'),
  ...shrub(9, 1575, 70, 60, 'box'),
]

const flowers = (() => {
  const random = seeded(61)
  return Array.from({ length: 70 }, () => ({
    cx: 580 + random() * 1040,
    cy: GROUND_Y + 2 + random() * 8,
    r: 3 + random() * 2.5,
    fill: random() > 0.5 ? '#d9435a' : '#f07f93',
  })).filter((f) => f.cx < 960 || f.cx > 1040)
})()

/* ------------------------------------------------------------------ */
/* Old roof wear                                                        */
/* ------------------------------------------------------------------ */

const streaks = (() => {
  const random = seeded(88)
  return Array.from({ length: 22 }, () => {
    const x = ROOF_X0 + 40 + random() * (ROOF_X1 - ROOF_X0 - 80)
    const top = RIDGE_Y + 10 + random() * 60
    return { x, y: top, w: 6 + random() * 22, h: 80 + random() * 180, o: 0.07 + random() * 0.12 }
  })
})()

const blotches = (() => {
  const random = seeded(12)
  return Array.from({ length: 16 }, () => ({
    cx: ROOF_X0 + 60 + random() * (ROOF_X1 - ROOF_X0 - 120),
    cy: RIDGE_Y + 30 + random() * 230,
    rx: 10 + random() * 26,
    ry: 4 + random() * 7,
  }))
})()

/* ------------------------------------------------------------------ */
/* Components                                                           */
/* ------------------------------------------------------------------ */

function GarageWing() {
  const doorPanels: string[] = []
  for (let x = 1676; x <= 1904; x += 38) doorPanels.push(`M${x} 976V1060`)
  for (let y = 992; y < 1060; y += 22) doorPanels.push(`M1676 ${y}H1904`)
  return (
    <g id="rf-garage">
      <rect x={GARAGE.x0} y={GARAGE.eaveY} width={GARAGE.x1 - GARAGE.x0} height={GROUND_Y - GARAGE.eaveY} fill="url(#rf-siding)" />
      <rect x="1668" y="968" width="244" height="92" fill="#f4f3ef" />
      <rect x="1676" y="976" width="228" height="84" fill="#e9e8e2" />
      <path d={doorPanels.join('')} stroke="#d2d0c8" strokeWidth="2" />
      <g id="rf-garage-roof">
        <g clipPath="url(#rf-garage-clip)">
          <rect x="1560" y="800" width="420" height="160" fill="url(#rf-deck)" />
          <rect x="1560" y="800" width="420" height="160" fill="url(#rf-underlay)" id="rf-garage-underlay" opacity="0" />
          <rect x="1560" y="800" width="420" height="160" fill="url(#rf-shingle-new-garage)" clipPath="url(#rf-garage-new-clip)" />
          <rect x="1560" y="800" width="420" height="160" fill="url(#rf-shingle-old-garage)" clipPath="url(#rf-garage-old-clip)" />
        </g>
        <path
          d="M1580 935L1700 830H1840L1960 935"
          fill="none"
          strokeWidth="7"
          strokeLinejoin="round"
          style={{ stroke: 'var(--rf-cap, #7d7970)' }}
        />
      </g>
      <rect x="1578" y={GARAGE.eaveY} width="384" height="9" fill="#f1f0eb" />
      <rect x="1578" y={GARAGE.eaveY + 9} width="384" height="5" fill="#000" opacity="0.08" />
    </g>
  )
}

function MainWalls() {
  return (
    <g>
      <rect x="760" y="866" width="880" height={GROUND_Y - 866} fill="url(#rf-siding)" />
      {/* porch recess */}
      <rect x="845" y="875" width="315" height={GROUND_Y - 875} fill="#2a2a24" opacity="0.06" />
      <rect x="845" y="875" width="315" height="34" fill="url(#rf-eave-shadow)" />
      <rect x="1440" y="875" width="200" height="26" fill="url(#rf-eave-shadow)" />
      {/* right double window */}
      <rect x="1496" y="916" width="126" height="102" fill="#f4f3ef" />
      <Pane {...WINDOW_PANES[1]} />
      <Pane {...WINDOW_PANES[2]} />
      <rect x="1490" y="1016" width="138" height="7" fill="#e3e0d8" />
      {/* downspout */}
      <rect x="1630" y="884" width="8" height="172" fill="#eceae4" />
    </g>
  )
}

function MainRoof() {
  const roofW = ROOF_X1 - ROOF_X0 + 40
  return (
    <g id="rf-roof">
      <g clipPath="url(#rf-roof-clip)">
        <rect x={ROOF_X0 - 20} y={RIDGE_Y - 20} width={roofW} height={EAVE_Y - RIDGE_Y + 40} fill="url(#rf-deck)" />

        <g id="rf-rot">
          {ROTTEN_SHEETS.map((s, i) => (
            <path
              key={i}
              d={`M${s.x + 22} ${s.y + 18}Q${s.x + 70} ${s.y - 6} ${s.x + 126} ${s.y + 22}Q${s.x + 150} ${s.y + 50} ${s.x + 110} ${s.y + 66}Q${s.x + 60} ${s.y + 84} ${s.x + 24} ${s.y + 60}Q${s.x + 2} ${s.y + 40} ${s.x + 22} ${s.y + 18}Z`}
              fill="#4b3424"
              opacity="0.78"
            />
          ))}
        </g>
        <g id="rf-new-deck" opacity="0">
          {ROTTEN_SHEETS.map((s, i) => (
            <g key={i}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="url(#rf-deck-new)" />
              <rect x={s.x + 1} y={s.y + 1} width={s.w - 2} height={s.h - 2} fill="none" stroke="#7a5a33" strokeWidth="1.6" />
            </g>
          ))}
        </g>
        <g id="rf-rot-highlight" opacity="0">
          {ROTTEN_SHEETS.map((s, i) => (
            <rect key={i} x={s.x + 2} y={s.y + 2} width={s.w - 4} height={s.h - 4} fill="#e2552c" fillOpacity="0.16" stroke="#e2552c" strokeWidth="3" strokeDasharray="10 6" />
          ))}
        </g>

        <g clipPath="url(#rf-ice-clip)">
          <rect x={ROOF_X0 - 20} y={ICE_TOP} width={roofW} height={EAVE_Y - ICE_TOP + 20} fill="url(#rf-ice)" />
          <rect x={ROOF_X0 - 20} y={ICE_TOP} width={roofW} height="3" fill="#1b1d1f" />
        </g>
        <g clipPath="url(#rf-under-clip)">
          <rect x={ROOF_X0 - 20} y={RIDGE_Y - 20} width={roofW} height={ICE_TOP - RIDGE_Y + 24} fill="url(#rf-underlay)" />
        </g>

        <g clipPath="url(#rf-new-clip)">
          <rect x={ROOF_X0 - 20} y={RIDGE_Y - 20} width={roofW} height={EAVE_Y - RIDGE_Y + 40} fill="url(#rf-shingle-new)" />
          <rect id="rf-sheen" x="0" y={RIDGE_Y - 20} width="260" height={EAVE_Y - RIDGE_Y + 40} fill="url(#rf-roof-sheen)" opacity="0" />
        </g>

        <g id="rf-old-roof" clipPath="url(#rf-old-clip)">
          <rect x={ROOF_X0 - 20} y={RIDGE_Y - 20} width={roofW} height={EAVE_Y - RIDGE_Y + 40} fill="url(#rf-shingle-old)" />
          {streaks.map((s, i) => (
            <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="#34322b" opacity={s.o} />
          ))}
          {blotches.map((b, i) => (
            <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill="#b5b0a4" opacity="0.32" />
          ))}
          {/* Missing and creased tabs from the storm. */}
          <g fill="#2a2622">
            <rect x="1336" y="636" width="34" height="9" />
            <rect x="1640" y="806" width="26" height="9" />
            <rect x="790" y="646" width="30" height="9" />
            <rect x="1002" y="780" width="22" height="9" />
          </g>
          <g fill="#a9a497">
            <path d="M1180 676h34l4 -6h-34z" />
            <path d="M1590 856h30l5 -7h-30z" />
          </g>
          {/* Emergency tarp over the leak, held down with battens. */}
          <g>
            <path d="M1522 742L1612 734L1650 836L1528 848Z" fill="#2f6db3" />
            <path d="M1530 770L1620 760M1534 802L1634 792M1556 744L1560 846M1596 738L1606 840" stroke="#25578f" strokeWidth="2.2" opacity="0.7" />
            <path d="M1520 740L1612 732" stroke="#8a6a44" strokeWidth="7" />
            <path d="M1528 850L1652 838" stroke="#8a6a44" strokeWidth="7" />
          </g>
          <g id="rf-chalk" fill="none" stroke="#f8f6ef" strokeWidth="2.6">
            {CHALK_MARKS.map((m, i) => (
              <g key={i} id={`rf-chalk-${i}`} opacity="0">
                <circle cx={m.x} cy={m.y} r="11" />
                <path d={`M${m.x - 3} ${m.y - 4}V${m.y + 4}M${m.x + 3} ${m.y - 4}V${m.y + 4}M${m.x - 3} ${m.y}H${m.x + 3}`} strokeWidth="1.8" />
              </g>
            ))}
          </g>
          <rect x={ROOF_X0} y={RIDGE_Y - 6} width={ROOF_X1 - ROOF_X0} height="13" fill="#7a766e" />
        </g>

        <g id="rf-ridge-new" opacity="0">
          <rect x={ROOF_X0} y={RIDGE_Y - 7} width={ROOF_X1 - ROOF_X0} height="15" fill="#2f3237" />
          <path
            d={Array.from({ length: 84 }, (_, i) => `M${ROOF_X0 + 6 + i * 12} ${RIDGE_Y - 7}v15`).join('')}
            stroke="#1f2225"
            strokeWidth="1.4"
          />
          <rect x={ROOF_X0} y={RIDGE_Y + 6} width={ROOF_X1 - ROOF_X0} height="2.4" fill="#16181a" />
        </g>
      </g>

      {/* Pipes stay through the job; their boots are replaced. */}
      {PIPE_BOOTS.map((b, i) => (
        <g key={i}>
          <g data-boot="old" className="rf-old-boot">
            <ellipse cx={b.x} cy={b.y + 2} rx="16" ry="6" fill="#3a3733" />
            <path d={`M${b.x - 9} ${b.y + 1}L${b.x - 6} ${b.y - 10}H${b.x + 6}L${b.x + 9} ${b.y + 1}Z`} fill="#4a4641" />
          </g>
          <g className="rf-new-boot" opacity="0">
            <ellipse cx={b.x} cy={b.y + 2} rx="17" ry="6.5" fill="#61666b" />
            <path d={`M${b.x - 10} ${b.y + 2}L${b.x - 6} ${b.y - 11}H${b.x + 6}L${b.x + 10} ${b.y + 2}Z`} fill="#24272a" />
          </g>
          <rect x={b.x - 5} y={b.y - 26} width="10" height="18" fill="#e9e7e0" />
          <rect x={b.x - 6} y={b.y - 28} width="12" height="3" fill="#cfccc3" />
        </g>
      ))}

      <path id="rf-drip" d={`M${ROOF_X0 - 6} ${EAVE_Y + 1}H${ROOF_X1 + 6}`} stroke="#e7e5df" strokeWidth="4" strokeDasharray="1020" strokeDashoffset="1020" />
      {/* Gutter. */}
      <rect x={ROOF_X0 - 8} y={EAVE_Y + 2} width={ROOF_X1 - ROOF_X0 + 16} height="11" fill="#f3f2ee" />
      <rect x={ROOF_X0 - 8} y={EAVE_Y + 11} width={ROOF_X1 - ROOF_X0 + 16} height="2" fill="#c9c6bd" />
    </g>
  )
}

function Chimney() {
  const { x0, x1, topY, baseY } = CHIMNEY
  return (
    <g id="rf-chimney">
      <rect x={x0} y={topY} width={x1 - x0} height={baseY - topY + 4} fill="url(#rf-stone)" />
      <rect x={x1 - 12} y={topY} width="12" height={baseY - topY + 4} fill="#000" opacity="0.13" />
      <rect x={x0 - 8} y={topY - 10} width={x1 - x0 + 16} height="14" fill="#cbc3b2" />
      <rect x={x0 - 8} y={topY + 2} width={x1 - x0 + 16} height="3" fill="#000" opacity="0.15" />
      <path d={`M${x0 + 19} ${topY - 10}L${x0 + 22} ${topY - 36}H${x0 + 38}L${x0 + 41} ${topY - 10}Z`} fill="#b06a3b" />
      <rect x={x0 + 15} y={topY - 44} width="30" height="9" fill="#c47e4a" />
      <path d={`M${x0 + 26} ${topY - 34}V${topY - 12}`} stroke="#d9996a" strokeWidth="2" />
      <g id="rf-chimney-flash-old">
        <rect x={x0 - 6} y={baseY - 8} width={x1 - x0 + 12} height="12" fill="#6e5d4b" />
        <rect x={x0 - 6} y={baseY - 52} width="6" height="48" fill="#6e5d4b" />
        <rect x={x1} y={baseY - 52} width="6" height="48" fill="#6e5d4b" />
      </g>
      <g id="rf-chimney-flash-new" opacity="0">
        <rect x={x0 - 7} y={baseY - 9} width={x1 - x0 + 14} height="13" fill="#cfd4d8" />
        <path d={`M${x0 - 7} ${baseY - 22}H${x1 + 7}`} stroke="#aeb4b9" strokeWidth="3" />
        <rect x={x0 - 7} y={baseY - 56} width="7" height="52" fill="#cfd4d8" />
        <rect x={x1} y={baseY - 56} width="7" height="52" fill="#b9bfc4" />
      </g>
    </g>
  )
}

function Dormer({ index }: { index: number }) {
  const { x, baseY: by } = DORMERS[index]
  return (
    <g id={`rf-dormer-${index}`}>
      <rect x={x - 44} y={by - 118} width="88" height="122" fill="url(#rf-siding)" />
      <rect x={x - 44} y={by - 118} width="6" height="122" fill="#f3f2ee" />
      <rect x={x + 38} y={by - 118} width="6" height="122" fill="#f3f2ee" />
      <rect x={x - 31} y={by - 108} width="62" height="92" fill="#f4f3ef" />
      <Pane x={x - 25} y={by - 102} w={50} h={78} cols={2} rows={3} />
      <rect x={x - 34} y={by - 18} width="68" height="6" fill="#e3e0d8" />
      <polygon points={`${x - 48},${by - 115} ${x},${by - 168} ${x + 48},${by - 115}`} fill="#f3f2ee" />
      <rect x={x - 48} y={by - 120} width="96" height="6" fill="#e6e3dc" />
      <Rake a={[x - 48, by - 115]} peak={[x, by - 168]} b={[x + 48, by - 115]} />
      <rect x={x - 48} y={by - 3} width="96" height="5" fill="#8b8d8e" opacity="0.7" />
    </g>
  )
}

function LeftGable() {
  const { x0, x1, eaveY, peakX, peakY } = LEFT_GABLE
  return (
    <g>
      <polygon points={`${x0},${GROUND_Y} ${x0},${eaveY} ${peakX},${peakY} ${x1},${eaveY} ${x1},${GROUND_Y}`} fill="url(#rf-siding)" />
      <rect x={x0} y={eaveY} width="8" height={GROUND_Y - eaveY - 14} fill="#f3f2ee" />
      <rect x={x1 - 8} y={eaveY} width="8" height={GROUND_Y - eaveY - 14} fill="#f3f2ee" />
      <rect x="660" y="896" width="100" height="120" fill="#f4f3ef" />
      <Pane {...WINDOW_PANES[0]} cols={3} rows={3} />
      <rect x="654" y="1014" width="112" height="7" fill="#e3e0d8" />
      <Shutter x={628} y={898} w={28} h={116} />
      <Shutter x={764} y={898} w={28} h={116} />
      {/* arched gable vent */}
      <path d={`M${peakX - 17} 812V786A17 17 0 0 1 ${peakX + 17} 786V812Z`} fill="#f4f3ef" />
      <path d={`M${peakX - 11} 808V788A11 11 0 0 1 ${peakX + 11} 788V808Z`} fill="#c9c7c0" />
      <path d={`M${peakX - 11} 793H${peakX + 11}M${peakX - 11} 799H${peakX + 11}M${peakX - 11} 805H${peakX + 11}`} stroke="#9e9c95" strokeWidth="1.6" />
      <Rake a={[x0 - 4, eaveY + 2]} peak={[peakX, peakY]} b={[x1 + 4, eaveY + 2]} />
      <rect x={x0} y={GROUND_Y - 16} width={x1 - x0} height="16" fill="url(#rf-brick)" />
    </g>
  )
}

function Porch() {
  return (
    <g>
      <rect x="936" y="928" width="128" height="12" fill="#f4f3ef" />
      <rect x="942" y="940" width="116" height="118" fill="#f4f3ef" />
      <Pane x={950} y={948} w={14} h={104} cols={1} rows={4} />
      <Pane x={1036} y={948} w={14} h={104} cols={1} rows={4} />
      <rect x="970" y="944" width="60" height="112" fill="#1b1e21" />
      <path d="M978 1000h44v48h-44zM978 952h44v40h-44z" fill="none" stroke="#2d3135" strokeWidth="2" />
      <circle cx="1000" cy="975" r="13" fill="none" stroke="#3d6833" strokeWidth="7" />
      <circle cx="993" cy="967" r="3" fill="#e86f8f" />
      <circle cx="1008" cy="981" r="3" fill="#e86f8f" />
      <circle cx="1022" cy="1004" r="2.4" fill="#c9a24c" />
      <Lantern x={926} y={996} />
      <Lantern x={1074} y={996} />
      {/* columns */}
      {[852, 1138].map((x) => (
        <g key={x}>
          <rect x={x} y="884" width="14" height="164" fill="#f4f3ef" />
          <rect x={x - 3} y="884" width="20" height="8" fill="#e6e3dc" />
          <rect x={x - 3} y="1040" width="20" height="8" fill="#e6e3dc" />
        </g>
      ))}
      <rect x="944" y="1050" width="112" height="8" fill="url(#rf-brick)" />
      <rect x="934" y="1056" width="132" height="8" fill="#9a6450" />
    </g>
  )
}

function StoneGable() {
  const { x0, x1, eaveY, peakX, peakY } = STONE_GABLE
  const seams: string[] = []
  for (let x = 1206; x <= 1396; x += 14) seams.push(`M${x} 900V914`)
  return (
    <g>
      <polygon points={`${x0},${GROUND_Y} ${x0},${eaveY} ${peakX},${peakY} ${x1},${eaveY} ${x1},${GROUND_Y}`} fill="url(#rf-stone)" />
      <polygon points={`${x1 - 16},${GROUND_Y} ${x1 - 16},${eaveY - 6} ${x1},${eaveY} ${x1},${GROUND_Y}`} fill="#000" opacity="0.08" />
      <path d={`M${peakX - 14} 806V788A14 14 0 0 1 ${peakX + 14} 788V806Z`} fill="#8e8778" />
      <path d={`M${peakX - 18} 808V788A18 18 0 0 1 ${peakX + 18} 788`} fill="none" stroke="#7a5843" strokeWidth="5" />
      {/* bay window */}
      <path d="M1186 916L1204 894H1396L1414 916Z" fill="#4b3a2e" />
      <path d={seams.join('')} stroke="#5f4b3b" strokeWidth="2" />
      <rect x="1196" y="916" width="208" height="120" fill="#f4f3ef" />
      <Pane {...WINDOW_PANES[3]} cols={2} rows={3} />
      <Pane {...WINDOW_PANES[4]} cols={2} rows={3} />
      <Pane {...WINDOW_PANES[5]} cols={2} rows={3} />
      <rect x="1190" y="1034" width="220" height="10" fill="#dcd5c6" />
      <Rake a={[x0 - 4, eaveY + 2]} peak={[peakX, peakY]} b={[x1 + 4, eaveY + 2]} />
    </g>
  )
}

function Plantings() {
  return (
    <g>
      <rect x="570" y={GROUND_Y - 4} width="1060" height="16" rx="8" fill="#4f3627" />
      {plantings.map((b, i) => (
        <circle key={i} cx={b.cx.toFixed(1)} cy={b.cy.toFixed(1)} r={b.r.toFixed(1)} fill={b.fill} />
      ))}
      {flowers.map((f, i) => (
        <circle key={i} cx={f.cx.toFixed(1)} cy={f.cy.toFixed(1)} r={f.r.toFixed(1)} fill={f.fill} />
      ))}
    </g>
  )
}

function Tarps() {
  const drape = (x0: number, x1: number, h: number) =>
    `M${x0} ${GROUND_Y + 10}C${x0 + 6} ${GROUND_Y - h} ${x1 - 6} ${GROUND_Y - h - 10} ${x1} ${GROUND_Y + 10}Z`
  return (
    <g id="rf-tarps" opacity="0">
      {[
        [552, 830, 96],
        [862, 940, 76],
        [1060, 1140, 76],
        [1166, 1434, 62],
        [1432, 1616, 96],
      ].map(([x0, x1, h]) => (
        <g key={x0}>
          <path d={drape(x0, x1, h)} fill="#3f6f9e" opacity="0.92" />
          <path d={drape(x0 + 14, x1 - 14, h - 22)} fill="none" stroke="#5687b7" strokeWidth="2" opacity="0.6" />
        </g>
      ))}
    </g>
  )
}

function Ladder() {
  const rungs: string[] = []
  for (let y = LADDER.topY + 14; y < GROUND_Y; y += 22) rungs.push(`M${LADDER.x - 14} ${y}H${LADDER.x + 14}`)
  return (
    <g id="rf-ladder" opacity="0">
      <path d={rungs.join('')} stroke="#9aa1a7" strokeWidth="4" />
      <rect x={LADDER.x - 19} y={LADDER.topY} width="6" height={GROUND_Y - LADDER.topY + 2} fill="#c3c8cc" />
      <rect x={LADDER.x + 13} y={LADDER.topY} width="6" height={GROUND_Y - LADDER.topY + 2} fill="#aab0b5" />
      <rect x={LADDER.x - 21} y={GROUND_Y - 4} width="10" height="6" fill="#2b2e31" />
      <rect x={LADDER.x + 11} y={GROUND_Y - 4} width="10" height="6" fill="#2b2e31" />
    </g>
  )
}

export function SceneHouse() {
  return (
    <g id="rf-house">
      <GarageWing />
      <MainWalls />
      <MainRoof />
    </g>
  )
}

/** Everything that stands in front of the roof plane (and the roof crew). */
export function SceneHouseFront() {
  return (
    <g id="rf-house-front">
      <Chimney />
      {DORMERS.map((_, i) => (
        <Dormer key={i} index={i} />
      ))}
      <LeftGable />
      <Porch />
      <StoneGable />
      <Plantings />
      <Tarps />
      <Ladder />
    </g>
  )
}

/** Warm window light for the night segment, drawn above the dusk tint. */
export function SceneGlow() {
  return (
    <g id="rf-glow" opacity="0">
      {WINDOW_PANES.map((p, i) => (
        <g key={i}>
          <circle cx={p.x + p.w / 2} cy={p.y + p.h / 2} r={Math.max(p.w, p.h) * 0.95} fill="url(#rf-window-glow)" />
          <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#ffcf82" />
          <rect x={p.x} y={p.y + p.h * 0.55} width={p.w} height={p.h * 0.45} fill="#f2a95a" opacity="0.5" />
          <Muntins x={p.x} y={p.y} w={p.w} h={p.h} cols={p.w > 60 ? 3 : p.w > 20 ? 2 : 1} rows={p.w > 20 ? 3 : 4} stroke="#8a6238" />
        </g>
      ))}
      {DORMERS.map((d, i) => (
        <g key={`d${i}`} id={`rf-dormer-glow-${i}`}>
          <rect x={d.x - 25} y={d.baseY - 102} width="50" height="78" fill="#f7c27a" />
          <Muntins x={d.x - 25} y={d.baseY - 102} w={50} h={78} cols={2} rows={3} stroke="#8a6238" />
        </g>
      ))}
      {[926, 1074].map((x) => (
        <g key={x}>
          <circle cx={x} cy={985} r="46" fill="url(#rf-window-glow)" />
          <rect x={x - 5} y={978} width="10" height="14" fill="#ffe1a3" />
        </g>
      ))}
    </g>
  )
}
