import { PREFERRED_LOGO_APPEARANCE, type LogoAppearance } from './waterHeroConfig'

interface LogoAppearanceSelectorProps {
  appearance: LogoAppearance
  onChange: (appearance: LogoAppearance) => void
}

export function LogoAppearanceSelector({ appearance, onChange }: LogoAppearanceSelectorProps) {
  return (
    <div className="water-hero__looks" role="group" aria-label="Logo appearance comparison">
      <button type="button" aria-pressed={appearance === 'led'} onClick={() => onChange('led')}>
        LED{PREFERRED_LOGO_APPEARANCE === 'led' && <span className="water-hero__look-preferred"> · Top runner</span>}
      </button>
      <button type="button" aria-pressed={appearance === 'electric'} onClick={() => onChange('electric')}>
        Electrified
      </button>
      <button type="button" aria-pressed={appearance === 'glass'} onClick={() => onChange('glass')}>
        Glass · Previous homepage
      </button>
      <button type="button" aria-pressed={appearance === 'chrome'} onClick={() => onChange('chrome')}>
        Black Chrome
      </button>
      <button type="button" aria-pressed={appearance === 'frosted'} onClick={() => onChange('frosted')}>
        Frosted Crystal
      </button>
      <button type="button" aria-pressed={appearance === 'pearl'} onClick={() => onChange('pearl')}>
        Pearl Ceramic
      </button>
      <button type="button" aria-pressed={appearance === 'copper'} onClick={() => onChange('copper')}>
        Smoked Copper
      </button>
      <button type="button" aria-pressed={appearance === 'mercury'} onClick={() => onChange('mercury')}>
        Liquid Mercury
      </button>
      <button type="button" aria-pressed={appearance === 'cutlight'} onClick={() => onChange('cutlight')}>
        Central Light
      </button>
      <button type="button" aria-pressed={appearance === 'studio'} onClick={() => onChange('studio')}>
        Studio · Silver & Blue
      </button>
      <label className="water-hero__look-menu">
        <span>Style</span>
        <select value={appearance} onChange={event => onChange(event.target.value as LogoAppearance)}>
          <option value="led">LED · Top runner</option>
          <option value="electric">Electrified</option>
          <option value="glass">Glass · Previous homepage</option>
          <option value="chrome">Black Chrome</option>
          <option value="frosted">Frosted Crystal</option>
          <option value="pearl">Pearl Ceramic</option>
          <option value="copper">Smoked Glass · Copper Edges</option>
          <option value="mercury">Liquid Mercury</option>
          <option value="cutlight">Central Light</option>
          <option value="studio">Studio · Silver & Blue</option>
        </select>
      </label>
    </div>
  )
}
