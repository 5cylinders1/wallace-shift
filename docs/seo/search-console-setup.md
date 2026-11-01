# Wallace Shift Search Console setup handoff

Prepared October 31, 2026. The user believes no Google account currently owns the Search Console property. The account checked during this work had no access to the `wallaceshift.com` domain property and showed an unverified URL-prefix property. **We have not connected or verified the property, changed DNS, submitted a sitemap, or requested indexing.** No verification values or credentials are included here.

## Verify the domain property

1. Sign in to [Google Search Console](https://search.google.com/search-console/) with the business Google account that should retain ownership.
2. Choose **Add property → Domain** and enter `wallaceshift.com`, without a protocol or path. A domain property covers protocols and subdomains. [Google's property instructions](https://support.google.com/webmasters/answer/34592?hl=en)
3. Follow the DNS verification prompt. For manual TXT verification, copy the exact value Google generates into a new TXT record at the domain's authoritative DNS provider. Use the root host format required by that provider, often `@` or blank. Add the record alongside existing records; do not replace website or email records.
4. Save the DNS record, return to Search Console, and select **Verify**. If Google cannot find it, allow DNS propagation and retry. Keep the verification record after success to maintain ownership. [Google's DNS verification instructions](https://support.google.com/webmasters/answer/9008080?hl=en)

Record the verified account and date in the business's account inventory. If another verified owner is discovered, have that owner grant the intended account access instead of assuming the property is unowned.

## Deploy, then submit the sitemap

Do this **only after the SEO changes are deployed to production** and the new service pages are live.

1. Open [the production sitemap](https://wallaceshift.com/sitemap.xml). Confirm it returns XML successfully and lists the intended canonical public pages, including the four service pages. Private, demo, and other intentionally excluded routes should stay out.
2. In the verified domain property's **Sitemaps** report, submit `https://wallaceshift.com/sitemap.xml`.
3. Confirm the report processes the sitemap successfully; investigate fetch or parsing errors. Submission helps discovery but does not guarantee indexing. [Google's sitemap submission guide](https://support.google.com/webmasters/answer/7451001?hl=en)

The two public contractor collections also have their own canonical hosts. After their updated pages are live, submit `https://contractors.wallaceshift.com/sitemap.xml` and `https://roofers.wallaceshift.com/sitemap.xml` in the domain property. Each sitemap lists only its public collection page. Protected interactive demos and fictional business pages remain excluded.

## Inspect three representative pages

After deployment, enter each URL into Search Console's URL Inspection bar:

- `https://wallaceshift.com/`
- `https://wallaceshift.com/services/ai-integration`
- `https://wallaceshift.com/services/custom-crm-development`

Run **Test live URL**. Check successful fetch, crawling and indexing allowed, and the rendered page's main heading and content. Where indexed data is available, compare the declared canonical and Google-selected canonical. The live test cannot establish Google's selected canonical. Request indexing for these updated pages after resolving errors. Use the sitemap for the broader URL set; requests do not guarantee inclusion. [Google's URL Inspection documentation](https://support.google.com/webmasters/answer/9012289?hl=en)

## Establish a performance baseline

Record the deployment and verification dates. Once data is available, save a monthly export of Search results performance: query, page, country, device, clicks, impressions, CTR, and average position. Compare full, equal periods and separate branded searches from service searches. Use United States filtering alongside the all-country report. Search Console reports countries, not a Kansas City city-level segment. [Google's performance report](https://support.google.com/webmasters/answer/7576553?hl=en)

Use the first complete 28-day period as the initial baseline if earlier data is unavailable. Newly added properties can take time to populate; sparse reports are not proof of zero demand. [Google's data availability notes](https://support.google.com/webmasters/answer/96568?hl=en)

For business results, validate that existing `enquiry_submitted` and `enquiry_failed` events reach the chosen analytics system; code hooks alone do not confirm collection. Separate successful form submissions from qualified enquiries recorded by the team. Measure landing page, service requested, and the prospect's voluntarily provided service area in the business's own records to compare Greater Kansas City with remote enquiries. Do not send names, email addresses, or message text to analytics. This is a measurement plan, not a claim that those reports or integrations are configured.

Suggested commit message: `docs: add Search Console verification and measurement handoff`
