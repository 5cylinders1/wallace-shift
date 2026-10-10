/** The sample contractor's mark: two ridgelines under a weather vane. */
export function BrandMark({ className = 'rf-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="10" fill="#14181c" />
      <path d="M10 40 32 20l22 20" fill="none" stroke="#f4f1ea" strokeWidth="6" />
      <path d="M18 48 32 35l14 13" fill="none" stroke="#b4582a" strokeWidth="6" />
      <path d="M32 8v10" stroke="#f4f1ea" strokeWidth="3" />
      <path d="M32 9l8 3-8 3z" fill="#b4582a" />
    </svg>
  )
}
