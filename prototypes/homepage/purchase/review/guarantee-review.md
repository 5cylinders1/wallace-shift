# Guarantee refinement

Reviewed 17 November 2026. Local purchase prototype only; no deployment or policy activation.

## Design and content

The proposed review period becomes a small custom shield emblem beside the full proposal label. A tonal panel groups the reassurance and draft status. Refund limits remain visible in the three native disclosures. The existing serif, italic treatment, blue accent and disclosure dividers follow the surrounding design.

The policy source is [the existing draft research](../../../../docs/homepage-guarantee-upgrade-research.md), specifically its Wallace Shift baseline and draft terms. This work does not validate the competitor research or introduce a new policy. The clock starts at complete delivery plus written notice, corrections remain optional, and a timely correction request preserves eligibility. Covered amounts remain the first $250 website payment and the setup fee actually paid, capped at $1,500. The copy retains SMS readiness, cost exclusions, ownership limits and data handoff conditions.

## Verification

- Built this prototype explicitly with Vite. The ordinary production build does not include it.
- Targeted TypeScript and ESLint passed; `git diff --check` passed.
- Inspected Chrome screenshots of the built section at 320, 390, 768, 1024 and 1440 pixels, including open disclosures and visible keyboard focus.
- No horizontal overflow within the section at those widths. Disclosure targets are at least 88 pixels high.
- Tab follows disclosure order. Enter opens and Space closes each disclosure while retaining focus. The Matthew email link is keyboard reachable when its disclosure is open.
- Chrome's accessibility tree exposes the named section with its draft-status description and three named disclosures whose expanded states update correctly. The decorative emblem is hidden from that tree.
- Measured text contrast across the expanded section is at least 10.03:1. The focus outline is visible at 2 pixels.
- A temporary 200 percent CSS text-size simulation at 320, 768 and 1440 pixels produced no horizontal overflow. This is not a native browser zoom test.
- Normal and reduced motion preferences both preserve the section's content and controls. No runtime page errors were recorded.
- Source review confirms that the draft label, fee limits, start event, optional remedy and exclusions are consistent with the policy notes. This is an editorial review, not legal approval or representative customer testing.

Actual screen reader sessions and physical device testing were not performed. The inquiry journey files were not edited by this task.

## Still to decide before adoption

Confirm the billing schedule, refund processing deadline and payment treatment, pre delivery cancellation, transition period, export details and ownership/license language in the agreement. The section explicitly remains a proposal until that policy is adopted.

Commit message: `Refine guarantee presentation and clarify proposed refund coverage`

## Shield illumination

Added 17 November 2026. Only the decorative shield treatment changes. The fixed radial blue field behind the SVG scales from 0.68 to 1.2 and changes opacity from 0.12 to 0.85. The shield itself stays crisp and stationary in its layout. ScrollTrigger maps progress from the shield's top entering the viewport bottom to its top reaching 40 pixels below the viewport top, adding the header height only for a fixed or sticky header. Progress is clamped and reversible. The downstream trigger refreshes after the preceding inquiry pin has established its spacing.

The effect updates only transform and opacity when progress changes. It has no repeating animation, dynamic blur, animated dimensions or React state updates. The layer cannot intercept input and is hidden from assistive technology. Reduced motion creates no glow scroll trigger and uses a static 0.8 scale / 0.2 opacity treatment; switching preferences restores the appropriate state through scoped GSAP cleanup.

Verified on the built prototype in Chrome:

- Entry, midpoint and peak at 1440, 768, 390 and 320 pixel widths; scale and opacity match the scroll position.
- Slow forward and reverse scrolling, fast jumps before and past both endpoints, direct `#guarantee` navigation, viewport resizing and a simulated fixed header.
- Zero glow style writes during each stationary measurement. Section height stays constant, with no horizontal overflow; the visible soft edge fits within the panel and remains clear of the copy.
- Runtime reduced-motion preference changes correctly restore the static appearance.
- Desktop trace: zero Layout and Paint events during the measured forward/reverse scroll. Mobile viewport with 4× CPU throttling: zero Layout events; 12 Paint events totaling 13.96ms, maximum 1.9ms. Both traces recorded zero layout shift and a median frame interval of 16.7ms, with no intervals above 34ms in 242 sampled frames each.
- Targeted TypeScript, ESLint and whitespace checks passed. No runtime page errors.

These are desktop Chrome measurements, including a simulated mobile viewport and CPU throttling. A physical phone's GPU and memory performance remain unmeasured. Local evidence: `/private/tmp/glow-{1440,390}-{0,50,100}.png`, `/private/tmp/guarantee-glow-report.json`, and `/private/tmp/glow-trace-{1440,390}.json`.

Commit message: `Add scroll driven blue glow to guarantee shield`
