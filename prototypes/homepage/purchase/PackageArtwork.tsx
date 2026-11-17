// Decorative diagrams of the existing offers. No example data or new claims.
function BrandMark({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y}) scale(.016) translate(-124 -291)`} className="p-art-ink" stroke="none">
    <path d="M124 291H322L516 715L582 572L459 457L540 291H713L640 447L772 581L645 852H396Z" />
    <path d="M952 291H1149L877 852H693Z" />
  </g>
}

function WebsiteArtwork() {
  return <>
    <g className="p-art-line">
      <rect x="22" y="42" width="274" height="170" rx="9" className="p-art-paper" />
      <path d="M22 68h274" />
      <circle cx="37" cy="55" r="2" /><circle cx="46" cy="55" r="2" /><circle cx="55" cy="55" r="2" />
      <path d="M238 55h40" />
    </g>
    <BrandMark x={42} y={82} />
    <path d="M42 112h76m-76 12h59" className="p-art-heading" />
    <path d="M42 141h85m-85 8h68" className="p-art-line" />
    <rect x="42" y="164" width="62" height="16" rx="8" className="p-art-accent" />
    <path d="M82 172h12m-4-4 4 4-4 4" className="p-art-button-mark" />
    <rect x="160" y="82" width="116" height="98" rx="3" className="p-art-wash" />
    <g className="p-art-architecture">
      <path d="m176 127 42-34 42 34m-75-7v47h66v-47" />
      <path d="M205 167v-31h26v31M194 145h4m41 0h4" />
    </g>
    <path d="M42 196h48m20 0h48m20 0h48" className="p-art-line" />
    <g className="p-art-care">
      <path d="M300 26a20 20 0 0 1 30 20m0-9v9h-9M327 58a20 20 0 0 1-30-20m0 9v-9h9" />
    </g>
    <g className="p-art-line">
      <rect x="250" y="126" width="76" height="116" rx="11" className="p-art-paper" />
      <path d="M277 135h22M279 232h18" />
    </g>
    <rect x="258" y="145" width="60" height="39" rx="2" className="p-art-wash" />
    <path d="m272 165 16-13 16 13m-28-4v17h24v-17m-16 17v-10h8v10" className="p-art-architecture" />
    <path d="M263 196h48m-48 6h34" className="p-art-line" />
    <rect x="263" y="214" width="42" height="10" rx="5" className="p-art-accent" />
  </>
}

function FollowUpArtwork() {
  return <>
    <g className="p-art-line">
      <rect x="20" y="40" width="180" height="172" rx="9" className="p-art-paper" />
      <path d="M20 66h180" />
      <circle cx="35" cy="53" r="2" /><circle cx="44" cy="53" r="2" /><circle cx="53" cy="53" r="2" />
      <path d="M155 53h27" />
    </g>
    <BrandMark x={38} y={80} />
    <path d="M67 85h65" className="p-art-heading" />
    <g className="p-art-line">
      <rect x="38" y="105" width="144" height="25" rx="3" />
      <rect x="38" y="139" width="144" height="25" rx="3" />
      <path d="M48 117h55m-55 34h80" />
    </g>
    <rect x="38" y="178" width="78" height="17" rx="8.5" className="p-art-accent" />
    <path d="M91 186.5h14m-4-4 4 4-4 4" className="p-art-button-mark" />
    <path d="M116 186.5h82q20 0 20-20V114q0-25 18-25M312 89h4q14 0 14 14v31m0 28v16" className="p-art-route" />
    <g className="p-art-line">
      <rect x="236" y="62" width="76" height="54" rx="5" className="p-art-paper" />
      <path d="m238 67 36 26 36-26m-72 44 23-21m26 0 23 21" />
    </g>
    <circle cx="330" cy="148" r="14" className="p-art-clock" />
    <path d="M330 140v8l5 3" className="p-art-route" />
    <path d="M261 178h66a7 7 0 0 1 7 7v34a7 7 0 0 1-7 7h-42l-13 10v-10h-11a7 7 0 0 1-7-7v-34a7 7 0 0 1 7-7Z" className="p-art-message" />
    <path d="M270 195h48m-48 11h32" className="p-art-route" />
  </>
}

export default function PackageArtwork({ kind }: { kind: 'website' | 'lead' }) {
  return <div className="p-package-art" aria-hidden="true">
    <svg viewBox="0 0 360 260" width="360" height="260" fill="none" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
      {kind === 'website' ? <WebsiteArtwork /> : <FollowUpArtwork />}
    </svg>
  </div>
}
