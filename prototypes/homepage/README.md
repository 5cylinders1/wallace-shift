# Homepage mockups

Three local homepage directions for review, with the proposed changes explained in [PLAN.md](./PLAN.md). Each retains the current Wallace Shift logo, Manrope and Instrument Serif typography, ink and pearl surfaces, azure controls, restrained borders and generous spacing.

From the repository root, with dependencies installed, run:

```sh
npx vite --host 127.0.0.1 --port 5184
```

Open a direction:

* [Offers first](http://localhost:5184/prototypes/homepage/index.html?view=offers)
* [Examples first](http://localhost:5184/prototypes/homepage/index.html?view=examples)
* [Choose by need](http://localhost:5184/prototypes/homepage/index.html?view=needs)

The preview bar switches layouts and shows the reasoning under **About this layout**. The close control hides the bar; **Compare layouts** restores it. Add `&clean=1` to a URL to hide all review controls for an unobstructed capture. Remove that parameter to restore the comparison interface.

The website examples switch between Roofing, Kitchens and Pools. **Watch the example** loads the selected video. The follow up illustration advances with **See the next step** and can restart after its fourth step. FAQs expand independently, and the mobile **Menu** opens navigation.

Review captures are in [review/](./review/). Each direction has desktop and mobile captures, plus opening viewport captures. Local visual review covered 1280 px desktop and 390 px mobile widths. This does not establish physical device behavior or conversion improvement.

These are isolated review mockups. The current homepage and its interactive experience remain intact. The showcase opens that existing homepage in a separate tab; offer links open the local offer pages, while service, approach, pricing and contact links use the existing site routes. The question link opens an email draft. The workflow is illustrative and sends no messages.

No production replacement or deployment is included. Package terms and the selected direction still need to be finalized before production integration, as described in the modification plan.

Proposed commit message: `Add three isolated homepage conversion mockups and modification plan`
