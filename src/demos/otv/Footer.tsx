import { links, org, socials, stores } from './content'
import { Logo, SignalStrip } from './Header'

/** The close: a station ID over a full test card. */
export function StationId() {
  return (
    <section id="join" className="otv-station" aria-labelledby="otv-station-title">
      <div className="otv-testcard otv-testcard--full" aria-hidden="true">
        <SignalStrip className="otv-strip--card" />
        <span className="otv-testcard-reverse" />
        <span className="otv-testcard-pluge" />
      </div>
      <div className="otv-station-slab" data-rise>
        <Logo className="otv-station-logo" />
        <h2 id="otv-station-title" className="otv-h2">stay tuned.</h2>
        <p>Watch something brave tonight, bring your story to OTV, or help keep it on air.</p>
        <div className="otv-station-actions">
          <a className="otv-btn" href={links.trial}>Start a free trial</a>
          <a className="otv-btn otv-btn--ghost" href={links.submit}>Submit your work</a>
          <a className="otv-btn otv-btn--ghost" href={links.donate}>Donate</a>
        </div>
        <a className="otv-link otv-station-news" href={links.newsletter}>Get the OTV newsletter <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  )
}

const columns = [
  { title: 'Watch', items: [{ label: 'Browse the catalog', href: links.browse }, { label: 'Start a free trial', href: links.trial }, ...stores.map((s) => ({ label: `OTV on ${s.label}`, href: s.href }))] },
  { title: 'Make', items: [{ label: 'Submit your work', href: links.submit }, { label: 'Book the studio', href: links.studioBooking }, { label: 'Programs', href: '#programs' }] },
  { title: 'Support', items: [{ label: 'Donate', href: links.donate }, { label: 'Gift a membership', href: links.giftMembership }, { label: 'Build with OTV', href: links.partner }] },
  { title: 'OTV', items: [{ label: 'Vision', href: links.vision }, { label: 'Research', href: links.research }, { label: 'Contact', href: links.contact }] },
]

export default function Footer() {
  return (
    <footer className="otv-footer">
      <SignalStrip />
      <div className="otv-wrap otv-footer-grid">
        <div className="otv-footer-brand">
          <Logo />
          <p>{org.tagline}</p>
          <ul className="otv-socials">
            {socials.map((s) => <li key={s.label}><a href={s.href}>{s.label}</a></li>)}
          </ul>
        </div>
        {columns.map((column) => (
          <nav key={column.title} className="otv-footer-col" aria-label={column.title}>
            <h2>{column.title}</h2>
            <ul>{column.items.map((item) => <li key={item.label}><a href={item.href}>{item.label}</a></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="otv-wrap otv-footer-base">
        <p>{org.legal} © {new Date().getFullYear()} {org.name}.</p>
        <p className="otv-concept-note">
          A website concept by <a href="https://wallaceshift.com">Wallace Shift</a>, not the official OTV site. Every link goes to OTV's real pages; titles, stills and photographs belong to OTV and its artists.
        </p>
      </div>
    </footer>
  )
}
