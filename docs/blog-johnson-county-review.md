# Johnson County contractor article conversion

Source: `/Users/matthewwallace/Downloads/wallace-shift-johnson-county-blog-draft.docx`.

Post: [A Contractor CRM Checklist for the Proposed Johnson County 2027 Code Update](../content/blog/posts/johnson-county-2027-code-update-contractor-crm.md).

The article body, title, proposed slug, description, category, and Matthew Wallace attribution were retained. The blog template supplies the title, author, publication date, and a new direct-answer summary. The source's Kansas City software engineer and Wallace Shift LLC descriptor appears in the closing first-person paragraph. The county-status sentence now states the October 28, 2026 check date. One contextual link to the existing CRM requirements guide was added; the source's existing article and contact links use local site paths.

The Word document is unchanged. Its cover labels, editorial metadata, promotion drafts, publishing checks, and social-post placeholder are not part of the public article. No LinkedIn or Facebook post was sent.

## Source verification

Checked October 28, 2026, America/Chicago:

- [Johnson County code notice](https://www.jocogov.org/department/building-codes/code-regulation-building-and-construction): the 2024 edition remains labeled draft. The notice states that the Board will consider the 2024 International Codes and county amendments on November 12, 2026, with January 1, 2027 effective only if adopted.
- The same notice limits its scope to applicable unincorporated areas, with exclusions stated by the county. The article does not extend the notice to every city within the county.
- [County address lookup](https://maps.jocogov.org/aimssubmit/servicerequests_pln.html): inspected its public HTML. A city result directs users to that city's planning department. No project address was submitted.

Neither source establishes the code edition applicable to an individual pending permit or a grandfathering rule. The article preserves the direction to confirm project-specific requirements with the responsible authority.

This is time-sensitive reporting. If release occurs after the source-check date, recheck the official notice before deployment, especially around the announced November 12 consideration date. No scheduled follow-up or deployment is created by this conversion.

## Validation

All 18 blog tests and the full site build passed, including the 29-article blog verification. The emitted article has one H1, the correct canonical URL and Person author metadata, valid internal blog links and table-of-contents anchors, and no editorial or social-post text from the source packet.

The standalone local preview server could not bind its loopback port because the environment returned `EPERM`. No browser visual check or production deployment was performed. Existing unrelated working-tree changes were preserved.

Suggested commit message: `feat(blog): add Johnson County contractor CRM checklist`
