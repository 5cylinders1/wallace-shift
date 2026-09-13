import { HeroContent } from '../../Hero/HeroContent'
import { HeroScrollCue } from '../../Hero/HeroScrollCue'
import '../../Hero/Hero.css'
import '../../Hero/LandingHeroTheme.css'

/** Reuse the lander's original HTML over the scene. The portfolio experiment
 * keeps its separate narrative copy and review UI. Draft form state survives
 * scrolling because this layer fades without unmounting its children. */
export function LandingHeroUI({ still }: { still: boolean }) {
  return <div className="water-hero__landing-ui">
    <div className="water-hero__landing-content"
      data-in-start="-1" data-in-end="0" data-out-start="0.25" data-out-end="0.35" data-shift="14">
      <HeroContent />
    </div>
    {!still && <div className="water-hero__landing-cue"
      data-in-start="-1" data-in-end="0" data-out-start="0.10" data-out-end="0.16" data-shift="0">
      <HeroScrollCue />
    </div>}
  </div>
}
