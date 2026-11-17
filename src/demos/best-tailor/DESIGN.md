---
name: Sue’s Tailor Shop demo
description: A feminine neighborhood boutique for dress alterations and personal fittings.
colors:
  burgundy: "#4b242b"
  cream: "#f7f3eb"
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

This record applies only to Sue’s Tailor Shop at `/demo/sues-tailor`. The prior `/demo/best-tailor` alias and internal source and asset paths remain available. It captures the user-approved direction and the implemented CSS and React behavior, without changing the Wallace Shift design system. The current direction is feminine and focused on dresses, with the warmth of a neighborhood boutique. The composition is led by code: a large serif promise and fitting request action sit beside three illustrative dress stages. Wedding dress copy invites discussion of a particular garment; the imagery does not establish custom gown services or actual client results.

**Key Characteristics:**

- Three illustrative dress-fitting stages and a fine needle-and-thread mark.
- Warm ivory, soft blush surfaces, deep burgundy, and restrained copper-brown accents.
- Expressive serif headings paired with small, calm sans-serif utility text.
- Open sections and ruled service rows, with subtle motion tied to interaction.

## Colors

Burgundy anchors the identity, fitting request buttons, and the full-width review section. Cream is the principal page surface and the light text color on dark areas. Ink and muted tones separate primary reading from supporting copy; line defines dividers. Blush surface gives the welcome line, process, and footer a gentle change in tone; warm surface grounds the appointment preview. Warm emphasis distinguishes selected heading phrases on the ivory hero. Focus is reserved for visible keyboard outlines on light surfaces; focus-on-dark serves the review section and mobile contact strip.

## Typography

Libre Caslon Display is self-hosted for headings, the wordmark, review summaries, and process numbers. DM Sans is self-hosted for body text and controls, with regular and medium files. The display and headline values above are desktop defaults; mobile hero type uses `clamp(56px, 13.5vw, 76px)` with a 0.99 line height. Supporting copy stays narrow: introduction paragraphs are capped at 360px and hero copy at 370px.

## Layout

The shared desktop container is `min(1248px, 100% - 112px)`. Gutters reduce to 40px at 1100px and 22px at 600px. Services and process use a two-column `.9fr 1.1fr` arrangement; the visit section uses `1.2fr .8fr`. These sections stack at 600px. Three review columns become three stacked entries at the same breakpoint.

The hero uses two equal columns with a 7% gap: text at left, the portrait dress sequence at right. Each dress frame has a 640:1086 aspect ratio and is capped at 330px wide on desktop, 360px on wide screens, and 320px on phones. At 600px, the hero stacks text above the dress sequence.

Navigation becomes a dropdown at 850px. At 600px, fixed fitting-request and call actions appear above the device safe area, with matching footer space. The appointment preview has an introductory column and a form column, stacking at 850px; its paired date inputs stack at 600px.

## Elevation & Depth

Most surfaces are flat, separated by tonal changes and thin rules. Dress photography sits in its own portrait frame beside the hero copy; it does not need a dark text overlay. Shadows appear only beneath the mobile navigation dropdown (`0 18px 24px #281b1b12`) and above the fixed mobile actions (`0 -4px 16px #2a16121a`).

## Shapes

Controls and panels have square corners. Buttons are simple rectangular blocks. The address panel uses an inset second outline to suggest a printed shop card. The needle-and-thread line art provides the organic gesture; no pill or rounded-card vocabulary is introduced.

## Components

- **Primary actions:** burgundy fitting-request buttons over ivory link to the local form; direct call actions remain available. Desktop buttons are at least 54px high. Hover changes the background and shifts the trailing arrow 4px. Visible focus uses an offset outline, with cream focus on dark reviews and the mobile strip; the fixed strip uses a -6px outline offset to keep focus inside each link.
- **Navigation:** understated text links and a filled fitting-request action. The mobile menu closes on link selection, outside pointer interaction, or Escape; Escape returns focus to the menu button.
- **Dress story:** three native pressed-state buttons select the first fitting, small details, or final try-on. Each state has one visible portrait image and a polite live text description. The imagery remains labelled illustrative.
- **Services:** four ruled accordion rows, with only one open at a time and the first open initially. A plus rotates 45 degrees when expanded. Native buttons expose expanded state and control a labelled region with a fitting tip.
- **Reviews:** three attributed review summaries per page, with explicit previous/next controls, disabled end states, and a polite live region. The control does not auto-advance. Summaries are labelled and link to the Google originals; the aggregate rating is displayed with its observation date.
- **Appointment preview:** a compact form with square cream fields, native contact radios and selects, 16px input text, optional dates and notes, inline errors, and a focused error summary. A local review state explicitly says nothing has been sent or booked, with call, edit, and clear actions. Field focus uses a 2px outline with 3px offset; error text and borders use warm dark red.
- **Visit panel:** Sue’s verified address, directions link, listed hours, and appointment guidance within a double outline. The fixed mobile strip provides Request a fitting and Call Sue within a navigation landmark named “Quick contact.”
- **Motion:** dress stages crossfade over 0.7 seconds using `cubic-bezier(.16,1,.3,1)`, settling from scale 1.015 to 1. The active stage underline changes over 0.3 seconds. The sequence never auto-advances. Other control transitions take 0.2 seconds; the accordion icon takes 0.25 seconds. Reduced motion disables animation, transitions, and smooth scrolling.

## Do's and Don'ts

- **Do** preserve the feminine dress-focused boutique direction, serif and sans-serif pairing, square controls, and fine tailoring mark.
- **Do** keep the fitting request, call action, and appointment-only language easy to find on narrow screens.
- **Do** preserve the illustrative image disclosure and the user-requested absence of visible Wallace Shift attribution.
- **Don't** represent the generated dress stages as the shop's actual work or promise custom gown creation.
- **Don't** imply the local preview sends an appointment request or reserves a fitting.
- **Don't** turn the review selector into an automatic carousel or add motion that ignores reduced-motion preferences.
