import type { CSSProperties } from 'react'
import { photo, photoSrc, photoSrcSet } from '../photos'

interface Props {
  slug: string
  sizes: string
  className?: string
  position?: string
  priority?: boolean
  /** Decorative when the same picture is described nearby. */
  decorative?: boolean
}

/** A licensed photograph at the right size for where it sits. */
export default function Photo({ slug, sizes, className = '', position, priority = false, decorative = false }: Props) {
  const item = photo(slug)
  const style: CSSProperties | undefined = position ? { objectPosition: position } : undefined
  return <img className={`tb-photo ${className}`} src={photoSrc(slug, 1000)} srcSet={photoSrcSet(slug)} sizes={sizes}
    alt={decorative ? '' : item.alt} width={item.w} height={item.h} style={style}
    loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} />
}
