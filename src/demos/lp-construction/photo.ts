/**
 * Visitors' photos are resized and re-encoded on their own device before
 * anything is sent: smaller uploads on a phone connection, and re-encoding
 * through a canvas drops EXIF metadata, including GPS (their home's location).
 */
export interface PreparedPhoto { dataUrl: string; width: number; height: number; bytes: number }

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Some browsers decode formats (such as HEIC in Safari) only through <img>.
    const url = URL.createObjectURL(file)
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export async function preparePhoto(file: File, maxEdge = 1536, quality = 0.85): Promise<PreparedPhoto> {
  const source = await decode(file)
  const sourceWidth = 'naturalWidth' in source ? source.naturalWidth : source.width
  const sourceHeight = 'naturalHeight' in source ? source.naturalHeight : source.height
  if (!sourceWidth || !sourceHeight) throw new Error('empty image')
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
  const width = Math.round(sourceWidth * scale)
  const height = Math.round(sourceHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(source, 0, 0, width, height)
  if ('close' in source) source.close()
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const bytes = Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4)
  return { dataUrl, width, height, bytes }
}

/** A room idea handed from the idea tool to the request form, for this tab only. */
export interface IdeaHandoff { style: string; finish: string; crown: boolean; photo: string | null; render: string | null }
const KEY = 'lp-room-idea'

export function saveIdea(idea: IdeaHandoff): boolean {
  try { sessionStorage.setItem(KEY, JSON.stringify(idea)); return true } catch { return false }
}

export function readIdea(): IdeaHandoff | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as IdeaHandoff | null
    return value && typeof value.style === 'string' ? value : null
  } catch { return null }
}

export function clearIdea(): void {
  try { sessionStorage.removeItem(KEY) } catch { /* storage unavailable */ }
}
