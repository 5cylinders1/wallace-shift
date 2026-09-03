import { PageHero } from '../components/PageHero/PageHero'
import { StandardsSection } from '../components/Standards/StandardsSection'
import { SiteAudit } from '../components/SiteAudit/SiteAudit'
import { AuditReport } from '../components/AuditReport/AuditReport'
import { AuditPill } from '../components/AuditPill/AuditPill'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import { auditCopy } from '../content/audit'
import {
  approachAssurances,
  approachCta,
  approachExpectations,
  approachProof,
  approachStages,
  servicePaths,
} from '../content/approachPage'
import { approachPageHero, business } from '../content/siteConfig'
import { renderLines } from '../lib/textLines'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import { useSiteAudit } from '../hooks/useSiteAudit'
import './InteriorPage.css'
import './ApproachPage.css'

/**
 * The process, in detail.
 *
 * The pit-stop sequence is the homepage's signature moment and is not
 * repeated here. This page has one job: let a cautious buyer answer five
 * questions without asking them — what happens first, what they will see
 * during the work, when they pay, why this studio, and what clicking the
 * CTA actually does.
 *
 * Order matters and is deliberate: assurance before detail, tangible
 * outputs inside each stage, the paid step named per service, credibility
 * before commercial terms, and exactly one conclusion at the end.
 */
export function ApproachPage() {
  useRouteMeta('/approach')

  /* Owned here, not inside the input: the field is in stage 01 and the
     result renders after stage 03, so both halves read the same state. */
  const audit = useSiteAudit()

  // Real scheduling link when one exists; the contact form until then.
  const bookingHref = business.bookingUrl ?? '/contact'

  return (
    <>
      <PageHero
        eyebrow={approachPageHero.eyebrow}
        headlineLines={approachPageHero.headlineLines}
        headlineAccent={approachPageHero.headlineAccent}
        supporting={approachPageHero.supporting}
      />

      {/* Assurance strip — sits directly under the hero so the first
          scroll answers "why should I keep reading" before the detail. */}
      <section className="interior interior--tight">
        <div className="container">
          <ul className="assurances">
            {approachAssurances.map((item) => (
              <Reveal className="assurance" key={item.title}>
                <h2 className="assurance__title">{item.title}</h2>
                <p className="assurance__body">{item.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Stage 01, performed rather than described — and it is the only
          Stage 01 on the page. Listing it again below the tool made the
          page restart itself right after the visitor had engaged with it. */}
      <section className="interior interior--stage-one">
        <div className="container">
          <div className="stage-one">
            <div className="stage-one__head">
              <span className="stage__index">{auditCopy.eyebrow}</span>
              <h2 className="stage__title">{auditCopy.heading}</h2>
              <p className="stage__summary">{auditCopy.summary}</p>
              <p className="stage-one__supporting">{auditCopy.supporting}</p>
            </div>
            <SiteAudit
              state={audit}
              continueTo="approach-stages"
              reportId="audit-report"
            />
          </div>
        </div>
      </section>

      {/* The three stages. Each ends on something the client physically
          leaves with, which is what the previous bullet list never said.
          The section carries no vertical padding of its own — each stage
          owns its ground edge to edge, so any padding here would render as
          a stripe of the wrong colour between them. */}
      <section className="interior interior--stages" id="approach-stages">
        <div className="container">
          <ol className="stages">
            {approachStages.map((stage, index) => (
              // The band itself never animates. Each stage is a full-bleed
              // ground butted exactly against its neighbours, so wrapping
              // it in a Reveal — which translates its subject 22px — would
              // slide the grounds independently and tear the seams between
              // them on the way in. The content reveals; the ground holds.
              <li
                className={`stage stage--ground-${index + 2}`}
                key={stage.index}
              >
                <Reveal className="stage__head">
                  <span className="stage__index">{stage.index}</span>
                  <h2 className="stage__title">{stage.title}</h2>
                  <p className="stage__summary">{stage.summary}</p>
                </Reveal>
                <dl className="stage__fields">
                  {stage.fields.map((field, fieldIndex) => (
                    <Reveal
                      className="stage__field"
                      delay={0.06 + fieldIndex * 0.06}
                      key={field.label}
                    >
                      <dt className="stage__field-label">{field.label}</dt>
                      <dd className="stage__field-body">{field.body}</dd>
                    </Reveal>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The other half of stage 01. It renders nothing until a check has
          been started, so the page is unchanged for visitors who never use
          the tool — and lands exactly where someone arrives after reading
          the three stages they just waited through. */}
      <AuditReport state={audit} id="audit-report" />

      {/* Where each service becomes paid — pulled out of stage 01, where
          four different engagement types were competing in one block.
          Ink from here down: the stages above have already completed the
          shift, so the page never returns to bone. */}
      <section className="interior interior--tight interior--ink">
        <div className="container">
          <Reveal>
            <p className="eyebrow">{servicePaths.eyebrow}</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="section-heading">{servicePaths.heading}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="section-supporting">{servicePaths.supporting}</p>
          </Reveal>

          <div className="paths">
            {servicePaths.items.map((item, index) => (
              <Reveal
                className="path"
                delay={0.12 + index * 0.05}
                key={item.service}
              >
                <span className="path__service">{item.service}</span>
                <PageLink href={item.href} className="path__step">
                  {item.step}
                  <span aria-hidden="true">&#8599;</span>
                </PageLink>
                <p className="path__note">{item.note}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility before commercial terms. No testimonials, no metrics,
          no client names — none exist yet, and inventing them is the one
          thing that would undo the rest of the page. */}
      <section className="interior interior--ink">
        <div className="container proof">
          <Reveal>
            <p className="eyebrow proof__eyebrow">{approachProof.eyebrow}</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="proof__heading">{approachProof.heading}</h2>
          </Reveal>
          {approachProof.paragraphs.map((paragraph, index) => (
            <Reveal delay={0.1 + index * 0.06} key={paragraph.slice(0, 24)}>
              <p className="proof__body">{paragraph}</p>
            </Reveal>
          ))}
          <Reveal delay={0.22}>
            <ul className="proof__credentials">
              {approachProof.credentials.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.26}>
            <PageLink href={approachProof.proofHref} className="proof__note">
              {approachProof.proofNote}
              <span aria-hidden="true">&#8599;</span>
            </PageLink>
          </Reveal>
        </div>
      </section>

      <section className="interior interior--tight interior--ink">
        <div className="container">
          <Reveal>
            <p className="eyebrow">{approachExpectations.eyebrow}</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="section-heading">{approachExpectations.heading}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="section-supporting">
              {approachExpectations.supporting}
            </p>
          </Reveal>

          <ul className="expectations">
            {approachExpectations.items.map((item, index) => (
              <Reveal
                className="expectation"
                delay={0.12 + index * 0.04}
                key={item.title}
              >
                <h3 className="expectation__title">{item.title}</h3>
                <p className="expectation__body">{item.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <StandardsSection />

      {/* One conclusion, not four. */}
      <section className="interior interior--ink">
        <div className="container closing">
          <Reveal>
            <h2 className="closing__headline">
              {renderLines(approachCta.headlineLines)}{' '}
              <span className="accent-serif">{approachCta.headlineAccent}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="closing__supporting">{approachCta.supporting}</p>
          </Reveal>
          <Reveal delay={0.14} className="closing__actions">
            <PageLink href={bookingHref} className="button-primary">
              {approachCta.primaryLabel}
              <span aria-hidden="true">&#8599;</span>
            </PageLink>
            <PageLink
              href={approachCta.secondaryHref}
              className="button-secondary"
            >
              {approachCta.secondaryLabel}
            </PageLink>
          </Reveal>
        </div>
      </section>

      <AuditPill state={audit} targetId="audit-report" />
    </>
  )
}
