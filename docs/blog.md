# Wallace Shift blog

The blog lives at **https://wallaceshift.com/blog**. Articles use stable,
descriptive URLs such as `/blog/how-to-choose-a-crm`. Google does not prefer
subdomains or subdirectories for ranking; the subdirectory keeps this publication
in the same site navigation and deployment as the services it supports.
[Google's guidance](https://developers.google.com/search/help/crawling-index-faq).

## Publishing an article

1. Copy `content/blog/_template.md` into `content/blog/posts/your-article.md`.
2. Keep `status: draft` while writing. Drafts are omitted from the output, index,
   RSS feed, and sitemap. They do not have public preview URLs.
3. Replace every example field and all template prose. Write the question your
   audience actually asks, followed by a short direct answer and useful detail.
   Add firsthand examples and evidence where appropriate. The framework makes
   content crawlable; it does not guarantee indexing or rankings.
4. Set a real author and profile link. Matthew's existing `/about` profile can be
   used for articles he authors. Do not attribute content without review.
5. Use an accurate ISO publication timestamp with a timezone, for example
   `2026-11-04T09:00:00-06:00` (Kansas City standard time). Quote timestamps in YAML.
   Only add `updatedAt` when making a substantive editorial update; it must be
   on or after publication and cannot be in the future.
6. Change `status` to `published`, run `npm run test:blog` and `npm run build`,
   inspect the article in `npm run preview`, then deploy the reviewed build.

Publication is **build-time**. A future `publishedAt` keeps an article private
until a build runs at or after that time. There is no scheduler, CMS, database,
or automatic redeployment. A passed date alone does not publish an article.

Slugs should not change after publication. If an article must move, add a permanent
redirect in `vercel.json` from the old URL to the new URL before deployment.
Do not recycle a retired slug for unrelated content.

## Writing and images

The template's title is the page's H1. Start Markdown headings at `##`; `##` and
`###` headings become a linked table of contents. Markdown supports paragraphs,
lists, links, block quotes, code, and tables. Raw HTML is rejected. Links use
absolute HTTP(S) URLs, root-relative site paths, `mailto:`, or section anchors;
script URLs and protocol-relative links are rejected.

Optional feature images live under `public/media/blog/` and use
`/media/blog/filename.webp` in `image.src`. Supply meaningful `image.alt`, optimize
the file, and confirm that you have permission to use it. In-body Markdown
images require alt text. No placeholder articles are included in production.

## Search and feeds

Every article is a complete static HTML document with its answer and body present
without JavaScript. The build writes unique titles, descriptions, canonical URLs,
social metadata, BlogPosting and breadcrumb structured data, `/blog/feed.xml`,
and entries in the existing `/sitemap.xml`. Publication and modification dates
come from editorial metadata, never the build clock. Drafts and future articles
are excluded everywhere. Missing article URLs return 404.

The empty blog hub is `noindex, follow` and excluded from the sitemap until the
first article is published. Its metadata switches automatically on the next build.
The main site's `robots.txt` already advertises `/sitemap.xml`; no DNS change is
needed for `/blog`. After production release, submit that sitemap in the verified
Google Search Console property and inspect the first article URL. Search Console
submission and Google indexing are separate from a successful deployment.

The blog's styling and navigation are static; Markdown authoring does not load
the site's WebGL or animation bundles. `blog/vite-plugin.ts` serves local blog
documents and writes production files after the main site's sitemap step. The
private demo build does not run the blog plugin.

## Reviewing an unpublished draft locally

Run `npm run blog:preview -- content/blog/posts/your-article.md` and open the
printed loopback URL. Add `--port 4176` if the default port is occupied. The page
shows a draft banner and omits publication dates and structured article data.
It is marked `noindex, nofollow`; the server listens only on `127.0.0.1`.

The source stays unchanged and unpublished. This command never writes to `dist`
or deploys anything. It serves one review snapshot, so stop with Ctrl+C and
restart after editing. Ordinary navigation links open the production site.

Keep unpublished images and PDFs in `content/blog/assets/<article-slug>/`.
Front matter can still use the intended `/media/blog/filename.webp` image URL,
and Markdown can link to `/resources/filename.pdf`. The preview serves those
specific files from the draft directory when they do not exist in `public`.
It does not expose other files or private demos. On approval, copy the chosen
assets into their intended `public/media/blog/` and `public/resources/` locations
as part of publishing the article; draft assets never enter the normal build.
