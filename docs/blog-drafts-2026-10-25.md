# Thirteen-article release — October 25, 2026

The thirteen researched articles are integrated with the current production base, `80e2f39`, on `codex/publish-blog-guides`. The first creation pass was committed as `e8f4d23` on an older local main; this release carries that work forward without removing the three existing articles, their downloads, or the consultation disclosures.

## Publication contents

- Thirteen new articles, each with a direct answer, full body, practical worksheet or checklist, FAQs, primary-source references, and an accurate Wallace Shift organization byline.
- Publication timestamp: `2026-10-25T19:14:48Z`. Publication occurs when this release is deployed; no scheduled publishing service is involved.
- Twenty-four new contextual links connect the thirteen new guides and the three originals. Existing article URLs and original publication timestamps are preserved.
- The inquiry guide now includes an ordered build sequence. The automation guide now defines the process terms and walks through a complete example. These additions complete the planned editorial coverage of the fifty supplied keyword questions across sixteen articles; this is not a claim about Google indexing or rankings.
- Existing author metadata defaults to Person. New Wallace Shift bylines use Organization in both the visible attribution and structured data.
- Feature illustrations and separately designed PDF downloads are optional. The new resources are complete within the articles and do not link to nonexistent files. The original three PDFs and images are retained.

## Release verification

- All eighteen blog and private-preview regression tests passed.
- TypeScript, the main production build, and the private demo build passed. The existing large-bundle notices are warnings; the blog contains full static HTML without application JavaScript.
- Build verification found sixteen published article pages, sixteen RSS items, and seventeen blog sitemap URLs including the hub.
- All 960 internal link, fragment, and image references across the built blog were checked. Main-site anchors rendered by React were confirmed separately in the browser. No article is orphaned.
- All forty-six distinct external citation URLs in the new articles were reachable during review; targeted factual review found no material issue.
- Browser review confirmed the sixteen-entry library, an article's heading, byline, answer, worksheet table, and table-of-contents navigation. Services, pricing, approach, and the Shift Finder section targets exist after rendering.
- `git diff --check` passed. Changes are limited to blog content, author metadata compatibility, the related regression test, and this release record.

## Search follow-up

The build updates `/sitemap.xml`, which is advertised by `/robots.txt`. Search Console submission and Google indexing remain separate from deployment. No connected Search Console tool was available during this pass; do not report submission or indexing as completed without verification.

Commit message: `feat(blog): publish 13 researched guides and connect the article library`
