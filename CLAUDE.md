# Wallace Shift — Project Instructions

Read this file and `SKILLS.md` completely before changing the project.

## Mission

Build a premium, conversion-focused website for Wallace Shift, a web design, web application, and automation studio serving growing local and small businesses.

Wallace Shift represents the transformation from overlooked to unforgettable. We combine bold design, smart technology, and strategic thinking to shift how customers see, trust, and choose a business.

This site should feel original, expensive, clear, and trustworthy. It must impress design-aware visitors without feeling like a science-fiction product or confusing practical local-business owners.

## Current project state

- The repository root contains the approved Wallace Shift logo assets, hero imagery, and a short WS-in-water video.
- Audit all root-level `.svg`, `.png`, `.jpg`, `.webp`, `.mov`, `.mp4`, and `.webm` files before coding.
- Use the current centered WS-in-water scene. Do not use older corridor, glass-wall, monitor-room, city, monolith, or science-fiction concept assets.
- Preserve all source assets. Copy only the selected production assets into clean paths under `public/`.
- If several water-scene files exist, inspect dimensions, duration, and visible content. Select the latest approved version with:
  - the WS centered horizontally;
  - a smaller, nearly planar silver structure;
  - calm water with fine visible ripples;
  - a broad but naturally distorted reflection;
  - generous dark negative space;
  - no fixed overhead spotlight or cone of light.
- Never redraw, reshape, slim, widen, separate, reconnect, or reinterpret the finalized WS logo.

## Technical direction

Preserve an existing working stack if one is present. If the repository contains only assets and project instructions, initialize a current stable React + Vite project with:

- TypeScript
- GSAP
- `@gsap/react`
- ESLint
- The existing package manager if a lockfile exists; otherwise use npm

Use custom CSS with well-organized variables and responsive rules. Do not add Tailwind unless the existing project already uses it.

Keep the dependency list lean. Do not introduce Three.js, WebGL, Framer Motion, a smooth-scroll library, a carousel library, a second animation framework, or a component kit unless the existing project already depends on it and it is necessary.

Keep most of the page semantic and stateless. Isolate GSAP timelines and pointer interaction inside small components/hooks with proper cleanup through `useGSAP()`.

## Non-negotiable creative direction

The approved direction is a restrained editorial studio site centered on one cinematic identity object.

The hero should take inspiration from the design logic of the Aurel Liquid Hero—full-bleed liquid film, disciplined typography, strong negative space, and restrained motion—but it must not copy its brand, text, code, or proprietary assets.

### Attached Aurel screenshot

The user's initial Claude Code message will include a screenshot of the Aurel Liquid Hero. Treat that attached screenshot as the primary visual reference for the first viewport.

Before coding, inspect the screenshot closely and extract its visual logic:

- Overall page silhouette and viewport composition
- Scale and placement of the central identity object
- Relationship between the media, negative space, and copy
- Typography scale, line length, hierarchy, and alignment
- Header density and placement
- Darkness, contrast, reflection, and lighting restraint
- Placement of secondary information or enquiry elements
- The amount and pacing of motion implied by the still composition

Translate those principles into Wallace Shift using the finalized WS media and approved copy. Do not use the screenshot itself as the website background, do not reproduce Aurel's logo or wording, and do not trace its interface pixel for pixel. The screenshot is the visual-quality target; the root WS imagery/video is the actual brand media.

If the screenshot is unavailable in the Claude conversation, ask the user to attach it before making subjective hero-layout decisions. Repository and asset auditing may continue while waiting.

### The site must be

- Premium but approachable
- Cinematic but not theatrical
- Bold but immediately understandable
- Editorial rather than “tech startup”
- Minimal without feeling empty
- Motion-rich in small, controlled ways
- Designed around the actual WS mark and the idea of a “shift”

### The site must not become

- A science-fiction scene
- A cyberpunk, space, holographic, or neon website
- A generic SaaS landing page
- A glassmorphism template
- A page full of floating rounded cards
- A logo demo with weak sales messaging
- A clone of the HorizonX reference
- An overanimated portfolio experiment

## Visual system

### Color

Use a mostly monochrome system:

- Ink: `#060708`
- Graphite: `#101214`
- Bone: `#F1EFE9`
- Soft white: `#F7F7F4`
- Muted gray: `#9EA3A6`
- Silver: `#D6DADF`

The hero and header begin dark. After the opening brand statement, transition into warm bone sections so the company feels human and trustworthy rather than relentlessly dark or futuristic. Use color sparingly; do not add neon blue or purple gradients.

### Typography

Use one precise modern sans-serif family for navigation, body copy, labels, and most headlines. Add one restrained editorial serif only for short emphasis when it materially improves the composition.

Preferred direction if no brand font exists:

- Sans: Manrope, Geist, or Instrument Sans
- Serif accent: Instrument Serif

Do not use the serif for full paragraphs. Avoid ultra-thin type, excessive all-caps, illegibly wide tracking, and gimmicky outlined text.

### Geometry and surfaces

- Echo the WS logo with disciplined diagonal cuts, offset rules, and directional transitions.
- Prefer sharp or subtly softened corners over large rounded rectangles.
- Use thin dividers, generous spacing, and large editorial type.
- Avoid excessive borders, shadows, pills, translucent cards, and repeated card grids.
- Let typography, rhythm, and the hero media do the visual work.

## Homepage architecture

Build one complete, cohesive homepage. Do not fabricate portfolio projects, testimonials, awards, client logos, revenue figures, conversion lifts, or years of experience.

### 1. Header

- Small finalized WS monogram plus the typeset name `WALLACE SHIFT`
- Anchor links: `Services`, `Approach`, `About`
- Primary action: `Start a project`
- Transparent over the hero at the top
- On scroll, transition to a restrained solid/near-solid header with a subtle divider
- Accessible mobile menu with focus management and keyboard support

### 2. Hero

The hero is the signature experience and should occupy approximately one viewport (`100svh`) with a sensible desktop minimum height.

Media rules:

- Use the approved WS-in-water video as a full-bleed background layer.
- Keep the WS centered. Do not shift the media to the left or right.
- Preserve the source aspect ratio. Never stretch the video.
- Use the matching approved still as the poster and reduced-motion fallback.
- The video starts automatically, remains muted, uses `playsInline`, and loops continuously.
- Do not add a pause at the loop point, a black frame, a fade-out/fade-in, or a visible playback control.
- Do not animate the WS itself in code. The object stays rigid and still.
- Do not add camera motion, zoom, parallax, bobbing, rotation, or perspective movement.

Desktop copy placement:

- Keep the WS visually centered in the frame.
- Place the copy in the dark negative space on the left without covering the WS or its main reflection.
- Keep the copy column compact enough to preserve visual tension and negative space.

Mobile copy placement:

- Keep the WS centered and readable.
- Move the copy above the object or into the safest dark area rather than covering it.
- Use a deliberate crop and gradient for legibility; do not simply shrink the desktop composition.

Use this copy unless the user later changes it:

**Eyebrow**

`Websites · Web apps · Automation`

**Headline**

`Shift how your business is seen.`

**Supporting copy**

`Wallace Shift creates distinctive digital experiences that turn overlooked businesses into trusted first choices.`

**Primary CTA**

`Start your shift`

**Secondary CTA**

`Explore our services`

### 3. Brand statement

Create a high-impact editorial transition from the dark hero into the warmer body of the site.

Use:

`From overlooked to unforgettable.`

`Wallace Shift combines bold design, smart technology, and strategic thinking to shift how customers see, trust, and choose your business.`

This section should make the name and value proposition immediately understandable.

### 4. Services

Heading: `Built to move your business forward.`

Present three services as large, well-composed rows or panels—not three generic floating cards.

1. `Websites that earn trust`
   - Strategy, copy structure, design, development, responsive execution, and performance.
2. `Web apps that remove friction`
   - Portals, internal tools, customer experiences, and focused digital products.
3. `Automation that gives time back`
   - Practical workflows and integrations that reduce repetitive work and missed follow-up.

Keep descriptions concise and customer-facing. Explain outcomes before technology.

### 5. Approach

Heading: `A clear shift, from first idea to launch.`

Use three steps:

1. `Find the friction` — Understand what customers need, where trust is being lost, and what is slowing the business down.
2. `Build the shift` — Create the strategy, identity, experience, and technology as one coherent system.
3. `Launch with momentum` — Refine, test, launch, and leave the business with a platform built to keep working.

Avoid fake timelines or guarantees.

### 6. Principles / reassurance

Use a compact section that resolves the tension between “memorable” and “practical.”

- `Distinctive without being confusing.`
- `Fast without looking rushed.`
- `Technology that earns its place.`

Support each line with one short sentence. This section should reassure local-business prospects that Wallace Shift understands usability and business outcomes, not only aesthetics.

### 7. Final CTA / contact

Headline: `Ready to stop being overlooked?`

Supporting copy: `Tell us what is not working. We will show you what can shift.`

Primary action: `Start a project`

If real contact details or a form endpoint are not present in the repository, do not invent them and do not fake a successful submission. Build the visual contact experience, isolate the submission logic behind a small adapter/config file, and ask for the missing destination after the first visual pass is complete.

### 8. Footer

- WS monogram and Wallace Shift name
- Short line: `Design. Technology. Momentum.`
- Navigation anchors
- Real contact/social links only
- Current year

## Hero pointer-light interaction

The source image intentionally contains no fixed spotlight because the light response will be created in code.

Implement a restrained cursor-reactive illumination layer:

- Desktop/fine-pointer devices only
- Track the pointer with `gsap.quickTo()`, `quickSetter()`, or an equally efficient GSAP method
- Use a large, very soft radial gradient above the video and below all copy/navigation
- `mix-blend-mode: screen` or an equally restrained compositing method is acceptable
- No visible hard circle, halo edge, flashlight cone, lens flare, or white hotspot
- Maximum effect should be subtle; it should reveal surface detail, not wash out the logo
- Fade the light in on pointer entry and out on pointer leave
- Do not change the base exposure of the entire hero
- Disable the effect on touch devices and for reduced motion

If the effect looks like a cursor glow rather than light moving across material, reduce opacity, increase radius, and soften the falloff.

## GSAP motion direction

Use GSAP deliberately. Scope React animation work with `useGSAP()` and clean up every timeline, listener, and ScrollTrigger.

- Hero entrance: stagger the eyebrow, headline, copy, and actions with subtle opacity and 16–24px vertical movement.
- Header: restrained opacity/background transition on scroll.
- Section reveals: short upward reveals with consistent timing.
- Service rows: small text/image or rule shifts on hover; no bouncing.
- Diagonal “shift” rules may move a few pixels or wipe into view.
- Keep easing smooth and premium; avoid springy overshoot except for the damped pointer-light tracking.
- Motion must never compete with the water video.
- Use `gsap.matchMedia()` or an equivalent accessible path to respect `prefers-reduced-motion` across both video and UI animation.

## Asset and video handling

1. Inventory the root assets before selecting anything.
2. Use `ffprobe` or equivalent to record video duration, dimensions, frame rate, codec, and audio presence.
3. Keep originals untouched.
4. Copy chosen assets into descriptive production paths such as:
   - `public/media/wallace-shift-hero.mp4`
   - `public/media/wallace-shift-hero.webm`
   - `public/media/wallace-shift-hero-poster.webp`
   - `public/brand/wallace-shift-logo-white.svg`
   - `public/brand/wallace-shift-logo-black.svg`
5. If the source is `.mov`, generate web-ready H.264 MP4 and WebM versions when tooling permits.
6. Remove any audio track from the web copies.
7. Preserve the full source duration and loop boundary. Do not add fades or duplicate frames unless a real loop defect requires a precisely documented fix.
8. Optimize for fast loading without banding the dark background or destroying water detail.
9. Use the source still as the poster. Do not regenerate the scene.
10. If the final video is not yet present, complete the page with the approved poster and make the media component accept a drop-in video later.

## Responsive requirements

- Design intentionally at 1440px, 1024px, 768px, 390px, and 360px widths.
- No horizontal overflow.
- Preserve the centered WS at every size.
- Do not allow copy, navigation, or CTAs to cover the logo's primary silhouette.
- Use `svh`/`dvh` thoughtfully on mobile.
- Account for notches and safe-area insets where relevant.
- Ensure buttons remain comfortably tappable.

## Accessibility

- Semantic landmarks and heading order
- Keyboard-accessible navigation and mobile menu
- Visible focus states
- Sufficient contrast
- Descriptive labels for form controls
- Decorative media marked appropriately so it is not announced redundantly
- A useful poster/static state when motion is reduced
- No essential information communicated only through animation or hover

## Performance and SEO

- Prioritize fast first paint even with cinematic media.
- Do not block the initial render on video playback.
- Preload only what the first viewport truly needs.
- Lazy-load below-the-fold media.
- Avoid unnecessary client JavaScript.
- Set a real title and description:
  - Title: `Wallace Shift | Websites, Web Apps & Automation`
  - Description: `Wallace Shift creates distinctive websites, web apps, and automations that help growing businesses earn trust and move forward.`
- Add canonical metadata only when the actual production domain is known.
- Add Organization structured data only with real supplied details; never invent an address, phone number, ratings, or service area.
- Use the supplied favicon assets.

## Copy rules

- Lead with the customer's outcome, not tools.
- Prefer short, direct sentences.
- Avoid empty agency language such as “digital excellence,” “innovative solutions,” “cutting-edge,” “synergy,” and “elevate your brand.”
- Avoid unexplained technical jargon.
- Never fabricate facts, clients, testimonials, metrics, or case studies.
- The site should clearly say what Wallace Shift does within the first viewport.

## Code quality

- Use small, readable components with clear names.
- Keep content in a central typed data/config file where practical.
- Avoid a single enormous page component, but do not over-engineer a one-page site.
- Avoid `any` unless a third-party boundary truly requires it.
- Do not suppress lint or TypeScript errors to force a build.
- Do not leave console errors, broken links, fake submissions, placeholder lorem ipsum, or unused scaffolding.
- Preserve project conventions and unrelated user changes.

## Definition of done

The first complete pass is done only when:

- The homepage is fully built from header through footer.
- The approved WS assets are used without geometry changes.
- The video or poster fallback fills the hero and keeps the WS centered.
- The coded pointer-light effect is subtle and functional on desktop.
- The page has intentional mobile layouts.
- Reduced-motion behavior is implemented.
- Navigation anchors and CTAs work.
- No fake content or fake form success exists.
- Lint, type-check, and production build pass.
- The final response reports what was built, which root media files were selected, and any real information still needed before launch.
