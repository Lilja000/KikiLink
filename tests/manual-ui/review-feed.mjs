// Optional painted-browser review. Start scripts/preview-ui.mjs first.
// Uses the actual app fixture; no production account or Cloud endpoint is used.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw new Error('Install Playwright outside the production dependency set to run this optional review.');
  playwright = createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/`)('playwright');
}
const output = resolve('.local-dev/feed-review');
const address = process.env.KIKILINK_VISUAL_URL || 'http://127.0.0.1:8765';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(address).hostname), 'Visual review must use a local fixture.');
await mkdir(output, { recursive: true });
const browser = await playwright.chromium.launch({ headless: true });
const results = [];
try {
  for (const [width, height] of [[1280, 800], [980, 740], [390, 844], [390, 340]]) {
    for (const density of ['comfortable', 'compact', 'super-compact']) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width === 390, isMobile: width === 390 });
      // Refuse real network calls if a fixture route accidentally escapes the mock.
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ? route.continue() : route.abort();
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${address}/?page=feed&density=${density}&persist=1`, { waitUntil: 'domcontentloaded' });
      await page.locator('.kl-feed-post[data-post-id="7"]').waitFor();
      await page.locator('.kl-feed-poll').first().waitFor();
      await page.addStyleTag({ content: '#fixture-tools,#fixture-state,#metric-output{display:none!important}' });
      const geometry = await page.evaluate(() => {
        const root = document.querySelector('#kikilink-root').shadowRoot;
        const selectors = ['.kl-panel', '.kl-feed-main', '.kl-feed-tools', '.kl-feed-filter', '.kl-feed-post', '.kl-feed-poll'];
        return selectors.flatMap(selector => [...root.querySelectorAll(selector)].filter(node => node.getClientRects().length).map(node => {
          const rect = node.getBoundingClientRect();
          return { selector, id: node.dataset.postId, left: rect.left, right: rect.right, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
        }));
      });
      for (const item of geometry) {
        assert.ok(item.left >= -1 && item.right <= width + 1, `${width}/${density}: ${item.selector} extends past viewport`);
        assert.ok(item.scrollWidth <= item.clientWidth + 2, `${width}/${density}: ${item.selector} overflows horizontally`);
      }
      assert.deepEqual(errors, [], `Unexpected browser errors at ${width}/${density}`);
      const image = `${width}x${height}-${density}.png`;
      await page.screenshot({ path: resolve(output, image), fullPage: true });
      results.push({ width, height, density, image, geometry });
      await context.close();
    }
  }
  // Distinct stateful checks go beyond CSS presence and static mock data.
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${address}/?page=feed&persist=1`, { waitUntil: 'domcontentloaded' });
  const composer = page.getByRole('textbox', { name: 'Share a post', exact: true });
  await composer.fill('A draft kept while new posts arrive.');
  await composer.focus();
  await page.evaluate(() => window.fixture.feed.addIncoming());
  await page.locator('.kl-feed-post[data-post-id="9"]').waitFor();
  assert.equal(await composer.inputValue(), 'A draft kept while new posts arrive.');
  assert.equal(await composer.evaluate(node => node.getRootNode().activeElement === node), true, 'Live Feed update stole composer focus');
  // Wait for the real draft store to finish; reloading uses a new view instance.
  await page.waitForFunction(() => [...document.querySelector('#kikilink-root').shadowRoot.querySelectorAll('[role="status"]')].some(node => /draft saved/i.test(node.textContent)));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await composer.waitFor();
  await page.waitForFunction(() => document.querySelector('#kikilink-root').shadowRoot.querySelector('textarea[aria-label="Share a post"]')?.value === 'A draft kept while new posts arrive.');
  await page.getByRole('button', { name: 'Friends', exact: true }).click();
  await page.waitForFunction(() => {
    const root = document.querySelector('#kikilink-root').shadowRoot;
    return [...root.querySelectorAll('.kl-feed-post')].length === 3;
  });
  await page.getByRole('button', { name: 'Hidden', exact: true }).click();
  await page.locator('.kl-feed-post[data-post-id="1"]').waitFor();
  await page.locator('[data-post-id="1"] summary').click();
  await page.getByRole('button', { name: 'Restore post', exact: true }).click();
  await page.locator('.kl-feed-post[data-post-id="1"]').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Everyone', exact: true }).click();
  await page.locator('.kl-feed-post[data-post-id="1"]').waitFor();
  await context.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ browser: await browser.version(), results, statefulChecks: ['live-update-retains-draft-and-focus', 'draft-survives-page-reload', 'friends-filter', 'restore-hidden-post'] }, null, 2));
  console.log(`Painted browser checks passed; screenshots and report: ${output}`);
} finally { await browser.close(); }
