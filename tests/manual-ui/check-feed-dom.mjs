// Full real-app fixture smoke checks in Happy DOM, not painted browser geometry.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

const rootPath = resolve(import.meta.dirname, '../..');
const source = await readFile(resolve(import.meta.dirname, 'fixture.js'), 'utf8');
const split = source.indexOf('const params =');
const built = await build({ stdin: { contents: source.slice(0, split) + 'window.bootFixture=async()=>{' + source.slice(split) + '};', resolveDir: import.meta.dirname },
  bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022',
  loader: { '.webp': 'dataurl', '.png': 'dataurl', '.svg': 'dataurl' },
  define: { __KIKILINK_DEV_TEST__: 'true', __KIKILINK_BUILD_ID__: '"feed-dom-review"' }, logLevel: 'silent' });
const win = new Window({ url: 'http://127.0.0.1:8765/?page=feed&persist=1', settings: {
  enableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, suppressInsecureJavaScriptEnvironmentWarning: true,
} });
Object.assign(win, { TextEncoder, TextDecoder, structuredClone });
win.document.write((await readFile(resolve(rootPath, 'tests/manual-ui/client.html'), 'utf8')).replace(/<script[^>]*><\/script>/u, ''));
const waitFor = async (check, reason) => {
  for (let attempt = 0; attempt < 80; attempt++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
  assert.ok(check(), reason);
};
const click = (scope, label) => {
  const button = [...scope.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === label);
  assert.ok(button, `Missing action: ${label}`);
  const menu = button.closest('details'); if (menu) menu.open = true;
  button.click();
};
try {
  win.eval(built.outputFiles[0].text); await win.bootFixture();
  const root = win.document.querySelector('#kikilink-root').shadowRoot;
  await waitFor(() => root.querySelectorAll('.kl-feed-post').length === 7, 'Fixture Feed did not load');
  assert.equal(root.querySelectorAll('.kl-feed-poll').length, 2);
  assert.deepEqual([...root.querySelectorAll('.kl-feed-filter button')].map(node => node.textContent), ['Everyone', 'Friends', 'My posts', 'Saved', 'Hidden']);
  const card = id => root.querySelector(`.kl-feed-post[data-post-id="${id}"]`);
  const requestCount = (method, path) => win.fixture.counters.filter(item => item.method === method && item.path === path).length;

  const pollCard = card(7), firstChoice = pollCard.querySelector('.kl-feed-poll input');
  firstChoice.checked = true; firstChoice.dispatchEvent(new win.Event('change'));
  click(pollCard, 'Vote');
  await waitFor(() => pollCard.querySelector('.kl-feed-poll-result'), 'Voting did not show results');
  assert.equal(card(7), pollCard, 'Voting rebuilt the surrounding post');
  assert.equal(requestCount('PUT', '/v1/feed/7/poll/vote'), 1);

  click(pollCard, 'Save post');
  await waitFor(() => pollCard.querySelector('[aria-label="Unsave post"]'), 'Save did not update menu');
  assert.equal(requestCount('PUT', '/v1/feed/7/bookmark'), 1);
  click(root, 'Saved');
  await waitFor(() => root.querySelectorAll('.kl-feed-post').length === 2 && card(7) && card(4), 'Saved filter mismatch');
  click(root, 'Friends');
  await waitFor(() => root.querySelectorAll('.kl-feed-post').length === 3 && card(7) && card(6) && card(2), 'Friends filter mismatch');
  click(root, 'Everyone');
  await waitFor(() => card(5), 'Everyone filter did not return');
  click(card(5), 'Hide post');
  await waitFor(() => !card(5) && root.querySelector('.kl-feed-undo'), 'Hide did not remove only the chosen post');
  click(root.querySelector('.kl-feed-undo'), 'Undo');
  await waitFor(() => card(5), 'Undo did not restore the hidden post');
  assert.equal(requestCount('PUT', '/v1/feed/5/hide'), 2);
  click(card(5), 'Follow comments');
  await waitFor(() => card(5).querySelector('[aria-label="Unfollow comments"]'), 'Follow did not update menu');
  assert.equal(requestCount('PUT', '/v1/feed/5/watch'), 1);
  click(root, 'Hidden');
  await waitFor(() => card(1) && root.querySelectorAll('.kl-feed-post').length === 1, 'Hidden filter mismatch');
  click(card(1), 'Restore post');
  await waitFor(() => !card(1), 'Restored post stayed in Hidden');
  click(root, 'Everyone');
  await waitFor(() => card(1), 'Restored post missing from Everyone');

  click(card(2), 'Comments · 3');
  await waitFor(() => card(2).querySelector('[data-comment-id="2"]'), 'Comments did not load');
  const parentComment = card(2).querySelector('[data-comment-id="1"]');
  assert.ok(parentComment.querySelector('.kl-comment-thread [data-comment-id="2"]'), 'Reply is not grouped with its parent');
  click(parentComment, 'Reply');
  const commentDraft = card(2).querySelector('textarea[aria-label="Comment"]');
  commentDraft.value = 'A reply through the actual composer'; commentDraft.dispatchEvent(new win.Event('input'));
  click(card(2), 'Send comment');
  await waitFor(() => card(2).querySelector('[data-comment-id="4"]'), 'Reply did not appear');
  assert.equal(win.fixture.feed.comments.find(item => item.id === 4).parentId, 1);
  assert.equal(requestCount('POST', '/v1/feed/2/comments'), 1);
  assert.equal(card(2).querySelector('textarea[aria-label="Comment"]'), commentDraft, 'Reply rebuilt its composer');

  const spoilerPath = '/v1/media/00000000-0000-4000-8000-000000000002';
  assert.equal(requestCount('GET', spoilerPath), 0, 'Spoiler image fetched before reveal');
  click(card(6), 'Reveal image spoiler');
  // Happy DOM has no painted intersections; explicitly model the revealed
  // wrapper entering the viewport, leaving production lazy loading unchanged.
  card(6).querySelector('.kl-feed-media-slot .kl-cloud-image-wrap').dispatchEvent(new win.Event('cloud-visible'));
  await waitFor(() => requestCount('GET', spoilerPath) === 1, 'Spoiler reveal did not load its image');

  const composer = root.querySelector('textarea[aria-label="Share a post"]');
  composer.value = 'Draft kept across a burst of live Feed hints'; composer.dispatchEvent(new win.Event('input')); composer.focus();
  const before = requestCount('GET', '/v1/feed');
  win.fixture.feed.addIncoming(); for (let index = 0; index < 10; index++) win.fixture.feed.emit();
  await waitFor(() => card(9), 'Live Feed post did not appear');
  assert.equal(root.querySelector('textarea[aria-label="Share a post"]'), composer, 'Live update rebuilt editor');
  assert.equal(composer.value, 'Draft kept across a burst of live Feed hints');
  assert.equal(root.activeElement, composer, 'Live update stole keyboard focus');
  assert.ok(requestCount('GET', '/v1/feed') - before <= 3, 'Hint burst triggered unbounded Feed refreshes');
  const idleBefore = requestCount('GET', '/v1/feed');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(requestCount('GET', '/v1/feed'), idleBefore, 'Unexpected idle Feed polling');
  console.log('Actual-app DOM fixture passed: load, polls, save, Friends/Saved/Hidden filters, hide/undo/restore, follow, real reply threading, lazy spoiler image, live draft/focus preservation, bounded hint burst. No browser geometry claim.');
} finally {
  win.fixture?.view.destroy(); win.fixture?.client.destroy(); win.fixture?.presence.destroy?.();
  await win.happyDOM.abort(); await win.happyDOM.close();
}
