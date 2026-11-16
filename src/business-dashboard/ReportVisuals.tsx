import { useState } from 'react'
import type { DashboardSeries, DashboardSource } from './model'
import { formatValue, metricValue, dateLabel } from './report-format'

export function Metrics({ source, exclude = [] }: { source: DashboardSource; exclude?: string[] }) {
  const metrics = source.metrics.filter(metric => !exclude.includes(metric.id))
  return <dl className="bd-metrics">{metrics.map(metric => <div key={metric.id}><dt>{metric.label}</dt><dd>{metricValue(metric)}</dd></div>)}</dl>
}
export function MetricDefinitions({ source }: { source: DashboardSource }) {
  return <details className="bd-definitions"><summary>How these metrics are measured</summary><dl>{source.metrics.map(metric => <div key={metric.id}><dt>{metric.label}</dt><dd>{metric.note || 'Reported directly by the source.'}</dd></div>)}</dl></details>
}
function availableSeries(source: DashboardSource): DashboardSeries[] {
  return source.seriesList?.length ? source.seriesList : source.series ? [source.series] : []
}

/** Exact returned dates only. A missing day breaks the line instead of implying a value. */
export function TrendChart({ source, compact = false }: { source: DashboardSource; compact?: boolean }) {
  const options = availableSeries(source)
  const [selected, setSelected] = useState('')
  const series = options.find(item => (item.id ?? item.label) === selected) ?? options[0]
  if (!series) return <div className="bd-empty-chart"><p>No daily trend is available from this report.</p><span>Summary values remain available above. Historical values are not estimated.</span></div>
  const points = series.points.filter(point => Number.isFinite(point.value) && point.value >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isFinite(Date.parse(point.date))).toSorted((a, b) => a.date.localeCompare(b.date))
  const selector = options.length > 1 && <label><span className="bd-sr-only">Chart metric for {source.name}</span><select value={series.id ?? series.label} onChange={event => setSelected(event.target.value)}>{options.map(item => <option key={item.id ?? item.label} value={item.id ?? item.label}>{item.label}</option>)}</select></label>
  if (!points.length) return <div className="bd-trend"><div className="bd-chart-heading"><h3>{series.label} over time</h3>{selector}</div><div className="bd-empty-chart"><p>No daily observations were returned for this period.</p><span>This is different from a reported value of zero.</span></div></div>
  const first = Date.parse(points[0].date), last = Date.parse(points.at(-1)!.date)
  const maximum = Math.max(1, ...points.map(point => point.value))
  const x = (date: string) => first === last ? 350 : 78 + (Date.parse(date) - first) / (last - first) * 582
  const y = (value: number) => 178 - value / maximum * 144
  const path = points.map((point, index) => `${index === 0 || Date.parse(point.date) - Date.parse(points[index - 1].date) > 86_400_000 ? 'M' : 'L'}${x(point.date)},${y(point.value)}`).join(' ')
  const value = (n: number) => formatValue(n, series.format ?? (maximum < 3 ? 'decimal' : 'number'), series.currency)
  const axisValue = (n: number) => {
    if (series.format === 'percent') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)}%`
    if (series.format === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: series.currency ?? 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: series.format === 'decimal' ? 1 : n >= 1000 ? 1 : 0 }).format(n)
  }
  const countSeries = !series.format || series.format === 'number'
  const ticks = countSeries && maximum <= 1 ? [0, 1] : countSeries ? [0, Math.floor(maximum / 2), maximum] : [0, maximum / 2, maximum]
  return <div className={`bd-trend ${compact ? 'bd-trend-compact' : ''}`}>
    <div className="bd-chart-heading"><h3>{series.label} over time</h3>{selector}</div>
    <svg className="bd-chart" viewBox="0 0 704 222" role="img" aria-label={`${source.name}: ${series.label}, ${dateLabel(points[0].date)} through ${dateLabel(points.at(-1)!.date)}. ${points.length} reported days. Exact values in View daily data.`}>
      {ticks.map(tick => <g key={tick}><line x1="78" y1={y(tick)} x2="660" y2={y(tick)} className="bd-chart-grid" /><text x="68" y={y(tick) + 4} textAnchor="end">{axisValue(tick)}</text></g>)}
      <path d={path} fill="none" stroke="var(--bd-azure)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => <circle key={`${point.date}-${index}`} cx={x(point.date)} cy={y(point.value)} r={points.length > 40 ? 2 : 3} fill="var(--bd-azure)"><title>{dateLabel(point.date, true)}: {value(point.value)}</title></circle>)}
      <text x="78" y="207">{dateLabel(points[0].date)}</text>{points.length > 2 && <text x="369" y="207" textAnchor="middle">{dateLabel(new Date(first + (last - first) / 2).toISOString())}</text>}{points.length > 1 && <text x="660" y="207" textAnchor="end">{dateLabel(points.at(-1)!.date)}</text>}
    </svg>
    <details className="bd-daily-data"><summary>View daily data</summary><p>Only returned dates are shown. Missing dates are not treated as zero. No previous period comparison was requested.</p><div className="bd-table-scroll" role="region" aria-label={`${source.name}: daily ${series.label}`} tabIndex={0}><table><thead><tr><th scope="col">Date</th><th scope="col" className="bd-number">{series.label}</th></tr></thead><tbody>{points.map((point, index) => <tr key={`${point.date}-${index}`}><td>{dateLabel(point.date, true)}</td><td className="bd-number">{value(point.value)}</td></tr>)}</tbody></table></div></details>
  </div>
}

export function ReportTable({ source }: { source: DashboardSource }) {
  if (!source.table) return null
  const table = source.table
  const barKey = table.columns.find(column => ['views', 'clicks'].includes(column.key))?.key
  const largest = barKey ? Math.max(1, ...table.rows.map(row => Number(row[barKey]) || 0)) : 1
  return <section className="bd-table-section"><div className="bd-chart-heading"><h3>{table.title}</h3><span>{table.rows.length} returned rows</span></div>{table.columns.length > 2 && table.rows.length > 0 && <p className="bd-table-hint">Scroll the table sideways to see all columns.</p>}{table.rows.length ? <div className="bd-table-scroll" role="region" aria-label={`${source.name}: ${table.title}`} tabIndex={0}><table><thead><tr>{table.columns.map(column => <th key={column.key} scope="col" className={column.format ? 'bd-number' : ''}>{column.label}</th>)}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={index}>{table.columns.map(column => <td key={column.key} className={column.format ? 'bd-number' : ''}>{column.key === barKey && typeof row[column.key] === 'number' ? <span className="bd-bar-value"><span className="bd-bar-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Number(row[column.key])) / largest * 100}%` }} /></span><span>{formatValue(Number(row[column.key]), column.format)}</span></span> : typeof row[column.key] === 'number' ? formatValue(row[column.key] as number, column.format) : row[column.key]}</td>)}</tr>)}</tbody></table></div> : <p className="bd-empty-inline">No rows were returned for this reporting period.</p>}</section>
}
