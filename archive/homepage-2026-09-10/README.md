# Homepage assets and pit-stop preservation

Saved on September 10, 2026 before the homepage replaced its service outcome videos, quiz spotlight, closing video, and pit-stop process presentation with a continuous logo story.

## Preserved portfolio experiment

Open `/experiments/pit-stop` to see the original homepage `ApproachSummary`, including the full desktop pit stop, compact mobile timeline, and diagonal car exit. The scene and geometry components are reused without changes. This isolated route has its own small header, no production header/footer, and `noindex, nofollow` metadata; it is omitted from the sitemap. Its original bone, ink, and orange palette is scoped to `.pit-stop-experiment`.

The runnable scene continues to use these original assets:

- `/media/pit-stop/formula-car-chassis.png`
- `/media/pit-stop/formula-tire-front-upper.png`
- `/media/pit-stop/formula-tire-front-lower.png`
- `/media/pit-stop/formula-tire-rear-upper.png`
- `/media/pit-stop/formula-tire-rear-lower.png`
- `/media/generated/car-ember.webp`

Their exact bytes are also saved inside `original-components-and-pit-stop.tar.gz`, along with the original component source and its local imports (46 files). The archive includes the service outcome field, closing contact section, ambient loop, and quiz spotlight implementations. `package.json` and the lockfile record the dependency versions needed to reuse them. This is a source snapshot, not a second executable app or a replacement for the live source.

`legacy-quiz-and-palette-supplement.tar.gz` adds the surrounding quiz components and original global token sheet (9 files; 9,853 bytes), explicitly sourced from Git commit `0324da9ab7de9b7799df55a064b99356a47cc373`. The quiz directory was clean at the start of this redesign. The supplement was added after the live quiz gained its homepage-only spotlight toggle; it uses the recorded Git baseline rather than presenting that modified source as the original. Source provenance and hashes are recorded separately in `manifest.json`. The first archive remains byte-for-byte unchanged.

## Retired homepage media

| Folder | Saved assets | Previous use |
| --- | --- | --- |
| `assets/services/` | TRUST, FLOW, and TIME MP4 loops and WebP posters | Service outcome fields |
| `assets/contact/` | Contact horizon MP4 and WebP poster | Closing contact background |
| `assets/quiz/` | Spotlight MP4 and WebP poster | Quiz illustration |

The ten media copies total 5,579,493 bytes; the source/pit-stop archive is 1,508,616 bytes. `manifest.json` records each original path, saved location, role, byte size, and SHA-256. `SHA256SUMS` allows the saved copies to be verified independently.

Original files remain in `public/media/`; other routes and experiments can still use them. The mobile homepage hero video is still in use and has not been retired. Nothing was deleted.

This archive is intentionally outside `public/`, is not imported by the app, and is excluded from Vercel uploads by an exact directory rule in `.vercelignore`. It is retained in the repository for future design work and portfolio use. No commit or deployment was made when it was created.

## Reuse

Extract `original-components-and-pit-stop.tar.gz` into a separate working folder when inspecting or reusing the snapshot. Avoid extracting over the active app, which has continued to evolve. Keep the listed media paths or update the copied components when using the assets in another portfolio project.

The existing water-hero experiment and its separate material options remain at `/experiments/water-hero`.

## Process wipe revision snapshot

`journey-before-process-wipes.tar.gz` preserves the complete `HomeJourney`
source directory, `src/components/Services/OutcomeField.tsx`, and
`docs/homepage-journey.md` immediately before the pinned process-panel rewrite.
This includes the superseded process copy layout and small CSS diagrams.
No media was removed in this revision; the existing service videos and
portfolio experiments remain available at their existing paths.

SHA-256: `6fa2e9ea631adfbee7c4d3540b8b35d292672ed4236e353e86ac196980c96139`
