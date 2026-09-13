// Generated brand media (Runway: nano-banana-pro stills, Seedance 2.0
// ambient loops). Every entry is decorative — sections must read fully
// with the poster alone, and the poster doubles as the reduced-motion and
// video-failure fallback.
export interface AmbientMediaAsset {
  poster: string
  video?: string
}

export type ServiceOutcome = 'TRUST' | 'FLOW' | 'TIME'

export const serviceMedia: Record<ServiceOutcome, AmbientMediaAsset> = {
  TRUST: {
    poster: '/media/generated/svc-trust.webp',
    video: '/media/generated/svc-trust.mp4',
  },
  FLOW: {
    poster: '/media/generated/svc-flow.webp',
    video: '/media/generated/svc-flow.mp4',
  },
  TIME: {
    poster: '/media/generated/svc-time.webp',
    video: '/media/generated/svc-time.mp4',
  },
}

// Cool grades of the preserved original loops, used only by the homepage.
// The original Runway assets and portfolio archives remain unchanged.
export const homeServiceMedia: Record<ServiceOutcome, AmbientMediaAsset> = {
  TRUST: { poster: '/media/services/svc-trust-ice.webp', video: '/media/services/svc-trust-ice.mp4' },
  FLOW: { poster: '/media/services/svc-flow-ice.webp', video: '/media/services/svc-flow-ice.mp4' },
  TIME: { poster: '/media/services/svc-time-ice.webp', video: '/media/services/svc-time-ice.mp4' },
}

export const contactMedia: AmbientMediaAsset = {
  poster: '/media/generated/contact-horizon.webp',
  video: '/media/generated/contact-horizon.mp4',
}
