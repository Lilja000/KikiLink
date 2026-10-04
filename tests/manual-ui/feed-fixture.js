// Synthetic API data only. The rendered Feed and all controls come from src/.
// This fixture is deliberately not a replacement for Cloud HTTP/SQLite tests.
export function createFeedFixture({ profile, now, friends, params, ownMember = 101 }) {
  const mediaId = '00000000-0000-4000-8000-000000000002';
  const reactions = (count = 0) => ({ counts: count ? [{ reaction: 'heart', count }] : [], mine: null });
  const post = (id, author, text, extra = {}) => ({
    id, author, profile: profile(author), text, revision: 1,
    createdAt: now - (9 - id) * 3600000, updatedAt: now - 60000,
    mediaIds: [], spoilerMediaIds: [], reactions: reactions(), commentCount: 0,
    bookmarked: false, hidden: false, watching: false, poll: null, ...extra,
  });
  const posts = [
    post(8, ownMember, 'A little space for everyone. Share your photos, ideas and favourite moments. 🌸', { pinnedAt: now - 7200000 }),
    post(7, 202, 'What shall we do together this evening?', {
      featuredAt: now - 3600000, featuredUntil: now + 10 * 3600000, reactions: reactions(7),
      poll: { question: 'Choose our evening plan', multiple: false, closesAt: now + 86400000, closed: false,
        options: [{ id: 1, text: 'Tea and a quiet conversation', votes: 3 }, { id: 2, text: 'Games with friends', votes: 2 }, { id: 3, text: 'Explore somewhere new', votes: 1 }], totalVoters: 6, myVotes: [] },
    }),
    post(6, 202, 'A small surprise for the evening. ||The room is ready!|| Tap the photo when you want to see it.', { mediaIds: [mediaId], spoilerMediaIds: [mediaId], reactions: reactions(4) }),
    post(5, 404, 'A longer thought, with **bold**, *italic* and a link: https://example.invalid/a/very-long-fixture-path-that-must-wrap-without-pushing-the-post-menu-off-the-screen', { reactions: reactions(2) }),
    post(4, ownMember, 'Things to bring: good company, a favourite song, and a story to share.', { bookmarked: true, watching: true, reactions: reactions(3) }),
    post(3, 303, 'A poll that has already closed.', { poll: { question: 'Which season feels cosiest?', multiple: true, closesAt: now - 60000, closed: true,
      options: [{ id: 1, text: 'Autumn', votes: 4 }, { id: 2, text: 'Winter', votes: 3 }, { id: 3, text: 'Spring', votes: 1 }], totalVoters: 5, myVotes: [1, 2] } }),
    post(2, 202, 'A cosy corner for the evening. Who is joining us for tea?', { commentCount: 3, reactions: reactions(3), watching: true }),
    post(1, 303, 'This post is hidden only for the fixture viewer. Restore it from Hidden.', { hidden: true }),
  ];
  const comment = (id, author, text, parentId = null) => ({
    id, postId: 2, author, profile: profile(author), text, revision: 1,
    createdAt: now - (5 - id) * 60000, updatedAt: now - 60000,
    reactions: reactions(), parentId, replyTo: null,
  });
  const comments = [comment(1, 202, 'I will bring the tea!'), comment(2, 303, 'Then I will bring something sweet.', 1), comment(3, ownMember, 'See you both there. 🌸')];
  const listeners = new Set(), clientIds = new Map();
  let nextPost = 9, nextComment = 4, failedPost = false;
  const clone = value => structuredClone(value);
  const json = value => Response.json(clone(value));
  const missing = () => Response.json({ error: 'content_unavailable' }, { status: 404 });
  const commentView = value => {
    const parent = comments.find(c => c.id === value.parentId);
    return { ...value, replyTo: parent ? { id: parent.id, author: parent.author, profile: parent.profile, text: parent.text } : null };
  };
  const emit = () => { for (const fn of listeners) fn(); };
  const update = target => { target.updatedAt = Date.now(); target.revision++; return json(target); };
  async function request(url, init, body) {
    const p = url.pathname, m = init.method || 'GET';
    if (!/^\/v1\/(feed(?:\/|$)|comments\/|reactions\/)/u.test(p) || p === '/v1/feed/unread') return undefined;
    const latency = Math.min(3000, Math.max(0, Number(params.get('latency')) || 0));
    if (latency && m !== 'GET') await new Promise(resolve => setTimeout(resolve, latency));
    if (p === '/v1/feed' && m === 'GET') {
      const filter = url.searchParams.get('filter') || 'all';
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const cursor = Number(url.searchParams.get('cursor')) || Infinity;
      const limit = Number(url.searchParams.get('limit')) || 20;
      const matches = item => (filter === 'hidden' ? item.hidden : !item.hidden)
        && (filter !== 'friends' || friends.includes(item.author))
        && (filter !== 'mine' || item.author === ownMember)
        && (filter !== 'saved' || item.bookmarked)
        && (!query || (query.startsWith('#') ? item.author === Number(query.slice(1)) : item.text.toLowerCase().includes(query)));
      const visible = posts.filter(matches).sort((a, b) => b.id - a.id);
      const eligible = visible.filter(item => item.id < cursor);
      const items = eligible.slice(0, limit);
      return json({ items, promoted: filter === 'all' && !query ? visible.filter(item => item.pinnedAt || item.featuredUntil > Date.now()) : [], nextCursor: eligible.length > limit ? items.at(-1).id : null });
    }
    if (p === '/v1/feed' && m === 'POST') {
      if (params.get('failPostOnce') === '1' && !failedPost) { failedPost = true; return Response.json({ error: 'cloud_temporarily_unavailable' }, { status: 503 }); }
      if (body.clientId && clientIds.has(body.clientId)) return json(clientIds.get(body.clientId));
      const item = post(nextPost++, ownMember, body.text, { ...body, createdAt: Date.now(), updatedAt: Date.now() });
      if (body.poll) item.poll = { ...body.poll, options: body.poll.options.map((text, index) => ({ id: index + 1, text, votes: 0 })), totalVoters: 0, myVotes: [], closed: false };
      posts.push(item); if (body.clientId) clientIds.set(body.clientId, item); return json(item);
    }
    const itemRoute = /^\/v1\/feed\/(\d+)(?:\/(bookmark|hide|watch|pin|poll\/vote|comments))?$/u.exec(p);
    if (itemRoute) {
      const item = posts.find(value => value.id === Number(itemRoute[1])); if (!item) return missing();
      const action = itemRoute[2];
      if (action === 'comments') {
        if (m === 'POST') {
          const value = { ...comment(nextComment++, ownMember, body.text, body.parentId ?? null), postId: item.id, createdAt: Date.now() };
          comments.push(value); item.commentCount++; return json(commentView(value));
        }
        const cursor = Number(url.searchParams.get('cursor')) || 0, limit = Number(url.searchParams.get('limit')) || 20;
        const eligible = comments.filter(value => value.postId === item.id && value.id > cursor), items = eligible.slice(0, limit);
        return json({ items: items.map(commentView), nextCursor: eligible.length > limit ? items.at(-1).id : null });
      }
      if (action === 'bookmark') { item.bookmarked = body.bookmarked; return json(item); }
      if (action === 'hide') { item.hidden = body.hidden; return json(item); }
      if (action === 'watch') { item.watching = body.watching; return json(item); }
      if (action === 'pin') { item.pinnedAt = body.pinned ? Date.now() : null; return json(item); }
      if (action === 'poll/vote' && item.poll) {
        if (item.poll.closed) return Response.json({ error: 'poll_closed' }, { status: 409 });
        const old = item.poll.myVotes; const votes = [...new Set(body.optionIds)];
        for (const option of item.poll.options) option.votes += Number(votes.includes(option.id)) - Number(old.includes(option.id));
        item.poll.totalVoters += Number(votes.length > 0) - Number(old.length > 0); item.poll.myVotes = votes; return json(item);
      }
      if (m === 'PATCH') { Object.assign(item, body); return update(item); }
      if (m === 'DELETE') { posts.splice(posts.indexOf(item), 1); return new Response(null, { status: 204 }); }
      return json(item);
    }
    const commentRoute = /^\/v1\/comments\/(\d+)$/u.exec(p);
    if (commentRoute) {
      const value = comments.find(item => item.id === Number(commentRoute[1])); if (!value) return missing();
      if (m === 'PATCH') { value.text = body.text; value.revision++; }
      if (m === 'DELETE') { comments.splice(comments.indexOf(value), 1); const parent = posts.find(item => item.id === value.postId); if (parent) parent.commentCount--; return new Response(null, { status: 204 }); }
      return json(commentView(value));
    }
    const reactionRoute = /^\/v1\/reactions\/(post|comment)\/(\d+)$/u.exec(p);
    if (reactionRoute) {
      const value = (reactionRoute[1] === 'post' ? posts : comments).find(item => item.id === Number(reactionRoute[2])); if (!value) return missing();
      if (m === 'GET') return json({ items: [{ memberNumber: 202, reaction: 'heart', profile: profile(202) }], nextCursor: null });
      const counts = new Map(value.reactions.counts.map(item => [item.reaction, item.count]));
      if (value.reactions.mine) counts.set(value.reactions.mine, Math.max(0, (counts.get(value.reactions.mine) || 0) - 1));
      if (body.reaction) counts.set(body.reaction, (counts.get(body.reaction) || 0) + 1);
      value.reactions = { counts: [...counts].filter(([, count]) => count).map(([reaction, count]) => ({ reaction, count })), mine: body.reaction }; return json(value.reactions);
    }
    return missing();
  }
  return { request, posts, comments, emit, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    addIncoming: () => { posts.push(post(nextPost++, 202, 'A new Feed post arrived while you were reading.', { createdAt: Date.now() })); emit(); },
  };
}
