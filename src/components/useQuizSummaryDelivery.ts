import { useRef, useState } from 'react'
import type { AiQualificationInput } from '../content/aiOffer'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'

export type SummaryStatus = 'idle' | 'sending' | 'sent' | 'failed'
type Submission = { fingerprint: string; payload: string; status: SummaryStatus }

// Only the quiz answers belong in this notification. Contact details belong to
// the separate Google booking or phone request.
function quizAnswers(values: AiOpportunityFormValues): AiQualificationInput {
  const { businessType, workflows, workflowDetails, currentTools, weeklyHours, impacts, impactDetails,
    role, approverAvailability, revenue, aiExperience, aiBarriers, budget, timing } = values
  return { businessType, workflows, workflowDetails, currentTools, weeklyHours, impacts, impactDetails,
    role, approverAvailability, revenue, aiExperience, aiBarriers, budget, timing }
}

export function useQuizSummaryDelivery() {
  const current = useRef<Submission | null>(null)
  const [status, setStatus] = useState<SummaryStatus>('idle')

  async function deliver(submission: Submission) {
    if (submission.status === 'sending' || submission.status === 'sent') return
    submission.status = 'sending'
    setStatus('sending')
    let accepted = false
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch('/api/ai-booking', {
          method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'content-type': 'application/json' },
          body: submission.payload, signal: AbortSignal.timeout(20000),
        })
        if (response.ok) {
          const result = await response.json().catch(() => null)
          accepted = result?.ok === true && result.notification === 'sent'
        }
        if (response.status < 500) break
      } catch {
        // A dropped response may follow a successful send. Reuse the same key.
      }
    }
    submission.status = accepted ? 'sent' : 'failed'
    if (current.current === submission) setStatus(submission.status)
  }

  function submit(values: AiOpportunityFormValues) {
    const answers = quizAnswers(values)
    const fingerprint = JSON.stringify([answers, values.company])
    if (current.current?.fingerprint !== fingerprint) {
      current.current = {
        fingerprint,
        payload: JSON.stringify({ action: 'quiz-summary', attemptId: crypto.randomUUID(), answers, company: values.company }),
        status: 'idle',
      }
    }
    void deliver(current.current)
  }

  function retry() {
    if (current.current) void deliver(current.current)
  }
  return { status, submit, retry }
}
