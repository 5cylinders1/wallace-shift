# Purchase page FAQ review

Implemented and inspected locally on November 17, 2026. This changes only the FAQ in the isolated purchase preview. No deployment or production change was made by this task.

## Design decision

The previous section paired a strong heading with eight identical gray disclosure boxes. It gave questions equal visual emphasis, left a large inactive area beneath the heading, and treated the longest answer as one dense paragraph. It borrowed the page's fonts without using the composition and custom linework visible in the neighboring sections.

The revision uses one editorial composition: a larger Instrument Serif heading, blue italic emphasis, Manrope reading text, the existing pearl/ink/azure palette, and a small geometric conversation drawing. Two visible groups provide scanning landmarks without tabs or filtering. Costs & scope covers the commercial questions; Setup & next steps covers readiness, compatibility and the route to a conversation. Costs are open initially; SMS timing leads the second group. All questions remain independently expandable, so readers can compare answers.

Closed questions sit quietly on the pearl surface. An open answer receives a white reading surface and a blue minus control. The entire question row remains the native disclosure target. The long SMS answer is divided at existing sentence boundaries into three paragraphs. All eight question strings and every answer word are unchanged. No animations, dependencies, prices or promises were added.

The layout becomes one column at 900px. Answer text is 15px with a 1.75 line height, including on phones. The mobile section is consequently taller: at 390px the original closed section was about 796px high, the revised closed section is 1108px, and the default state with costs visible is 1261px. At 1440px the revised closed section is 752px versus 764px before; the new default state is 857px. This is a deliberate reading and visibility tradeoff, not evidence of better conversion.

## Content evidence and hypotheses

Primary commercial source: [contractorOffers.ts](../../../../../src/content/contractorOffers.ts). The [existing purchase evidence](../../../../../docs/homepage-purchase-evidence.md) helps locate the underlying source and documents unresolved terms. The FAQ's pre-edit text is preserved in [before-measurements.json](before-measurements.json).

| Existing question | Uncertainty resolved | Source and boundary |
| --- | --- | --- |
| What will I pay beyond the package price? | Total cost and continuing charges | Offer source lines 27 and 60–64: domain/paid services for the website; hosting/software/message usage for the lead page. |
| Can I choose by monthly versus a single payment? | Whether the offers are payment plans for the same service | Offer source lines 19–28 and 50–61: different deliverables, costs and responsibilities. |
| Is a CRM included? | Wallace Shift's agreement/invoice portal versus software to manage the buyer's customers | Offer source lines 27, 60 and 65; purchase evidence's portal/source assessment. Custom CRM work is separate. |
| What does basic SEO cover? | Foundational setup versus ongoing marketing | Offer source lines 24, 27 and 31: titles, descriptions, headings and readable service information; no ranking guarantees or ongoing campaign. |
| Can text messaging start straight away? | Sender approval, launch timing, consent, fees and scope | [Purchase README](../../README.md), SMS disclosure notes around lines 95–101. Existing wording distinguishes local-number A2P registration and toll-free verification, timing outside Wallace Shift's control, and agreed changes to email. Provider policy was not newly audited in this visual task. |
| Can you connect my existing tools? | Compatibility and included integration scope | Offer source lines 56–61 and 66: compatibility review, one workflow, and separately scoped connections/management. |
| What if I need neither package? | Freedom to decline and discuss a different scope | Purchase evidence's recommendation and comparison conclusion: no need to force a package selection. |
| Can I ask questions before choosing? | Whether contact creates a purchase obligation | Offer source lines 28, 35, 61 and 68: ask before deciding; an inquiry is not a purchase. |

No verbatim prospect questions, inquiry export, interview transcripts or observed FAQ usage were found in the task-relevant repository sources. A recorded owner anecdote about a business already at capacity is not a customer transcript or proof of FAQ priorities. The grouping, order and initially open cost answer are design hypotheses, informed by the offer boundaries and the user's requested comprehension tasks. They are not presented as the most frequent customer questions.

## Before and after captures

All captures use the local preview at 1440px desktop or 390px mobile, with loaded fonts and reduced motion. The default revised state shows costs; the closed and single-answer captures allow like-for-like state comparisons. Context captures include the adjacent section boundary. The original context captures were corrected by rendering the saved pre-edit FAQ implementation through a temporary local module, which was removed afterward.

| State | Before desktop | After desktop | Before mobile | After mobile |
| --- | --- | --- | --- | --- |
| Default | [Before](before-desktop-closed.png) | [After](after-desktop-default.png) | [Before](before-mobile-closed.png) | [After](after-mobile-default.png) |
| All closed | [Before](before-desktop-closed.png) | [After](after-desktop-closed.png) | [Before](before-mobile-closed.png) | [After](after-mobile-closed.png) |
| CRM answer | [Before](before-desktop-short.png) | [After](after-desktop-short.png) | [Before](before-mobile-short.png) | [After](after-mobile-short.png) |
| SMS answer | [Before](before-desktop-long.png) | [After](after-desktop-long.png) | [Before](before-mobile-long.png) | [After](after-mobile-long.png) |
| In page context | [Before](before-desktop-context.png) | [After](after-desktop-context.png) | [Before](before-mobile-context.png) | [After](after-mobile-context.png) |

## Technical checks

| Check | Result |
| --- | --- |
| Targeted ESLint, TypeScript with Vite declarations, and production build of the actual preview HTML entry | Passed. Build output was isolated in `/private/tmp/wallace-faq-build`. The production app's build alone would not cover this preview entry. |
| Responsive layout | Passed at 320, 390, 768, 900, 901, 1024, 1440 and 1920px with default and all-expanded states: no page overflow, no FAQ content outside its section, no browser errors. Separate fresh 720px reflow also passed. |
| axe WCAG 2/2.1/2.2 A/AA checks | 16 checks, zero violations and zero incomplete checks, covering the two states at all eight widths. Includes automated text contrast checks. |
| Keyboard | All eight disclosures open with Enter and close with Space. Tab follows the visual column order. Focus stays on the trigger, with a visible 2px deep-blue outline. [Focus capture](keyboard-focus.png). |
| Native accessibility exposure | Chromium accessibility trees expose all eight disclosure names and the correct expanded/collapsed state. Closed answers are absent from the tree. Native Mac browser accessibility inspection also exposed the expanded SMS answer and its three paragraphs. This does not substitute for spoken-output validation. |
| Motion | No FAQ animations in either normal or reduced-motion mode. |
| Zoom/reflow | The FAQ remains within a 1440px viewport under 200% CSS page-zoom emulation with costs, CRM and SMS answers open; no clipped FAQ text. The page as a whole overflows because of the existing `#work .ij-team` inquiry illustration. A fresh 720 CSS-pixel reflow check has no overflow. This emulation does not establish native browser zoom behavior. [Zoom capture](zoom-200-emulated.png), [720px capture](reflow-720.png), [measurements](zoom-validation.json). |
| Content and scope | Automated comparison confirms all eight questions and answer text are unchanged, apart from paragraph boundaries. Immediate neighbor markup, size and colors match the baseline. Integration comparison against the saved main file confirms only the FAQ extraction/import changed. |
| Design detector | Impeccable returned no findings for `Questions.tsx`. |

Detailed results: [validation.json](validation.json), [before measurements](before-measurements.json), [after measurements](after-measurements.json).

## Design review and user observations

An independent AI review inspected desktop, mobile, expanded answers and page context. It approved the continuity, distinctiveness and reading treatment, and identified the context-capture offset error that was corrected. It found no blocking visual or source-level semantic issue. This is design judgment, not a human usability study.

VoiceOver spoken-output verification remains **pending**. The native VoiceOver utility and caption-panel configuration were inspected, and VoiceOver was enabled for an attempt using Apple's documented controls. The computer tool could not attach to VoiceOver's output panel and timed out; no speech announcement is claimed as verified. VoiceOver was returned to off afterward. [Apple VoiceOver controls](https://support.apple.com/en-mide/guide/voiceover/vo2682/mac).

Actual prospective-customer observations: **none**. No participants were available, no outreach was sent, and no results were simulated. The following small comparison remains to be conducted using counterbalanced before/after versions, on participants' usual devices, without explaining the offers first:

| Neutral task | Correct understanding | Record |
| --- | --- | --- |
| “You choose the lead page. What might you still pay after the setup?” | Hosting, software and email/SMS usage can recur; scope and costs are identified before committing. | First attempted question, time to find the answer, explanation in their own words, any wrong assumption. |
| “Would either package let you manage your own customers in a CRM?” | The included portal is for Wallace Shift agreements/invoices; a customer CRM is not included and custom work is separate. | Whether the person distinguishes the portal from a CRM without coaching. |
| “Your workflow uses automated text messages. What could affect when it starts?” | Required sender registration/verification and review can delay launch; timing is outside Wallace Shift's control. | Whether approval is identified before promising an immediate SMS launch. |

Correct explanation and fewer unsuccessful attempts would support the hierarchy. A preference for the visual design alone would not establish comprehension or conversion improvement. Native browser zoom, a completed VoiceOver session, physical-device review and prospective-customer comparison remain outstanding.

Commit message: `style: redesign purchase FAQ with clearer hierarchy and reading states`
