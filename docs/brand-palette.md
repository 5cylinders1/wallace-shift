# Wallace Shift palette

The production site uses pearl, graphite and cool reflected light. The glass logo carries the iridescent color; interface accents are a single azure hue at two lightnesses. Existing media is unchanged.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink` | `#080d12` | Dark page ground; text on azure controls |
| `--color-graphite` | `#121a21` | Raised dark surfaces |
| `--color-pearl` | `#edf1f2` | Light page ground; primary text on dark |
| `--color-silver` | `#c3d0d8` | Secondary text on dark |
| `--color-muted` | `#adbac3` | Small supporting text on dark |
| `--color-muted-on-bone` | `#52616b` | Secondary text on pearl |
| `--color-accent` | `#4fa8ff` | Azure text, focus and controls on dark |
| `--color-accent-hover` | `#7cc4ff` | Hover fill for azure controls |
| `--color-accent-deep` | `#175c99` | Deep azure text, focus and controls on pearl |
| `--color-accent-rgb` | `79 168 255` | Azure gradients/shadows with CSS alpha |
| `--color-accent-deep-rgb` | `23 92 153` | Deep azure gradients/rules with CSS alpha |

Compatibility names remain: `--color-bone` and `--color-soft-white` resolve to pearl; `--color-ember` resolves to azure; `--color-ember-deep` resolves to deep azure; `--color-ember-soft` is azure at 16% opacity. These are aliases for existing components, not additional brand colors.

The accent was a pale ice blue (`#bfd1df` / `#315564`) until it was replaced with this azure on 2026-09-12. Nothing consumes the retired values: the few places that had copied them literally now read the tokens, so the pair can be changed again in one file.

## Pricing level surfaces (mobile)

Below 1024px the three pricing levels stack, each covering the one before it,
so each needs a surface of its own. The ramp runs along the line between pearl
and silver — both existing tokens — in steps of 1.26 contrast: `#edf1f2`,
`#cfd9df`, `#b3c3ce`. The closing card returns to pearl.

A surface that deep carries the card's quieter text below AA, so the two
supporting roles step down with it: `#363c3f`/`#475560` on the second level
and `#2f363b`/`#3d4a54` on the third, with the accent deepening to `#0e4776`
on the third only. `TierTable.css` names these roles (`--tier-body`,
`--tier-quiet`, `--tier-accent`) with the values they replaced as defaults, so
the desktop table is unaffected.

These are literal values in the mobile block of `PricingDeck.css` rather than
new tokens: they exist to separate three adjacent planes in one component, not
to extend the palette. Contrast for every role on its own surface is asserted
in `scripts/verify-pricing-stack.mjs`; the tightest is 4.84:1.

## Surface rules

- On ink or graphite, use pearl/silver text and azure accents. Azure button fills take ink text.
- On pearl, use ink/graphite text and deep-azure accents. Deep-azure button fills take pearl text. The final “unforgettable.” wipe uses this shared deep-azure token.
- Use the secondary text token for the actual surface. Avoid azure text or focus rings on pearl.
- Alpha gradients and shadows are decorative. Do not use them as the sole contrast guarantee behind essential text.
- Keep semantic success/error colors distinct from branding where those states require them.

## Calculated contrast

Ratios use WCAG relative luminance for the solid sRGB token pairs. They do not verify text over animated fog, images, transparency or antialiasing.

| Foreground / background | Contrast |
| --- | ---: |
| Pearl / ink | 17.15:1 |
| Pearl / graphite | 15.45:1 |
| Silver / graphite | 11.15:1 |
| Muted / graphite | 8.86:1 |
| Azure / graphite | 7.01:1 |
| Ink / azure button | 7.78:1 |
| Ink / azure hover button | 10.40:1 |
| Deep azure / pearl | 6.10:1 |
| Pearl / deep azure button | 6.10:1 |
| Muted-on-bone / pearl | 5.63:1 |

Azure on pearl is only 2.20:1 and is intentionally not a text/control pairing. Light interior sections explicitly switch primary buttons and keyboard focus to deep azure. Every pairing above is at least 5.6:1, which is AA at any size and AAA for normal text from 7:1 up; the azure pair sits lower than the ice it replaced (7.01 where ice was 11.21) because a more saturated blue is necessarily darker, and it remains well clear of the 4.5:1 floor. Animated backgrounds still require visual inspection at their brightest states.

## Portfolio preservation

`.water-hero-shell:not(.water-hero-shell--landing)` and `.pit-stop-experiment` restore the original ink, warm bone and orange palette locally. They also define the original orange RGB and hover values, so shared CSS lights preserve their earlier appearance. Production landing mode inherits the new palette. No shader material colors or media files are changed by this palette pass.
