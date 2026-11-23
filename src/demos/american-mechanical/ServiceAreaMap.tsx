import { useId } from 'react'
import { missouriRiver } from './boundaries'

type Point = [lat: number, lng: number]
type Anchor = 'start' | 'middle' | 'end'

const project = ([lat, lng]: Point): [number, number] => [440 + (lng + 94.5786) * 370, 192 - (lat - 39.0997) * 475]
const path = (points: Point[]) => points.map((point, index) => `${index ? 'L' : 'M'}${project(point).join(',')}`).join(' ')
const stateLine: Point[] = [...missouriRiver.slice(0, 11), [38.5, -94.617]]
const kansas: Point[] = [[39.615, -96], ...stateLine, [38.5, -96]]
const nearby: [name: string, lat: number, lng: number, dx: number, dy: number, anchor: Anchor][] = [
  ['Leavenworth', 39.3227, -94.925, -9, -9, 'end'],
  ['Liberty', 39.2413, -94.4194, 9, -8, 'start'],
  ['Kansas City, KS', 39.1225, -94.7418, -9, 5, 'end'],
  ['Blue Springs', 39.012, -94.2676, 9, 5, 'start'],
  ['Olathe', 38.8798, -94.82, -9, 5, 'end'],
  ['Overland Park', 38.889, -94.6906, 0, -10, 'middle'],
  ['Lee’s Summit', 38.9216, -94.3848, 9, 5, 'start'],
]

export default function ServiceAreaMap() {
  const id = useId()
  return <svg viewBox="0 0 880 384" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby={id} className="am-area-svg">
    <title id={id}>Greater Kansas City service area map, with approximate coverage centered on Kansas City, Missouri and extending into Kansas.</title>
    <rect width="880" height="384" fill="#eef3f7" />
    <path d={`${path(kansas)} Z`} fill="#f6f3ec" />
    <path d={path(stateLine)} fill="none" stroke="#9baab7" strokeDasharray="4 5" />
    <circle cx="440" cy="192" r="168" fill="#477cba" fillOpacity=".13" stroke="#497ab2" strokeWidth="1.8" strokeDasharray="5 5" />
    <path d={path(missouriRiver)} fill="none" stroke="#92bad1" strokeWidth="2.5" strokeLinejoin="round" />
    <g fill="#526579" fontSize="15" fontWeight="700" textAnchor="middle" letterSpacing="3">
      <text x="253" y="60">KANSAS</text><text x="620" y="60">MISSOURI</text>
    </g>
    <g fill="#344d65" fontSize="15" fontWeight="600" paintOrder="stroke" stroke="#f5f8fb" strokeWidth="3" strokeLinejoin="round">
      {nearby.map(([name, lat, lng, dx, dy, anchor]) => {
        const [x, y] = project([lat, lng])
        return <g key={name}><circle cx={x} cy={y} r="3.4" strokeWidth="1.5" /><text x={x + dx} y={y + dy} textAnchor={anchor}>{name}</text></g>
      })}
    </g>
    <g transform="translate(440 192)">
      <path d="M0 7C-3 2-12-6-12-14a12 12 0 0 1 24 0C12-6 3 2 0 7Z" fill="#d2851e" stroke="#fff" strokeWidth="2" />
      <circle cy="-14" r="3.8" fill="#fff" />
      <rect x="-82" y="19" width="164" height="32" rx="6" fill="#14243b" />
      <text y="40" fill="#fff" fontSize="16" fontWeight="700" textAnchor="middle">Kansas City, MO</text>
    </g>
  </svg>
}
