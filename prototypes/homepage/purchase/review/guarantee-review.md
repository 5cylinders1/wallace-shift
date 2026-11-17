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
