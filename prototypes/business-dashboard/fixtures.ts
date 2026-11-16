import type { DashboardDays, DashboardMetric, DashboardSnapshot, DashboardSource } from '../../src/business-dashboard/model'
import type { PublishingSnapshot } from '../../src/business-dashboard/publishing-model'
import type { Engagement } from '../../src/client-portal/model'

export type FixtureScenario = 'connected' | 'partial' | 'empty' | 'error' | 'expired'
export const FIXTURE_NOW = '2026-11-16T16:00:00.000Z'
const endDate = '2026-11-15'
const dateAt = (offset: number) => new Date(Date.parse(`${endDate}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)
const round = (value: number) => Math.round(value * 100) / 100
const metric = (id: string, label: string, value: number, format: DashboardMetric['format'] = 'number', note = 'Synthetic sample in the selected reporting period.'): DashboardMetric => ({ id, label, value, format, note, ...(format === 'currency' ? { currency: 'USD' } : {}) })

/** Entirely invented clients and invoices. Amounts follow the real model's cents convention. */
export const fixtureEngagements: Engagement[] = [
  {
    id: 'fixture-northline', revision: 1, createdAt: '2026-08-10T16:00:00Z', client: 'Sample Northline Roofing', email: 'northline@example.test', title: 'Sample managed website', scope: 'Fixture record only. Website, hosting and basic maintenance.', exclusions: 'No real agreement or service.', delivery: 'Sample site delivered', amount: 25000, cadence: 'monthly', firstDue: '2026-08-15', endDate: '', state: 'issued', agreement: 'Synthetic preview agreement. Not a real contract.', agreementHash: 'fixture-only', issuedAt: '2026-08-10T16:00:00Z', signature: { name: 'Sample Client', email: 'northline@example.test', at: '2026-08-11T16:00:00Z', hash: 'fixture-only', consent: 'Fixture only' },
    invoices: [
      { id: 'fixture-northline-aug', due: '2026-08-15', amount: 25000, fee: 0, status: 'paid', paidAt: '2026-08-15T16:00:00Z' },
      { id: 'fixture-northline-sep', due: '2026-09-15', amount: 25000, fee: 0, status: 'paid', paidAt: '2026-09-15T16:00:00Z' },
      { id: 'fixture-northline-oct', due: '2026-10-15', amount: 25000, fee: 0, status: 'paid', paidAt: '2026-10-15T16:00:00Z' },
      { id: 'fixture-northline-nov', due: '2026-11-15', amount: 25000, fee: 0, status: 'open' },
    ], nextDue: '2026-12-15', audit: [],
  },
  {
    id: 'fixture-elm', revision: 1, createdAt: '2026-10-20T16:00:00Z', client: 'Sample Elm Plumbing', email: 'elm@example.test', title: 'Sample lead page and follow up', scope: 'Fixture record only. Lead page and follow up configuration.', exclusions: 'No real agreement or service.', delivery: 'Sample project in progress', amount: 150000, cadence: 'once', firstDue: '2026-11-10', endDate: '', state: 'issued', agreement: 'Synthetic preview agreement. Not a real contract.', agreementHash: 'fixture-only', issuedAt: '2026-10-20T16:00:00Z', signature: { name: 'Sample Client', email: 'elm@example.test', at: '2026-10-21T16:00:00Z', hash: 'fixture-only', consent: 'Fixture only' },
    invoices: [{ id: 'fixture-elm-nov', due: '2026-11-10', amount: 150000, fee: 0, status: 'paid', paidAt: '2026-11-10T16:00:00Z' }], audit: [],
  },
  {
    id: 'fixture-clearwater', revision: 1, createdAt: '2026-09-01T16:00:00Z', client: 'Sample Clearwater Services', email: 'clearwater@example.test', title: 'Sample managed website', scope: 'Fixture record only. Website, hosting and basic maintenance.', exclusions: 'No real agreement or service.', delivery: 'Sample site delivered', amount: 25000, cadence: 'monthly', firstDue: '2026-09-05', endDate: '', state: 'issued', agreement: 'Synthetic preview agreement. Not a real contract.', agreementHash: 'fixture-only', issuedAt: '2026-09-01T16:00:00Z',
    invoices: [
      { id: 'fixture-clearwater-sep', due: '2026-09-05', amount: 25000, fee: 0, status: 'paid', paidAt: '2026-09-05T16:00:00Z' },
      { id: 'fixture-clearwater-oct', due: '2026-10-05', amount: 25000, fee: 0, status: 'paid', paidAt: '2026-10-05T16:00:00Z' },
      { id: 'fixture-clearwater-nov', due: '2026-11-05', amount: 25000, fee: 0, status: 'open' },
    ], nextDue: '2026-12-05', audit: [],
  },
]

const definitions: [string, string, DashboardSource['category'], string][] = [
  ['portal', 'Wallace Shift client portal', 'operations', 'Recorded payments and the current state of client agreements and invoices.'],
  ['ga4', 'Google Analytics', 'website', 'Measured website visitors, sessions, page views and configured key events.'],
  ['search-console', 'Google Search Console', 'seo', 'Google search clicks, impressions, queries and average search position.'],
  ['mail', 'Wallace Shift Mail', 'email', 'Recent sending activity retained by the mailbox workspace.'],
  ['google-ads', 'Google Ads', 'advertising', 'Account spend, impressions, clicks and attributed conversions.'],
  ['meta-ads', 'Meta Ads', 'advertising', 'Paid account delivery and clicks across Meta placements.'],
  ['linkedin-ads', 'LinkedIn Ads', 'advertising', 'Paid account delivery and conversions reported by LinkedIn.'],
  ['facebook', 'Facebook', 'social', 'Page content views and engagement reported by Meta.'],
  ['instagram', 'Instagram', 'social', 'Professional account content views and interactions.'],
]

export function createFixtureSnapshot(days: DashboardDays, scenario: FixtureScenario = 'connected'): DashboardSnapshot {
  const empty = scenario === 'empty'
  const daily = Array.from({ length: days }, (_, index) => {
    const day = 90 - days + index
    return {
      date: dateAt(index - days + 1), sessions: empty ? 0 : 45 + (day * 17 % 52),
      searchClicks: empty ? 0 : 8 + (day * 7 % 19), searchImpressions: empty ? 0 : 260 + (day * 37 % 280),
      position: 8.8 - (day % 16) / 10,
      adsClicks: empty ? 0 : 9 + (day * 3 % 13), adsImpressions: empty ? 0 : 240 + (day * 27 % 330),
      spend: empty ? 0 : 15 + (day * 13 % 160) / 10, conversions: empty ? 0 : day % 7 === 0 ? 1.5 : day % 3 === 0 ? 1 : 0,
      facebookViews: empty ? 0 : 80 + (day * 29 % 170), facebookEngagements: empty ? 0 : 3 + (day * 3 % 15),
    }
  })
  type DailyKey = Exclude<keyof typeof daily[number], 'date'>
  const sum = (key: DailyKey) => round(daily.reduce((total, row) => total + row[key], 0))
  const series = (id: string, label: string, key: DailyKey, format: DashboardMetric['format'] = 'number') => ({ id, label, format, ...(format === 'currency' ? { currency: 'USD' } : {}), points: daily.map(row => ({ date: row.date, value: row[key] })) })
  const startDate = daily[0].date
  const sources: DashboardSource[] = definitions.map(([id, name, category, description]) => ({
    id, name, category, description, status: 'connected', statusDetail: 'Synthetic sample connection. No provider has been contacted.', freshness: 'Illustrative data only. Refreshing reloads local fixtures, not provider data.', checkedAt: FIXTURE_NOW, dataThrough: endDate, timeZone: id === 'search-console' ? 'America/Los_Angeles' : 'America/Chicago', metrics: [],
    setup: { steps: ['This is a local fixture. Use the authenticated owner workspace to configure actual connections.'] },
  }))
  const source = (id: string) => sources.find(item => item.id === id)!
  const payments = empty ? [] : fixtureEngagements.flatMap(item => item.invoices).filter(invoice => invoice.status === 'paid' && invoice.paidAt && invoice.paidAt.slice(0, 10) >= startDate && invoice.paidAt.slice(0, 10) <= endDate)
  const openInvoices = empty ? [] : fixtureEngagements.flatMap(item => item.invoices).filter(invoice => invoice.status === 'open' || invoice.status === 'processing')
  const paymentSeries = { id: 'collected', label: 'Recorded payments', format: 'currency' as const, currency: 'USD', points: daily.map(row => ({ date: row.date, value: payments.filter(invoice => invoice.paidAt?.slice(0, 10) === row.date).reduce((total, invoice) => total + invoice.amount + invoice.fee - (invoice.refunded ?? 0), 0) / 100 })) }
  Object.assign(source('portal'), {
    metrics: [metric('collected', 'Recorded payments', paymentSeries.points.reduce((total, point) => total + point.value, 0), 'currency', 'Sample payments recorded within selected dates. Not recognized revenue or settlement reconciliation.'), metric('outstanding', 'Outstanding invoices', openInvoices.reduce((total, invoice) => total + invoice.amount, 0) / 100, 'currency', 'Current open invoice principal across all dates.'), metric('activeEngagements', 'Active agreements', empty ? 0 : fixtureEngagements.length, 'number', 'Current issued agreements. Includes unsigned agreements.'), metric('openInvoices', 'Open invoices', openInvoices.length, 'number', 'Current open or processing invoices across all dates.'), metric('overdueInvoices', 'Past due invoices', openInvoices.filter(invoice => invoice.due < '2026-11-16').length, 'number', 'Open invoices due before the fixture date, November 16.')],
    series: paymentSeries, seriesList: [paymentSeries],
    table: { title: 'Current open invoices', columns: [{ key: 'client', label: 'Client' }, { key: 'due', label: 'Due' }, { key: 'amount', label: 'Amount', format: 'currency' }], rows: empty ? [] : fixtureEngagements.flatMap(item => item.invoices.filter(invoice => invoice.status === 'open').map(invoice => ({ client: item.client, due: invoice.due, amount: invoice.amount / 100 }))) },
  })
  const sessions = sum('sessions')
  const views = sessions * 2 + (empty ? 0 : days * 5)
  const sessionsWithKeyEvent = empty ? 0 : Math.floor(sessions * .052)
  Object.assign(source('ga4'), {
    account: { id: 'fixture-ga4', label: 'Sample website property' },
    metrics: [metric('activeUsers', 'Active visitors', Math.floor(sessions * .76), 'number', 'Synthetic distinct visitors for the whole period, not the sum of daily users.'), metric('sessions', 'Sessions', sessions), metric('pageViews', 'Page views', views), metric('keyEvents', 'Key events', sessionsWithKeyEvent + (empty ? 0 : days), 'number', 'All configured sample key events. Not necessarily qualified leads or sales.'), ...(sessions > 0 ? [metric('sessionKeyEventRate', 'Session key event rate', sessionsWithKeyEvent / sessions * 100, 'percent', 'Sample sessions with at least one configured key event divided by sessions. Not event count divided by sessions.')] : []), metric('realtimeUsers', 'Visitors in last 30 min', empty ? 0 : 3, 'number', 'Synthetic live count. Separate from the selected reporting period.')],
    series: series('sessions', 'Sessions', 'sessions'), seriesList: [series('sessions', 'Sessions', 'sessions')],
    table: { title: 'Top pages', columns: [{ key: 'page', label: 'Page' }, { key: 'views', label: 'Views', format: 'number' }], rows: empty ? [] : ['/', '/offers/website', '/offers/lead-page', '/work', '/pricing'].map((page, index) => ({ page, views: Math.floor(views * [0.37, .23, .17, .09, .06][index]) })) },
  })
  const searchClicks = sum('searchClicks'), impressions = sum('searchImpressions')
  Object.assign(source('search-console'), {
    account: { id: 'fixture-search', label: 'sc-domain:example.test' },
    metrics: [metric('clicks', 'Search clicks', searchClicks), metric('impressions', 'Search impressions', impressions), ...(impressions ? [metric('ctr', 'Click through rate', searchClicks / impressions * 100, 'percent', 'Clicks divided by impressions for the whole period.'), metric('position', 'Average position', daily.reduce((total, row) => total + row.position * row.searchImpressions, 0) / impressions, 'decimal', 'Impression weighted average of the topmost result. Not a live or fixed keyword rank.')] : [])],
    series: series('clicks', 'Search clicks', 'searchClicks'),
    seriesList: [
      series('clicks', 'Search clicks', 'searchClicks'),
      series('impressions', 'Search impressions', 'searchImpressions'),
      { id: 'ctr', label: 'Click through rate', format: 'percent', points: daily.filter(row => row.searchImpressions > 0).map(row => ({ date: row.date, value: row.searchClicks / row.searchImpressions * 100 })) },
      { id: 'position', label: 'Average position', format: 'decimal', points: daily.filter(row => row.searchImpressions > 0).map(row => ({ date: row.date, value: row.position })) },
    ],
    table: { title: 'Top search queries', columns: [{ key: 'query', label: 'Search query' }, { key: 'clicks', label: 'Clicks', format: 'number' }, { key: 'impressions', label: 'Impressions', format: 'number' }, { key: 'ctr', label: 'Click through rate', format: 'percent' }, { key: 'position', label: 'Avg. position', format: 'decimal' }], rows: empty ? [] : ['sample contractor website', 'sample lead follow up', 'sample website services', 'sample Kansas City web design'].map((query, index) => ({ query, clicks: Math.floor(searchClicks * [.31, .22, .15, .08][index]), impressions: Math.floor(impressions * [.26, .21, .16, .10][index]), ctr: Math.floor(searchClicks * [.31, .22, .15, .08][index]) / Math.floor(impressions * [.26, .21, .16, .10][index]) * 100, position: [4.7, 7.2, 9.6, 12.3][index] })) },
    statusDetail: 'Synthetic sample. Query rows intentionally do not total the complete property report, as anonymized and omitted queries are not included.',
  })
  const adsMetrics = [metric('spend', 'Ad spend (USD)', sum('spend'), 'currency', 'Sample account currency USD. No currency conversion.'), metric('impressions', 'Impressions', sum('adsImpressions')), metric('clicks', 'Clicks', sum('adsClicks')), metric('conversions', 'Attributed conversions', sum('conversions'), 'decimal', 'Provider attributed conversions. May be fractional and are not deduplicated customers or revenue.')]
  Object.assign(source('google-ads'), { account: { id: 'fixture-google-ads', label: 'Sample Google Ads account' }, metrics: adsMetrics, series: series('clicks', 'Google Ads clicks', 'adsClicks'), seriesList: [series('spend', 'Ad spend', 'spend', 'currency'), series('impressions', 'Impressions', 'adsImpressions'), series('clicks', 'Google Ads clicks', 'adsClicks'), series('conversions', 'Attributed conversions', 'conversions', 'decimal')] })
  Object.assign(source('meta-ads'), { account: { id: 'fixture-meta-ads', label: 'Sample Meta ad account' }, metrics: [metric('spend', 'Ad spend (USD)', round(sum('spend') * .65), 'currency'), metric('impressions', 'Impressions', sum('adsImpressions') * 3), metric('clicks', 'All clicks', sum('adsClicks') * 2), metric('link-clicks', 'Link clicks', Math.floor(sum('adsClicks') * .82))], statusDetail: 'Synthetic account totals only. A daily reporting series is not supplied by the current adapter.' })
  Object.assign(source('linkedin-ads'), { account: { id: 'fixture-linkedin-ads', label: 'Sample LinkedIn ad account' }, metrics: [metric('spend', 'Ad spend (USD)', round(sum('spend') * .8), 'currency'), metric('impressions', 'Impressions', Math.floor(sum('adsImpressions') * .45)), metric('clicks', 'Clicks', Math.floor(sum('adsClicks') * .38)), metric('conversions', 'Attributed conversions', empty ? 0 : Math.floor(sum('conversions') * .4), 'decimal', 'Provider attribution. Do not add to Google conversions to count customers.')], statusDetail: 'Synthetic account totals only. A daily reporting series is not supplied by the current adapter.' })
  Object.assign(source('facebook'), { account: { id: 'fixture-facebook', label: 'Sample Facebook Page' }, metrics: [metric('page_media_view', 'Content views', sum('facebookViews')), metric('page_post_engagements', 'Post engagements', sum('facebookEngagements'))], series: series('page_media_view', 'Content views', 'facebookViews'), seriesList: [series('page_media_view', 'Content views', 'facebookViews'), series('page_post_engagements', 'Post engagements', 'facebookEngagements')] })
  Object.assign(source('instagram'), { account: { id: 'fixture-instagram', label: 'Sample Instagram account' }, metrics: [metric('views', 'Content views', sum('facebookViews') * 2), metric('total_interactions', 'Interactions', sum('facebookEngagements') * 3)], statusDetail: 'Synthetic account totals only. A daily reporting series is not supplied by the current adapter.' })
  Object.assign(source('mail'), { metrics: [metric('sent', 'Accepted for sending', empty ? 0 : days * 3, 'number', 'Within selected dates and retained history only. Provider acceptance is not delivery.'), metric('needsReview', 'Sends needing review', empty ? 0 : 1, 'number', 'Pending, failed or uncertain attempts in retained history.')], dataThrough: empty ? null : '2026-11-15T16:00:00Z' })
  if (scenario === 'partial') {
    Object.assign(source('meta-ads'), { status: 'error', statusDetail: 'Sample provider failure. Meta Ads metrics are unavailable and are not zero.', metrics: [], dataThrough: null })
    Object.assign(source('mail'), { status: 'needs-sign-in', statusDetail: 'Sample mailbox requires a separate sign in.', metrics: [], dataThrough: null })
    Object.assign(source('facebook'), { status: 'needs-setup', statusDetail: 'Sample Page connection has not been configured.', metrics: [], series: undefined, seriesList: undefined, checkedAt: null, dataThrough: null })
    const analytics = source('ga4')
    analytics.metrics = analytics.metrics.filter(item => item.id !== 'realtimeUsers')
    analytics.statusDetail = 'Synthetic historical report available. The live visitor count is unavailable.'
  }
  return {
    schemaVersion: 1, generatedAt: FIXTURE_NOW, range: { days, startDate, endDate, timeZone: 'America/Chicago' }, environment: 'development', sources,
    brief: empty ? [{ id: 'sample-empty', title: 'No activity in this sample', detail: 'The connected sources returned zero activity for the sample period. No sales or results are implied.', sourceIds: ['ga4'], severity: 'info' }] : [{ id: 'sample-invoices', title: '2 sample invoices past due', detail: 'Sample current invoice balances remain the same when the reporting period changes. No reminders have been sent.', sourceIds: ['portal'], severity: 'attention' }, ...(scenario === 'partial' ? [{ id: 'sample-source', title: 'A sample source could not be read', detail: 'Meta Ads reporting is unavailable. The other returned sources remain usable.', sourceIds: ['meta-ads'], severity: 'attention' as const }] : [])],
    agentPolicy: { mode: 'read-only', executionEnabled: false, summaryMethod: 'rules', allowed: ['Read the returned dashboard snapshot', 'Prepare observations for owner review'], requiresApproval: ['Send messages', 'Publish posts', 'Change advertising settings'], note: 'Deterministic observations only. No AI model or autonomous executor is connected.' },
  }
}

export function createPublishingFixture(scenario: FixtureScenario): PublishingSnapshot {
  return {
    page: { id: '143962288', name: 'Wallace Shift · sample preview', url: 'https://www.linkedin.com/company/wallace-shift/' },
    connection: scenario === 'partial' ? { status: 'needs-setup', detail: 'Sample account needs owner setup. This preview cannot connect accounts.' } : { status: 'ready', detail: 'Sample connection state. Publishing, uploads and saved drafts are blocked in this preview.' },
    limits: { text: 3000, imageBytes: 4 * 1024 * 1024, videoBytes: 200 * 1024 * 1024 }, history: [],
  }
}
