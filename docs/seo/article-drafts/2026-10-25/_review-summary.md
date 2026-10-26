# Editorial handoff and validation

This batch contains 12 complete, unpublished Markdown articles and 12 proposed metadata records. The final whitespace word count is 21,263, including tables and Markdown references. Publication dates and author attribution are deliberately unassigned pending conversion into blog posts.

## Completed review

- Read all 12 drafts for scope, clarity, unsupported claims, duplicate coverage, and consistency. Independent cross-review found no material editorial issues.
- Checked cited provider documentation while drafting. Detailed evidence and limits are in the three topic review files; volatile product behavior should be checked again if publication is delayed.
- Verified the shared fictional customer, locations, people, tasks, submission identifiers, and financial assumptions across articles.
- Checked article structure, absence of unfinished placeholders, fictional-example labeling, metadata-to-file matching, and every reading-index link. Existing blog links map to current local post files. This is not a live HTTP availability or indexing check.
- Verified the fictional budget arithmetic and the distinction between cash costs, optional reserve, and internal effort. The inquiry example retains its different denominators and does not label an unexplained discrepancy as proven lost leads.

## Workbook validation

The exported XLSX contains 13 sheets: an introduction and one worksheet per article. Every sheet was visually inspected for readability and clipping. Response columns and visible input-cell boundaries were added following review.

The calculator was recalculated before export. Both example budgets matched independent expected results. A zero-support-cost input changed the first-year result correctly; a missing required input displayed `n.a.`. Inputs were then restored to the article examples. A read-only check of the exported XLSX confirmed the cached results and found no formula-error cells.

This validates the generated workbook and its formula engine results. It does not represent a native Microsoft Excel session, a live integration test, a migration, or an AI-provider evaluation.

## Scope of this pass

All new work is editorial material and its companion resources. No new draft was added to `content/blog/posts`, published, deployed, or submitted to Search Console. Existing unrelated site changes were preserved. No commit or push was performed.

Suggested commit message: `docs(blog): draft twelve CRM and automation articles with worksheets`
