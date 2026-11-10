import { useEffect, useId, useRef, useState } from 'react'
import { useHydrated } from './hooks'
import { SlidersIcon } from './Icons'

/** Native display preferences, not an overlay: each option maps to a data
 * attribute on <html> that the stylesheet already honours. The same storage
 * key is read by the inline script in the document head before first paint. */
export type TextSize = 'standard' | 'large' | 'largest'
interface Prefs { text: TextSize; contrast: boolean; motion: boolean; underline: boolean; spacing: boolean }
const DEFAULTS: Prefs = { text: 'standard', contrast: false, motion: false, underline: false, spacing: false }
const KEY = 'dc-display'

function read(): Prefs {
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>
    return { ...DEFAULTS, ...stored }
  } catch {
    return DEFAULTS
  }
}

function apply(prefs: Prefs) {
  const root = document.documentElement
  root.dataset.dcText = prefs.text
  root.toggleAttribute('data-dc-contrast', prefs.contrast)
  root.toggleAttribute('data-dc-motion', prefs.motion)
  root.toggleAttribute('data-dc-underline', prefs.underline)
  root.toggleAttribute('data-dc-spacing', prefs.spacing)
}

export default function DisplaySettings() {
  const id = useId()
  const [open, setOpen] = useState(false)
  const hydrated = useHydrated()
  const [chosen, setChosen] = useState<Prefs | null>(null)
  const prefs = chosen ?? (hydrated ? read() : DEFAULTS)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) panel.current?.querySelector<HTMLInputElement>('input:checked, input')?.focus() }, [open])

  function update(next: Partial<Prefs>) {
    const merged = { ...prefs, ...next }
    apply(merged)
    try { window.localStorage.setItem(KEY, JSON.stringify(merged)) } catch { /* private mode: still applied for this visit */ }
    setChosen(merged)
  }

  function close() {
    setOpen(false)
    button.current?.focus()
  }

  const sizes: Array<[TextSize, string]> = [['standard', 'Standard'], ['large', 'Large'], ['largest', 'Largest']]
  const toggles: Array<[keyof Omit<Prefs, 'text'>, string, string]> = [
    ['contrast', 'Higher contrast', 'Darker text, stronger borders, no photos behind text.'],
    ['motion', 'Reduce motion', 'Turns off animations and transitions.'],
    ['underline', 'Underline all links', 'Makes every link easy to spot.'],
    ['spacing', 'Extra spacing', 'More room between lines, words and letters.'],
  ]

  return (
    <div className="dc-display">
      <button ref={button} type="button" className="dc-display-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => (open ? close() : setOpen(true))}>
        <SlidersIcon size={18} /> Display<span className="dc-display-word"> settings</span>
      </button>
      <div ref={panel} id={`${id}-panel`} className="dc-display-panel" hidden={!open} role="group" aria-labelledby={`${id}-heading`} onKeyDown={event => { if (event.key === 'Escape') close() }}>
        <h2 id={`${id}-heading`} className="dc-display-heading">Display settings</h2>
        <p className="dc-display-note">Saved on this device. Your browser’s zoom (Ctrl or ⌘ and +) works too.</p>
        <fieldset>
          <legend>Text size</legend>
          <div className="dc-segmented">
            {sizes.map(([value, label]) => (
              <label key={value}>
                <input type="radio" name={`${id}-text`} value={value} checked={prefs.text === value} onChange={() => update({ text: value })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {toggles.map(([key, label, hint]) => (
          <div className="dc-switch" key={key}>
            <input id={`${id}-${key}`} type="checkbox" checked={prefs[key]} aria-describedby={`${id}-${key}-hint`} onChange={event => update({ [key]: event.target.checked })} />
            <label htmlFor={`${id}-${key}`}>{label}</label>
            <span id={`${id}-${key}-hint`} className="dc-switch-hint">{hint}</span>
          </div>
        ))}
        <div className="dc-display-actions">
          <button type="button" className="dc-link-button" onClick={() => update(DEFAULTS)}>Reset to defaults</button>
          <button type="button" className="dc-button dc-button-small" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  )
}
