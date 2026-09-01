import { websiteStandard } from '../../content/pricing'
import { Reveal } from '../Reveal/Reveal'
import './WebsiteStandard.css'

/**
 * The floor under all three levels, stated once. Deliberately a labelled
 * list on a rule rather than five cards — it is a footnote to the table
 * above, not a fourth thing to compare.
 */
export function WebsiteStandard() {
  return (
    <Reveal y={14} className="website-standard">
      <p className="eyebrow website-standard__eyebrow">
        {websiteStandard.eyebrow}
      </p>
      <ul className="website-standard__list">
        {websiteStandard.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Reveal>
  )
}
