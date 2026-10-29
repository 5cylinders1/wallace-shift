// Independent acceptance inventory: six roofing websites, four other trade
// websites, and the separate sample CRM. Shared by release and access checks.
export const contractorPreviewIds = [
  'northvane', 'alder-stone', 'contour', 'halcyon', 'velar', 'stratum',
  'datum', 'tambour', 'mitre', 'stillwater', 'roofing-crm',
]
// Public demos shown as tiles without a preview film; they open the demo directly.
export const contractorOpenDemoIds = ['trawsome', 'complete-painting']
export const contractorPreviewFiles = contractorPreviewIds.flatMap(id =>
  ['mp4', 'jpg', 'vtt'].map(extension => `media/demo-previews/${id}.${extension}`),
)
