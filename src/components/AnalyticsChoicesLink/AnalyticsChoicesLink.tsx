import { footer } from '../../content/siteConfig'

interface AnalyticsChoicesLinkProps {
  className?: string
  /** Studio origin, for footers served from another host such as contractors.wallaceshift.com. */
  origin?: string
}

/**
 * Footer link that reopens the analytics consent panel. public/site-analytics.js
 * handles the click; where analytics is off or blocked, it opens the policy.
 * A plain anchor, so it works the same in the SPA and the standalone entries.
 */
export function AnalyticsChoicesLink({ className, origin = '' }: AnalyticsChoicesLinkProps) {
  return (
    <a className={className} href={`${origin}${footer.analyticsChoices.href}`} data-ws-analytics-choices="">
      {footer.analyticsChoices.label}
    </a>
  )
}
