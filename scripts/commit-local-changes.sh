#!/usr/bin/env bash

set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

if ! git diff --cached --quiet; then
  echo "Refusing to run: the index already contains staged changes." >&2
  echo "Review or clear the index, then run this script again." >&2
  exit 1
fi

commit_group() {
  local message=$1
  shift

  git add -- "$@"
  if git diff --cached --quiet; then
    echo "Skipping empty group: $message"
    return
  fi
  git commit -m "$message"
}

# Contractor demo, public preview media, and the checks/configuration that keep
# those assets public while keeping the interactive implementation private.
commit_group \
  "feat: add contractor demo preview gallery" \
  .gitignore \
  .vercelignore \
  vercel.json \
  docs/demos/contractor-preview-audit.md \
  public/media/demo-previews \
  scripts/contractor-preview-contract.mjs \
  scripts/commit-local-changes.sh \
  scripts/test-contractor-gallery.mjs \
  scripts/test-demo-access.mjs \
  scripts/test-demo-preview.mjs \
  scripts/verify-demo-build.mjs \
  src/demos/contractors \
  videos/contractor-previews

# Published articles, revisions, review notes, and the downloadable worksheet.
commit_group \
  "docs: add CRM automation guides and worksheet" \
  content/blog/posts/ai-vs-rules-based-automation-inquiries.md \
  content/blog/posts/automation-audit-scope-deliverables-cost.md \
  content/blog/posts/automation-failure-recovery-checklist.md \
  content/blog/posts/automate-client-onboarding.md \
  content/blog/posts/client-portal-vs-crm-service-business.md \
  content/blog/posts/connect-website-form-to-crm.md \
  content/blog/posts/contact-form-not-sending-email.md \
  content/blog/posts/crm-implementation-cost-service-business.md \
  content/blog/posts/crm-migration-checklist-service-business.md \
  content/blog/posts/crm-requirements-template-service-business.md \
  content/blog/posts/custom-crm-vs-off-the-shelf.md \
  content/blog/posts/johnson-county-2027-code-update-contractor-crm.md \
  content/blog/posts/save-time-with-automation-stop-losing-hours-to-busy-work.md \
  content/blog/posts/small-business-automation-tools.md \
  content/blog/posts/spreadsheet-vs-crm-service-business.md \
  content/blog/posts/track-website-inquiries-qualified-leads.md \
  content/blog/posts/what-your-service-website-must-have-to-get-more-inquiries.md \
  docs/blog-johnson-county-review.md \
  docs/seo/article-drafts/2026-10-25/README.md \
  public/resources/blog/wallace-shift-business-systems-worksheets.xlsx

# Proposal packages and the document-generation helper used to prepare them.
commit_group \
  "docs: add proposal packages and service PDF builder" \
  docs/proposals \
  scripts/build-services-pdf.py

if ! git diff --quiet || [[ -n $(git ls-files --others --exclude-standard) ]]; then
  echo "Warning: changes remain outside the commit groups:" >&2
  git status --short >&2
fi
