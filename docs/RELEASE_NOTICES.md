# KikiLink release notices

## Home update card

When Home is built on a production Bondage Club hostname, KikiLink performs one credential-free
request to the official raw `package.json`. It sends no cookies or referrer, rejects redirects,
accepts only a strict newer SemVer from a bounded JSON response, and stops after four seconds. The
body is capped at 8 KiB and 256 stream reads, including empty chunks. There is no retry, interval, or
background polling. A fixed official userscript link remains hidden unless that check succeeds;
network, CORS, parsing, or lifecycle failure stays silent and leaves the current Home unchanged.

KikiLink may send a concise ordinary private Beep to a peer that is still running an older release:

> `KikiLink <version> is available. Update it in your userscript manager.`

The Beep uses `BCAdapter.sendBeep(memberNumber, message, false)`, so it never includes the sender's
current room. `LinkChatModule` immediately passes the returned outgoing event through its normal
capture path; local history, the conversation preview, and an open transcript therefore agree with
what the addon sent. The adapter's low-level Beep hooks do not capture that caller-owned event again.

## Eligibility

A notice is considered only immediately after a KikiLink protocol event. Every condition below must
still be true at that moment:

- the authenticated local and remote versions are strict SemVer-shaped values;
- the local version has greater SemVer precedence than the remote version;
- the remote version came from a live accepted Presence packet, never the cached public profile;
- Presence still identifies the recipient as a compatible peer;
- the recipient is not the authenticated local account;
- Bondage Club confirms the recipient is a native friend (a shared room alone is insufficient);
- Bondage Club's ordinary Beep API is ready; and
- the recipient is observable either in the current room or through the native online-friend route.

Equal versions, newer remote versions, malformed/ambiguous versions, cached-only versions, expired
compatibility, non-friends, offline/unknown routes, guarded native state, and storage uncertainty all fail closed.
Build metadata does not affect precedence; stable versions outrank their own prereleases, and numeric
components/identifiers use numeric rather than lexical ordering. No ordinary incoming Beep content is
ever interpreted as a release trigger, so a notice cannot echo or create a reply loop.

## Dedupe and rate bounds

Before native transport, the service writes and reads back this marker through the authenticated
account's injected storage:

`kikilink:release-notice:v1:<recipient MemberNumber>:<announced version>`

Any existing value suppresses the notice. This makes dedupe persistent per account, recipient, and
announced release across page reloads. The arbitrary key is account-scoped local browser data; it is
not copied into Bondage Club `ExtensionSettings` or another device. A denied read, denied/silently
dropped write, or verification mismatch suppresses sending. A synchronous `sendBeep` rejection gets a
best-effort marker rollback, but the pair remains attempted for the rest of that addon session.

Native send attempts are bounded globally within one running addon instance:

- at most one attempt per rolling 60-second window;
- at most three attempts for the entire session; and
- at most one attempt per recipient and announced version in that session, including re-entrant or
  failed adapter calls.

There is no background queue, automatic retry timer, broadcast, delivery claim, or acknowledgement.
A rate-limited peer can be reconsidered only when a later valid protocol event arrives.

## Regression coverage

`tests/release-notice-service.test.ts` covers the private branded Beep and returned event, persistent
restart dedupe, a new announced release, strict comparison (including prereleases, build metadata,
large numeric components, and malformed input), self/equal/newer rejection, live-version-only checks,
current-room and online-friend reachability, compatibility, per-minute/session caps, account isolation,
strict friend-only filtering, guarded friend reads, read/write storage denial, conservative
corrupt-marker handling, synchronous transport failure, marker
rollback, and re-entrant delivery suppression.

`tests/link-presence-service.test.ts` covers the live compatible-version accessor at the Presence
boundary. Full verification remains `npm run check`; the focused service check is
`npx vitest run tests/release-notice-service.test.ts`.
