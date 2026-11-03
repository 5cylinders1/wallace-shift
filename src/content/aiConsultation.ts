const bookingUrl = 'https://calendar.google.com/appointments/schedules/AcZssZ0sJQOQw_yPeOv8Nm_ZBh-hMDulDvuG2vjeUKuqnOlrIYWBcMZkridN50_p7AIMDnlRWSm47HrE'

/** Public schedule supplied by the owner. Do not append quiz or contact details. */
export const aiConsultation = {
  durationMinutes: 45,
  bookingUrl,
  embedUrl: `${bookingUrl}?gv=true`,
  /** Add the finished walkthrough and English WebVTT captions before enabling video offers. */
  walkthrough: {
    src: null as string | null,
    captionsSrc: null as string | null,
  },
} as const
