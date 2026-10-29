/** An editorial shot list, in milliseconds. Camera coordinates are percentages
 * of the image, keeping motion independent of the viewport size. */
export const filmShots = [
  { asset: 'hero-1', width: 1600, smallWidth: 800, name: 'The open road', duration: 5600, dissolve: 650, from: [1.02, 0, 0], to: [1.16, -3, -1.5], origin: '70% 55%' },
  { asset: 'film-detail', width: 1920, smallWidth: 960, name: 'In the details', duration: 3800, dissolve: 240, from: [1.2, 2, 1], to: [1.06, -2, 0], origin: '70% 50%' },
  { asset: 'film-engine', width: 1920, smallWidth: 960, name: 'Under the hood', duration: 6000, dissolve: 600, from: [1.04, 0, 1.8], to: [1.22, -2, -2], origin: '70% 55%' },
  { asset: 'film-aerial', width: 1920, smallWidth: 960, name: 'A different perspective', duration: 5000, dissolve: 300, from: [1.17, 2, -1.5], to: [1.04, -1, 1.5], origin: '65% 50%' },
  { asset: 'film-rear', width: 1920, smallWidth: 960, name: 'The road ahead', duration: 5200, dissolve: 650, from: [1.05, -2, 0], to: [1.16, 1.5, -1], origin: '70% 50%' },
] as const

export const filmDuration = filmShots.reduce((sum, shot) => sum + shot.duration, 0)
export const shotStarts = filmShots.map((_, index) => filmShots.slice(0, index).reduce((sum, shot) => sum + shot.duration, 0))

export function filmFrame(elapsed: number) {
  const time = Math.max(0, elapsed) % filmDuration
  let index = filmShots.length - 1
  for (let i = 0; i < filmShots.length; i++) {
    if (time < shotStarts[i] + filmShots[i].duration) { index = i; break }
  }
  const shotTime = time - shotStarts[index]
  const shot = filmShots[index]
  const previous = (index + filmShots.length - 1) % filmShots.length
  // Begin on the establishing shot, not a fade from the end of the film.
  const opacity = index === 0 && elapsed < filmDuration ? 1 : Math.min(1, shotTime / shot.dissolve)
  return { index, previous, opacity, progress: shotTime / shot.duration, outgoingProgress: 1 + shotTime / filmShots[previous].duration, reelProgress: time / filmDuration }
}

export function cameraValues(index: number, progress: number) {
  const shot = filmShots[index]
  const [scale, requestedX, requestedY] = shot.from.map((start, axis) => start + (shot.to[axis] - start) * progress)
  const [originX, originY] = shot.origin.split(' ').map(value => parseFloat(value) / 100)
  // Keep the image covering its viewport, including outgoing camera movement
  // during a dissolve. The small inset prevents subpixel seams at the edges.
  const clamp = (value: number, origin: number) => Math.min(origin * (scale - 1) * 100 - 0.15, Math.max(-(1 - origin) * (scale - 1) * 100 + 0.15, value))
  return { scale, x: clamp(requestedX, originX), y: clamp(requestedY, originY) }
}

export function cameraTransform(index: number, progress: number) {
  const { scale, x, y } = cameraValues(index, progress)
  return `translate3d(${x.toFixed(4)}%, ${y.toFixed(4)}%, 0) scale(${scale.toFixed(5)})`
}
