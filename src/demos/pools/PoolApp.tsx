import PoolHero from './PoolHero'
import PoolDetails from './PoolDetails'

export default function PoolApp() {
  return <div className="sw-site">
    <a className="sw-skip" href="#inspiration">Skip the pool build</a>
    <main>
      <PoolHero />
      <div className="sw-introduction">
        <div className="sw-introduction-label"><span className="sw-small-wave" aria-hidden="true">≈</span> A DIFFERENT KIND OF EVERYDAY</div>
        <p>The best part of getting away?<br /><em>Not having to leave.</em></p>
        <div className="sw-introduction-note">Morning laps. Unhurried afternoons.<br />One more swim before the sun goes down.<br />Let’s make room for more of that.</div>
      </div>
      <PoolDetails />
    </main>
  </div>
}
