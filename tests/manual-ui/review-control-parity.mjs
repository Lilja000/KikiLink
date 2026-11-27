// Run against a local populated manual-ui fixture. KIKILINK_VISUAL_URL and
// KIKILINK_CHROMIUM_PATH optionally select its URL and the browser executable.
import assert from 'node:assert/strict';
import { reviewEmptyResults, reviewSearchFields, reviewPagination } from './review-search-results.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/package.json`)('playwright');
}
const address = new URL(process.env.KIKILINK_VISUAL_URL || 'http://127.0.0.1:8765');
assert.ok(['http:', 'https:'].includes(address.protocol) && ['localhost','127.0.0.1','[::1]'].includes(address.hostname), 'A local fixture URL is required.');
for (const key of ['creator', 'populated', 'music', 'rooms']) address.searchParams.set(key, '1');

function appearance(control) {
  const rect = control.getBoundingClientRect(), style = getComputedStyle(control);
  const icon = control.querySelector('svg')?.getBoundingClientRect();
  return {
    size: [rect.width, rect.height], border: style.borderTop, radius: style.borderRadius,
    fill: style.backgroundColor, ink: style.color, font: style.font, outline: style.outline,
    icon: icon && [icon.width, icon.height],
  };
}

async function navigate(page, area, route) {
  await page.locator(`.kl-platform-area[data-area="${area}"]:visible`).click();
  const link = page.locator(`.kl-platform-link[data-route="${route}"]:visible`);
  if (area === 'explore' && route === 'people') {
    await page.locator('.kl-platform-link[data-route="discover"]:visible').click();
    await page.getByRole('button', {name: 'People', exact: true}).click();
  } else if (area !== 'create') await link.click(); // Workshop supplies its own section navigation.
  await page.mouse.move(2, 2);
}

async function review(page, touch) {
  await navigate(page, 'explore', 'discover');
  const discover = page.locator('.kl-discover-page:visible');
  const links = ['Communities', 'People'].map(name => discover.locator(`header button[aria-label="${name}"]`));
  const idle = await Promise.all(links.map(link => link.evaluate(appearance)));
  assert.deepEqual(idle[0], idle[1], 'Discover links must have identical resting styles and dimensions.');
  assert.equal(idle[0].size[1], touch ? 44 : 32);
  assert.match(idle[0].border, /^1px solid /);
  assert.notEqual(idle[0].fill, 'rgba(0, 0, 0, 0)');
  const supportsHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  for (const state of supportsHover ? ['hover', 'focus'] : ['focus']) {
    const styles = [];
    for (const link of links) {
      if (state === 'hover') await link.hover();
      else { await page.keyboard.press('Tab'); await link.focus(); }
      await link.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
      styles.push(await link.evaluate(appearance));
      await page.mouse.move(2, 2);
      await link.evaluate(element => element.blur());
    }
    assert.deepEqual(styles[0], styles[1], `Mismatched Discover ${state} styles`);
    if (state === 'hover') assert.notEqual(styles[0].fill, idle[0].fill, 'Hover should highlight the navigational button');
    else assert.match(styles[0].outline, /solid 2px|2px solid/);
  }

  const menus = [
    ['explore', 'events', '.kl-ev-menu-trigger', '.kl-shell-menu[open]'],
    ['explore', 'communities', '.kl-cm-more', '.kl-shell-menu[open]'],
    ['feed', 'feed', 'summary[aria-label="Post options"]', '.kl-social-menu[open] > .kl-social-menu-items'],
    ['game', 'music', '.kl-music-playlist-menu > summary', '.kl-music-playlist-menu[open] > .kl-music-playlist-actions'],
  ];
  let firstTrigger, firstRow;
  for (const [area, route, selector, popup] of menus) {
    await navigate(page, area, route);
    const trigger = page.locator(`${selector}:visible`).first();
    await trigger.waitFor();
    const style = await trigger.evaluate(appearance);
    const square = touch ? 44 : 32;
    assert.deepEqual(style.size, [square, square], `${route} overflow target`);
    assert.deepEqual(style.icon, [16, 16], `${route} overflow glyph`);
    assert.equal(style.fill, 'rgba(0, 0, 0, 0)', `${route} should show unboxed dots`);
    assert.match(style.border, /^0px none /);
    const buttonColors = [style.fill, style.border, style.radius, style.ink];
    firstTrigger ??= buttonColors;
    assert.deepEqual(buttonColors, firstTrigger, `${route} overflow colors or outline`);
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.locator(`${popup}:visible`);
    await menu.waitFor();
    const row = menu.locator(':scope > button:visible').first();
    const item = await row.evaluate(appearance);
    assert.equal(item.size[1], touch ? 44 : 36, `${route} action row height`);
    const rowStyle = [item.size, item.radius, item.font];
    firstRow ??= rowStyle;
    assert.deepEqual(rowStyle, firstRow, `${route} action row geometry or typography`);
    await row.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    assert.ok(await trigger.evaluate(node => node.getRootNode().activeElement === node), `${route} should return focus to its opener`);
  }
}

// Native selects and segmented filters are often replaced when their result lists refresh.
async function reviewBrowseControls(page, touch) {
  const routes = [
    ['communities', 'explore', 'communities', 'Sort communities', '.kl-cm-tabs', 'My communities'],
    ['events', 'explore', 'events', 'Sort events', '.kl-ev-scopes', 'My plans'],
    ['workshop', 'create', 'workshop', 'Sort catalogue', '.kl-workshop-scopes', 'Saved'],
    ['installed', 'create', 'workshop', 'Sort installed creations', '.kl-workshop-scopes', 'Saved'],
    ['people', 'explore', 'people', 'Sort people'],
    ['feed', 'feed', 'feed', null, '.kl-feed-filter', 'Following'],
    ['rooms', 'explore', 'rooms', null, '.kl-lobby-filters', 'Friends'],
    ['matching', 'explore', 'discover', 'Sort suggestions', '.kl-match-collections', 'Saved'],
  ];
  const references = new Map();
  async function compare(control, kind, screen) {
    const { size: [, height], radius, fill, border, ink, font } = await control.evaluate(appearance);
    if (touch) assert.ok(height >= 44, `${screen}: ${kind} target is only ${height}px high`);
    const style = { height, radius, fill, border, ink, font };
    if (!references.has(kind)) references.set(kind, style);
    assert.deepEqual(style, references.get(kind), `${screen}: inconsistent ${kind} geometry or styling`);
  }
  async function checkFocus(control, screen) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await control.and(page.locator(':focus')).waitFor({ timeout: 3000 }).catch(() => {
      assert.fail(`${screen} lost keyboard focus after refreshing`);
    });
  }
  for (const [screen, area, route, sortLabel, groupSelector, scope] of routes) {
    await navigate(page, area, route);
    if (screen === 'rooms') await page.locator('#kl-rooms-lobbies:visible').click();
    if (screen === 'installed') await page.locator('[data-workshop-section="installed"]:visible').click();
    if (screen === 'matching') await page.locator('.kl-discover-link[aria-label="Find matches"]:visible').click();
    await page.mouse.move(2, 2);
    if (sortLabel) {
      const sort = page.getByRole('combobox', { name: sortLabel, exact: true });
      await compare(sort, 'sort', screen);
      const fits = await sort.evaluate(select => {
        const style = getComputedStyle(select);
        const text = document.createElement('canvas').getContext('2d');
        text.font = style.font;
        const available = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return text.measureText(select.selectedOptions[0].text).width <= available + 1;
      });
      assert.ok(fits, `${screen}: selected label overlaps the select arrow`);
      const last = await sort.locator('option').last().evaluate(option => option.value);
      assert.notEqual(await sort.inputValue(), last, `${screen}: fixture should start at the default sort`);
      await sort.press('End');
      await checkFocus(sort, screen);
      assert.equal(await sort.inputValue(), last, `${screen}: keyboard sort was lost`);
      if (screen === 'workshop') {
        const cards = page.locator('.kl-workshop-card .kl-workshop-title:visible');
        await cards.first().waitFor();
        const titles = await cards.allTextContents();
        assert.ok(titles.length > 1, 'The populated catalogue should contain multiple creations');
        assert.deepEqual(titles, [...titles].sort((left, right) => left.localeCompare(right)), 'Title A–Z should reorder the cards');
      }
    }
    if (!groupSelector) continue;
    const group = page.locator(`${groupSelector}:visible`);
    const all = group.getByRole('button', { name: 'All', exact: true });
    const next = group.getByRole('button', { name: scope, exact: true });
    await compare(all, 'selected segment', screen);
    await compare(next, 'unselected segment', screen);
    await next.press('Enter');
    await next.and(page.locator('[aria-pressed="true"]')).waitFor();
    await checkFocus(next, screen);
    assert.equal(await all.getAttribute('aria-pressed'), 'false');
    assert.equal(await group.locator('button[aria-pressed="true"]').count(), 1);
    if (screen === 'communities' && touch) {
      const last = group.getByRole('button', { name: 'Archived', exact: true });
      await last.scrollIntoViewIfNeeded();
      await last.press('Enter');
      await last.and(page.locator('[aria-pressed="true"]')).waitFor();
      await checkFocus(last, screen);
      const visible = await last.evaluate(button => {
        const strip = button.parentElement.getBoundingClientRect(), item = button.getBoundingClientRect();
        return item.left >= strip.left - 1 && item.right <= strip.right + 1;
      });
      assert.ok(visible, 'Refreshing communities scrolled the selected scope out of view');
    }
  }
}

async function reviewDialogActions(page, touch) {
  const reference = new Map();
  const dialog = page.locator('dialog[open]:visible').last();
  const visible = selector => page.locator(`${selector}:visible`).first();
  async function compare(button, role, screen) {
    await page.mouse.move(1, 1);
    await button.evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))));
    const { size: [width, height], font, fill, ink, border, radius } = await button.evaluate(appearance);
    assert.equal(height, touch ? 44 : 36, `${screen}: ${role} target height`);
    const signature = { font, fill, ink, border, radius };
    if (!reference.has(role)) reference.set(role, signature);
    assert.deepEqual(signature, reference.get(role), `${screen}: inconsistent ${role} appearance`);
    if (role === 'Cancel' || role === 'Close') {
      if (!reference.has(role + ' width')) reference.set(role + ' width', width);
      assert.equal(width, reference.get(role + ' width'), `${screen}: ${role} width`);
    }
  }
  async function dismiss(opener) {
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await opener.and(page.locator(':focus')).waitFor({ timeout: 3000 });
  }
  for (const screen of ['Events', 'Feed', 'Matching']) {
    const feed = screen === 'Feed', matching = screen === 'Matching';
    await navigate(page, feed ? 'feed' : 'explore', feed ? 'feed' : matching ? 'discover' : 'events');
    if (matching) await visible('.kl-discover-link[aria-label="Find matches"]').click();
    const opener = matching ? visible('.kl-match-filter-button') :
      page.getByRole('button', { name: feed ? /^(Post|Resume draft)$/ : 'Create event', exact: true }).first();
    await opener.press('Enter');
    await dialog.waitFor();
    if (feed) await dialog.locator('textarea').fill('Keyboard review');
    const footer = dialog.locator('footer');
    await compare(footer.getByRole('button', { name: 'Cancel', exact: true }), 'Cancel', screen);
    const primary = footer.getByRole('button', { name: feed ? 'Post' : matching ? 'Apply filters' : 'Continue', exact: true });
    await compare(primary, 'primary', screen);
    await dismiss(opener);
  }
  await navigate(page, 'explore', 'rooms');
  await visible('#kl-rooms-current').click();
  const leave = page.getByRole('button', { name: 'Leave room', exact: true }).filter({ visible: true }).first();
  await leave.press('Enter');
  const safe = dialog.locator('footer').getByRole('button', { name: 'Cancel', exact: true });
  await safe.and(page.locator(':focus')).waitFor();
  await compare(safe, 'Cancel', 'Leave room');
  await dismiss(leave);

  for (const [kind, route] of [['event', 'events'], ['community', 'communities'], ['Space', 'rooms']]) {
    await navigate(page, 'explore', route);
    let opener;
    if (kind === 'Space') {
      await visible('#kl-rooms-spaces').click();
      await visible('.kl-sp-title').click();
      opener = page.getByRole('button', { name: 'Share Space', exact: true });
      await opener.press('Enter');
    } else {
      const scopes = visible(kind === 'event' ? '.kl-ev-scopes' : '.kl-cm-tabs');
      await scopes.getByRole('button', { name: 'All', exact: true }).click();
      opener = visible(kind === 'event' ? '.kl-ev-menu-trigger' : '.kl-cm-more');
      await opener.press('Enter');
      await page.locator('.kl-shell-menu[open]:visible').getByRole('menuitem', { name: `Share ${kind}`, exact: true }).press('Enter');
    }
    await dialog.waitFor();
    const hasSelection = await dialog.locator('input[readonly]').evaluate(input =>
      input.matches(':focus') && input.value.length > 0 && input.selectionStart === 0 && input.selectionEnd === input.value.length);
    assert.ok(hasSelection, `Share ${kind}: the full link should be ready for keyboard copy`);
    const actions = dialog.locator('footer button:visible');
    const close = actions.first(), copy = actions.last();
    assert.equal((await close.textContent()).trim(), 'Close');
    assert.match((await copy.textContent()).trim(), /^Copy/i);
    await compare(close, 'Close', kind);
    await compare(copy, 'primary', kind);
    await dismiss(opener);
  }
}

async function reviewDrawerProfileAndMusic(page, touch) {
  await navigate(page, 'feed', 'feed');
  await page.getByRole('button', { name: 'Upcoming events', exact: true }).click();
  const drawer = page.locator('.kl-feed-upcoming-drawer[open]');
  const close = drawer.getByRole('button', { name: 'Close dialog' });
  const frame = await drawer.boundingBox(), button = await close.boundingBox();
  assert.ok(button.x >= frame.x && button.x + button.width <= frame.x + frame.width,
    'The drawer must show the entire close button');
  await close.click();
  await drawer.waitFor({ state: 'hidden' });

  if (!touch) {
    await page.getByRole('button', { name: 'Open your profile', exact: true }).first().click();
    const profile = page.locator('.kl-addon-profile-dialog[open]');
    const strip = profile.getByRole('tablist');
    let initialY;
    for (const name of ['About', 'Events', 'Albums', 'About']) {
      const tab = strip.getByRole('tab', { name, exact: true });
      await tab.click();
      await strip.getByRole('tab', { name, exact: true, selected: true }).waitFor();
      const { y } = await strip.boundingBox();
      initialY ??= y;
      assert.ok(Math.abs(y - initialY) <= 1, name + ' moved the profile tabs');
    }
    await strip.getByRole('tab', { name: 'Preferences', exact: true }).click();
    await profile.locator('.kl-addon-profile-body').evaluate(node => { node.scrollTop = node.scrollHeight; });
    const scrolledY = (await strip.boundingBox()).y;
    await strip.getByRole('tab', { name: 'Events', exact: true }).click();
    assert.ok(Math.abs((await strip.boundingBox()).y - scrolledY) <= 1, 'Switching a scrolled profile moved its tabs');
    await profile.getByRole('button', { name: 'Close KikiLink profile' }).click();
  }

  await navigate(page, 'game', 'music');
  const playlistActions = page.locator('.kl-music-playlist-menu:visible');
  const dismissed = await playlistActions.evaluate(menu => {
    const summary = menu.querySelector('summary');
    summary.click();
    if (!menu.open) return false;
    // Native details queues its toggle event. Escape can arrive before that event.
    const action = menu.querySelector('button');
    action.focus();
    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    return !menu.open && menu.getRootNode().activeElement === summary;
  });
  assert.ok(dismissed, 'Escape must close a just-opened playlist menu and return focus');
  const add = page.getByRole('button', { name: 'Add audio', exact: true });
  await add.nth(1).waitFor();
  await page.mouse.move(1, 1);
  assert.deepEqual(await add.first().evaluate(appearance), await add.nth(1).evaluate(appearance),
    'The two Add audio buttons must share their size, glyph and styling');
  for (const button of await add.all()) {
    await button.click();
    const form = page.locator('.kl-music-add-dialog[open]');
    await form.getByRole('button', { name: /close/i }).click();
    await form.waitFor({ state: 'hidden' });
  }
}

async function reviewCatalogActions(page, touch) {
  await navigate(page, 'explore', 'rooms');
  await page.locator('#kl-rooms-lobbies:visible').click();
  const refresh = await page.getByRole('button', { name: 'Refresh room list' }).evaluate(appearance);
  let detailsStyle, overviewStyle;
  for (const [area, route, card, back, tabs] of [
    ['explore', 'events', '.kl-ev-card', '.kl-ev-back-link', '.kl-ev-detail-tabs'],
    ['explore', 'communities', '.kl-cm-card', '[data-community-action="back"]', '.kl-cm-sections'],
    ['create', 'workshop', '.kl-workshop-card', '.kl-workshop-path button', '.kl-workshop-detail-tabs'],
    ['explore', 'rooms', '.kl-sp-card', '.kl-sp-path > button', null],
  ]) {
    await navigate(page, area, route);
    if (route === 'rooms') await page.locator('#kl-rooms-spaces:visible').click();
    if (route === 'events') {
      const eventsRefresh = page.getByRole('button', { name: 'Refresh', exact: true }).first();
      assert.deepEqual(await eventsRefresh.evaluate(appearance), refresh, 'Event and lobby refresh controls');
    }
    const item = page.locator(card + ':visible').first();
    if (route === 'communities' || route === 'workshop') {
      const details = item.getByRole('button', { name: /\bdetails$/i });
      const style = await details.evaluate(appearance);
      detailsStyle ??= style;
      assert.deepEqual(style, detailsStyle, 'Community and Workshop Details controls');
      await details.click();
    } else {
      await item.locator('[data-page-result]').first().click();
    }
    await page.mouse.move(1, 1);
    if (tabs) {
      const overview = page.locator(tabs + ':visible').getByRole('button', { name: 'Overview', exact: true })
        .or(page.locator(tabs + ':visible').getByRole('tab', { name: 'Overview', exact: true }));
      const style = await overview.evaluate(node => {
        const css = getComputedStyle(node), rect = node.getBoundingClientRect();
        return [rect.width, rect.height, css.fontWeight, css.borderBottom];
      });
      overviewStyle ??= style;
      assert.deepEqual(style, overviewStyle, route + ' Overview tab');
    }
    const returnButton = page.locator(back + ':visible').first();
    const style = await returnButton.evaluate(appearance);
    assert.deepEqual(style.icon, [16, 16], route + ' back icon');
    assert.equal(style.size[1], touch ? 44 : 36, route + ' back target');
    await returnButton.click();
    await item.waitFor();
  }
}

async function openFixture(page) {
  await page.goto(address.href);
  await page.waitForFunction(() => window.fixture?.view);
  await page.addStyleTag({ content: '#fixture-tools,#fixture-state,#metric-output{display:none!important}' });
}

const browser = await playwright.chromium.launch({ executablePath: process.env.KIKILINK_CHROMIUM_PATH });
try {
  for (const [width, height, theme, touch] of [[1366,768,'dark',false], [1920,1080,'light',false], [393,852,'dark',true], [360,800,'light',true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', request => new URL(request.request().url()).origin === address.origin ? request.continue() : request.abort());
    const page = await context.newPage();
    await openFixture(page);
    await page.evaluate(value => window.fixture.settings.update(settings => { settings.ui.theme = value; }), theme);
    await reviewCatalogActions(page, touch);
    await reviewDrawerProfileAndMusic(page, touch);
    await reviewEmptyResults(page, touch, navigate);
    await reviewSearchFields(page, touch, navigate);
    await reviewPagination(page, touch, navigate);
    await review(page, touch);
    await reviewBrowseControls(page, touch);
    await reviewDialogActions(page, touch);
    if (width === 1366) {
      // Start the density check from the directory, independently of the last dialog's detail page.
      await openFixture(page);
      await page.evaluate(() => window.fixture.settings.update(settings => {
        settings.ui.density = 'super-compact';
        settings.ui.textScale = 'extra-large';
      }));
      await reviewCatalogActions(page, touch);
    }
    await context.close();
    console.log(`Passed control parity, navigation, profile tabs, dialogs and results at ${width}×${height} (${theme}).`);
  }
} finally { await browser.close(); }
