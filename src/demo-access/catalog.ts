import { trades } from '../demos/contractors/catalog'

export interface AdminDemo {
  id: string
  slug: string
  href: string
  name: string
  detail: string
}

// Share the contractor inventory, then include standalone concepts that do not
// appear in that public gallery. Relative links preserve the current session host.
export const adminDemos: AdminDemo[] = [
  ...trades.map(demo => ({
    id: demo.kind === 'film' ? demo.accessKey : demo.id,
    slug: demo.id,
    href: demo.productionPath,
    name: demo.id === 'roofing-crm' ? 'Roofing Dashboard' : demo.name,
    detail: demo.id === 'roofing-crm' ? 'Interactive operations concept' : demo.trade,
  })),
  {
    id: 'bucyrus-auto', slug: 'bucyrus-auto', href: '/demos/bucyrus-auto/',
    name: 'Bucyrus Auto & Drivetrain', detail: 'Auto repair website concept',
  },
  {
    id: 'otv', slug: 'otv', href: '/demo/otv',
    name: 'OTV | Open Television', detail: 'Arts nonprofit website concept',
  },
  {
    id: 'solara', slug: 'solara', href: '/demo/solara',
    name: 'SoLara Salon', detail: 'Hair salon website concept',
  },
  {
    id: 'dopps', slug: 'dopps', href: '/demo/dopps',
    name: 'Dopps Chiropractic', detail: 'Chiropractic 3D website concept',
  },
  {
    id: 'best-tailor', slug: 'sues-tailor', href: '/demo/sues-tailor',
    name: 'Sue’s Tailor Shop', detail: 'Tailoring and alterations website concept',
  },
  {
    id: 'american-mechanical', slug: 'american-mechanical', href: '/demo/american-mechanical',
    name: 'American Mechanical KC', detail: 'HVAC and water heater website concept',
  },
  {
    id: 'deercreek', slug: 'deercreek', href: '/demo/deercreek',
    name: 'Deer Creek Plumbing: Site A', detail: 'Plumbing website concept',
  },
  {
    id: 'deercreekplumbing', slug: 'deercreekplumbing', href: '/demo/deercreekplumbing',
    name: 'Deer Creek Plumbing: Site B', detail: 'Plumbing website concept',
  },
  {
    id: 'anthony', slug: 'anthony', href: '/demo/anthony',
    name: 'Anthony PHCE', detail: 'Customer chat demonstration',
  },
]
