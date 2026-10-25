# Service website inquiry article: editorial review

**Release status:** Approved by Matthew on October 25, 2026. Publication metadata and public assets are prepared for the release. Production deployment is tracked separately in `blog-release.md`; earlier draft notes below describe the editorial review.

Status: editorially approved by Matthew on October 25, 2026 ("First article looks good"). The source remains a draft pending the production release; nothing has been published or deployed.

Source supplied by the user: `what-your-service-website-must-have-to-get-more-inquiries.md` from AnswerThePublic/Composeo. Original Downloads file preserved.

## Changes made

- Changed the title to the reader's direct question; retained the original descriptive slug.
- Removed unverified conversion benchmarks (2-4% and 5-8%), mobile search percentages (70-73%), and the 21x/five-minute lead qualification claim. The remaining arithmetic example is explicitly hypothetical and defines its denominator as sessions.
- Replaced universal claims about form lengths, CTA wording, testimonials, dedicated service pages, and redesigns with contextual recommendations.
- Added inquiry delivery, responsibility, qualification, and measurement guidance. These are illustrative workflow recommendations, not customer case-study results.
- Corrected the product description. Shift Finder is a three-question service recommendation quiz. The article now accurately links to the separate website first check and states its limitations.
- Corrected the FAQ advice using Google's current documentation: FAQ rich results were retired in May 2026.
- Replaced secondary agency citations with primary Google/W3C references where they support specific claims.
- Retained the source illustration as a labeled concept, with descriptive alt text and a local draft asset.
- Added a two-page printable checklist with 18 checks, issue records, and a measurement worksheet.

## Review and release

The current article has passed Matthew's editorial review. At release, set an accurate `publishedAt` timestamp, promote its assets, and change its status as part of the production build. No firsthand customer outcomes have been invented; a genuine example can be added if supplied.

Draft assets are under `content/blog/assets/what-your-service-website-must-have-to-get-more-inquiries/`, outside `public/`. Before publishing, copy `service-website-inquiries.webp` to `public/media/blog/` and `service-website-inquiry-checklist.pdf` to `public/resources/`. The intended production URLs are already in the Markdown. Until then, the local draft preview serves only those explicit assets.

## Sources checked October 25, 2026

- W3C Forms Tutorial: https://www.w3.org/WAI/tutorials/forms/
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Core Web Vitals: https://web.dev/articles/vitals
- Google Search documentation updates, May/June 2026: https://developers.google.com/search/updates
- Local source: `src/content/shiftQuiz.ts`, `src/content/audit.ts`, `src/components/SiteAudit/SiteAudit.tsx`, `src/content/servicesPage.ts`, `src/content/about.ts`.

Suggested commit message: `content(blog): prepare service website inquiry guide and checklist`
