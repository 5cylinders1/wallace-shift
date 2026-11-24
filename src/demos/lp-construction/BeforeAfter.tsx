import { useId, useState } from 'react'
import { useLang } from './lang'

/**
 * Two aligned images with a divider. The native range input gives keyboard,
 * touch and screen-reader control; the images carry the alt text.
 */
export default function BeforeAfter({ before, after, beforeAlt, afterAlt, width, height }: {
  before: string; after: string; beforeAlt: string; afterAlt: string; width: number; height: number
}) {
  const id = useId()
  const { t } = useLang()
  const [split, setSplit] = useState(50)
  return (
    <figure className="lp-compare" style={{ aspectRatio: `${width} / ${height}` }}>
      <img src={before} alt={beforeAlt} width={width} height={height} loading="lazy" decoding="async" />
      <img src={after} alt={afterAlt} width={width} height={height} loading="lazy" decoding="async" className="lp-compare-after" style={{ clipPath: `inset(0 0 0 ${split}%)` }} />
      <span className="lp-compare-line" style={{ left: `${split}%` }} aria-hidden="true" />
      <span className="lp-compare-tag lp-compare-tag-before" aria-hidden="true">{t.compare.before}</span>
      <span className="lp-compare-tag lp-compare-tag-after" aria-hidden="true">{t.compare.after}</span>
      <label className="lp-visually-hidden" htmlFor={id}>{t.compare.label}</label>
      <input id={id} type="range" min={0} max={100} value={split} onChange={event => setSplit(Number(event.target.value))} aria-valuetext={t.compare.value(100 - split)} />
    </figure>
  )
}
