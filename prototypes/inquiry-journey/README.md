# Inquiry section checks

Scripts for the "The website is the start" section on the homepage (`src/components/ServiceHome/InquiryJourney.tsx`). They run against the dev server (`npm run dev`, default `http://localhost:5173`; set `JOURNEY_PREVIEW_URL` for another port).

- **`measure.mjs <label>`** measures the section at desktop 1440×900, tablet 1024×768, iPhone 390×664 and Android 360×640. For each size it:
  - reads the section's own scroll trigger, so it lands on the same points each time: step 1, step 2, then the end;
  - records the picture frame heights and centres, the step heading tops and type, both connector angles and lengths, the story height, and whether the section is held in place;
  - writes `review/<label>/measurements.json` and a screenshot of each step.

  Set `AXE_PATH` to a local `axe.min.js` to add an axe check of the finished section.
- **`audit.mjs <label>`** lists every block of text in the section. It marks text that is hidden or sits inside a picture, flags text that appears more than once, and writes `review/<label>/audit.json`.
- **`review/explain-back.md`** is the script for testing with five trades owners.

The scroll behaviour has its own regression test, which runs at five sizes with and without reduced motion: `INQUIRY_JOURNEY_ORIGIN=http://localhost:5173 node scripts/test-inquiry-journey-browser.mjs`.

**Before vs after.**
- `review/before/` is the section as it was before the rebuild, measured on the working tree.
- `review/before/audit.json` came from the same audit script run on a worktree of commit `cb99a9b`.
- `review/after/` is the rebuild.
- Screenshots stay out of git. The `.json` files are kept.
