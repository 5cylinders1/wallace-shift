# Automation article: editorial review

**Release status:** Approved by Matthew on October 25, 2026. Publication metadata and public assets are prepared for the release. Production deployment is tracked separately in `blog-release.md`; earlier draft notes below describe the editorial review.

Status: draft, awaiting Matthew's review. No publication or deployment authorized by this artifact. These two files are prepared in a temporary review directory for the parent agent to install.

Source supplied by the user: `/Users/matthewwallace/Downloads/save-time-with-automation--stop-losing-hours-to-busy-work.md` from AnswerThePublic/Composeo. Original Downloads file preserved.

## Editorial changes

- Replaced highest-return task rankings and blanket promises with a task-selection method based on observed work, clear rules, useful inputs, exceptions, and ownership.
- Removed the unsupported 36%/16-hour administrative-work claim, 1–5-hour promises, per-workflow savings ranges, 60–80% recovery assumption, and the arbitrary more-than-three-times-a-week threshold.
- Replaced categorical Make-versus-Zapier superiority and stale price/usage comparisons with a requirements table linked to official capability documentation. No exact platform pricing or licensing entitlement is promised.
- Added concrete checks for duplicate requests, record matching, stop conditions for follow-up, onboarding prerequisites, invoice status, partial failure recovery, and a manual fallback.
- Retained the requested savings calculation as explicitly illustrative: 30 × (5 − 1) − 15 = 105 minutes per week. Added an eight-hour setup example: 480 ÷ 105 ≈ 4.6 weeks, recovered during week five only if assumptions hold. Distinguished time-only break-even from financial payback and cash savings.
- Corrected the Wallace Shift offer to match current repository sources: paid automation audit; scoped workflow builds and support; separate subscriptions and third-party costs. Removed the false claim that Shift Finder diagnoses exactly where time is lost. Verified `/services#automation` and `/pricing#automation` in content/section mappings.
- Added a natural early and later link to `/resources/automation-opportunity-worksheet.pdf`. Suggested worksheet contents: task/input/output map, frequency and manual timing, remaining review and maintenance, setup effort, net savings and time break-even, pilot cases, owner, fallback, review date.
- Named Matthew as draft author using the established template; author attribution still requires his review. No `publishedAt` value is set.
- Retained the supplied image as a concept only. Parent inspected the original and supplied alt wording describing paperwork moving through automation into connected business tools; its stylized chart is explicitly not presented as measured customer data.
- No links to unpublished sibling articles were added.

## Sources checked October 25, 2026

- Zapier, What is a Zap?: https://help.zapier.com/hc/en-us/articles/8496309697421-What-is-a-Zap — verified live official documentation for app-connected trigger/action workflows.
- Zapier, View and manage your Zap history: https://help.zapier.com/hc/en-us/articles/8496291148685-View-and-manage-your-Zap-history — verified live official run-history reference.
- Make, Router: https://help.make.com/router — verified conditional routing and fallback capability; no claim that Make uniquely offers branching.
- Make, Overview of error handling: https://help.make.com/Overview-of-error-handling — verified official error-handling and incomplete-execution reference. The article does not repeat the documentation's example of inserting dummy customer information.
- Microsoft, Get started with approvals: https://learn.microsoft.com/en-us/power-automate/get-started-approvals — verified approval workflows, waiting for approver response, and the need to check account/environment access and licensing.
- Calendly, Automate Meeting Emails and Texts: https://calendly.com/learn/calendly-workflows — verified current official page, updated October 5, 2026, describing booking-related communication and event-type assignment.
- Local business sources: `src/content/servicesPage.ts` automation section; `src/content/pricing.ts` automation section; `src/pages/ServicesPage.tsx` dynamic service anchors; `src/components/Pricing/EngagementRows.tsx` dynamic pricing anchors.

Vendor documentation establishes capabilities, not comparative superiority or measured returns. Candidate selection, testing approach, illustrative workflows, and savings examples are editorial recommendations, not reported customer results.

## Before release

Review the draft and author attribution. Confirm the final worksheet content and the inspected image, place their approved copies at the intended public URLs, test links and rendering, and set an accurate publication timestamp only when publication is approved. The parent agent owns draft-asset storage, local previews, and repository installation.

Suggested commit message: `content(blog): prepare practical automation guide and opportunity worksheet`
