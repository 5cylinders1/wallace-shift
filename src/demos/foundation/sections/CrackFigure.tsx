import type { ReactNode } from 'react'
import type { Figure } from '../symptoms'

/**
 * Line drawings of each symptom, in the same section-drawing language as
 * the model: ink outlines, rust for the defect, azure for water.
 */
const INK = 'var(--dt-ink)'
const STRESS = 'var(--dt-stress)'
const WATER = 'var(--dt-water)'
const FILL = 'var(--dt-figure-fill)'

function Blocks({ x = 20, y = 20, w = 200, h = 120 }: { x?: number; y?: number; w?: number; h?: number }) {
  const rows = 6
  const rowH = h / rows
  const lines: ReactNode[] = []
  for (let r = 1; r < rows; r++) lines.push(<line key={`r${r}`} x1={x} x2={x + w} y1={y + r * rowH} y2={y + r * rowH} />)
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? 25 : 0
    for (let c = offset; c < w; c += 50) if (c > 0) lines.push(<line key={`c${r}-${c}`} x1={x + c} x2={x + c} y1={y + r * rowH} y2={y + (r + 1) * rowH} />)
  }
  return <g stroke={INK} strokeOpacity="0.28" strokeWidth="1">{lines}</g>
}

const crack = (d: string, color = STRESS) => <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

const drawings: Record<Figure, ReactNode> = {
  vertical: <>
    <rect x="20" y="20" width="200" height="120" fill={FILL} stroke={INK} strokeWidth="1.5" />
    {[60, 120, 180].flatMap(x => [50, 110].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={INK} fillOpacity="0.35" />))}
    <path d="M131 20 L129 38 L133 55 L130 74 L132 92 L130 110" fill="none" stroke={STRESS} strokeWidth="2.2" strokeLinecap="round" />
  </>,
  step: <>
    <rect x="20" y="20" width="200" height="120" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <Blocks />
    {crack('M170 20 V40 H145 V60 H120 V80 H95 V100 H70 V120 H45 V140')}
  </>,
  horizontal: <>
    <rect x="20" y="20" width="200" height="120" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <Blocks />
    {crack('M30 120 V100 H45 V80 H195 V100 H210 V120')}
  </>,
  bow: <>
    <path d="M20 30 H96 V140 H20 Z" fill="var(--dt-soil)" opacity="0.55" />
    <path d="M96 30 Q 122 85 96 140 L118 140 Q 144 85 118 30 Z" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <line x1="132" y1="30" x2="132" y2="140" stroke={INK} strokeDasharray="4 4" strokeOpacity="0.6" />
    {[60, 85, 110].map(y => <path key={y} d={`M34 ${y} H80 M72 ${y - 6} L80 ${y} L72 ${y + 6}`} stroke={WATER} strokeWidth="2.4" fill="none" />)}
    <text x="140" y="90" fontSize="11" fill={INK} fontFamily="var(--dt-mono)">string line</text>
    <line x1="20" y1="140" x2="220" y2="140" stroke={INK} strokeWidth="1.5" />
  </>,
  diagonal: <>
    <rect x="20" y="20" width="200" height="120" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <rect x="95" y="58" width="50" height="82" fill="none" stroke={INK} strokeWidth="1.5" />
    {crack('M95 58 L86 50 L80 41 L70 33 L62 24', STRESS)}
    {crack('M145 58 L152 52 L160 44', STRESS)}
  </>,
  floor: <>
    <path d="M20 128 L220 112" stroke={INK} strokeWidth="3" />
    <path d="M20 128 L20 30 M220 112 L220 30" stroke={INK} strokeWidth="1.5" />
    <line x1="20" y1="112" x2="220" y2="112" stroke={WATER} strokeDasharray="6 5" strokeWidth="1.5" />
    <rect x="96" y="96" width="48" height="12" rx="6" fill="none" stroke={INK} strokeWidth="1.5" />
    <circle cx="106" cy="102" r="4" fill={STRESS} />
    <text x="26" y="146" fontSize="11" fill={INK} fontFamily="var(--dt-mono)">low corner</text>
  </>,
  door: <>
    <path d="M70 140 L74 30 L170 26 L170 140" fill="none" stroke={INK} strokeWidth="3" />
    <rect x="80" y="36" width="84" height="104" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <path d="M164 30 L170 26 L170 44 L164 44 Z" fill={STRESS} opacity="0.85" />
    <path d="M74 30 L80 36" stroke={STRESS} strokeWidth="2" />
    <circle cx="152" cy="92" r="3.2" fill={INK} />
  </>,
  cove: <>
    <path d="M20 30 H96 V140 H20 Z" fill="var(--dt-soil)" opacity="0.55" />
    <rect x="96" y="30" width="22" height="104" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <rect x="118" y="122" width="102" height="12" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <rect x="86" y="134" width="44" height="12" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <path d="M118 122 C 140 118 170 118 200 121" stroke={WATER} strokeWidth="3" fill="none" />
    {[[40, 80], [58, 104], [74, 122]].map(([x, y]) => <path key={x} d={`M${x} ${y} H${x + 18} M${x + 12} ${y - 5} L${x + 18} ${y} L${x + 12} ${y + 5}`} stroke={WATER} strokeWidth="2.2" fill="none" />)}
  </>,
  bloom: <>
    <rect x="20" y="20" width="200" height="120" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <Blocks />
    <path d="M20 140 C 50 112 70 126 92 108 C 110 96 130 118 150 104 C 170 92 196 120 220 106 V140 Z" fill="#ffffff" opacity="0.9" />
    <path d="M20 140 C 50 112 70 126 92 108 C 110 96 130 118 150 104 C 170 92 196 120 220 106" fill="none" stroke={INK} strokeOpacity="0.35" strokeDasharray="2 3" />
  </>,
  gap: <>
    <path d="M20 60 H104 V140 H20 Z" fill="var(--dt-soil)" opacity="0.55" />
    <path d="M104 60 L114 60 L106 118 Z" fill={INK} opacity="0.85" />
    <rect x="114" y="40" width="22" height="100" fill={FILL} stroke={INK} strokeWidth="1.5" />
    <path d="M136 52 H220" stroke={INK} strokeWidth="1.5" />
    <path d="M20 60 H104" stroke={INK} strokeWidth="1.5" />
    {[[40, 74], [62, 92], [44, 110]].map(([x, y]) => <path key={x} d={`M${x} ${y} l8 10 l-4 10`} stroke={INK} strokeOpacity="0.5" fill="none" />)}
  </>,
}

export default function CrackFigure({ figure, className }: { figure: Figure; className?: string }) {
  return <svg className={className ?? 'dt-figure'} viewBox="0 0 240 160" role="presentation" aria-hidden="true">
    {drawings[figure]}
  </svg>
}
