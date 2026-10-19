import { useMemo, useState } from 'react'
import type { Brief } from './Booking'

type Event = 'hail' | 'wind' | 'tree' | 'leak'
type When = 'week' | 'month' | 'older' | 'unsure'

const events: { id: Event; label: string }[] = [
  { id: 'hail', label: 'Hail' },
  { id: 'wind', label: 'High wind' },
  { id: 'tree', label: 'A tree or limb fell' },
  { id: 'leak', label: 'Water is coming in' },
]

const timing: { id: When; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'older', label: 'Longer ago' },
  { id: 'unsure', label: 'Not sure' },
]

/** Standard hail size references, in inches across. */
const hail = [
  { name: 'Pea', size: 0.25, label: '¼' },
  { name: 'Marble', size: 0.5, label: '½' },
  { name: 'Penny', size: 0.75, label: '¾' },
  { name: 'Quarter', size: 1, label: '1' },
  { name: 'Golf ball', size: 1.75, label: '1¾' },
]

function plan(selected: Set<Event>, when: When | null): { title: string; text: string; urgent?: boolean }[] {
  const steps: { title: string; text: string; urgent?: boolean }[] = []
  if (selected.has('tree')) steps.push({ title: 'Keep clear first', text: 'Stay away from the limb and any downed lines. If wires are involved, call the utility or 911. We can tarp once it is safe.', urgent: true })
  if (selected.has('leak')) steps.push({ title: 'Slow the water down', text: 'Catch drips, move what you can and photograph stains as they spread. We can tarp the roof as an emergency repair.', urgent: true })
  steps.push({ title: 'Stay off the roof', text: 'Photograph what you can from the ground: debris in the yard, gutters, downspouts, siding, cars and outdoor furniture.' })
  if (selected.has('hail')) steps.push({ title: 'Check the soft metals', text: 'Gutters, downspouts, vents and air-conditioner fins usually dent first. A coin next to a dent shows its size in photos.' })
  if (selected.has('hail') || selected.has('wind')) steps.push({ title: 'Look at the downspouts', text: 'Piles of dark granules at the outlets, or tabs and ridge caps in the grass, tell us where to look first.' })
  steps.push({ title: 'Write down the date', text: 'Note when the storm came through. Public storm reports for your area can help confirm it later.' })
  if (when === 'month' || when === 'older' || when === 'unsure') steps.push({ title: 'Check your reporting deadline', text: 'Many policies set a time limit for reporting damage, and it can be shorter than people expect. Your policy documents say how long you have.' })
  else steps.push({ title: 'Know how to report', text: 'Your policy explains how and when to report damage. Keep receipts for any emergency repair; insurers usually ask you to prevent further damage.' })
  steps.push({ title: 'Book a free storm inspection', text: 'You get photos of what we find and an honest read on whether it looks like storm damage, before you decide what to do.' })
  return steps
}

export default function StormDesk({ onBrief }: { onBrief: (brief: Brief) => void }) {
  const [selected, setSelected] = useState<Set<Event>>(() => new Set(['hail']))
  const [when, setWhen] = useState<When | null>('week')
  const steps = useMemo(() => plan(selected, when), [selected, when])

  const toggle = (id: Event) => setSelected(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const send = () => {
    const what = events.filter(event => selected.has(event.id)).map(event => event.label.toLowerCase()).join(', ') || 'not specified'
    const date = timing.find(item => item.id === when)?.label.toLowerCase() ?? 'not specified'
    onBrief({ service: 'storm', source: 'Storm desk', notes: `Storm desk: ${what}; happened ${date}.${selected.has('leak') ? ' Water is coming in now.' : ''}` })
  }

  return <section id="storm-desk" className="st-desk st-opaque" aria-labelledby="st-desk-title">
    <div className="st-wrap">
      <div className="st-section-head">
        <p className="st-kicker st-kicker-light"><span>03</span>The storm desk</p>
        <h2 id="st-desk-title">Had a storm? <em>Start here.</em></h2>
        <p className="st-lede">Two questions, then a plan for the next 48 hours. It takes less time than finding your policy number.</p>
      </div>
      <div className="st-desk-grid">
        <div className="st-desk-form">
          <fieldset>
            <legend><span>1</span>What happened?</legend>
            <div className="st-chips">
              {events.map(event => <label key={event.id} className="st-chip">
                <input type="checkbox" checked={selected.has(event.id)} onChange={() => toggle(event.id)} />
                <span>{event.label}</span>
              </label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>2</span>When was it?</legend>
            <div className="st-chips">
              {timing.map(item => <label key={item.id} className="st-chip">
                <input type="radio" name="st-storm-when" checked={when === item.id} onChange={() => setWhen(item.id)} />
                <span>{item.label}</span>
              </label>)}
            </div>
          </fieldset>
          <figure className="st-hail">
            <figcaption>Common hail sizes, to scale with each other</figcaption>
            <ol>
              {hail.map(stone => <li key={stone.name}>
                <span className="st-hail-stone" style={{ width: `${stone.size * 52}px`, height: `${stone.size * 52}px` }} aria-hidden="true" />
                <strong>{stone.name}</strong><span>{stone.label} in</span>
              </li>)}
            </ol>
            <p>Around an inch across, quarter-sized, is often enough to bruise asphalt shingles.</p>
          </figure>
        </div>
        <div className="st-desk-plan">
          <p className="st-desk-plan-label">Your next steps</p>
          <ol aria-live="polite">
            {steps.map((step, index) => <li key={step.title} className={step.urgent ? 'is-urgent' : ''}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{step.title}</strong><p>{step.text}</p></div>
            </li>)}
          </ol>
          <button type="button" className="st-button st-button-copper st-button-wide" onClick={send}>Book a free storm inspection <span aria-hidden="true">→</span></button>
          <p className="st-fine">General guidance for a fictional contractor, not legal or insurance advice. Your policy and insurer decide coverage.</p>
        </div>
      </div>
    </div>
  </section>
}
