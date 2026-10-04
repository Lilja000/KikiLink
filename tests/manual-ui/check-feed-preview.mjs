// Boots the exact exported standalone HTML at its file: URL. Happy DOM checks
// real-app state and controls here; it does not verify painted browser geometry.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

const rootPath = resolve(import.meta.dirname, '../..');
const { version } = JSON.parse(await readFile(resolve(rootPath, 'package.json'), 'utf8'));
const catalog = JSON.parse(await readFile(resolve(rootPath, 'cloud/shared/feed-reactions.json'), 'utf8'));
const path = resolve(rootPath, `.local-dev/manual-ui/KikiLink-${version}-Feed-Preview.html`);
const html = await readFile(path, 'utf8');
const modules = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/gu)];
assert.equal(modules.length, 1, 'Standalone preview must have one self-contained module');
assert.equal(html.includes('src="fixture.bundle.js"'), false, 'Preview depends on an external bundle');
const win = new Window({ url: pathToFileURL(path).href, settings: {
  enableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true,
  suppressInsecureJavaScriptEnvironmentWarning: true,
} });
Object.assign(win, { TextEncoder, TextDecoder, structuredClone });
const waitFor = async (check, reason) => {
  for (let attempt = 0; attempt < 80; attempt++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
  assert.ok(check(), reason);
};
try {
  win.document.write(html.replace(modules[0][0], ''));
  // The bundle has no module dependencies. This preserves its exact body while
  // supplying top-level await support to Happy DOM's classic-script evaluator.
  await win.eval(`(async () => {\n${modules[0][1]}\n})()`);
  const app = win.document.querySelector('#kikilink-root').shadowRoot;
  await waitFor(() => app.querySelectorAll('.kl-feed-post').length === 7, 'Standalone Feed did not open automatically');
  assert.equal(win.fixture.ownMember, 72385);
  assert.equal(win.fixture.adapter.getOwnMemberNumber(), 72385);
  assert.equal(win.fixture.client.memberNumber, 72385);
  assert.equal(win.Player.MemberNumber, 72385);
  assert.equal(win.fixture.version, version);
  assert.equal(win.document.getElementById('profile').hidden, true);
  assert.match(win.document.getElementById('fixture-state').textContent, /Тестовые данные/u);
  const creatorNames = [...app.querySelectorAll('.kl-social-name[data-creator="true"]')];
  assert.ok(creatorNames.length >= 2, 'Creator styling is missing from own posts');
  for (const name of creatorNames) assert.equal(name.closest('[data-cloud-member]').dataset.cloudMember, '72385');
  for (const author of app.querySelectorAll('.kl-social-author:not([data-cloud-member="72385"])')) {
    assert.equal(author.querySelector('.kl-social-name')?.dataset.creator, 'false', 'Ordinary author got creator styling');
    assert.equal(author.querySelector('.kl-feed-administrator'), null, 'Ordinary author got administrator shield');
  }
  assert.ok(app.querySelector('.kl-feed-post[data-post-id="8"] .kl-feed-administrator'));
  const post = app.querySelector('.kl-feed-post[data-post-id="7"]');
  assert.equal(post.querySelector('[aria-label="Vote"] svg'), null, 'Vote still contains an icon');
  const choices = post.querySelector('.kl-reaction-choices');
  assert.deepEqual([...choices.querySelectorAll('[data-reaction]')].map(button => button.dataset.reaction), catalog.map(item => item.id));
  choices.closest('details').open = true;
  choices.querySelector('[data-reaction="fire"]').click();
  await waitFor(() => post.querySelector('.kl-reactions > [data-reaction="fire"][aria-pressed="true"]'), 'New emoji reaction did not update the real post');

  // Photo mutations must return the selected bytes, not the fixture emblem.
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
  const photo = new win.File([bytes], 'preview-photo.png', { type: 'image/png' });
  const uploaded = await win.fixture.client.request('POST', '/v1/media/feed', photo);
  const loaded = await win.fixture.client.media(uploaded.id);
  assert.deepEqual([...new Uint8Array(await loaded.arrayBuffer())], [...bytes]);
  assert.equal(loaded.type, 'image/webp');
  console.log(`Standalone ${version} preview passed at file: URL: automatic Feed, seven posts, creator identity, ordinary authors, 20 reaction choices, reaction mutation, text-only Vote, original uploaded photo bytes.`);
} finally {
  win.fixture?.view.destroy(); win.fixture?.client.destroy(); win.fixture?.presence.destroy?.();
  await win.happyDOM.abort(); await win.happyDOM.close();
}
