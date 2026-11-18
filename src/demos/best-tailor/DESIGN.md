---
name: Sue’s Tailor Shop demo
description: A feminine neighborhood boutique for dress alterations and personal fittings.
colors:
  burgundy: "#4b242b"
  cream: "#f7f3eb"
  cinematic-backdrop: "#20191a"
  ink: "#3e3030"
  muted: "#74625c"
  line: "#d9cec1"
  warm-surface: "#eee5d7"
  blush-surface: "#eee3dd"
  warm-emphasis: "#8b5c4b"
  light-emphasis: "#ead5b9"
  focus: "#a35839"
  focus-on-dark: "#f7f3eb"
typography:
  display:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(60px, 6.5vw, 96px)"
    fontWeight: 400
    lineHeight: 0.99
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(44px, 4.4vw, 64px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  square: "0px"
spacing:
  compact: "8px"
  control: "18px"
  mobile-gutter: "22px"
  section-mobile: "65px"
  section-desktop: "110px"
components:
  button-cream:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.burgundy}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "18px 25px"
  button-burgundy:
    backgroundColor: "{colors.burgundy}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "18px 25px"
---

# Design System: Sue’s Tailor Shop demo

## Overview

**Creative North Star: "A personal dress fitting"**

This record applies only to Sue’s Tailor Shop at `/demo/sues-tailor`. The prior `/demo/best-tailor` alias and internal source and asset paths remain available. It captures the established feminine boutique direction without changing the Wallace Shift design system. **The five-cutout hero proposal is rejected and obsolete:** the user found it insufficiently cinematic. The replacement uses completed original landscape and portrait garment films, converted to scroll-controlled canvas image sequences. Source contact sheets show continuous cloth bending and unfolding with a completed gown at the endpoint. Local browser results and their limits are recorded in [the final verification](../../../docs/review/sues-tailor/cinematic/README.md); technical checks do not imply user acceptance. Wedding dress copy invites discussion of a particular garment; the imagery does not establish custom gown services or actual client results.

**Key Characteristics:**

- A continuous cinematic garment sequence accompanies short editorial copy. The fine needle-and-thread mark remains part of the boutique identity.
- A dark plum hero with amber light and cream type leads into warm ivory, soft blush surfaces, deep burgundy, and restrained copper-brown accents.
- Expressive serif headings paired with small, calm sans-serif utility text.
- Open sections and ruled service rows, with subtle motion tied to interaction.

## Colors

Burgundy anchors the identity, fitting request buttons outside the hero, and the full-width review section. The cinematic hero uses a warm dark plum ground, amber lighting within the rendered imagery, and cream headings and fitting action. Cream is the principal surface for the rest of the page. Ink and muted tones separate primary reading from supporting copy; line defines dividers. Blush surface gives the welcome line, process, and footer a gentle change in tone; warm surface grounds the appointment preview. Warm emphasis distinguishes selected phrases on light surfaces. Focus is reserved for visible keyboard outlines on light surfaces; focus-on-dark serves the dark hero, review section, and mobile contact strip.

## Typography

Libre Caslon Display is self-hosted for headings, the wordmark, review summaries, and process numbers. DM Sans is self-hosted for body text and controls, with regular and medium files. The display and headline values above are general page tokens; the cinematic hero uses scoped type sizing, with compact centered headings on portrait screens. Supporting copy stays narrow so the garment remains the main visual subject.

## Layout

The shared desktop container is `min(1248px, 100% - 112px)`. Gutters reduce to 40px at 1100px and 22px at 600px. Services and process use a two-column `.9fr 1.1fr` arrangement; the visit section uses `1.2fr .8fr`. These sections stack at 600px. Three review columns become three stacked entries at the same breakpoint.

The hero is one pinned editorial stage with an original cinematic gown sequence and short supporting typography. The completed landscape delivery has 180 frames at 1280 × 720; a separately generated native portrait delivery has 180 frames at 720 × 1280 and is selected at 600px and below. Each 10-second source is trimmed to its first 7.5 seconds before reversal and extraction at 24 fps, preserving the finished gown at the assembly endpoint. The camera stays locked, with no added desktop zoom. Mobile must reserve room for the fitting action; reduced motion must present a finished-garment still without the long pin. Local validation of those behaviors is recorded in [the final verification](../../../docs/review/sues-tailor/cinematic/README.md). The opening portrait composition slightly clips outer fabric; the completed gown fits. The former five-layer composition is not an accepted layout reference.

Navigation becomes a dropdown at 850px. At 600px, fixed fitting-request and call actions appear above the device safe area, with matching footer space. The appointment preview has an introductory column and a form column, stacking at 850px; its paired date inputs stack at 600px.

## Elevation & Depth

Most surfaces are flat, separated by tonal changes and thin rules. Depth in the garment story comes from the continuous rendered imagery: cloth folds, bending panels, amber highlights, and shadows. The imagery is generated illustration; it is not evidence of a physical cloth simulation or Sue’s actual work. Final visual acceptance remains with the user. Shadows on the existing interface appear beneath the mobile navigation dropdown (`0 18px 24px #281b1b12`) and above the fixed mobile actions (`0 -4px 16px #2a16121a`).

## Shapes

Controls and panels have square corners. Buttons are simple rectangular blocks. The address panel uses an inset second outline to suggest a printed shop card. The needle-and-thread line art provides the organic gesture; no pill or rounded-card vocabulary is introduced.

## Components

- **Primary actions:** the cream fitting-request button on the dark plum hero and burgundy buttons on ivory sections link to the local form; direct call actions remain available. Desktop buttons are at least 54px high. Hover changes the background and shifts the trailing arrow 4px. Visible focus uses an offset outline, with cream focus on dark surfaces; the fixed strip uses a -6px outline offset to keep focus inside each link.
- **Navigation:** understated text links and a filled fitting-request action. The mobile menu closes on link selection, outside pointer interaction, or Escape; Escape returns focus to the menu button.
- **Dress story:** native scrolling scrubs the 180-frame canvas sequence, and reverse scrolling reverses the same construction. Landscape and native portrait films are complete and source endpoints have been inspected. The former five-layer skirt/bodice/strap transform approach is rejected. See [the final verification](../../../docs/review/sues-tailor/cinematic/README.md) for local browser results and their limits; technical checks do not imply user acceptance. The imagery must remain labelled illustrative.
- **Services:** four ruled accordion rows, with only one open at a time and the first open initially. A plus rotates 45 degrees when expanded. Native buttons expose expanded state and control a labelled region with a fitting tip.
- **Reviews:** three attributed review summaries per page, with explicit previous/next controls, disabled end states, and a polite live region. The control does not auto-advance. Summaries are labelled and link to the Google originals; the aggregate rating is displayed with its observation date.
- **Appointment preview:** a compact form with square cream fields, native contact radios and selects, 16px input text, optional dates and notes, inline errors, and a focused error summary. A local review state explicitly says nothing has been sent or booked, with call, edit, and clear actions. Field focus uses a 2px outline with 3px offset; error text and borders use warm dark red.
- **Visit panel:** Sue’s verified address, directions link, listed hours, and appointment guidance within a double outline. The fixed mobile strip provides Request a fitting and Call Sue within a navigation landmark named “Quick contact.”
- **Motion:** the garment sequence follows native scroll position rather than autonomous playback or still-image crossfades. Canvas frame delivery is implemented; [the final verification](../../../docs/review/sues-tailor/cinematic/README.md) records local scrub, loading, responsiveness, and performance checks. Physical-phone performance and visual parity with the reference are not established. Reduced motion must use a static finished garment without an extended pin. Existing control transitions remain disabled under reduced motion.

## Do's and Don'ts

- **Do** preserve the feminine dress-focused boutique direction, serif and sans-serif pairing, square controls, and fine tailoring mark.
- **Do** keep the fitting request, call action, and appointment-only language easy to find on narrow screens.
- **Do** preserve the illustrative image disclosure and the user-requested absence of visible Wallace Shift attribution.
- **Do** compare the replacement visually against the verified cinematic reference and distinguish technical checks from visual acceptance.
- **Don't** reuse the rejected cutout proposal or its browser captures as the accepted design direction.
- **Don't** represent the generated dress stages as the shop's actual work or promise custom gown creation.
- **Don't** imply the local preview sends an appointment request or reserves a fitting.
- **Don't** turn the review selector into an automatic carousel or add motion that ignores reduced-motion preferences.
