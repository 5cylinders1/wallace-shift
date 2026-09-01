import type { Ref } from 'react'
import type { StandardPrincipleItem } from '../../content/siteConfig'

export interface StandardPrincipleProps {
  item: StandardPrincipleItem
  ref?: Ref<HTMLLIElement>
}

// One row of the standard: a rule, its number, and its copy. The rule is a
// dedicated element (not a `border-top`) so it can be scaled from zero
// width on entrance; everything else here is static markup GSAP reaches
// through the `<li>` ref via scoped selectors, not individually threaded
// refs — there's nothing here for a parent timeline to target beyond
// "this row's rule" and "this row's copy".
export function StandardPrinciple({ item, ref }: StandardPrincipleProps) {
  return (
    <li className="standard-principle" ref={ref}>
      <span className="standard-principle__rule" aria-hidden="true" />
      <span className="standard-principle__number">{item.number}</span>
      <div className="standard-principle__copy">
        <h3 className="standard-principle__title">{item.title}</h3>
        <p className="standard-principle__description">{item.description}</p>
      </div>
    </li>
  )
}
