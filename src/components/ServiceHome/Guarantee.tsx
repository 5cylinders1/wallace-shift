import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import './guarantee.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

function ReviewEmblem() {
  const frame = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const host = frame.current!
    const halo = host.querySelector<HTMLElement>('.p-guarantee-emblem-glow')!
    const header = host.closest('.p-page')?.querySelector<HTMLElement>('.m-header')
    const media = gsap.matchMedia()
    // The current header scrolls away. Reserve its height only if it overlays
    // the page; 40px also leaves room for the glow above the shield.
    const topInset = () => {
      if (!header) return 40
      const style = getComputedStyle(header)
      return ['fixed', 'sticky'].includes(style.position)
        ? header.offsetHeight + Math.max(0, parseFloat(style.top) || 0) + 40
        : 40
    }

    media.add('(prefers-reduced-motion: no-preference)', () => {
      // Register initial styles with the context so reduced motion/unmount
      // restores CSS. Write only when progress changes, including on refresh.
      gsap.set(halo, { scale: .68, opacity: .12 })
      let previous = -1
      const paint = (self: ScrollTrigger) => {
        const progress = gsap.utils.clamp(0, 1, self.progress)
        if (progress === previous) return
        previous = progress
        halo.style.transform = `scale(${.68 + progress * .52})`
        halo.style.opacity = `${.12 + progress * .73}`
      }
      const trigger = ScrollTrigger.create({
        id: 'guarantee-shield-glow',
        trigger: host,
        start: 'clamp(top bottom)',
        end: () => `clamp(top ${topInset()}px)`,
        // The inquiry above can add its pin after this child mounts. Refresh
        // this downstream range after that pin has established its spacing.
        refreshPriority: -1,
        onUpdate: paint,
        onRefresh: paint,
      })
      paint(trigger)
    })

    // Font loading can move the shield after fragment navigation. Other page
    // layout changes already refresh the shared ScrollTrigger measurements.
    let disposed = false
    void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh() })
    return () => { disposed = true; media.revert() }
  }, { scope: frame })

  return <span className="p-guarantee-emblem-frame" ref={frame} aria-hidden="true">
    <span className="p-guarantee-emblem-glow" />
    <svg className="p-guarantee-emblem" viewBox="0 0 120 136" fill="none" focusable="false">
      <path className="p-guarantee-emblem-face" d="M60 5 106 23v40c0 28-20 50-46 65C34 113 14 91 14 63V23L60 5Z" />
      <path className="p-guarantee-emblem-inset" d="m60 14 38 15v34c0 23-16 43-38 57-22-14-38-34-38-57V29l38-15Z" />
      <text x="60" y="70" className="p-guarantee-emblem-number">30</text>
      <text x="60" y="89" className="p-guarantee-emblem-unit">days</text>
      <path className="p-guarantee-emblem-check" d="m54 101 4 4 8-9" />
    </svg>
  </span>
}

function DisclosureIcon() {
  return <svg className="p-guarantee-toggle" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
    <path d="M4 10h12" /><path className="p-guarantee-toggle-vertical" d="M10 4v12" />
  </svg>
}

export default function Guarantee() {
  return <section className="r-section p-guarantee" id="guarantee" aria-labelledby="guarantee-heading">
    <div className="r-wrap p-guarantee-grid">
      <div className="p-guarantee-promise">
        <div className="p-guarantee-identity">
          <ReviewEmblem />
          <p>Proposed 30 day<br />satisfaction guarantee</p>
        </div>
        <h2 id="guarantee-heading">Time to <em>be sure.</em></h2>
        <p className="p-guarantee-lede">Review the complete agreed work. Under this proposal, you could choose a correction or a covered refund.</p>
      </div>

      <div className="p-guarantee-terms">
        <h3>Proposed refund coverage</h3>
        <p className="p-guarantee-intro">For a website, the 30 days start with your first payment. For a lead page, the window would begin with written notice that the complete agreed work is ready to review.</p>

        <details>
          <summary><span className="p-guarantee-summary-copy">Website &amp; care<span>First payment covered</span></span><span className="p-guarantee-amount">$250</span><DisclosureIcon /></summary>
          <div className="p-guarantee-detail">
            <p>Cancel within 30 days of your first $250 payment and that payment is refunded. Nothing more is charged.</p>
            <p>The first payment is taken when you sign. After 30 days, cancelling takes effect at the end of that month, and your site stays online until then.</p>
            <p>Later monthly payments are not covered by this guarantee.</p>
          </div>
        </details>
        <details>
          <summary><span className="p-guarantee-summary-copy">Lead page &amp; follow up<span>Paid setup fee covered</span></span><span className="p-guarantee-amount"><small>Up to</small>$1,500</span><DisclosureIcon /></summary>
          <div className="p-guarantee-detail">
            <p>You could choose a correction within the agreed scope or a refund of the setup fee paid for your agreed page and workflow, up to $1,500. Any deposit would count toward that same fee.</p>
            <p>The complete page and agreed workflow would need to be demonstrated. If SMS is in scope, required sender approval and workflow testing would need to be complete before the review window starts. A finished page alone would not start it.</p>
            <p>Coverage would apply to satisfaction with the agreed delivery, not ad results or the performance of outside platforms.</p>
          </div>
        </details>
        <details>
          <summary><span className="p-guarantee-summary-copy">Review, request &amp; handoff<span>When it starts. How to ask. What stays yours.</span></span><DisclosureIcon /></summary>
          <div className="p-guarantee-detail">
            <p><strong>A complete delivery.</strong> An accessible, complete version of the agreed website, or the complete lead page and agreed workflow, plus written notice that it is ready to review. That notice would start the 30 calendar day window. Incomplete work would not start the clock.</p>
            <p><strong>Your choice of remedy.</strong> Email <a href="mailto:matthew@wallaceshift.com?subject=Question%20about%20the%20proposed%20guarantee">Matthew</a> within that window with your project name and whether you want a correction or refund. A timely correction request would preserve refund eligibility while we resolve it. Corrections would be optional; you could request the covered refund instead.</p>
            <p><strong>Costs outside the proposal.</strong> Domain purchases, outside subscriptions, message charges, ad spend and separately approved work would be excluded and disclosed before payment. New scope would be agreed separately.</p>
            <p><strong>A clear handoff.</strong> Your domain, accounts, supplied content and collected inquiry data would stay yours. We would return your data before retiring the refunded work, disconnect our access and agree the hosting shutdown date. A refunded build would not include rights to keep using our unpaid design or workflow work. Outside subscriptions would need separate cancellation.</p>
            <p><strong>Still to be agreed.</strong> Refund timing, the handoff period and ownership wording need to be settled in the agreement. Ordinary written cancellation and defect correction terms would continue outside the review window.</p>
          </div>
        </details>
        <p className="p-guarantee-boundary">Covers satisfaction with the agreed work. Outside costs are excluded. No promise of leads, rankings or revenue.</p>
      </div>
    </div>
  </section>
}
