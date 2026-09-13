import { submitContactRequest } from '../../lib/contactAdapter'

type Status = 'idle' | 'submitting' | 'sent' | 'not_configured' | 'error'
type ContactState = { name: string; email: string; status: Status }

/** One controller belongs to one homepage, so presentation changes cannot
 * discard a draft or detach the result of an in-flight submission. */
export function createHeroContactState(submitRequest = submitContactRequest) {
  let state: ContactState = { name: '', email: '', status: 'idle' }
  let pending: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const update = (patch: Partial<ContactState>) => {
    state = { ...state, ...patch }
    listeners.forEach(listener => listener())
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    setName: (name: string) => update({ name }),
    setEmail: (email: string) => update({ email }),
    submit: () => {
      if (pending) return pending
      const payload = { name: state.name, email: state.email, message: '' }
      // Set the pending promise before notifying subscribers, including a
      // newly mounted presentation that might otherwise submit again.
      pending = Promise.resolve()
        .then(() => submitRequest(payload))
        .then(result => {
          if (result.ok) {
            update({ status: 'sent', name: '', email: '' })
          } else {
            update({ status: result.reason === 'not_configured' ? 'not_configured' : 'error' })
          }
        })
        .catch(() => { update({ status: 'error' }) })
        .finally(() => { pending = null })
      update({ status: 'submitting' })
      return pending
    },
  }
}

export type HeroContactState = ReturnType<typeof createHeroContactState>
