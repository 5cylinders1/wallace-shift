import { useEffect, useRef, useState } from 'react'
import { services } from '../../content/siteConfig'
import { homeServiceMedia } from '../../content/mediaAssets'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { ServiceRow } from '../Services/ServiceRow'
import '../Services/Services.css'
import './JourneyServiceRows.css'

/** Select the outcome nearest the centre of the visible service rows. */
export function JourneyServiceRows() {
  const rootRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [scrollIndex, setScrollIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const reducedMotion = useReducedMotion()
  // Mobile panels keep their height so changing the active row cannot
  // move the content underneath a user's finger. Only visible loops play.
  const showAll = isMobile || reducedMotion

  useEffect(() => {
    const root = rootRef.current
    if (!root || showAll) return
    const heading = root.closest('.journey-services')?.querySelector<HTMLElement>('.journey-services__header')
    let pending = 0
    const update = () => {
      pending = 0
      const headingBox = heading?.getBoundingClientRect()
      const covered = headingBox && headingBox.top < window.innerHeight && headingBox.bottom > 0
        ? Math.min(headingBox.bottom, window.innerHeight) : 0
      const target = covered + (window.innerHeight - covered) * 0.5
      let candidate: number | null = null
      let nearest = Infinity
      rowRefs.current.forEach((row, index) => {
        if (!row) return
        const box = row.getBoundingClientRect()
        if (box.bottom <= covered || box.top >= window.innerHeight) return
        const distance = Math.abs((box.top + box.bottom) / 2 - target)
        if (distance < nearest) { nearest = distance; candidate = index }
      })
      setScrollIndex(previous => previous === candidate ? previous : candidate)
    }
    const requestUpdate = () => { if (!pending) pending = requestAnimationFrame(update) }
    const observer = new ResizeObserver(requestUpdate)
    observer.observe(root)
    if (heading) observer.observe(heading)
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    requestUpdate()
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      cancelAnimationFrame(pending)
    }
  }, [showAll])

  const activeIndex = focusIndex ?? hoverIndex ?? scrollIndex
  return <div className="journey-services__rows" ref={rootRef}>
    {services.items.map((item, index) => <ServiceRow
      key={item.index}
      ref={element => { rowRefs.current[index] = element }}
      item={item}
      media={homeServiceMedia[item.outcomeWord]}
      isActive={showAll || activeIndex === index}
      reducedMotion={reducedMotion}
      isMobile={isMobile}
      onPointerEnter={() => { if (canHover) setHoverIndex(index) }}
      onPointerLeave={() => setHoverIndex(null)}
      onFocus={() => setFocusIndex(index)}
      onBlur={() => setFocusIndex(null)}
      onClick={() => setFocusIndex(index)}
    />)}
  </div>
}
