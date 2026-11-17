// Isolated preview entry. Components intentionally stay outside production routing.
/* eslint-disable react-refresh/only-export-components */
import { useState, type KeyboardEvent } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import '../mockups.css'
import '../refined/refined.css'
import './purchase.css'

const email = 'mailto:matthew@wallaceshift.com?subject=Question%20about%20my%20website'
const offerPaths = { website: '/offers/contractor-websites', lead: '/offers/lead-page-follow-up' }
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h16m-6-6 6 6-6 6'} /></svg>
}
function Plus() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M9 3v12M3 9h12" /></svg> }
function Header() {
  const [open, setOpen] = useState(false)
  return <header className="m-header"><a className="m-skip" href="#main">Skip to content</a><a href="#main" className="m-brand"><img src="/brand/wallace-shift-logo-white.svg" width="22" height="14" alt="" />WALLACE SHIFT</a><nav className={`m-nav ${open ? 'is-open' : ''}`} aria-label="Primary">{[['See the work', '#examples'], ['Packages', '#packages'], ['How it works', '#process']].map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}</nav><a className="m-header-contact" href="#questions">Ask a question<Arrow diagonal /></a><button className="m-menu" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button></header>
}

function WebsiteDemo() {
  const [demo, setDemo] = useState('northvane')
  const [play, setPlay] = useState(false)
  const names: Record<string, string> = { northvane: 'Roofing', tambour: 'Kitchens', stillwater: 'Pools' }
  return <div className="r-website-demo">
    <div className="r-example-top"><span>Website examples</span><div role="group" aria-label="Choose a website example">{Object.entries(names).map(([key, label]) => <button key={key} aria-pressed={demo === key} onClick={() => { setDemo(key); setPlay(false) }}>{label}</button>)}</div></div>
    <div className="r-screen">{play ? <video controls autoPlay playsInline preload="none" key={demo} poster={`/media/demo-previews/${demo}.jpg`} aria-label={`${names[demo]} website walkthrough`}><source src={`/media/demo-previews/${demo}.mp4`} type="video/mp4" /><track kind="captions" src={`/media/demo-previews/${demo}.vtt`} srcLang="en" label="English" /></video> : <button className="m-watch" aria-label={`Watch ${names[demo].toLowerCase()} website walkthrough`} onClick={() => setPlay(true)}><img src={`/media/demo-previews/${demo}.jpg`} alt={`${names[demo]} website design concept by Wallace Shift`} width="1200" height="675" /><span><svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7Z" /></svg>Watch the walkthrough</span></button>}</div>
    <div className="r-example-caption"><p>Fictional demo brands. Advanced tools shown are scoped separately.</p><a href="#work">Follow the inquiry<Arrow /></a></div>
    {play && <p className="r-credit">Music: <a href="https://www.scottbuckley.com.au/library/a-kind-of-hope/">A Kind Of Hope by Scott Buckley</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Edited with narration.</p>}
  </div>
}

function Hero() {
  return <section className="r-hero" id="examples"><div className="r-wrap r-hero-grid"><div className="r-hero-copy"><h1>Make your work<br />easy to <em>choose.</em></h1><p>A business website with monthly care. Or a focused lead page that captures inquiries and follows up. Start with the work you need.</p><div className="r-opening-prices"><a href="#website-package"><span>Website, hosting & care</span><strong>$250 <small>/month</small></strong></a><a href="#lead-package"><span>Lead page & follow up</span><strong>$1,500 <small>once for setup</small></strong></a></div><div className="r-hero-actions"><a href="#packages" className="m-button">Find your starting point<Arrow /></a><a href="#questions" className="r-question-link">Just have a question?</a></div><p className="p-opening-note">Package details and any additional costs below.</p></div><WebsiteDemo /></div><div className="r-wrap r-hero-foot"><p>Built in Greater Kansas City. Available remotely.</p><a href="/services">Need a custom CRM or connected system?<Arrow diagonal /></a></div></section>
}

const journey = [
  { title: 'Capture the request.', description: 'Give your customer a clear place to describe the job. Collect the details your team needs to start a conversation.', label: 'Inquiry form in both packages' },
  { title: 'Put it in the right hands.', description: 'Route the request to the agreed inbox or compatible tool. Your team knows what the customer needs and how to reach them.', label: 'Agreed inquiry destination in both packages' },
  { title: 'Give the inquiry a next step.', description: 'Acknowledge the request and follow up at agreed times. Define when the sequence stops and your team takes over.', label: 'One automatic workflow in the $1,500 package' },
]
function tabKey(event: KeyboardEvent, index: number, count: number, choose: (index: number) => void, prefix: string) {
  let next: number | undefined
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % count
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + count - 1) % count
  if (event.key === 'Home') next = 0
  if (event.key === 'End') next = count - 1
  if (next !== undefined) { event.preventDefault(); choose(next); document.getElementById(`${prefix}-${next}`)?.focus() }
}
function Journey() {
  const [stage, setStage] = useState(0)
  const [replied, setReplied] = useState(false)
  const choose = (next: number) => { setStage(next); setReplied(false); document.getElementById(`journey-${next}`)?.focus() }
  return <section className="r-section r-light" id="work"><div className="r-wrap">
    <div className="r-section-head"><h2>The website is the start.<br /><em>Here is what comes next.</em></h2><p>Follow one roof repair request. See what both packages do, and where automatic follow up adds another step.</p></div>
    <div className="r-journey"><div className="r-stages" role="tablist" aria-label="Explore the inquiry journey" aria-orientation="vertical">{journey.map((item, i) => <button key={item.title} id={`journey-${i}`} role="tab" aria-selected={stage === i} aria-controls="journey-panel" tabIndex={stage === i ? 0 : -1} onClick={() => choose(i)} onKeyDown={e => tabKey(e, i, 3, choose, 'journey')}><span className="r-stage-number">{i + 1}</span><span><strong>{item.title}</strong><span className="r-stage-description">{item.description}</span><span className="r-stage-label">{item.label}</span></span><Arrow /></button>)}</div>
    <div className="r-journey-panel" id="journey-panel" role="tabpanel" tabIndex={0} aria-labelledby={`journey-${stage}`}>
      <div className="r-panel-label"><span>Illustrative customer journey</span><span>{stage + 1} of 3</span></div>
      {stage === 0 && <div className="p-request"><h3>Tell us what needs attention.</h3><p>A sample inquiry from the roofing example.</p><dl><div><dt>What can we help with?</dt><dd>Water around a skylight</dd></div><div><dt>Where is the property?</dt><dd>Kansas City</dd></div><div><dt>How should we get in touch?</dt><dd>Email</dd></div></dl><button className="m-button" onClick={() => choose(1)}>Preview where it goes<Arrow /></button><p className="r-panel-fine">Illustrative form, not a real request. Nothing is collected or sent.</p></div>}
      {stage === 1 && <div className="r-inquiry"><div className="r-inquiry-heading"><span>New roof repair inquiry</span><span className="r-sample-tag">Example inbox</span></div><dl><div><dt>Project</dt><dd>Water around a skylight</dd></div><div><dt>Location</dt><dd>Kansas City</dd></div><div><dt>Preferred contact</dt><dd>Email</dd></div></dl><div className="r-destination"><svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg><div><strong>Your team can respond from here.</strong><p>With the website package, your team handles the reply. The lead page package also includes one agreed automatic workflow.</p></div></div><button className="m-text-link" onClick={() => choose(2)}>Preview automatic follow up<Arrow /></button><p className="r-panel-fine">Illustrative delivery. This example does not send information or connect a CRM.</p></div>}
      {stage === 2 && <div className="r-response"><div className="r-response-row"><span className="r-dot" /><div><span>After the inquiry</span><p>“Thanks for getting in touch. We have your roof repair request.”</p></div></div><div className="r-response-row"><span className="r-dot" /><div><span>At the agreed follow up time</span><p>“Are you still looking for help? Reply here and we can discuss the next step.”</p></div></div><div aria-live="polite" className={`r-reply ${replied ? 'is-replied' : ''}`}><strong>{replied ? 'Your team takes over.' : 'What happens when they reply?'}</strong><p>{replied ? 'In this example, the customer response stops the sequence and the conversation returns to your team.' : 'The response and stop conditions are defined before the workflow goes live.'}</p><button className="m-text-link" onClick={() => setReplied(!replied)}>{replied ? 'Reset the example' : 'Show a customer reply'}<Arrow /></button></div><p className="r-panel-fine">Illustration of a proposed setup in compatible tools. No messages are sent. Channels, timing and stop conditions depend on the agreed scope.</p></div>}
    </div></div>
  </div></section>
}

const choices = [
  { label: 'I need a business website', title: 'Start with the website package.', text: 'A home for your services and work, with hosting and technical maintenance. Monthly care is part of this service.', href: '#website-package', action: 'See the website package' },
  { label: 'I need a page for one offer', title: 'Start with the lead page package.', text: 'A focused page and one follow up workflow. Keep a website that already works. Setup is a single fee; running costs may continue.', href: '#lead-package', action: 'See the lead page package' },
  { label: 'I may need both', title: 'Map the scope together first.', text: 'A business website and a campaign page can work together. We check for overlap before quoting so shared work is not priced twice.', href: '#questions', action: 'Ask about a combined scope' },
  { label: 'I am not sure yet', title: 'You can start with a question.', text: 'Tell us what is working and what is missing. You can explore every example and price without choosing a package.', href: '#questions', action: 'Ask Matthew a question' },
]
const comparisons = [
  ['Best fit', 'A new or improved business website', 'One service, offer or campaign'],
  ['What we build', 'Business website. Page count agreed in scope.', 'One focused lead page'],
  ['Inquiry capture', 'Included, with an agreed destination', 'Included, with an agreed destination'],
  ['Automatic follow up', 'Not included. Can be scoped separately.', 'One agreed workflow included'],
  ['Text messaging readiness', 'Only if separately scoped. Sender approval may be required.', 'If SMS is selected, required registration or verification must be approved before sending.'],
  ['Hosting and maintenance', 'Included within the agreed care scope', 'Hosting may recur. Ongoing management excluded.'],
  ['SEO', 'Basic on page SEO included', 'SEO campaign not included. Page setup agreed in scope.'],
  ['Build or setup charge', 'Website build included in $250/month', '$1,500 once for the agreed page and workflow'],
  ['Continuing costs', '$250/month, plus agreed domain or paid services', 'Hosting, software and message usage may recur'],
  ['After launch', 'Technical maintenance. Update allowance agreed.', 'Tested handoff. Client manages the agreed tools.'],
  ['Ownership and exit', 'Ownership, term and cancellation agreed in writing', 'Ownership, access and handoff rights agreed in writing'],
  ['Advertising', 'Ad spend and campaign management excluded', 'Ad spend and campaign management excluded'],
  ['Client software', 'Agreement and invoice portal. No customer CRM.', 'Agreement and invoice portal. No customer CRM.'],
]
const comparisonHighlights = [0, 1, 3, 8, 9]
function ComparisonRows({ rows }: { rows: typeof comparisons }) {
  return rows.map(([label, website, lead]) => <tr key={label} role="row">
    <th scope="row" role="rowheader">{label}</th>
    <td role="cell">{website}</td>
    <td role="cell">{lead}</td>
  </tr>)
}
function PackageComparison() {
  const [expanded, setExpanded] = useState(false)
  return <section className="r-section p-comparison" id="compare" aria-labelledby="compare-heading">
    <div className="r-wrap">
      <div className="r-section-head p-comparison-heading">
        <h2 id="compare-heading">The differences,<br /><em>at a glance.</em></h2>
        <p>Compare what is included and what happens after launch. These are two different services, so start with the work you need.</p>
      </div>
      <table className="p-comparison-table" role="table">
        <caption className="p-visually-hidden">Website care and lead page setup comparison</caption>
        <thead role="rowgroup"><tr role="row">
          <th scope="col" role="columnheader" className="p-criterion-heading">What to consider</th>
          <th scope="col" role="columnheader"><span className="p-column-title">Website & care</span><span className="p-column-price">$250<small>/month</small></span><span className="p-column-note">Website build included</span></th>
          <th scope="col" role="columnheader"><span className="p-column-title">Lead page & follow up</span><span className="p-column-price">$1,500<small>once for setup</small></span><span className="p-column-note">Running costs may continue</span></th>
        </tr></thead>
        <tbody role="rowgroup"><ComparisonRows rows={comparisonHighlights.map(index => comparisons[index])} /></tbody>
        <tbody role="rowgroup" id="comparison-details" hidden={!expanded}><ComparisonRows rows={comparisons.filter((_, index) => !comparisonHighlights.includes(index))} /></tbody>
      </table>
      <div className="p-comparison-actions">
        <button type="button" className="p-comparison-toggle" aria-expanded={expanded} aria-controls="comparison-details" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer details' : 'Show all package details'}<Plus />
        </button>
        <p>{expanded ? 'All 13 comparison points shown.' : 'Also compare hosting, SEO, ownership, SMS and exclusions.'}</p>
      </div>
    </div>
    <aside className="p-both" aria-labelledby="both-heading"><div className="r-wrap p-both-content">
      <h3 id="both-heading">Need <em>both?</em></h3>
      <div><p>We can scope them together and identify shared work.</p><small>There is no automatic bundle price.</small></div>
      <a href="#questions" className="m-button">Talk through the fit<Arrow /></a>
    </div></aside>
  </section>
}
function Packages() {
  const [choice, setChoice] = useState<number | null>(null)
  return <section className="r-section r-light p-packages" id="packages"><div className="r-wrap">
    <div className="r-section-head"><h2>Choose the work.<br /><em>Know the commitment.</em></h2><p>A website for your whole business, or a focused page for one offer. Each has its own scope and way of working.</p></div>
    <details className="p-guide"><summary>Not sure where to start?<Plus /></summary><p>What do you need right now? This is optional. Both packages stay available below.</p><div className="p-choices" role="group" aria-label="What do you need right now?">{choices.map((item, i) => <button key={item.label} aria-pressed={choice === i} onClick={() => setChoice(i)}>{item.label}</button>)}</div><div aria-live="polite">{choice !== null && <div className="p-guidance"><h3>{choices[choice].title}</h3><p>{choices[choice].text}</p><a className="m-text-link" href={choices[choice].href}>{choices[choice].action}<Arrow /></a></div>}</div></details>
    <article className="p-package" id="website-package">
      <div className="p-package-purpose"><h3>A website for your<br /><em>whole business.</em></h3><p>Show your services, work and service area in one place. A good fit when you need a new website or a clearer one.</p><a href="#examples" className="m-text-link">Explore website examples<Arrow /></a></div>
      <div className="p-package-scope"><h4>Website, hosting & care</h4><ul><li>Website build and inquiry form</li><li>Hosting and technical maintenance</li><li>Basic on page SEO</li><li>Agreed inquiry destination</li></ul><p><strong>After launch</strong>Your team replies to inquiries. We provide technical maintenance within the agreed care scope.</p></div>
      <div className="p-package-buy"><div className="p-price">$250<span>/month</span></div><p>Website build included.</p><p className="p-cost-note">Domain registration and paid services may cost extra. Page count, update allowance, minimum term, cancellation and ownership are agreed before payment.</p><a className="m-button" href={offerPaths.website}>Explore website care<Arrow /></a><a href="#guarantee" className="p-policy-link">Proposed 30 day guarantee</a></div>
    </article>
    <article className="p-package" id="lead-package">
      <div className="p-package-purpose"><h3>One offer.<br /><em>A clear next step.</em></h3><p>Give one service or campaign its own page and follow up path. Keep the business website that already works for you.</p><a href="#work" className="m-text-link">Try the inquiry example<Arrow /></a></div>
      <div className="p-package-scope"><h4>Lead page & automatic follow up</h4><ul><li>One focused lead page</li><li>Inquiry capture and routing</li><li>One agreed follow up workflow</li><li>Workflow testing and handoff</li></ul><p><strong>After handoff</strong>Your team runs the agreed tools and handles replies. Ongoing workflow management is separate.</p></div>
      <div className="p-package-buy"><div className="p-price">$1,500<span>once for setup</span></div><p>One page. One agreed workflow.</p><p className="p-cost-note">Hosting, software and message usage may add recurring costs. We confirm tools, access, ownership and running costs before payment. Advertising is separate.</p><p className="p-sms-note"><strong>Planning to use text messages?</strong>Automated texts to US customers from a local 10 digit number require A2P 10DLC registration before sending. Approval can take several business days or longer and may delay SMS launch.</p><a className="m-button" href={offerPaths.lead}>Explore lead page setup<Arrow /></a><a href="#guarantee" className="p-policy-link">Proposed 30 day guarantee</a></div>
    </article>
  </div></section>
}

function Guarantee() {
  return <section className="r-section p-guarantee" id="guarantee"><div className="r-wrap p-guarantee-grid"><div><h2>Room to feel good<br /><em>about the decision.</em></h2><p>Proposed 30 day satisfaction guarantee</p><span className="p-draft">Draft for review. Not an active guarantee.</span></div><div><p className="p-guarantee-intro">Review the delivered work. If you are not satisfied, ask us to correct it or request the covered refund within 30 days of written notice that the complete agreed work is ready to review.</p><details><summary>Website package: what would be covered<Plus /></summary><p>Refund the first $250 package payment. A timely refund request pauses future package billing; the refund ends the covered service. The proposed billing schedule starts with complete delivery and takes no second package payment before the review window ends. Later monthly payments are not covered by this launch guarantee.</p></details><details><summary>Lead page: what would be covered<Plus /></summary><p>Refund the setup fee actually paid for the agreed page and workflow, up to $1,500. The guarantee covers satisfaction with that delivery, not ad results or the performance of outside platforms. If SMS is in scope, required sender approval and workflow testing must be complete before the review window starts. A finished page alone does not start it.</p></details><details><summary>How a request and handoff would work<Plus /></summary><p>Email Matthew within the 30 day window. A correction request made in time preserves refund eligibility while we resolve it. Under this proposal, corrections are optional; you may request the refund instead. Domain purchases, outside subscriptions, message charges, ad spend and separately approved work are excluded and disclosed before payment.</p><p>Your domain, accounts and supplied content stay yours. We return your data, disconnect our access and agree the hosting shutdown date. A refunded build would not include rights to keep using our unpaid design or workflow work. Outside subscriptions must be cancelled separately.</p><p>Refund timing, the handoff period and ownership wording still need to be settled in the agreement. This preview does not activate a refund policy or promise leads, rankings or revenue.</p></details></div></div></section>
}
const upgrades = [
  { title: 'More room for your services', kind: 'Project quote', text: 'Add agreed service or location pages when your business needs more detail. Includes a defined content brief, page build and review allowance.', boundary: 'Additional pages outside your included website scope. Original agreed pages stay included.', price: 'Quoted per approved page scope, including writing, images, build and review time.' },
  { title: 'Another follow up workflow', kind: 'Project quote + tool costs', text: 'Add a separate inquiry path in compatible tools, with agreed messages, timing, stop conditions and a tested handoff.', boundary: 'For another use case. The first agreed workflow is already included in the $1,500 package.', price: 'Quoted after tool and access checks. Extra subscriptions, message usage and ongoing management are separate. SMS may require sender registration or verification, with provider fees and approval time before launch.' },
  { title: 'Ongoing content updates', kind: 'Optional monthly scope', text: 'Keep service information and project examples current with a defined amount of content work each month.', boundary: 'Only work beyond the agreed included allowance. Technical maintenance stays in the $250 package.', price: 'Quoted by update volume, content responsibility and review time. No unlimited work promise.' },
]
function Upgrades() {
  return <section className="r-section r-light p-upgrades" id="upgrades"><div className="r-wrap p-upgrade-grid"><div><h2>Start with what you need.<br /><em>Add only what helps.</em></h2><p>Your original package stands on its own. These are optional additions when the work grows.</p><a href="#questions" className="m-text-link">Ask about an addition<Arrow /></a></div><div>{upgrades.map(item => <details key={item.title}><summary><span>{item.title}<small>{item.kind}</small></span><Plus /></summary><p>{item.text}</p><p><strong>What stays included</strong><br />{item.boundary}</p><p><strong>How it is priced</strong><br />{item.price}</p></details>)}</div></div></section>
}

function PortalIllustration() {
  const [tab, setTab] = useState(0)
  return <div className="r-portal"><div className="r-portal-bar"><img src="/brand/wallace-shift-logo-white.svg" alt="" width="18" height="12" /><strong>Your project with Wallace Shift</strong></div><div className="r-portal-body"><div className="r-portal-title"><h3>Business website</h3><span className="r-sample-tag">Example records</span></div><div role="tablist" aria-label="Explore the client portal" className="r-portal-tabs">{['Agreement', 'Invoices'].map((label, i) => <button key={label} role="tab" id={`portal-${i}`} aria-selected={tab === i} aria-controls="portal-panel" tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => tabKey(e, i, 2, setTab, 'portal')}>{label}</button>)}</div><div id="portal-panel" role="tabpanel" tabIndex={0} aria-labelledby={`portal-${tab}`} className="r-portal-content">{tab === 0 ? <><h4>Your agreed scope</h4><p>Website design, hosting, technical maintenance and basic SEO.</p><dl><div><dt>Package</dt><dd>$250/month</dd></div><div><dt>Scope and terms</dt><dd>Confirmed before work begins</dd></div></dl><p className="r-portal-disclaimer">Illustrative summary, not a contract.</p></> : <><h4>Invoices & payments</h4><div className="r-invoice-row"><div><strong>Website hosting & care</strong><span>Example monthly invoice</span></div><strong>$250.00</strong></div><p>View the amount, payment status and the invoice associated with your project.</p><p className="r-portal-disclaimer">Fictional record. No payment can be made here.</p></>}</div></div><p className="r-portal-caption">Illustration of existing client portal functions. This manages your project with Wallace Shift, not your customers or advertising accounts.</p></div>
}
function Process() {
  return <section className="r-section r-light" id="process"><div className="r-wrap r-process-grid"><div><h2>Know what you get.<br /><em>Know what happens next.</em></h2><ol>{[['Agree the work', 'We confirm the deliverables, costs, responsibilities and terms. Your questions help shape the scope.'], ['Review the working example', 'See the design and test the agreed inquiry path before launch.'], ['Launch with a clear handoff', 'Know where inquiries arrive, what the tools do and how to ask for support.']].map(([title, text], i) => <li key={title}><span>{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol><p className="r-process-note">Your agreement and invoices stay together in your private client portal.</p></div><PortalIllustration /></div></section>
}

function Systems() {
  return <section className="r-systems"><div className="r-wrap"><div><h2>When the work needs<br /><em>more than a website.</em></h2><p>Customer records, handoffs and tools that do not connect can need a different solution. We scope custom CRMs, AI integrations and connected workflows separately.</p></div><a className="m-text-link" href="/services">Explore custom systems<Arrow diagonal /></a></div></section>
}
const faqs = [
  ['Can text messaging start straight away?', 'If your workflow includes automated texts to US customers from a local 10 digit number, A2P 10DLC business and campaign registration must be approved before sending. Review can take several business days or longer, especially if information needs correcting. Toll free numbers use a separate verification process. We confirm the provider requirements, customer consent process, current review timing and any registration or carrier fees before setup. Approval timing is outside our control. Email follow up does not require A2P registration; changing an agreed SMS workflow to email would need an agreed scope change.'],
  ['Can I choose by monthly versus a single payment?', 'Start with the work you need. The website package covers a business website and ongoing technical care. The lead page package covers a focused page and one workflow setup. A single setup payment does not remove hosting, software, usage charges or the need to maintain your tools.'],
  ['What if I need neither package?', 'If your website and inquiry process already work, you may not need either. You can ask a question or discuss a separately scoped system without buying one of these packages.'],
  ['Is a CRM included?', 'These packages include a private portal for your agreement and invoices with Wallace Shift. They do not include software to manage your own customers. We can review a compatible CRM you already use for a follow up setup; custom CRM work is scoped separately.'],
  ['What does basic SEO cover?', 'Page titles, descriptions, headings and readable service information. Ongoing content, local SEO campaigns, link building and ranking guarantees are not part of the $250 package.'],
  ['Can you connect my existing tools?', 'We review compatibility and account access before agreeing the work. One agreed follow up setup is included in the $1,500 package. Additional connections, advertising reports and campaign management require their own scope.'],
  ['What will I pay beyond the package price?', 'For the website, we confirm any domain or paid service costs. For the lead page, hosting, software and email or SMS usage can be additional recurring costs. We identify these before you commit.'],
  ['Can I ask questions before choosing?', 'Yes. You can compare the options, discuss an existing website or plan for later. You do not need to choose a package or be ready to purchase.'],
]
function Questions() {
  return <section className="r-section r-light"><div className="r-wrap r-faq-grid"><h2>A few things<br /><em>worth knowing.</em></h2><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus /></summary><p>{answer}</p></details>)}</div></div></section>
}
function Showcase() {
  return <section className="r-showcase"><div className="r-wrap"><img src="/media/wallace-shift-hero-poster.webp" alt="Wallace Shift sculptural logo reflected in water" width="1916" height="1080" loading="lazy" /><div><h2>Explore our<br /><em>other dimension.</em></h2><p>Our interactive design experience is here when you want to explore it.</p><a href="/" target="_blank" rel="noreferrer" className="m-text-link">Open the interactive showcase<Arrow diagonal /></a></div></div></section>
}
function Contact() {
  return <section className="r-section r-contact" id="questions"><div className="r-wrap"><div><h2>Start with<br /><em>a question.</em></h2><p>Tell Matthew what you want to improve, or what you want to understand. You do not need to know the solution.</p></div><div><a href={email} className="m-button">Ask Matthew a question<Arrow /></a><a className="m-text-link" href="/contact">Tell us about your project<Arrow /></a><p>Questions are welcome before you choose.</p></div></div></section>
}
function App() {
  return <div className="m-page r-page p-page"><Header /><main id="main"><Hero /><Packages /><PackageComparison /><Journey /><Guarantee /><Upgrades /><Process /><Systems /><Questions /><Showcase /><Contact /></main><footer className="r-wrap r-footer"><a href="#main" className="m-brand"><img src="/brand/wallace-shift-logo-white.svg" width="20" height="14" alt="" />WALLACE SHIFT</a><a href="/pricing">All services & pricing</a><a href="/privacy">Privacy</a><a href="./README.md">Preview notes</a><a href="../refined/index.html">Previous preview</a></footer></div>
}
const root = createRoot(document.getElementById('root')!)
root.render(<App />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
