import assert from 'node:assert/strict';

function fieldAppearance(field) {
  const style = getComputedStyle(field);
  const input = field.querySelector('input'), glyph = field.querySelector('svg[data-icon="search"]');
  const box = field.getBoundingClientRect(), icon = glyph.getBoundingClientRect();
  return {
    height: box.height, icon: [icon.width, icon.height], iconInset: icon.left - box.left,
    textInset: input.getBoundingClientRect().left - box.left + parseFloat(getComputedStyle(input).paddingLeft),
    radius: style.borderRadius, border: style.borderTop, fill: style.backgroundColor,
    font: getComputedStyle(input).font, placeholder: getComputedStyle(input, '::placeholder').color,
  };
}

export async function reviewSearchFields(page, touch, navigate) {
  const routes = [
    ['explore', 'events', '.kl-ev-toolbar .kl-browse-search'],
    ['explore', 'communities', '.kl-cm-search .kl-browse-search'],
    ['explore', 'people', '.kl-people-search'],
    ['feed', 'feed', '.kl-feed-search-form'],
    ['create', 'workshop', '.kl-workshop-search-field'],
    ['home', 'inbox', '.kl-inbox-search'],
  ];
  let reference;
  for (const [area, route, selector] of routes) {
    await navigate(page, area, route);
    if (route === 'workshop') await page.locator('[data-workshop-section="browse"]:visible').click();
    // A fresh focus/hover state makes comparisons between submit and decorative magnifiers meaningful.
    const field = page.locator(selector + ':visible').first();
    const input = field.locator('input');
    await input.evaluate(node => node.blur());
    await page.mouse.move(1, 1);
    await field.evaluate(node => Promise.all(node.getAnimations().map(a => a.finished.catch(() => {}))));
    const metrics = await field.evaluate(fieldAppearance);
    assert.equal(metrics.height, touch ? 44 : 36, route + ' search height');
    assert.deepEqual(metrics.icon, [16, 16], route + ' search glyph');
    reference ??= metrics;
    assert.deepEqual(metrics, reference, route + ' search inset, font or colors');
    const clear = field.locator('button').filter({ has: page.locator('svg[data-icon="close"]') });
    for (const byEscape of [true, false]) {
      await input.fill('quiet');
      await clear.waitFor();
      if (byEscape) await input.press('Escape');
      else await clear.press('Enter');
      await clear.waitFor({ state: 'hidden' });
      await input.and(page.locator(':focus')).waitFor({ timeout: 3000 });
      assert.equal(await input.inputValue(), '', route + ' query after clearing');
      assert.ok(await page.locator('.kl-panel:visible').count(), route + ' closed while clearing search');
    }
  }
}

export async function reviewEmptyResults(page, touch, navigate) {
  let reference;
  for (const section of ['events', 'browse', 'installed']) {
    const workshop = section !== 'events';
    await navigate(page, workshop ? 'create' : 'explore', workshop ? 'workshop' : 'events');
    if (workshop) await page.locator(`[data-workshop-section="${section}"]:visible`).click();
    const input = page.locator((workshop ? '.kl-workshop-search-field input' : '.kl-ev-search') + ':visible').first();
    await input.fill('ZeroMatches5487');
    if (section === 'browse') await input.press('Enter');
    const empty = page.getByRole('heading', { name: /^No matching (?:installed )?(?:events|creations)$/ }).locator('..');
    await empty.waitFor();
    assert.equal(await empty.locator('svg[data-icon="search"]').count(), 1, section + ' missing empty search glyph');
    const reset = empty.getByRole('button', { name: 'Clear filters', exact: true });
    const style = await reset.evaluate(button => {
      const box = button.getBoundingClientRect(), style = getComputedStyle(button);
      return { width: box.width, height: box.height, radius: style.borderRadius,
        fill: style.backgroundColor, color: style.color, font: style.font, border: style.borderTop };
    });
    assert.equal(style.height, touch ? 44 : 36);
    reference ??= style;
    assert.deepEqual(style, reference, section + ' empty state reset button');
    await reset.press('Enter');
    await input.and(page.locator(':focus')).waitFor({ timeout: 3000 });
    assert.equal(await input.inputValue(), '', section + ' reset should restore the search');
  }
}

// Split the deterministic local fixture through its usual Cloud client. The community
// directory fills 20 slots before showing its pager, unlike single-response lists.
function provideResultPages() {
  const client = window.fixture.client, request = client.request.bind(client);
  const paths = ['/v1/calendar/discover', '/v1/community-directory', '/v1/spaces', '/v1/workshop/catalog'];
  client.request = async (...args) => {
    const response = await request(...args), url = new URL(args[1], location.href);
    if (args[0] !== 'GET' || !paths.includes(url.pathname) || !response?.items?.length) return response;
    const directory = url.pathname === '/v1/community-directory';
    const records = directory ? Array.from({ length: 21 }, (_, index) => ({
      ...response.items[index % response.items.length], id: '00000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
      name: 'Directory community ' + (index + 1),
    })) : response.items;
    const start = Number(url.searchParams.get('cursor')) || 0, end = start + (directory ? 20 : 1);
    return { ...response, items: records.slice(start, end), nextCursor: end < records.length ? String(end) : null };
  };
  window.restoreResultPages = () => { client.request = request; };
}

export async function reviewPagination(page, touch, navigate) {
  const routes = [['explore', 'events'], ['explore', 'communities'], ['explore', 'rooms'], ['create', 'workshop']];
  let reference, appendWidth;
  await page.evaluate(provideResultPages);
  try {
    for (const [area, route] of routes) {
      await navigate(page, area, route);
      if (route === 'rooms') await page.locator('#kl-rooms-spaces:visible').click();
      const results = page.locator('[data-page-result]:visible');
      const kind = route === 'workshop' ? 'next' : 'more';
      const pager = page.locator(`button[data-page-action="${kind}"]:visible`).first();
      const info = await pager.evaluate(button => {
        const style = getComputedStyle(button), rect = button.getBoundingClientRect(), icon = button.querySelector('svg');
        return { width: rect.width, height: rect.height, radius: style.borderRadius, font: style.font, box: style.borderTop,
          fill: style.backgroundColor, icon: icon?.dataset.icon };
      });
      const { icon, width, ...style } = info;
      assert.equal(icon, kind === 'next' ? 'arrow-right' : 'chevron-down', route + ' pager direction');
      if (kind === 'more') {
        appendWidth ??= width;
        assert.equal(width, appendWidth, route + ' append button width');
      }
      assert.equal(style.height, touch ? 44 : 36, route + ' pager target');
      reference ??= style;
      assert.deepEqual(style, reference, route + ' pager appearance');
      const before = await results.evaluateAll(nodes => nodes.map(n => n.dataset.pageResult));
      assert.ok(before.length, route + ' first page is empty');
      await pager.press('Enter');
      const newlyFocused = results.and(page.locator(':focus'));
      await newlyFocused.waitFor({ timeout: 3500 });
      const focusedId = await newlyFocused.getAttribute('data-page-result');
      const after = await results.evaluateAll(nodes => nodes.map(n => n.dataset.pageResult));
      assert.equal(focusedId, after.find(id => !before.includes(id)), route + ' should focus the first new result');
      if (route === 'workshop') {
        assert.ok(before.every(id => !after.includes(id)), 'Workshop catalogue should replace its page');
        await page.locator('button[data-page-action="previous"]:visible').press('Enter');
        await page.locator(`[data-page-result="${before[0]}"]:focus`).waitFor({ timeout: 3500 });
      } else {
        assert.ok(before.every(id => after.includes(id)), route + ' lost a previously loaded result');
      }
    }
  } finally {
    await page.evaluate(() => window.restoreResultPages());
  }
}
