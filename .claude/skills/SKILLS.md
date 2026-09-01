# Wallace Shift — Claude Code Skills and Execution Standards

This file supplements `CLAUDE.md`. Apply these skills throughout the build.

## 1. Asset forensics

Before coding the hero:

- List all root-level image, vector, and video assets.
- Inspect image dimensions and transparency.
- Inspect video dimensions, codec, duration, frame rate, and audio streams.
- Generate contact sheets or temporary thumbnails only when necessary to distinguish similar files.
- Match imagery by visible content, not filename alone.
- Reject older corridor, city, glass-wall, screen-room, or unrelated logo explorations.
- Keep an explicit note of which source file becomes each production asset.
- Never modify or delete an original asset.

## 2. Brand-accurate art direction

Use the finalized WS monogram as the source of the site's visual language:

- Repeated diagonal angles
- Tension between solid mass and negative space
- Directional movement without literal speed effects
- Large fields of calm space around one strong object
- Silver, ink, soft white, and warm bone

Premium does not mean adding effects. When something feels cheap or generic, first improve composition, type scale, alignment, spacing, and restraint.

## 3. Cinematic media integration

Treat the video as atmosphere and identity—not as a separate content block.

- Use semantic `<video>` with MP4/WebM sources, `muted`, `autoPlay`, `loop`, and `playsInline`.
- Use a real poster that matches the first frame closely.
- Prevent layout shift with an explicit container/aspect strategy.
- Keep copy in HTML above the media.
- Use layered gradients only for legibility and depth.
- Never hide an obvious loop problem with a long fade.
- If native looping exposes a real encoding hitch, document the cause before changing playback behavior.
- Use a static poster when reduced motion is requested or video cannot play.

## 4. GSAP craft

Use GSAP and `@gsap/react` for meaningful transitions:

- `useGSAP()` for scoped React animation and automatic cleanup
- `gsap.timeline()` for the coordinated hero entrance
- `gsap.quickTo()` or `quickSetter()` for efficient pointer-light tracking
- ScrollTrigger or Intersection Observer for restrained section entrances
- `gsap.matchMedia()` for responsive and reduced-motion alternatives
- Shared animation constants for consistent stagger and easing
- Transform and opacity animations wherever possible

Avoid animating layout-heavy properties continuously. Avoid perpetual motion outside the source water video. Do not use a custom cursor.

Recommended motion character:

- Duration: approximately 0.55–0.9 seconds for major reveals
- Distance: approximately 16–24px
- Easing: smooth and controlled, without bounce
- Hover movement: approximately 2–6px
- Pointer light: highly damped and visually subtle

## 5. Editorial responsive design

Do not create desktop first and merely shrink it.

- Establish a strong desktop grid around the centered WS and left-side copy safe area.
- Recompose mobile so text occupies clean dark space above the centered object.
- Use fluid type with `clamp()` and protect readable line lengths.
- Preserve intentional negative space at every breakpoint.
- Use full-width service rows and typographic transitions instead of stacking endless cards.

## 6. Conversion-focused copy discipline

Every major section must answer one prospect question:

- Hero: What do you do, and why should I care?
- Brand statement: What does “Wallace Shift” mean?
- Services: What can I hire you to build?
- Approach: What will working together feel like?
- Principles: Will the result be practical for my customers?
- Final CTA: What should I do next?

Do not add a section that cannot answer a real prospect question.

## 7. Component and code architecture

Suggested component boundaries:

- `SiteHeader`
- `Hero`
- `HeroMedia`
- `PointerLight`
- `BrandStatement`
- `Services`
- `Approach`
- `Principles`
- `ContactCta`
- `SiteFooter`
- `Reveal`

Use a central `siteConfig` or typed content file for navigation, service content, contact details, and metadata. Keep the hero media behavior isolated so a revised Kling/Luma export can be swapped without rebuilding the page.

## 8. Accessibility skill

Verify:

- One H1
- Logical heading hierarchy
- Semantic navigation and landmarks
- Keyboard-operable mobile menu
- Escape closes open menu/dialog state
- Focus returns correctly
- Visible focus styles on dark and light surfaces
- Minimum comfortable tap targets
- Form errors connected to their fields
- Reduced-motion path uses the poster and removes decorative reveals
- Pointer-light interaction is decorative only

## 9. Performance skill

Keep the cinematic hero fast:

- Prefer an optimized WebM plus H.264 fallback.
- Avoid preloading both full video files.
- Use `preload="metadata"` unless testing proves a stronger preload is required.
- Use an optimized poster that appears immediately.
- Remove video audio streams.
- Keep dark-gradient quality high enough to avoid obvious banding.
- Keep below-the-fold sections mostly server-rendered.
- Run a production build and resolve warnings that indicate real defects.

## 10. Honest implementation

- Never fabricate social proof.
- Never pretend an unconfigured form submitted successfully.
- Never hide missing content with lorem ipsum.
- Never replace the selected logo or hero with an approximate recreation.
- Never claim visual QA that was not performed.
- Surface missing launch information clearly at handoff.

## 11. Build sequence

1. Read `CLAUDE.md` and this file.
2. Audit the repository and root assets.
3. Preserve an existing app; otherwise initialize React + Vite + TypeScript + GSAP in place without deleting assets.
4. Normalize selected assets into `public/`.
5. Establish tokens, fonts, base layout, and metadata.
6. Build the complete hero, including poster/video fallback and pointer light.
7. Build every remaining homepage section through the footer.
8. Add responsive and reduced-motion behavior.
9. Connect anchors and available real contact actions.
10. Run lint, type-check, and production build.
11. Review the implementation against the no-go list in `CLAUDE.md`.
12. Report selected source assets, changed files, verification results, and launch blockers.

Do not stop after scaffolding, the navigation, or the hero. Deliver the complete first-pass homepage in one focused build.

## 12. Final self-review

Before handoff, ask:

- Is the WS still centered at desktop, tablet, and mobile sizes?
- Does any copy cover the logo or primary reflection?
- Does the hero look premium before the pointer moves?
- Does the hover light feel like illumination rather than a cursor glow?
- Does the body transition feel warmer and more approachable than the hero?
- Can a local-business owner understand the offer within five seconds?
- Is the page distinctive without relying on science-fiction imagery?
- Is every claim true and every action functional?
- Does reduced motion still produce a complete, polished experience?
- Did lint, type-check, and build pass without suppressed errors?
