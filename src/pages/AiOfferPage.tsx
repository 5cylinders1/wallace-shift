import { useEffect, useRef, useState } from 'react'
import { AiOpportunityForm } from '../components/AiOpportunityForm'
import { AiOpportunityRecommendation } from '../components/AiOpportunityRecommendation'
import { PageLink } from '../components/PageLink/PageLink'
import { aiOffer } from '../content/aiOffer'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './AiOfferPage.css'

export function AiOfferPage() {
  useRouteMeta(aiOffer.path)
  const pageRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'quiz' | 'result' | 'contact' | 'booking' | 'success'>('quiz')
  useEffect(() => {
    const viewport = window.visualViewport
    const updateHeight = () => pageRef.current?.style.setProperty('--qf-viewport-height', `${viewport?.height ?? window.innerHeight}px`)
    updateHeight()
    viewport?.addEventListener('resize', updateHeight)
    window.addEventListener('resize', updateHeight)
    return () => {
      viewport?.removeEventListener('resize', updateHeight)
      window.removeEventListener('resize', updateHeight)
    }
  }, [])
  return (
    <div className="ao-page qf-page" ref={pageRef}>
      <a className="qf-skip" href="#main">Skip to {phase === 'quiz' ? 'questions' : 'next steps'}</a>
      <header className="qf-header">
        <PageLink className="qf-brand" href="/" aria-label="Wallace Shift home">WALLACE SHIFT</PageLink>
        <PageLink href="/contact">Contact us</PageLink>
      </header>
      <main id="main">
        {phase === 'quiz' && <div className="qf-introduction">
          <h1>Find your first useful AI project.</h1>
          <p>Start with what is holding your business back. Your answers will help identify a practical next step.</p>
        </div>}
        <AiOpportunityForm onPhaseChange={setPhase} renderRecommendation={(values, onRequestContact) => <AiOpportunityRecommendation values={values} onRequestContact={onRequestContact} />} />
      </main>
      <footer className="qf-footer">
        <span>Wallace Shift</span>
        <div><PageLink href="/about">About us</PageLink><PageLink href="/privacy">Privacy</PageLink></div>
      </footer>
    </div>
  )
}
