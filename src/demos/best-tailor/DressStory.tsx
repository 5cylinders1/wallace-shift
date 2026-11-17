import { useState } from 'react'

const stages = [
  { name: 'The first fitting', title: 'It begins with you.', copy: 'Your dress, your shoes, and how you want to feel. Talk through the fit, the details, and the date you have in mind.', image: '/demos/best-tailor/media/first-fitting.webp', alt: 'Illustrative ivory gown with excess length and pins marking the waist at a first fitting' },
  { name: 'The small details', title: 'A little care, everywhere.', copy: 'A hem, a strap, a more comfortable silhouette. Sue can assess your garment and explain the adjustments, timing, and price.', image: '/demos/best-tailor/media/small-details.webp', alt: 'The same illustrative ivory gown with a refined waist and a neatly pinned hem' },
  { name: 'The final try-on', title: 'Ready for your moment.', copy: 'Try your piece with the shoes and undergarments you plan to wear. Check the fit together before taking it home.', image: '/demos/best-tailor/media/final-fitting.webp', alt: 'The finished illustrative ivory gown with a smooth bodice and a clean floor-length hem' },
]

export default function DressStory() {
  const [active, setActive] = useState(0)
  const stage = stages[active]

  return <div className="bt-dress-story">
    <figure className="bt-dress-frame">
      {stages.map((item, index) => <img key={item.image} className={`bt-dress-image ${index === active ? 'is-active' : ''}`} src={item.image} alt={index === active ? item.alt : ''} aria-hidden={index !== active} width="640" height="1086" fetchPriority={index === 0 ? 'high' : 'low'} />)}
      <figcaption>Illustrative fitting story</figcaption>
    </figure>
    <div className="bt-dress-controls" role="group" aria-label="Explore the fitting stages">
      {stages.map((item, index) => <button key={item.name} type="button" aria-pressed={index === active} aria-controls="bt-dress-detail" onClick={() => setActive(index)}><span aria-hidden="true">0{index + 1}</span>{item.name}</button>)}
    </div>
    <div className="bt-dress-detail" id="bt-dress-detail" aria-live="polite" aria-atomic="true"><h2>{stage.title}</h2><p>{stage.copy}</p></div>
  </div>
}
