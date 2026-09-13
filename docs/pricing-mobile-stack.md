# Mobile pricing: two slideshows

Below 1024px the pricing page is three areas — Websites, Web Apps, Automation
— each holding three packages. Above 1024px nothing changes: the horizontal
deck, its scroll snapping, its height matching and its settle pass are
untouched, the engagement areas keep their row layout, and every rule this
adds lives inside the `max-width: 1023px` block.

## The tabs: a layered stack

The three areas are layered, each above the one before it, rather than laid
end to end. Only the active one is exposed; the others wait off stage to the
right. Choosing an area to the right brings it in from that edge, travelling
left across what is showing. Choosing one to the left sends everything above
it — including whatever sits between — back out to the same edge, uncovering
it. One edge serves both directions; the stack's own order is what makes them
read as opposites.

The two motions are sequenced rather than run together. Nothing scrolls and
no height changes while the slide runs, so the area being left stays exactly
where the visitor left it; only once the slide has landed does the page move
to the top of the new area's first package.

That second move is instant and invisible, because the arriving area is held
to the frame for the length of its slide at the exact position the page is
about to take — its own top relative to where the page lands. Without that
hold it would slide in showing whatever happens to sit at the visitor's
current depth, and the scroll afterwards would be a visible lurch. With it,
the only motion on screen is the slide, and it ends with the new area at its
beginning.

The earlier version did the opposite of all of this: it scrolled the page
during the slide, and held the *outgoing* area to the frame top — which
snapped that area to its own beginning, under the incoming one. Three things
moved at once.

## The packages: a vertical stack

Inside an area, each package is at least the height of the frame beneath the
bar. It holds once its own end reaches the bottom of that frame, and the next
package rides up over it.

The hold offset is `frame - the package's own height`, measured per package —
no CSS length knows a package's height, so it is read from the DOM and written
back as `--pricing-package-height`. For anything taller than the frame that
offset is negative, which holds the package with its head above the bar. That
is the trade: a long scope list can be read all the way to its end before the
package stops, at the cost of its name and price passing above the bar while
it is held. Holding at the bar instead keeps the head visible but puts the
tail permanently below the fold. `min()` keeps a package shorter than the
frame at the bar rather than pushing it down the screen.

Each level has a surface of its own — see "Three surfaces" below — so a
package arriving over another reads as a new plane rather than more of the
same one.

A package holds only while something is coming up behind it to cover it.
The website area ends with the care band, which is the maintenance package
that sits under the third level, so all three website packages hold. An
engagement area ends with a one-line closing note, which is not a card and
cannot cover anything, so its last package leaves with the page.

For the hold to reach that far the box bounding it has to reach that far too.
A sticky box is bounded by its containing block, and while that block ended at
the last package there was no room left to hold into: the last package never
held and nothing ever rode over it. Both wrappers between the packages and the
area's section — the packages' own grid and the area's column — are collapsed
with `display: contents`, which hands the packages the section itself, and the
section continues through the closing card. Each child that column used to
hold now carries one itself. The care band's own column is a different element
and is left alone.

That same bound is what stops a released package reappearing from under the
card that covered it: the packages and the closing card now end at the same
edge, so a package can never be pushed past the thing covering it.

The care band fills the frame like a package does, so it can cover the third
website package completely rather than passing over it as a strip.

## Three surfaces

The three levels sit on their own surfaces, each a step further from the page
ground along the line between pearl and silver:

| Level | Surface | Body text | Supporting text | Accent |
| --- | --- | --- | --- | --- |
| 1 | `#edf1f2` (pearl) | `#3d4143` | `#52616b` | `#175c99` |
| 2 | `#cfd9df` | `#363c3f` | `#475560` | `#175c99` |
| 3 | `#b3c3ce` | `#2f363b` | `#3d4a54` | `#0e4776` |
| closing card | `#edf1f2` (pearl) | `#3d4143` | `#52616b` | `#175c99` |

The steps are even in contrast rather than even in hex: 1.26 between each
surface and the next. The first attempt stepped about 1.10 and read as one
surface rather than three — a step has to be big enough to see across the hard
edge where one package covers another. The closing card breaks away at 1.59,
arriving *lighter* than the level it covers, which is what reads as the stack
being over.

A surface that deep carries the card's quieter text below AA, so the two
supporting roles step down with it. `TierTable.css` names the card's three
text roles — `--tier-body`, `--tier-quiet`, `--tier-accent` — and each default
is the exact value it replaced, so the desktop table computes identically and
only the mobile levels ever restate one. Ink and the card's structure do not
move; body stays darker than quiet on every surface.

How far the ramp can run is set by contrast, not by taste. Every role is
checked against its own level's surface in `verify-pricing-stack.mjs`, which
resolves the tokens from `index.css` rather than repeating them — the tightest
pairing is 4.84:1, and the whole thing recomputes if a surface or the accent
moves.

## Three traps, each of which broke a whole mechanism

**`bottom: 0` is not "hold at the bottom."** It pins the bottom edge to the
bottom of the frame, so on load it drags every package taller than the frame
upward until its end meets that edge. An earlier version used it and all three
collapsed onto each other.

**`overflow-x: hidden` would break every hold.** The layered areas park off to
the right, which needs clipping — but `hidden` makes the track a scroll
container, and every package inside would then stick to the track rather than
to the viewport. `clip` does the same job without creating one.

**The layout mode cannot be read from anything transient.** It is taken from
the track's `display`, which only the stylesheet sets. Overflow is wrong: the
layered areas park off to the right, so `scrollWidth > clientWidth` is true
there too, and every mobile tab took the deck's path. A panel's `position` is
also wrong: an area held to the frame mid-slide is `fixed` rather than
`absolute`, so that detector called the layout a deck for exactly as long as a
slide lasted — which meant no slide ever ended.

A fourth, smaller one: sticky is a form of relative positioning, so a held
package reports its *stuck* position from a bounding rect and from `offsetTop`
alike. A landing measured from either drops the visitor into the middle of a
package that happened to be holding. The read neutralises the hold first.

A fifth: `scrollTo({ behavior: 'auto' })` is not a jump. `auto` defers to CSS,
and the page sets `scroll-behavior: smooth`, so the landing glided instead of
cutting. The area being left is frozen to the frame for exactly the length of
the slide so that scroll happens behind it; a glide is still travelling when
the freeze lifts, and the area snaps as it is released. The landing asks for
`instant`.

## One component for all three areas

Websites, Web Apps and Automation present through the same `PricingPackage`,
so parity is structural rather than a copy of the markup. The markup and class
names are the website tiers' own, unchanged, so the desktop table renders as
it did.

The four fields the tiers carried and the engagements did not — `category`,
`tagline`, `bestFor`, `scope` — **were drafted by Claude on 2026-09-12 and are
not approved**. They are marked as such in `src/content/pricing.ts`. The
`scope` lines are deliberately near restatements of each item's own approved
`description` and `note`; no warranty, response time, or capability not
already claimed elsewhere on the site appears in them. Every field is optional
and each block simply does not render while its field is absent, so anything
withdrawn in review leaves no empty section behind.

## Verified in the browser

At 400x867, `--pricing-frame-top` 127, so the frame is 740 tall. Three areas
of three packages each, areas absolute and layered, only the active one
visible, the rest off stage at `translateX(100%)`. Every area's column
survives the collapsed wrappers — 400 wide with a 20px gutter on intros,
packages and closing blocks alike. The website packages measure 855, 999 and
939, and each one's hold offset is its own: 12px, -132px, -72px.

Walking the Websites area down. Each package's top and bottom, then the
"Every website includes" strip and the care band:

| scroll | pkg 1 | pkg 2 | pkg 3 | includes | care |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 780…1634 | 1634…2633 | 2633…3572 | 3600 | 3790 |
| 768 | **26…881** | 866…1865 | 1865…2804 | 2832 | 3022 |
| 1200 | **26…881** | 434…1433 | 1433…2372 | 2400 | 2590 |
| 1766 | **26…881** | **-118…881** | 867…1806 | 1834 | 2024 |
| 2705 | **26…881** | **-118…881** | **-58…881** | 895 | 1085 |
| 3455 | **26…881** | **-118…881** | **-58…881** | 145 | 335 |
| 3800 | -111…744 | -255…744 | -195…744 | -200 | -10 |

Every package is scrolled through to its own end before it holds — package 1
holds at 768, by which point all 855px of it have passed — and then holds with
its bottom at the frame's bottom while the next rides over it. The third holds
from 2705 until 3663, by which time the care band has reached the frame top
and covers it completely; it releases at the same edge the card covering it
ends at, so it never re-emerges below it. (The 14px the held figures run over
867 is the entrance offset, which does not animate in a hidden tab.)

Computed styles confirm the rest: the three levels read `rgb(237 241 242)`,
`rgb(207 217 223)` and `rgb(179 195 206)`, with the third level's body and
supporting text at `rgb(47 54 59)` and `rgb(61 74 84)`; all three website
packages are `sticky`, while the third package of Web Apps and of Automation
is `relative`. Level 2 arriving over level 1, and level 3 over level 2, were
both checked by eye with the entrance animations forced on — the edge between
two levels is plainly visible and the text is comfortable on all three.

Tab changes, clicking from partway down each area — Websites at 2500 →
Automation (forward, skipping one), Automation at 2000 → Web Apps (back one),
Web Apps at 1500 → Websites (back one):

| | during the slide | after |
| --- | --- | --- |
| page scroll | unchanged (2500 / 2000 / 1500) | 652.5 every time |
| area being left | unchanged (-1949 / -1449 / -949) | off stage |
| arriving area | held at -102 | released, nothing frozen |

-102 is where the area's top sits once the page is at 652.5, so the release is
silent; 652.5 + 127 is 779.5, which is the new area's first package. Nothing
moves under the slide, and every tab lands on the same mark.

Two things these checks could not cover. The travel itself was not watched:
the browser pane here is hidden, so frames, transitions and entrance
animations are suspended — screenshots catch reveals frozen part-way and
cannot show one package covering another. Geometry and computed styles were
measured directly instead, and the states either side of every slide are
correct. And the desktop layout was not re-verified visually: the pane is
400px wide, so the 1024px breakpoint cannot be reached. Desktop rests on the
media-query scoping, which is asserted, and on the mobile effect's cleanup
clearing every transform, attribute and variable it set when the breakpoint is
crossed.
