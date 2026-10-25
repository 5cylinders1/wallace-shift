# Website redesign draft review

**Release status:** Approved by Matthew on October 25, 2026. Publication metadata and public assets are prepared for the release. Production deployment is tracked separately in `blog-release.md`; earlier draft notes below describe the editorial review.

Draft: `website-redesign-strategy-what-to-prioritize-first.md`

Status is `draft`, with Matthew Wallace as author and `/about` as profile. No
publication date is assigned. Source material was the user-supplied Downloads
article; the first Wallace Shift article supplied the format and tone. Nothing
was installed in the repository, deployed, or published by this agent.

## Editorial work

- Rebuilt the article around a decision brief, baseline, evidence, priorities,
  page inventory, ownership, dependencies, launch review, and measurement.
- Kept it distinct from the inquiry-optimization article: this draft explains
  how to scope and manage a redesign rather than restating website feature advice.
- Removed unsupported prevalence claims, audit statistics, third-party timeline
  claims, universal KPI limits, guaranteed improvement language, and mandatory
  30/60/90-day monitoring schedules.
- Corrected the idea that every redesign changes URLs. The draft separates
  visual work, platform changes, and domain changes, and preserves useful URLs.
- Replaced the misleading Shift Finder scanner claims with its actual
  three-question recommendation behavior. The separate website first check is
  described only within its technical scope.
- Did not reproduce overstatements in legacy site copy about search snippets,
  trust measurement, exact fixes, or guaranteed lead gains.
- Added no links to other unpublished articles and no fabricated case studies.

## Sources checked on October 25, 2026

Primary Google documentation is linked beside the relevant article passages.
No direct quotations are used. Derived material is divided across the sources;
the substantive planning framework and examples are original editorial guidance.

| Source | Coverage in article | Approximate derived words |
| --- | --- | --- |
| [Redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects) | Permanent redirect implementation | Under 60 |
| [Site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) | Relevant destinations, fluctuation, retention | Under 180 across all mentions |
| [HTTP statuses](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes) | Retired content responses | Under 70 |
| [Robots controls](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) | Indexing controls and crawler access | Under 85 |
| [Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) | Consistent preferred URLs | Under 50 |
| [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | Discovery and sitemap contents | Under 50 |

The HTTP-status source now resolves to Google's Crawling Infrastructure
documentation; the draft links directly to that current destination.

## Site accuracy and resources

Verified against the clean worktree's `src/content/shiftQuiz.ts`,
`src/content/audit.ts`, and `src/content/servicesPage.ts`. The source was checked;
live tool operation was not exercised for this editorial review.

- Primary worksheet URL: `/resources/website-redesign-planning-worksheet.pdf`.
  Linked near the opening and again in schedule planning. Its expected content
  is the brief, page inventory, priorities, ownership, and launch checks.
- Image URL: `/media/blog/website-redesign-strategy.webp`. Root inspected the
  downloaded image. Alt text matches the blueprint-style concept. The caption
  identifies the chart and blueprint labels as illustrative, including the
  decorative date rather than presenting it as publication metadata.
- Working internal destinations: `/approach#approach-start`, `/#shift-finder`,
  `/services#websites`, `/pricing#websites`, and `/contact`.
- Contact is framed as a discussion request, with no automatic booking,
  response-time, pricing, or delivery commitment added.

## Release handoff

Before publication, root should verify the completed worksheet matches its
description, check both resource paths in the local draft preview, obtain the
editorial decision, and assign the actual publication timestamp. Keep draft
assets outside `public` until the article is approved for release.

Suggested commit message: `content(blog): prepare website redesign strategy draft and planning worksheet`
