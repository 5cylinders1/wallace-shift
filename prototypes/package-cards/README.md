# Package card checks

Scripts for the two stacked package cards under the homepage hero. They run against the dev server (`npm run dev`, default `http://localhost:5173`; set `CARDS_PREVIEW_URL` for another port).

- **`measure.mjs <label>`** measures both cards at desktop 1440, tablet 1024, iPhone 390 and Android 360. For each card it records:
  - the card's height;
  - where each row starts, from the card's top, so the two cards can be compared row by row;
  - words on the card;
  - how often each number appears;
  - any link or button cut off.

  It writes `review/<label>/measurements.json` and a screenshot of each card.
- **`check-figures.mjs`** compares every price and count on the cards and in the comparison table with `src/content/packagePurchase.ts`. It fails on anything the package terms don't say. Run it with `SELF_TEST=1` to plant a wrong price and page count and see it fail.
- **`swap-check.mjs`** switches the cards back and forth at three sizes. It checks that the stack keeps its height, the back card stays unclickable, and the swap animation clears its styles.
- **`review/card-test.md`** is the 10-second card test for five trades owners.

The homepage keyboard and accessibility checks in `prototypes/home-hero/` (`keyboard-check.mjs`, `checkout-check.mjs`) cover the cards' buttons and axe.

**Before vs after.** `review/before/` is the cards before the rebuild; `review/after/` is the rebuild. Screenshots stay out of git; the `.json` files are kept.
