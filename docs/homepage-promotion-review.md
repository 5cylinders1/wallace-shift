# Homepage promotion and contact choices

Reviewed November 17, 2026. The hero was subsequently restored to its prior layout at the user’s correction. The prominent three-option treatment is confined to the booking popup. Homepage routing and shared navigation remain in place. Changes are local; no deployment was performed.

## Result

- `/` now renders the service lander through the real application entry and production prerender. Its title and description describe websites, lead pages and the immediate contact options.
- The existing shared navigation retains Services, Pricing, Approach, About, Blog and Contact on desktop and mobile. The shared footer follows the lander.
- The previous interactive homepage is preserved at `/showcase`, linked from the lander and kept out of the sitemap/search index. Its complete journey and footer remain together.
- The full viewport inquiry overlay presents three substantial controls: **Request a call**, **Book a Google Meet**, and **Call directly: (913) 347-5479**. Each option explains its purpose. Both overlay modes show the selected option. The hero retains its original compact callback button, Google Meet text link, phone link, copy and spacing.
- Callback requires name and phone, with optional email/note. The booking flow retains the existing 20 minute Google Meet event. No package selection is required. Prices and commercial disclosures are preserved.
- Production components live in `src/components/ServiceHome`. The former preview URL imports the same implementation, preventing two versions of the inquiry flow.
- Fixed navigation clearance, stable modal positioning, server rendering and package fragment navigation were adapted for the shared application shell. Scrollbar compensation also covers fixed navigation and the docked package selector.

## Evidence and limits

The user's screenshot showed the three contact options as understated text links below explanatory copy. Source inspection confirmed the lander had its own preview header and browser-only render assumptions. Those are observed obstacles addressed here. The stronger popup controls are a design response to that evidence; increased conversion has not been measured. No new original visitor sessions, prospect conversations or research participants were available in this task. The [earlier inquiry review](homepage-call-request-review.md) records the preceding source audit and live calendar-duration change.

## Validation

| Check | Result |
| --- | --- |
| Production build | `npm run build` passed, including application/server TypeScript, prerender, demo/blog boundaries, 24 SEO checks and marketing entry verification. Build retains large-chunk advisories. |
| Browser flow | Eight Playwright inquiry scenarios passed against built `/`: four callback viewport/motion variants, minimal phone-only callback, two simulated bookings and blocked-calendar recovery. |
| First viewport | Primary action visible at 1440 × 900, 1280 × 720, 390 × 844 and 320 × 568. All three choices visible at 390 × 844. No horizontal page overflow. Internal overlay scrolling keeps fields and submit reachable at small heights. |
| Production navigation | Desktop and mobile checks passed for all six main navigation destinations and return home, direct `/#lead-package` loading, browser Back, header clearance and absence of hydration/runtime errors. |
| Server rendering | Hero, all three contact choices and direct phone link are present with JavaScript disabled. Interactive actions become available after hydration. |
| Modal and form | Focus containment/restoration, Escape, background scroll lock, nonzero scroll restoration, draft preservation, validation, duplicate guard, failure/HTML/HTTP error handling, stable retry identifier and confirmed simulated success passed. |
| Accessibility | Zero axe violations in the scoped header, hero and modal states. Axe left color contrast items for manual review; this is not a complete accessibility certification or a test of the live third-party calendar. Automated keyboard interaction passed. |
| Scrollbar geometry | Layout remained stable in the tested Chrome environment. Native and explicitly styled scrollbars both measured 0px of reserved gutter, so the added non-overlay scrollbar scenario reports pending instead of claiming a Windows result. |
| Contact endpoint | All 13 contact regression tests passed using a simulated delivery provider. |
| Code | Targeted ESLint, hero policy/composition checks, SEO runtime checks and `git diff --check` passed. |
| Visual inspection | Desktop and mobile production screenshots inspected with web fonts loaded. Screenshots block the unrelated chat widget and API traffic; no submissions were made. |

[Machine-readable browser results](review/homepage-promotion/browser-results.json) · [Browser test source](../scripts/test-purchase-inquiry-browser.mjs)

[Desktop homepage](review/homepage-promotion/home-desktop.png) · [Mobile homepage](review/homepage-promotion/home-mobile.png) · [Desktop contact overlay](review/homepage-promotion/contact-desktop.png) · [Mobile contact overlay](review/homepage-promotion/contact-mobile.png)

All callback responses and calendar confirmation events in this run were simulated. A shorter browser viewport simulated keyboard space; it was not a physical phone test. Real inbox delivery, a completed calendar reservation/invitation, VoiceOver, physical phone/keyboard use, manual contrast review, reserved-scrollbar platform verification and prospective-user observation remain pending. No conversion improvement is claimed.

## Commit message

`Restore the hero and keep prominent contact options in the booking popup`
