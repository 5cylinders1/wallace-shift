import { links, studio } from './content'

/** The studio as a call sheet: the format every artist booking it already reads. */
export default function Studio() {
  const rows: { label: string; value: string | string[] }[] = [
    { label: 'Location', value: `${studio.where} · ${studio.corner}` },
    { label: 'Space', value: studio.size },
    { label: 'Inside', value: studio.inside },
    { label: 'Good for', value: studio.goodFor },
    { label: 'Bookings', value: studio.booking },
  ]

  return (
    <section id="studio" className="otv-studio otv-light" aria-labelledby="otv-studio-title">
      <div className="otv-wrap otv-studio-grid">
        <div className="otv-studio-copy">
          <p className="otv-kicker" data-rise>OTV Studio</p>
          <h2 id="otv-studio-title" className="otv-h2" data-rise>a home base in humboldt park.</h2>
          <p className="otv-studio-lede" data-rise>
            Formerly Reunion Chicago, the studio is a one-stop shop for intersectional artists: room to read, rehearse, cast, cut and screen, in a storefront built for the work.
          </p>

          <div className="otv-callsheet" data-rise>
            <p className="otv-callsheet-head">
              <span>Call sheet</span>
              <span>OTV Studio</span>
            </p>
            <dl>
              {rows.map((row) => (
                <div key={row.label} className="otv-callsheet-row">
                  <dt>{row.label}</dt>
                  <dd>
                    {Array.isArray(row.value)
                      ? <ul>{row.value.map((item) => <li key={item}>{item}</li>)}</ul>
                      : row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="otv-callsheet-actions">
              <a className="otv-btn otv-btn--ink" href={links.studioBooking}>Request a booking <span aria-hidden="true">↗</span></a>
              <a className="otv-link" href={links.studioEmail}>studio@weareo.tv</a>
            </div>
          </div>
        </div>

        <figure className="otv-studio-photos">
          <ul aria-label="Artists in the studio's director's chairs at its soft launch">
            {studio.chairs.map((src, i) => (
              <li key={src} data-rise style={{ ['--i' as string]: i }}>
                <img src={src} alt="" loading="lazy" decoding="async" width="1100" height="1000" />
              </li>
            ))}
          </ul>
          <figcaption>Artists in the director's chair at the studio's soft launch. {studio.photoCredit}.</figcaption>
        </figure>
      </div>
    </section>
  )
}
