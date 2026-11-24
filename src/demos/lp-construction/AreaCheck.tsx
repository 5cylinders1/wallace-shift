import { useId, useState, type FormEvent } from 'react'
import { useLang } from './lang'
import { TalkButtons } from './Layout'
import { checkZip, cleanZip, type AreaResult } from './serviceArea'

/**
 * "Do we work in your area?" Checks a ZIP against the drive-time list on the
 * device (nothing is sent). In the area, it hands the ZIP to the request form.
 */
export default function AreaCheck({ tone = 'light', heading }: { tone?: 'light' | 'dark'; heading?: string }) {
  const id = useId()
  const { t: all, href } = useLang()
  const t = all.area
  const [zip, setZip] = useState('')
  const [result, setResult] = useState<{ zip: string; area: AreaResult } | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const clean = cleanZip(zip)
    setResult({ zip: clean, area: checkZip(clean) })
  }

  const message = result && (result.area === 'invalid' ? t.invalid : t[result.area](result.zip))
  return (
    <form className={`lp-area lp-area-${tone}`} onSubmit={submit} noValidate>
      {heading && <p className="lp-area-heading" id={`${id}-heading`}>{heading}</p>}
      <div className="lp-area-row">
        <label className="lp-visually-hidden" htmlFor={`${id}-zip`}>{t.label}</label>
        <input
          id={`${id}-zip`} name="zip" inputMode="numeric" autoComplete="postal-code" maxLength={10}
          placeholder={t.label} value={zip}
          aria-describedby={result ? `${id}-result` : undefined}
          aria-invalid={result?.area === 'invalid' || undefined}
          onChange={event => setZip(event.target.value)}
        />
        <button type="submit" className="lp-button">{t.button}</button>
      </div>
      <div className="lp-area-result" id={`${id}-result`} role="status" aria-live="polite">
        {result && (
          <>
            <p data-area={result.area}>{message}</p>
            {result.area === 'inside' && (
              <a className="lp-button lp-button-accent" href={href(`/request?zip=${result.zip}`)}>{t.request}</a>
            )}
            {(result.area === 'edge' || result.area === 'unknown') && <TalkButtons tone={tone} textBody={t.textBody(result.zip)} />}
          </>
        )}
      </div>
    </form>
  )
}
