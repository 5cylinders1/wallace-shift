# Homepage hero checks

Scripts for the homepage hero redesign. They run against the dev server (`npm run dev`, default `http://localhost:5173`; set `HERO_PREVIEW_URL` for another port).

- **`capture.mjs <label>`** saves the hero at desktop 1440×900, tablet 1024×768, iPhone 390×664 and Android 360×640. Phone sizes are the visible area after the browser's own bars. For each size it writes:
  - a full-hero capture;
  - a first-screen capture;
  - a blurred "squint test" copy;
  - `layout.json` with each element's position and whether it fits the first screen.

  The Reply365 chat frame is removed from captures because it can't load on localhost. On real phones its launcher sits in the bottom-right corner.
- **`keyboard-check.mjs`** checks:
  - there's one action in the hero;
  - the form heading matches the button;
  - Meet is still reachable inside the form;
  - Escape returns focus to the button;
  - price rows bring their card forward and move focus to it, even twice in a row;
  - the phone first screen fits and keeps clear of the chat corner;
  - "Ask Matthew a question" at the end of the page, and "Need both, or not sure?" under the packages, open the same form. Its heading reads "Ask Matthew a question.", and each opening records its own place in analytics;
  - the showcase and the closing question are separate sections, with the showcase copy clear of the WS.

  Set `AXE_PATH` to a local `axe.min.js` to add axe checks on the hero and the form. It exits non-zero on any failure.
- **`hero-30-day.mjs <launch date> [end date]`** is a read-only GA4 report for after launch. Run it with `node --env-file=.env.local`. By device it shows homepage sessions, form opens, the contact option picked, package rows tapped, and requests sent from the hero.
- **`capture-packages.mjs <label>`** captures both package cards and their checkout panels at desktop, tablet and iPhone sizes.
- **`checkout-check.mjs`** walks the package checkout in a browser with the purchase API mocked, so no email is sent and nothing is saved. It covers Buy now opening the right package, keyboard and Escape, details, a wrong code, the redirect to the client portal, the exact fields sent, a refused request, and axe on the card and the panel. The backend has its own suite: `npm run test:package-checkout`.
- **`review/five-second-test.md`** is the script for testing with five trades owners.

**Before vs after.** `review/before/` holds the hero as it was after the trim and before the redesign. It was captured from a worktree of `origin/main` with the trim applied. `review/after/` holds the redesign. Screenshots stay out of git; the `layout.json` files are kept.
