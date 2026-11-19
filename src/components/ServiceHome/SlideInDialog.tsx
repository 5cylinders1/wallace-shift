import { useCallback, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import './call-request.css'

type Props = {
  open: boolean
  onClose: () => void
  labelledBy: string
  describedBy?: string
  closeLabel: string
  /** Receives focus when the panel opens; usually the panel heading. */
  initialFocus: RefObject<HTMLElement | null>
  /** Any element inside marked data-dismiss closes the panel when clicked. */
  children: ReactNode
}

/**
 * The homepage's slide-in panel: a native modal dialog that locks page scroll (including on iOS),
 * fits the visible viewport when the keyboard opens, keeps Tab inside, animates closed and returns
 * focus to whatever opened it. Shared by the contact form and the package checkout.
 */
export default function SlideInDialog({ open, onClose, labelledBy, describedBy, closeLabel, initialFocus, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismiss = useCallback(() => {
    if (closeTimer.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    if (dialog.current) dialog.current.dataset.closing = 'true'
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      onClose()
    }, 180)
  }, [onClose])

  useLayoutEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const { scrollX, scrollY } = window
    const body = document.body
    const root = document.documentElement
    const original = {
      position: body.style.position, top: body.style.top, left: body.style.left,
      width: body.style.width, paddingRight: body.style.paddingRight, overflow: root.style.overflow,
      scrollbarWidth: root.style.getPropertyValue('--modal-scrollbar-width'),
    }
    const scrollbar = window.innerWidth - root.clientWidth
    const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0
    // Fixing the body also locks iOS scrolling. Compensate for the scrollbar
    // before removing it so the page behind the dialog does not reflow.
    Object.assign(body.style, {
      position: 'fixed', top: `${-scrollY}px`, left: `${-scrollX}px`,
      width: '100%', paddingRight: `${padding + scrollbar}px`,
    })
    // Viewport-fixed navigation ignores body padding, so preserve its own
    // containing width while the document scrollbar is removed as well.
    root.style.setProperty('--modal-scrollbar-width', `${scrollbar}px`)
    root.style.overflow = 'hidden'
    const viewport = window.visualViewport
    const fitVisibleViewport = () => {
      if (!viewport) return
      element.style.setProperty('--call-visible-height', `${viewport.height}px`)
      element.style.setProperty('--call-visible-top', `${viewport.offsetTop}px`)
    }
    fitVisibleViewport()
    viewport?.addEventListener('resize', fitVisibleViewport)
    viewport?.addEventListener('scroll', fitVisibleViewport)
    delete element.dataset.closing
    element.showModal()
    element.scrollTop = 0
    initialFocus.current?.focus({ preventScroll: true })

    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
      closeTimer.current = null
      viewport?.removeEventListener('resize', fitVisibleViewport)
      viewport?.removeEventListener('scroll', fitVisibleViewport)
      element.style.removeProperty('--call-visible-height')
      element.style.removeProperty('--call-visible-top')
      element.close()
      const { overflow, scrollbarWidth, ...bodyStyles } = original
      Object.assign(body.style, bodyStyles)
      root.style.overflow = overflow
      if (scrollbarWidth) root.style.setProperty('--modal-scrollbar-width', scrollbarWidth)
      else root.style.removeProperty('--modal-scrollbar-width')
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      opener?.focus({ preventScroll: true })
    }
  }, [open, initialFocus])

  // A closed dialog renders identically during prerendering and hydration.
  if (!open) return null

  return createPortal(
    <dialog ref={dialog} className="call-request-dialog" aria-labelledby={labelledBy} aria-describedby={describedBy} onCancel={event => { event.preventDefault(); dismiss() }} onClick={event => { if ((event.target as Element).closest('[data-dismiss]')) dismiss() }} onKeyDown={event => {
      if (event.key !== 'Tab') return
      // Native modality makes the background inert. Explicitly wrap the two
      // ends as well so Tab does not move into browser chrome in Chromium.
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, summary, iframe, [tabindex]'))
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }}>
      <div className="call-request-shell">
        <header className="call-request-header">
          <span className="call-request-brand">WALLACE SHIFT</span>
          <button type="button" className="call-request-close" onClick={dismiss} aria-label={closeLabel}>Close<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </header>
        {children}
      </div>
    </dialog>, document.body,
  )
}
