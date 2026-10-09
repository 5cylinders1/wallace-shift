import type { Credit } from './types'

/** Data credits as their licences ask: named, and linked where a link is given. */
export function Credits({ credits, className = '' }: { credits: Credit[]; className?: string }) {
  return (
    <ul className={`rf-credits ${className}`.trim()} aria-label="Map data credits">
      {credits.map((credit) => (
        <li key={credit.text}>
          {credit.href ? (
            <a href={credit.href} target="_blank" rel="noopener noreferrer">
              {credit.text}
            </a>
          ) : (
            credit.text
          )}
        </li>
      ))}
    </ul>
  )
}
