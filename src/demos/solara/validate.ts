/** Moves focus to the first control flagged invalid after a failed submit. */
export function focusFirstError(form: HTMLFormElement | null) {
  window.requestAnimationFrame(() => {
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })
}

export const digits = (value: string) => value.replace(/\D/g, '')
export const validPhone = (value: string) => {
  const d = digits(value)
  return d.length === 10 || (d.length === 11 && d.startsWith('1'))
}
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
