/** Render existing project templates with synthetic values. Never imports sending functions. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, 'output/page-application');
fs.mkdirSync(OUT, { recursive: true });
const { renderBrandedEmail } = require('/Users/matthewwallace/Repos/reply365/apps/app/src/lib/email-template.js');
const asset = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const replyLogo = asset('/Users/matthewwallace/Repos/reply365/apps/app/public/favicon-96x96.png');
const legacyLogo = asset('/Users/matthewwallace/Repos/masaton-lcp/wp-content/themes/legacy-compounds/assets/images/legacy-logo-email.png');
const sampleLink = 'https://example.com/sample/call';
let reply = renderBrandedEmail({
  branding: { businessName: 'Reply365', appUrl: 'https://www.reply365.app', siteUrl: 'https://reply365.ai' },
  preheader: 'Reply365 captured a new call summary for Demonstration Business.',
  eyebrow: 'Demonstration Business',
  title: 'New call summary',
  paragraphs: ['Reply365 captured a call summary for your team.'],
  cta: { label: 'View call details', url: sampleLink },
  sections: [{ title: 'Call details', rows: [
    { label: 'Business', value: 'Demonstration Business' },
    { label: 'Caller', value: 'Taylor Reed' },
    { label: 'When', value: 'October 28, 2026 at 10:30 AM Central' },
    { label: 'Urgency', value: 'Routine' },
    { label: 'Summary', value: 'Caller requested a callback to discuss an upcoming project.' },
    { label: 'Call record', value: sampleLink },
  ] }],
  footerReason: 'This is a transactional Reply365 call alert for Demonstration Business.',
}).html;
reply = reply.replace(/(<img\b[^>]*\bsrc=")[^"]+("[^>]*>)/g, '$1' + replyLogo + '$2');

const php = fs.readFileSync('/Users/matthewwallace/Repos/masaton-lcp/wp-content/plugins/lcp-core/includes/class-lcp-auth.php', 'utf8');
const start = php.indexOf('private function build_magic_link_email(');
const block = php.slice(start, php.indexOf('return (string) ob_get_clean();', start));
let legacy = block.slice(block.indexOf('<!doctype html>'), block.indexOf('</html>') + 7);
const substitutions = new Map([
  ["<?php esc_html_e('Secure portal access', 'lcp-core'); ?>", 'Secure portal access'],
  ['<?php echo esc_html($preheader); ?>', 'Your secure, single-use link to Legacy Compounds expires in 15 minutes.'],
  ['<?php echo $safe_home_url; ?>', 'https://example.com/'],
  ['<?php echo $safe_logo_url; ?>', legacyLogo],
  ['<?php echo $safe_site_name; ?>', 'Legacy Compounds'],
  ['<?php echo $safe_link; ?>', 'https://example.com/sample-access'],
  ['<?php echo esc_html($link); ?>', 'https://example.com/sample-access'],
  ["<?php echo esc_html(sprintf(_n('%d minute', '%d minutes', $safe_ttl, 'lcp-core'), $safe_ttl)); ?>", '15 minutes'],
  ["<?php echo esc_html(wp_date('Y')); ?>", '2026'],
]);
for (const [from, to] of substitutions) legacy = legacy.split(from).join(to);
if (legacy.includes('<?php')) throw new Error('Unresolved PHP expression');

// Inactive links and inline logos keep the samples independent of accounts and live services.
const sanitize = html => html.replace(/href="[^"]*"/g, 'href="#"');
const samples = [['reply365-call-summary', sanitize(reply)], ['legacy-account-access', sanitize(legacy)]];
const { chromium } = require('/Users/matthewwallace/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  for (const [name, html] of samples) {
    fs.writeFileSync(path.join(OUT, name + '.html'), html);
    const page = await browser.newPage({ viewport: { width: 720, height: 1000 }, deviceScaleFactor: 2 });
    await page.route('**/*', route => route.abort());
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('Rendered two existing email templates with synthetic details and no network access.');
