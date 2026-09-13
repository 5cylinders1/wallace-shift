/**
 * The mark, in the state each stage leaves it in — for the panels the live
 * scene does not reach.
 *
 * On a desktop with WebGL the three approach panels share one travelling
 * object, and the copy is written against it. Everywhere else that object is
 * absent and the panels are copy on a colour field, which is what this fills.
 *
 * It is the finalized mark and nothing else: the shape comes from the approved
 * SVG used as a mask, so what changes between stages is the light and the
 * ground behind it, never the geometry. Two elements and no image beyond the
 * logo already in `public/brand`.
 */
export type JourneyStage = 'find' | 'make' | 'launch'

export function JourneyStageArt({ stage }: { stage: JourneyStage }) {
  return (
    <div className={`journey-stage-art journey-stage-art--${stage}`} aria-hidden="true">
      <span className="journey-stage-art__field" />
      <span className="journey-stage-art__mark" />
    </div>
  )
}
