import { Fragment, type ReactNode } from 'react'

export function renderLines(lines: readonly string[]): ReactNode {
  return lines.map((line, index) => (
    <Fragment key={line}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ))
}
