const bookingUrl = 'https://calendar.google.com/appointments/schedules/AcZssZ0sJQOQw_yPeOv8Nm_ZBh-hMDulDvuG2vjeUKuqnOlrIYWBcMZkridN50_p7AIMDnlRWSm47HrE'
const filmPath = '/media/ai-consultation/wallace-shift-put-ai-to-work'

export const aiConsultation = {
  durationMinutes: 45,
  fallbackBookingUrl: bookingUrl,
  /** The short studio film plays here until the full consultation walkthrough is ready. */
  walkthrough: {
    title: 'Put AI to work',
    description: 'In 15 seconds, see how AI drafts a reply to a roofing inquiry for a team member to approve.',
    src: `${filmPath}-15s.mp4` as string | null,
    captionsSrc: `${filmPath}-15s.vtt`,
    posterSrc: `${filmPath}-poster.jpg`,
  },
} as const
