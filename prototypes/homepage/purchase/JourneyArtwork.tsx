/** Decorative, fictional coordinator for the local inquiry demonstration. */
export function TeamPortrait() {
  return <svg viewBox="0 0 160 160" fill="none" aria-hidden="true" focusable="false">
    <circle cx="80" cy="80" r="78" fill="var(--portrait-bg, #e4ebef)" />
    <path d="M22 144c3-24 19-36 45-40h26c26 4 42 16 45 40l-2 10H24l-2-10Z" fill="var(--portrait-shirt, #6d92ae)" />
    <path d="m68 92-2 16 14 17 15-17-3-16H68Z" fill="var(--portrait-skin, #d4dfe6)" stroke="#405b6e" strokeWidth="1.5" />
    <path d="m65 105 15 20-13 8-12-25 10-3Zm30 0-15 20 13 8 12-25-10-3Z" fill="#f5f7f8" />
    <path d="M54 58c-9-3-12 4-9 13 1 5 5 8 10 8m51-21c9-3 12 4 9 13-1 5-5 8-10 8" fill="var(--portrait-skin, #d4dfe6)" stroke="#405b6e" strokeWidth="1.5" />
    <path d="M54 45c1-18 50-20 52 0l-1 28c-1 17-12 29-25 29S56 90 55 73l-1-28Z" fill="var(--portrait-skin, #d4dfe6)" stroke="#405b6e" strokeWidth="1.5" />
    <path d="M53 62c-8-16-4-35 11-40 12-5 30-2 37 7 13 1 16 17 7 34l-7-20c-14 5-25 3-34-2-2 9-6 15-14 21Z" fill="#314e64" />
    <path d="M65 66h3m24 0h3m-17 2-3 12h6m-10 8c6 4 12 4 18-1" stroke="#405b6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M60 59c3-2 7-3 11-1m18 0c4-1 8 0 11 2" stroke="#405b6e" strokeWidth="1.5" strokeLinecap="round" />
    <rect className="ij-portrait-envelope" x="49" y="121" width="64" height="36" rx="4" fill="var(--portrait-envelope, #f5f7f8)" stroke="var(--portrait-envelope-line, #405b6e)" strokeWidth="1.5" />
    <path d="m51 124 30 19 30-19" stroke="var(--portrait-envelope-line, #405b6e)" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="m46 132 12 6c5 3 4 10-2 10l-13-1c-5-1-7-5-5-9 1-4 4-7 8-6Zm71 0-12 6c-5 3-4 10 2 10l13-1c5-1 7-5 5-9-1-4-4-7-8-6Z" fill="var(--portrait-skin, #d4dfe6)" stroke="#405b6e" strokeWidth="1.5" />
  </svg>
}
