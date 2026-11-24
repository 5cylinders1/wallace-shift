# LP Construction: owner questions and answers

First round: 2026-11-24 (the owner's answers, passed on by Matthew). Each
question shows the answer so far and what's still needed. When an open item is
answered, fill it in, update its status here, and copy the fact into
`docs/demos/lp-construction.md`. Anything without an answer stays off the site.

## Status

| # | Topic | Status |
| --- | --- | --- |
| 1 | Who hires him | Answered |
| 2 | Which customers he wants more of | Answered |
| 3 | Which job he wants more of | Answered |
| 4 | Service area | Answered (confirm center and ZIP list) |
| 5 | Smallest job | Answered |
| 6 | Past invoices | **Open** |
| 7 | Rate card | **Open** |
| 8 | What changes the price | Answered |
| 9 | Caulk, fill and paint | Answered |
| 10 | Estimate and travel fees | Answered |
| 11 | Original photos and video | **Open** (after he signs; Instagram copies in use) |
| 12 | Instagram photos are his own | Answered |
| 13 | Google profile and reviews | Answered |
| 14 | Legal name and years in business | **Open** |
| 15 | License and insurance | Partial |
| 16 | Where requests go | Partial |
| 17 | Spanish | Answered |
| 18 | First questions and lost jobs | **Open** |

Answered 11 · Partial 2 · Open 5

## Who and where

**1. Who hires you today: builders, homeowners, or both? Roughly what split?**
Answer: Both. No split given.

**2. Which do you want more of next year?**
Answer: More customers of any kind.

**3. Which job do you want more of: accent walls and wall paneling, or
staircases?**
Answer: More jobs of any kind; no preference.

**4. Where will you drive for a job?**
Answer: About a 45-minute drive from Kansas City, MO, so both states.
Still needed: confirm the center is downtown Kansas City, MO (not his shop),
then his OK on the ZIP list the 45-minute area produces: 133 ZIPs within 45
minutes and 23 more up to 55 ("call or text to confirm") in
`src/demos/lp-construction/serviceAreaZips.ts`.

**5. What's the smallest job worth the trip?**
Answer: $500.

## Pricing

**6. Can you share 3 to 5 past estimates or invoices?**
Answer: Not right now.
Still needed: the invoices, customer names blacked out.

**7. If not, what would you usually charge, as a low-to-high range?**
Answer: No answer yet.
Still needed: the table below. Until it's filled in, the site shows no prices.

| Work | Unit | Low | High | Material included? |
| --- | --- | --- | --- | --- |
| Baseboard, new | per linear foot | | | |
| Baseboard, tear out and replace | per linear foot | | | |
| Crown, up to about 5 in. | per linear foot | | | |
| Crown, larger or built-up | per linear foot | | | |
| Door casing | per opening, one side | | | |
| Window casing with stool and apron | per window | | | |
| Interior door, prehung | per door | | | |
| Picture-frame molding or wainscoting | per wall or per linear foot | | | |
| Board and batten or grid accent wall | per wall (say 12 ft wide) | | | |
| Slat or fluted wall | per wall | | | |
| Coffered or beam ceiling | per room or per sq ft | | | |
| Stair treads, carpet to wood | per tread | | | |
| Balusters, wood to iron | per baluster | | | |
| Handrail | per linear foot | | | |
| Newel post | each | | | |
| Built-in bookcase or lockers | per linear foot | | | |
| Fireplace mantel or surround | each | | | |

**8. What changes the price most?**
Answer: The cost of materials and the condition of the area. Ceiling height
matters for ceiling work only.

**9. Do you caulk, fill and paint, or does a painter finish it?**
Answer: No painter. He does everything himself.

**10. Do you charge for estimates or travel?**
Answer: No.

## Photos and proof

**11. Send the original photos and videos from your phone.**
Answer: Not now. He'll send them if he becomes a client.
Still needed: the originals, after he signs. The demo already uses 15 copies
of his Instagram photos; Matthew is getting his OK (2026-11-24).

**12. Are all the photos on your Instagram your own jobs?**
Answer: Yes.

**13. Google Business Profile? Reviews? Would past clients write one?**
Answer: No profile and no reviews anywhere. Yes, past clients would write one.
Still needed: nothing from him yet. Setting up a Google profile and asking
those clients for reviews is a separate job.

## Running the business

**14. The legal business name, and how many years you've been doing this.**
Answer: No answer yet. (Angi says 10 years.)
Still needed: both.

**15. "Licensed & insured": which license, and who's the insurer?**
Answer: Licensed with Kansas City, MO. He doesn't know the insurer offhand.
Still needed: the license number or a photo of it, and the insurance
certificate. Until then the site repeats only his own bio wording, "Licensed &
Insured".

**16. Where should website requests go? Does 913-717-2787 take texts?**
Answer: Both email and text, but only if it doesn't mean a new phone number or
A2P registration right now.
Still needed: the email address for requests.
Note: a form can't text his phone without a sending number, and US texting from
one requires A2P 10DLC registration. So for now form requests go by email, and a
"Text us" button opens the customer's own Messages app addressed to
913-717-2787. That needs no new number and no registration. Whether his number
takes texts is still unconfirmed.

**17. Should customers be able to send requests in Spanish? Who answers them?**
Answer: Yes. The owner answers them himself.

**18. What do homeowners ask you first? When a job doesn't happen, why not?**
Answer: No answer yet.
Still needed: both.

## Also for him to review

- The Spanish text on the request form and ZIP check (`src/demos/lp-construction/i18n.ts`), written by Claude.
- The service pages' wording (`services` in `src/demos/lp-construction/content.ts`).
- The photo captions on Our work (`gallery` in the same file).
