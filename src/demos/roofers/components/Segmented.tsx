import './Segmented.css'

interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

interface SegmentedProps<T extends string> {
  legend: string
  name: string
  options: readonly Option<T>[]
  value: T | ''
  onChange: (value: T) => void
  tone?: 'light' | 'dark'
  columns?: number
  error?: string | null
  describedBy?: string
}

/** A radio group drawn as buttons: native inputs, so arrow keys just work. */
export function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  tone = 'light',
  columns,
  error,
  describedBy,
}: SegmentedProps<T>) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <fieldset
      className={`rf-seg rf-seg--${tone}${error ? ' has-error' : ''}`}
      aria-describedby={[describedBy, errorId].filter(Boolean).join(' ') || undefined}
      data-field={name}
    >
      <legend className="rf-seg__legend">{legend}</legend>
      <div className="rf-seg__options" style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
        {options.map((option) => (
          <label key={option.value} className={`rf-seg__option${value === option.value ? ' is-checked' : ''}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="rf-seg__label">{option.label}</span>
            {option.hint && <span className="rf-seg__hint">{option.hint}</span>}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="rf-field-error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
