/**
 * The color studio's choices, shared by the page and /api/paint-render. The server
 * builds every prompt from these allowlisted ids (plus a validated custom
 * hex), never from visitor text. Names are plain descriptions rather than
 * any paint brand's color names.
 */

export interface PaintColor {
  id: string
  name: string
  hex: string
  /** How the color is described to the image model. */
  description: string
}

export const BODY_COLORS: PaintColor[] = [
  { id: 'evergreen', name: 'Deep evergreen', hex: '#2f4a48', description: 'a deep, rich blue-green (dark evergreen teal)' },
  { id: 'navy', name: 'Harbor navy', hex: '#263447', description: 'a deep classic navy blue' },
  { id: 'charcoal', name: 'Soft charcoal', hex: '#3b3e41', description: 'a soft, deep charcoal gray' },
  { id: 'black', name: 'Warm black', hex: '#24221f', description: 'a warm, soft black' },
  { id: 'olive', name: 'Prairie olive', hex: '#5d5b3e', description: 'a deep muted olive green' },
  { id: 'sage', name: 'Sage', hex: '#8f9b84', description: 'a muted gray-green sage' },
  { id: 'slate', name: 'Slate blue', hex: '#6d8395', description: 'a dusty medium slate blue' },
  { id: 'clay', name: 'Fired clay', hex: '#a6654a', description: 'a muted, earthy terracotta clay red' },
  { id: 'greige', name: 'Warm greige', hex: '#cdc4b4', description: 'a warm light greige (gray-beige)' },
  { id: 'butter', name: 'Butter', hex: '#e9dba6', description: 'a soft, pale butter yellow' },
  { id: 'cream', name: 'Cream white', hex: '#efe9dc', description: 'a warm, creamy white' },
]

export const TRIM_COLORS: PaintColor[] = [
  { id: 'warm-white', name: 'Warm white', hex: '#f2ede1', description: 'a crisp warm white' },
  { id: 'bright-white', name: 'Bright white', hex: '#f8f8f5', description: 'a clean bright white' },
  { id: 'black', name: 'Black', hex: '#232323', description: 'a satin black' },
  { id: 'match', name: 'Match the body', hex: '', description: 'the same color as the siding, for a monochrome look' },
  { id: 'keep', name: 'Keep current', hex: '', description: '' },
]

export const DOOR_COLORS: PaintColor[] = [
  { id: 'keep', name: 'Keep current', hex: '', description: '' },
  { id: 'ochre', name: 'Golden ochre', hex: '#c38a2e', description: 'a saturated golden ochre' },
  { id: 'red', name: 'Barn red', hex: '#8e2b25', description: 'a deep barn red' },
  { id: 'black', name: 'Gloss black', hex: '#1f1f1f', description: 'a glossy black' },
  { id: 'blue', name: 'Lake blue', hex: '#2b4c6f', description: 'a deep lake blue' },
  { id: 'wood', name: 'Natural wood', hex: '#9a6a3f', description: 'a stained natural oak wood finish' },
]

export type RenderQuality = 'low' | 'medium'

export interface PaintSelection {
  /** A BODY_COLORS id, or 'custom' with `customHex`. */
  body: string
  customHex?: string
  trim: string
  door: string
}

export interface RenderRequestBody extends PaintSelection {
  photo: string
  quality: RenderQuality
  consent: true
}

export type RenderErrorCode =
  | 'invalid' | 'photo_too_large' | 'disabled' | 'not_configured' | 'rate_limited' | 'limit_reached'
  | 'busy' | 'timed_out' | 'provider_auth' | 'provider_quota' | 'photo_rejected' | 'upstream'

export type RenderResponse =
  | { ok: true; image: string; width: number; height: number; cached: boolean; costUsd: number | null }
  | { ok: false; error: RenderErrorCode; message: string }

export interface RenderStatus {
  ok: true
  enabled: boolean
  message: string
}

export const HEX = /^#[0-9a-f]{6}$/

export const findColor = (list: PaintColor[], id: string) => list.find((color) => color.id === id)

/** A readable name for a selection, for status lines and the estimate request. */
export function describeSelection(selection: PaintSelection): string {
  const body = selection.body === 'custom' ? `Custom ${selection.customHex ?? ''}`.trim() : findColor(BODY_COLORS, selection.body)?.name ?? selection.body
  const trim = findColor(TRIM_COLORS, selection.trim)?.name ?? selection.trim
  const door = findColor(DOOR_COLORS, selection.door)?.name ?? selection.door
  return `${body} siding · ${trim} trim · ${door} door`
}
