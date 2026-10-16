import './JourneyStageArt.css'

export type JourneyStage = 'find' | 'make' | 'launch'

const descriptions: Record<JourneyStage, string> = {
  find: 'Follow the customer journey from visiting, to understanding, to taking action. Look for friction between those steps.',
  make: 'Connect strategy, identity, experience, and technology into one system.',
  launch: 'Move through refinement, testing, and launch, with a platform ready to keep working.',
}

/** A small process diagram for the layouts without the travelling 3D scene. */
export function JourneyStageArt({ stage }: { stage: JourneyStage }) {
  return (
    <div className={`journey-stage-art journey-stage-art--${stage}`} role="img" aria-label={descriptions[stage]}>
      <div className="journey-stage-art__content" aria-hidden="true">
        <span className="journey-stage-art__eyebrow">
          {stage === 'find' ? 'The customer journey' : stage === 'make' ? 'One connected system' : 'The path to launch'}
        </span>
        {stage === 'make' ? (
          <div className="journey-stage-art__system">
            <svg className="journey-stage-art__connections" viewBox="0 0 320 128" preserveAspectRatio="none">
              <path d="M64 20 L160 64 L256 20 M64 108 L160 64 L256 108" />
            </svg>
            <span className="journey-stage-art__system-label">Strategy</span>
            <span className="journey-stage-art__system-label">Identity</span>
            <span className="journey-stage-art__system-label">Experience</span>
            <span className="journey-stage-art__system-label">Technology</span>
            <span className="journey-stage-art__hub">+</span>
          </div>
        ) : (
          <>
            <div className="journey-stage-art__path">
              {(stage === 'find' ? ['Visit', 'Understand', 'Act'] : ['Refine', 'Test', 'Launch']).map((label, index) => (
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
