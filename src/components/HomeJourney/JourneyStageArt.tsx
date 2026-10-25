import './JourneyStageArt.css'

export type JourneyStage = 'find' | 'make' | 'launch'

const descriptions: Record<JourneyStage, string> = {
  find: 'Trace an enquiry through follow-up and work in progress. Find gaps between those steps.',
  make: 'Connect people, records, tools, and actions in one system.',
  launch: 'Test the system, hand it over, and plan further improvements.',
}

/** A small process diagram for the layouts without the travelling 3D scene. */
export function JourneyStageArt({ stage }: { stage: JourneyStage }) {
  return (
    <div className={`journey-stage-art journey-stage-art--${stage}`} role="img" aria-label={descriptions[stage]}>
      <div className="journey-stage-art__content" aria-hidden="true">
        <span className="journey-stage-art__eyebrow">
          {stage === 'find' ? 'The daily workflow' : stage === 'make' ? 'One connected system' : 'Launch and beyond'}
        </span>
        {stage === 'make' ? (
          <div className="journey-stage-art__system">
            <svg className="journey-stage-art__connections" viewBox="0 0 320 128" preserveAspectRatio="none">
              <path d="M64 20 L160 64 L256 20 M64 108 L160 64 L256 108" />
            </svg>
            <span className="journey-stage-art__system-label">People</span>
            <span className="journey-stage-art__system-label">Records</span>
            <span className="journey-stage-art__system-label">Tools</span>
            <span className="journey-stage-art__system-label">Actions</span>
            <span className="journey-stage-art__hub">+</span>
          </div>
        ) : (
          <>
            <div className="journey-stage-art__path">
              {(stage === 'find' ? ['Enquiry', 'Follow-up', 'Work'] : ['Test', 'Handover', 'Improve']).map((label, index) => (
                <div className="journey-stage-art__point" key={label}>
                  <span className="journey-stage-art__node">
                    {stage === 'launch' && index === 2 ? <span>↗</span> : <span className="journey-stage-art__dot" />}
                  </span>
                  <span className="journey-stage-art__label">{label}</span>
                </div>
              ))}
            </div>
            <span className="journey-stage-art__caption">
              {stage === 'find' ? 'Look for friction along the way' : 'Built to keep working'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
