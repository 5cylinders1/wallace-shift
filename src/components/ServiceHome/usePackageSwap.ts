import { useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

// FALL is mirrored by the back card's transition delay in package-stack.css.
const FALL = 0.42
const TURN = 0.62

/**
 * Animates the package stack after React has swapped which card is in front.
 * Like a Rolodex, the front card turns on its bottom edge: its top falls
 * toward the viewer and it keeps turning the same way, round underneath,
 * until it stands behind the card that replaced it. CSS owns both resting
 * poses; this only bridges between them, then clears every inline style.
 */
export function usePackageSwap(stackRef: RefObject<HTMLDivElement | null>, front: string, shouldAnimate: RefObject<boolean>) {
  const previous = useRef(front)
  const active = useRef<gsap.core.Timeline | null>(null)

  useGSAP(() => {
    const before = previous.current
    previous.current = front
    const stack = stackRef.current
    if (!stack || before === front) return

    const incoming = stack.querySelector<HTMLElement>(`[data-stack-card="${front}"]`)
    const outgoing = stack.querySelector<HTMLElement>(`[data-stack-card="${before}"]`)
    const tab = stack.querySelector<HTMLElement>('[data-stack-tab]')
    if (!incoming || !outgoing || !tab) return
    const touched = [stack, incoming, outgoing, tab]

    if (active.current) {
      active.current.kill()
      gsap.set(touched, { clearProps: 'all' })
    }
    if (!shouldAnimate.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const styles = getComputedStyle(stack)
    const peek = parseFloat(styles.getPropertyValue('--stack-peek')) || 48
    const scale = parseFloat(styles.getPropertyValue('--stack-scale')) || 0.955
    const radius = parseFloat(getComputedStyle(incoming).borderTopLeftRadius) || 0
    // Browsers shorten computed inset() values, so both ends are spelled out in full for GSAP to pair.
    const clipBelow = (px: number) => `inset(0px 0px ${px}px 0px round ${radius}px)`

    // The incoming card is already in flow; the outgoing one is pinned behind it.
    // Let the outgoing card keep its own height while it is still in front.
    const endHeight = stack.offsetHeight
    const incomingHeight = incoming.offsetHeight
    gsap.set(outgoing, { bottom: 'auto', height: 'auto' })
    const outgoingHeight = outgoing.offsetHeight
    const startHeight = endHeight - incomingHeight + outgoingHeight
    const hiddenBelow = Math.max(0, incomingHeight - outgoingHeight)
    // Deep perspective for tall cards keeps the near edge from ballooning as it falls.
    const perspective = Math.max(2400, outgoingHeight * 4)
    // Look from a third of the way down the card, not from its pivot, so the
    // top edge visibly drops toward the bottom edge as it comes forward.
    const eyeY = parseFloat(styles.paddingTop) + outgoingHeight * 0.35
    // Behind, the card turns on the new front card's bottom edge, so lift it
    // until its top edge clears the front card by the peek.
    const backY = -peek - (1 - scale) * incomingHeight

    // Restore the previous arrangement before the browser paints the new one.
    gsap.set(outgoing, { zIndex: 4, transformOrigin: '50% 100%', backfaceVisibility: 'hidden', y: 0, scale: 1, rotationX: 0 })
    gsap.set(incoming, { zIndex: 1, y: -peek, scale })
    gsap.set(tab, { opacity: 0 })
    gsap.set(stack, { height: startHeight, perspective, perspectiveOrigin: `50% ${eyeY}px` })

    const total = FALL + TURN
    active.current = gsap.timeline({
      onComplete: () => {
        gsap.set(touched, { clearProps: 'all' })
        active.current = null
      },
    })
      .to(stack, { height: endHeight, duration: total, ease: 'power2.inOut' }, 0)
      .fromTo(incoming, { clipPath: clipBelow(hiddenBelow) }, { clipPath: clipBelow(0), duration: total, ease: 'power2.inOut', immediateRender: true }, 0)
      // The front card's top edge falls toward the viewer while its bottom edge holds...
      .to(outgoing, { rotationX: -90, duration: FALL, ease: 'power2.in' }, 0)
      // ...uncovering the card behind, which steps forward into its place.
      .to(incoming, { y: 0, scale: 1, duration: 0.62, ease: 'power2.inOut' }, 0.1)
      // Flat and showing only its hidden back, the card can pass behind unseen,
      // taking the new front card's bottom edge as its pivot.
      .set(outgoing, { zIndex: 1, clearProps: 'height,bottom' }, FALL)
      .set(incoming, { zIndex: 4 }, FALL)
      // It keeps turning the same way: round underneath (its back is hidden from just
      // before edge on), then up behind.
      .to(outgoing, { rotationX: -360, y: backY, scale, duration: TURN, ease: 'power2.out' }, FALL)
      .to(tab, { opacity: 1, duration: 0.25, ease: 'power1.out' }, total - 0.15)
  }, { dependencies: [front], scope: stackRef })
}
