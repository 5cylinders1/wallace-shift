export const pilot = {
  id: 'velar', name: 'Velar Roof Atelier', path: '/velar',
  tagline: 'A new roof, seen on a sample residence.',
  disclosure: 'Prepared sample study · illustrative planning prices · fictional brand',
  scenes: [
    { title: 'An architectural first impression', caption: 'A cinematic roofing concept, built around a considered home.', focus: '.va-hero', actions: [] },
    { title: 'Compare the existing sample study', caption: 'Move between the original residence and its prepared slate roof.', focus: '.va-visualizer', actions: [{kind:'click',selector:'.va-viz-view-switch button:last-child'},{kind:'range',selector:'input[aria-label="Original and preview comparison position"]',value:'22'},{kind:'range',selector:'input[aria-label="Original and preview comparison position"]',value:'78'}] },
    { title: 'Explore a different material', caption: 'A prepared metal study and local planning range make the choice tangible.', focus: '.va-visualizer', actions: [{kind:'click',selector:'.va-viz-materials button:nth-child(2)'},{kind:'click',selector:'.va-viz-view-switch button:nth-child(2)'}] },
  ],
}
