# Changelog

## 0.29.0 - 2026-08-30

- Added a dedicated page-realm FUSAM distribution. It does not install the privileged userscript
  upload bridge or perform KikiLink's standalone update check; temporary uploads use bounded,
  credential-free Litterbox requests, while persistent Catbox uploads are unavailable in FUSAM.
- Changed remote profile artwork to consent-first loading for new and migrated settings. The UI and
  privacy documentation now explain that opening remote media can disclose the viewer's IP address
  and request time to its host.
- Made direct-message deletion, clearing, and retention durable across account-data synchronization,
  including monotonic deletion/pruning markers and conversation-preview repair so an older mirror
  cannot restore deleted text. Account imports are size bounded and reapply the same policies.
- Enforced group history and retention settings on durable state while preserving the active session,
  and kept replay tombstones without retaining message bodies. Creator-relayed messages now identify
  the relay and visibly treat the claimed original sender as unverified.
- Hardened account switching, protocol parsing, and abuse resistance: account-bound work fails closed,
  stale presence cannot overwrite newer state, presence/typing/activity effects are rate limited with
  bounded sender tracking, bidi controls are stripped, and quoted sender labels are marked unverified.
- Bounded device-local media storage and cleanup, canonicalized migrated settings and caches, removed
  identifying release metadata from the UI/logs, and documented the page-realm trust boundary.
- Hardened the release pipeline with pinned CI actions, read-only workflow permissions, dependency
  auditing, deterministic checks for both distributions, narrow game routes, `@noframes`, and the
  complete bundled Mod SDK license notice.

## 0.28.1 - 2026-08-29

- Removed addon-authored update Beeps and their peer-notice service entirely. KikiLink no longer sends
  another player an update message; the bounded local Home version check and its explicit Update button
  remain available without polling.
- Rendered matched `*action*` spans as italics in direct and group chat while keeping unmatched markers
  literal and preserving the existing safe text, link, image-preview, and Reply parsing boundaries.
- Increased the Custom Activity Blossom marker to 18 px on desktop so it remains recognizable, while
  preserving the existing 12 px marker on mobile.
- Made the desktop Custom Activity character/body-slot map a keyboard-accessible vertical scroll region,
  so lower slots remain selectable without enlarging the creator; the existing mobile layout is unchanged.
- Added regression coverage for quiet local-only updates, safe action formatting, responsive Blossom
  sizing, and desktop body-slot scrolling.

## 0.28.0 - 2026-08-29

- Fixed the Catbox upload bridge for isolated userscript realms. Some Tampermonkey/Violentmonkey
  configurations expose a same-page `MessageEvent` with a null or realm-specific `source`; KikiLink
  now authenticates the exact HTTPS origin, 256-bit per-load capability, request ID, and bounded schema
  without rejecting that valid transport shape. Wrong origins/capabilities still fail closed, and the
  page no longer asks users to change a Catbox/Litterbox permission when the installed bridge is present.
- Kept durable profile banners and managed-group avatars exclusively on public Catbox. Both reuse the
  same metadata-removing WebP preparation and authenticated privileged transport as an explicitly
  selected Catbox Gallery upload. Temporary chat and room-media uploads remain clearly expiring
  Litterbox actions; no upload POST is automatically retried after an ambiguous failure.
- Repaired the Confirm Group Chat layout so every avatar occupies one fixed slot instead of drifting
  down and right through nested margins. Group participant/author avatars are slightly larger, while
  the group marker stays above the avatar edge like a status dot.
- Matched the group composer and message density to direct chat: one-row auto-growing input, compact
  image/send controls, smaller bubbles and feedback, and more transcript space. Reply now renders a
  bounded inline context card with sender and excerpt rather than displaying a duplicated wire quote;
  selecting a new reply replaces the previous pending context.
- Split remote profile art from chat-message preview privacy under settings schema 27. Profile avatars,
  banners, and managed-group art now default to `Always show`, as expected for identity UI. Players may
  restore `Ask before loading` or `Links only` in Settings; message and Gallery previews retain their
  independent existing preference and default.
- Added an optional 160-character KikiProfile bio. Unsafe control and directional characters are
  stripped, the value is sent only after an explicit compatible profile lookup through a separately
  negotiated `pb` packet, and older exact-key `pf` peers remain compatible. An empty negotiated reply
  clears stale bio; the bounded device-local public-profile cache ages it with other rich details.
- Added a one-shot Home update check against KikiLink's official raw `package.json`. It runs only on
  production Bondage Club hosts, omits credentials and referrer data, rejects redirects, enforces strict
  SemVer, a four-second deadline, an 8 KiB response cap, bounded stream reads, and no retry or polling.
  Home exposes the fixed official userscript link only when the result is genuinely newer.
- Added scarce addon-authored release notices for compatible older peers. An ordinary private Beep is
  eligible only for a confirmed native BC friend with a live version and reachable route, is persisted
  per account/recipient/release before sending, and is capped at one attempt per minute and three per
  addon session. Unknown state, strangers, cached versions, storage failure, and malformed versions all
  suppress the notice; there is no broadcast, background queue, acknowledgement, or automatic retry.
- Added regression coverage for isolated-world upload events, Catbox routing, fixed confirmation
  geometry, compact group composition, Reply parsing/rendering, separate profile-media defaults, bio
  negotiation and cache expiry, official update bounds, and release-notice authorization/rate limits.

## 0.27.0 - 2026-08-29

- Added creator-managed group chats behind the newly negotiated `g: 3` capability. The creator is
  visibly identified and may rename the group, set or clear a direct-HTTPS avatar, choose a strict
  `#RRGGBB` outline, add one compatible member, or kick a non-owner while the group remains within
  3–5 members. Old fixed-membership groups remain usable as legacy groups and require an explicit
  owner-only conversion to a new creator-bound ID before management is enabled.
- Bound managed group authority to the creator encoded in the group ID, a cryptographically random
  membership epoch, and monotonic state/appearance/name revisions. Authoritative ID creation fails
  closed when the browser has no secure RNG. Membership changes rotate the epoch; kicked members
  receive an owner-authenticated removal with a durable bounded retry, stale state and messages fail
  closed, replay/rate/storage collections remain capped, and unsolicited owners cannot consume every
  local group slot.
- Replaced the tall group header action row with a compact avatar, title, creator marker, and one
  accessible menu. The same menu opens by right-click, keyboard Context Menu or Shift+F10, and
  touch/pen hold; it restores focus, closes on Escape/outside input, and exposes details, pin,
  removal, close, and owner-only management without retaining detached conversation rows.
- Added ordinary HTTPS and privacy-prepared local image messages to groups. Uploads revalidate the
  destination after asynchronous work, reuse the guarded LinkChat preview renderer, and appear in
  the lazy all-chat Gallery with an Open group action. Group author avatars are slightly larger,
  custom group avatars retain stable image nodes, and the status-like group marker is no longer
  clipped by the avatar stack.
- Reworked mixed direct/group navigation around keyed reusable rows, cached summaries, coalesced
  animation-frame refreshes, and targeted transcript updates. Focus and scroll survive refreshes,
  remote image object URLs stay valid while leased by live elements, and per-view timers,
  long-press bindings, uploads, and object URLs have explicit teardown paths.
- Bound group replay identity to the authenticated original MemberNumber plus message ID. A member
  racing another author's observed ID can no longer suppress that author's direct or creator-relayed
  message; storage version 3 preserves old version-1/2 replay IDs as conservative origin wildcards,
  and the keyed transcript can render legitimate same-ID messages from different authors.
- Hardened remote JPG/PNG/GIF/WebP loading before browser decode with strict MIME/signature agreement,
  redirect and private-address rejection, 5 MiB transfer, 4096-axis, 8-megapixel canvas, animation
  frame/pixel/rate, request/decode concurrency, queue, cache, lease, visibility, and live-preview
  residency bounds. Sub-20-ms animation frames and AVIF now fail closed rather than relying on
  decoder-specific timing or unbounded primary AV1 sequence metadata.
- Added the same fail-before-decode principle to selected local JPG/PNG/WebP files: bounded header
  inspection validates JPEG frames, PNG/APNG canvases, and WebP canvases/frames against the existing
  32-megapixel preparation limit, plus a 240-frame/64-megapixel animation-cycle budget, before
  `createImageBitmap` or `Image` can allocate them.
- Fixed direct-chat peer-switch, draft, and double-send races with per-peer mutation queues and a
  durability barrier for global clear/prune operations. Room media and image composers now capture
  and revalidate their destination, so a late completion cannot write into a closed view or a
  different conversation.
- Fixed profile-banner Catbox uploads hanging until timeout. Catbox now keeps
  `GM_xmlhttpRequest` in XHR mode by omitting the fetch-forcing anonymous option; bridge readiness and
  capability acknowledgement are authenticated, a missing/stale bridge fails in about three seconds,
  each request has one total deadline, and cancel/teardown releases both page and userscript resources.
  Litterbox keeps its credential-free anonymous mode. Non-idempotent upload POSTs no longer retry
  automatically after ambiguous provider errors, avoiding duplicate public files without a retained URL.
- Fixed profile names sitting on or escaping the banner boundary, contact-picker avatars layering
  across cards, Gallery/New group controls crowding the section label, and the tiny nested group-header
  scrollbar. Long profile names keep a safe inset and wrap/clamp within the card at narrow widths.
- Quieted and clarified the New group toolbar action with a distinct restrained treatment plus visible
  tooltip and accessible label. Owner/read-only group details, avatar picker, outline reset, member
  limits, and errors remain keyboard and mobile usable, including forced-color and reduced-motion modes.
- Hardened presence privacy so guarded Blacklist/Ghost checks fail closed and profile requests cannot
  escape through a throwing BC adapter. New tests cover managed authorization, revision/epoch replay,
  revocation retries and bounds, context-menu lifecycle, layout regressions, upload bridge deadlines,
  image leases, direct-chat races, and keyed rendering.

## 0.26.0 - 2026-08-29

- Rebuilt Chat navigation as one chronological, searchable list for direct and group conversations.
  Groups keep their separate transport and history, but now use participant-avatar stacks, an explicit
  `GROUP` badge, member-aware previews, pins, times, and unread counts in the same place users already
  look for chats. Gallery, New group, and New Beep actions now share one spaced toolbar instead of
  colliding with a separate Groups block.
- Removed the accidental mini scrollbar from group headers. Participant avatars now wrap within the
  header instead of creating a tiny nested scrolling strip, including on narrow layouts.
- Fixed corrupted direct-chat text from WCE/LikoMAT interop. KikiLink now removes only the exact,
  trailing validated WCE metadata envelope and anchored LikoMAT language trailer, applies the same
  canonical text to live and recent-log deduplication, and lazily cleans existing messages and
  conversation previews without touching malformed or user-authored near matches.
- Made profile banner uploads cancellable end to end. Presence shows upload progress and elapsed time,
  its upload button becomes Cancel, closing the dialog aborts the actual privileged request, and both
  page and userscript layers clean pending listeners, timers, and active slots exactly once. A host
  watchdog now releases stuck Tampermonkey requests even when provider callbacks never arrive, while
  missing bridge permission fails immediately with a useful reload/permission message. Profile-banner
  uploads now get a slow-connection-safe 180-second window instead of the generic 60-second image limit.
- Added an optional two-color profile-card gradient under settings schema 26. Both endpoints are strict
  `#RRGGBB` values, render with contrast-aware text, and travel only in the negotiated, explicitly
  requested profile-details packet. Older 0.25 peers keep receiving the original exact-key shape.
- Recolored and renamed the existing avatar decorations instead of adding more near-duplicates:
  Sakura blossoms, Scarlet rose ring, Violet starlight, Golden laurel, Poison thorns, Silver moon
  orbit, and Jade ribbons now have deliberately distinct palettes while retaining their stable IDs.
- Added a bounded account-local cache for voluntarily shared public profile fields. Up to 200 records
  remain for 90 days with LRU pruning and strict URL/enum/color validation. Saved cards open
  immediately, distinguish a wholly `SAVED PROFILE` from `SAVED DETAILS` beside live status, and refresh
  through a targeted lookup when the player is reachable; live status and room, private notes,
  relationships, and fetched image blobs are never persisted in this cache. Banner, outline, and
  gradient age only when those rich details are actually received, so ordinary presence heartbeats
  cannot keep removed visuals alive indefinitely.
- Limited quiet background discovery to players who are actually reachable through the current room
  or Bondage Club's online-friend route. Explicit profile opens remain point-to-point and cooldown
  bounded; a newly online friend gets one deduplicated discovery attempt, without a fixed global
  profile poll or repeated scans of offline profiles.
- Made avatars in Room and both Players list/detail surfaces real keyboard-focusable profile buttons,
  while keeping the notebook row as a separate action instead of nesting interactive controls.
- Gave long profile names a two-line clamp, safe word wrapping, a title tooltip, and a right inset so
  names no longer sit against or escape the profile card edge on desktop or mobile.

## 0.25.0 - 2026-08-29

- Promoted group chats into a prominent, searchable section of LinkChat. The section now exposes an
  aggregate unread count, recognizable participant-avatar stacks, member-aware previews, and clearer
  pinned and unread state without mixing groups into ordinary one-to-one conversations.
- Made group people consistently actionable. Participant chips, group-creation contacts, confirmation
  members, and message-author avatars open the same KikiLink profile surface as other compatible-player
  avatars, with keyboard, context-menu, and touch behavior supplied by the host view.
- Kept large group histories responsive by rendering the newest 120 messages first and adding
  `Load older messages` in bounded 100-message increments. The group composer now follows LinkChat's
  existing Enter-to-send preference, while Ctrl/Cmd+Enter remains an explicit send shortcut.
- Made direct/group navigation latest-intent-wins across asynchronous storage work, so a newer group
  click or panel close cannot be overwritten by an older pending direct-chat open. Group activation
  now hides the direct pane before awaiting read-state persistence.
- Added a creator-mediated, one-hop route for messages between group members who are neither BC
  friends nor in the same room. A member first hands the authored packet to the group creator; the
  creator may forward it only to the group's immutable members over routes BC currently permits.
  Relay packets preserve the original MemberNumber and message ID and cannot be relayed again.
- Kept creator relay deliberately limited: it works only while the creator is online, running the
  compatible addon, and reachable; it has a bounded short-lived queue, per-origin and aggregate input
  limits, paced forwarding, block/ghost checks, and no offline storage or retry service. Handoff and
  relay are best-effort and unconfirmed—KikiLink still does not claim delivery receipts. The creator
  remains the trust root for this v1 group shape, so members should create groups only with a creator
  they trust.
- Replaced repeated full group-history writes during busy chats with a 300 ms trailing batch and a
  hard 1.8-second durability deadline. Lifecycle boundaries still flush immediately, while sustained
  message or draft activity no longer serializes the complete bounded snapshot several times a second.
- Added creator-authenticated group display names so participants are recognizable even without a
  local BC contact record. Name packets are accepted only from the immutable group's creator and only
  for the exact member list; names are presentation data and never replace the authenticated sender
  MemberNumber for identity, membership, rate limits, or authorization.
- Added local profile-banner upload. KikiLink validates the selected JPG, PNG, or WebP, decodes and
  center-crops it to an exact 1200×400 canvas, removes source filename and metadata through WebP
  re-encoding, adapts quality, and fails closed unless the result is at most 2 MiB. The explicit upload
  action opens the file picker, then stores the chosen prepared banner on Catbox's long-lived public
  storage. The dialog labels that public-storage boundary before selection.
- Applied the existing remote-image privacy boundary to profile banners: `Ask first` reveals only the
  exact member-and-URL pair for the current session, `Always show` may load automatically, and
  `Links only` makes no image request. Banners use the same credential-free, no-referrer, no-redirect,
  reserved-address-blocking, MIME-checked, 5 MiB bounded loader and cancellable local blob URLs as
  profile avatars.
- Added strict optional `#RRGGBB` profile outlines and four new avatar decorations: Golden laurel,
  Crimson thorns, Moonlit orbit, and Silk ribbons. Refined profiles keep the presence dot above every
  decoration, expose a pointer cursor on clickable avatars, and retain initials when remote images are
  hidden.
- Migrated settings to schema 25 and moved banner URL and outline details into a separate bounded `pf`
  response requested only when a compatible profile is explicitly opened. These optional fields are
  not added to periodic presence broadcasts, are never retried automatically, and are discarded when
  Presence sharing is disabled.
- Bound each Presence instance to the authenticated BC MemberNumber captured at construction. A
  confirmed account switch now irreversibly clears old voluntary profile, capability, typing, request,
  listener, and timer state before the instance can receive or send through the new account; transient
  guarded Firefox reads stay silent and can recover for the same account.
- Left the proven Blossom integration unchanged: KikiLink still owns exactly one
  `ChatRoomDrawCharacterStatusIcons` ModSDK hook and does not wrap the outer character overlay or loop.

## 0.24.0 - 2026-08-29

- Added separate addon group chats for 3–5 total members, including the creator. A new group is
  confirmed before invitations are sent, and its sorted membership cannot be changed: create a new
  group when the participant list needs to change.
- Kept group invitations inside an explicit trust boundary. An incoming group is accepted only from
  a known BC friend, must include both sender and recipient, and cannot rewrite an existing group's
  creator or membership. Merely sharing a room grants no trust, while blocked, ghosted, or unreadable
  relationship state is rejected for inbound invitations.
- Added a strict version-1 group protocol over individual KikiLink packets. Exact packet shapes,
  canonical member lists, duplicate message IDs, bounded remote times, unsafe control or bidi text,
  unpaired surrogates, and unauthorized senders are validated before storage. Each JSON payload is at
  most 700 characters and every group message is capped at 257 characters, including worst-case JSON
  escaping.
- Made group send feedback honest and bounded: each remote member receives an individual addon
  packet, per-recipient local BC handoff failures are reported, and a message is not added to local
  history when every send fails. There are no delivery receipts. Account-scoped browser storage
  retains at most 30 groups, 500 messages per group, 3,000 group messages overall, and 60
  removed-group tombstones.
- Coalesced high-frequency group messages, reads, pins, and drafts into a bounded 300 ms local-storage
  write. Destructive actions, page hiding, and module teardown flush explicitly; failed writes keep a
  dirty in-memory copy, show a storage warning, and report recovery. Replay storage now contains only
  IDs of evicted or pruned messages instead of duplicating every visible message ID.
- Made group storage fail closed on unreadable, malformed, or unsupported saved state: no mutation can
  overwrite the original bytes, a recovered valid snapshot is restored before work resumes, and an
  explicit clear reports whether the empty state was durably retained instead of showing false success.
  Removing one group likewise reports a session-only result if its durable write fails.
- Kept the current room first in Lobbies even when it is not returned by the room directory, a search
  does not match it, or a refresh fails. Its Join action is replaced by a non-interactive
  `Current room` badge.
- Completed lobby navigation with Bondage Club's native room flow. KikiLink now checks whether the
  current room may be left, requests one native leave, waits for the old room state to clear, performs
  one native join, and closes the panel only after BC reports the requested room. Repeated clicks share
  the same in-flight operation instead of starting competing transitions.
- Added KikiLink profile cards from compatible avatars and player context menus. Cards separate
  voluntary addon profile details from Bondage Club-observable facts and clearly label the private
  note, tags, last recorded room, and encounter count as visible only to the local user. Optional Blossom,
  Rose, and Starlight avatar frames and Garden or Midnight card styles add decoration without changing
  player identity. Explicit profile opens request a fresh voluntary profile under a short cooldown,
  closing the card cancels its unfinished avatar, and turning Presence off immediately drops cached
  remote profile fields so reciprocal privacy does not depend on cache age.
- Applied the existing image-preview privacy choice to profile avatars: `Ask before loading` grants
  only the exact member-and-normalized-URL pair for the current session, so a replacement URL asks
  again; `Always show` loads automatically, and `Links only` never requests it. The loader omits
  credentials and referrer data, rejects redirects and local/reserved addresses, validates the HTTPS
  response, supported image MIME, and 5 MiB bound,
  then gives the image element only a local blob URL. At most four remote images fetch at once, no
  more than 32 may be active or queued, and the complete wait is limited to 15 seconds. Closing or
  replacing an avatar cancels its unused request. Initials and decorations remain available.
- Hardened remote images and the privileged Catbox/Litterbox bridge. Remote fetches now refuse every
  redirect and reject localhost plus private, loopback, link-local, and reserved IP literals before
  sending a request. Each userscript load gives its page runtime an unguessable 256-bit upload
  capability, validates exact window/origin metadata, and enforces two concurrent uploads plus a
  rolling 12-request/160-MiB budget per 10 minutes with a bounded cooldown and teardown cleanup.
- Made the all-chat Gallery truly lazy: automatic remote previews wait for the viewport and run at
  most four at once; browsers without `IntersectionObserver` load only a bounded first set and leave
  the remainder manual. Navigation, close, and teardown now invalidate delayed reads, cancel unused
  requests, and release object URLs. Device-storage errors are visible, Litterbox expiry is retained,
  labeled, range-checked, and pruned, and upload choices cannot change halfway through a request.
- Hardened storage and live BC integration. Account-sync writes are batched more conservatively,
  transient mirror failures keep pending local data available for a later retry, IndexedDB closes on
  version changes and late blocked opens, and guarded or malformed cross-realm socket/profile values
  are contained instead of breaking the addon. Presence packets now sanitize hostile control and bidi
  text, stay within the same 700-character transport bound, and prune stale request state.
- Made direct-chat clearing durability-aware across IndexedDB, its session fallback, and the bounded
  account mirror. A verified account-scoped clear marker prevents an older cloud snapshot or an
  already-running snapshot from resurrecting chats on reload; the UI warns instead of claiming success
  when only the current session was cleared. A newer valid cloud settings/notebook snapshot also remains
  the in-memory source of truth when browser storage temporarily refuses its restoration write.
- Left the proven Blossom integration unchanged: KikiLink still owns exactly one
  `ChatRoomDrawCharacterStatusIcons` ModSDK hook and does not wrap the outer character overlay or loop.

## 0.23.0 - 2026-08-27

- Added a dedicated `News` tab immediately beside the KikiLink brand. It presents a curated,
  in-addon changelog with the current release highlighted and a link to the complete project log.
- Expanded desktop window dragging from the brand to every genuinely empty part of the top bar.
  Profile/Status, News, Find, Settings, Close, links, fields, labels, the clock, and the workspace
  label remain normal controls and never begin a drag.
- Added account-scoped favorite lobby names. Matching live rooms are sorted ahead of friend rooms,
  use a gold outline and filled star, and can be added or removed directly from each room card.
  Rooms containing friends now use the selected accent instead of gold.
- Replaced Bondage Club's raw lobby map values: `Never` is shown as `Character view` and `Always`
  as `Map view`, while unknown future modes receive an explicit `Map mode` label.
- Added compact New Beep controls for `All contacts`, `Online only`, or `In this room`, plus
  `Online first` and `A–Z` sorting. The default keeps in-room and online contacts above offline
  names while preserving direct member-number entry.
- Added the missing `Sub` player relationship. KikiLink combines the current room character's
  native owner record with Bondage Club's `Submissive` online-friend category, and deduplicates it
  with the existing Owner, Lover, Whitelist, Blacklist, and Ghosted tags.
- Expanded local-file Gallery storage into three explicit, opt-in choices: private permanent
  storage on this device, public Catbox without automatic expiry, or public Litterbox for 1, 12,
  24, or 72 hours. Selection still performs no network request; only the final save action uploads
  the privacy-prepared, metadata-free WebP.
- Bumped the settings schema to 23 with bounded, case-insensitive favorite-room sanitization and
  added end-to-end regressions for News, safe drag targets, lobby ordering/colors, map labels,
  contact filtering, native Sub detection, and both Gallery hosts.

## 0.22.12 - 2026-08-27

- Moved the default Blossom from the clipped right edge into a stacked slot directly below Echo's
  clothing-skirt icon: both use `CharX + 420×Zoom`; Echo stays at `CharY + 5` and Blossom now uses
  `CharY + 45×Zoom`. Existing positions saved through the placement control remain unchanged.
- Separated addon detection from optional Presence profile sharing. A small capability-only packet
  now confirms KikiLink even when status sharing is disabled, so the Blossom appears for every
  confirmed KikiLink user and never for players who did not answer the KikiLink protocol.
- Reduced native room-frame work by removing the obsolete string/microtask draw deduplicator,
  repeated normal-play DOM style writes, temporary frame/position allocations, and redundant probes
  for already-confirmed peers. Added regressions for the Echo/Blossom stack, disabled-Presence
  discovery, invalid peers, and repeated canvas passes.

## 0.22.11 - 2026-08-27

- Fixed the remaining first-frame Blossom failure: Bondage Club's `DrawImageResize` legitimately
  returns `false` while an image is still decoding. KikiLink now continues to its cached page-realm
  vector renderer on that result, so the flower is visible immediately instead of depending on the
  SVG image cache becoming ready.
- Added a regression that keeps the native helper present but returning `false` and requires the
  complete Blossom vector (petals, outlines, center, and highlights) to draw in the same frame.

## 0.22.10 - 2026-08-27

- Fixed the Firefox `Permission denied to access object` crash introduced by 0.22.8/0.22.9.
  KikiLink no longer reads `unsafeWindow` or passes Bondage Club characters, functions, callbacks,
  canvas state, or ModSDK objects across a userscript boundary. The full game integration is
  injected into the page realm; the DOM-only userscript sandbox retains just the upload permission
  and a strictly validated structured-data bridge for Catbox/Litterbox.
- Matched the established addon chain directly: KikiLink joins
  `ChatRoomDrawCharacterStatusIcons` once through the shared ModSDK, after the native/Echo/WCE
  drawing, and keeps its dedicated `CharX + 460×Zoom` slot. It never wraps
  `ChatRoomCharacterViewDrawOverlay` or `ChatRoomCharacterViewLoopCharacters`, including when
  registration is unavailable or another addon loads late.
- Removed the normal-play DOM fallback and its character-loop polling. The DOM copy and one native
  character-frame lookup now exist only while the user explicitly arms icon placement in Settings.
- Minified the embedded page runtime to reduce userscript download size and startup parsing while
  keeping the small privileged loader readable and independently auditable.
- Added regressions for a poisoned `unsafeWindow`, the nested Echo/WCE/BCX chain, failed and late
  ModSDK registration, decoded Blossom pixels and neighboring icon slots, and end-to-end sandboxed
  multipart upload progress.

## 0.22.9 - 2026-08-27

- Fixed the last visual conflict found in the addon compatibility audit: Echo owns the
  `CharX + 420×Zoom` through `+455×Zoom` rectangle, so sharing it could let Echo's later draw cover
  the Blossom even though KikiLink's canvas call succeeded.
- Moved the default Blossom to a dedicated `CharX + 460×Zoom` through `+495×Zoom` slot, after Echo
  and clear of WCE and BCX. Existing explicit user placement remains unchanged.
- Extended the published browser harness to render an Echo-slot sentinel and require both that
  sentinel and real decoded Blossom pixels to survive simultaneously.

## 0.22.8 - 2026-08-27

- Restored the explicit `unsafeWindow` page-context bridge from the empirically working 0.20.6
  release. Firefox can isolate a userscript as soon as `GM_xmlhttpRequest` is granted, so moving
  `@sandbox raw` was not sufficient even though KikiLink's DOM interface still appeared.
- Aligned the Blossom with the current addon icon paths used by Echo, WCE, and BCX: KikiLink now
  joins only `ChatRoomDrawCharacterStatusIcons`, draws through BC's page-owned `DrawImageResize`,
  and returns to Echo's established `CharX + 420×Zoom`, `CharY + 5`, `35×Zoom` slot.
- Added a strictly room-gated DOM failsafe for the authenticated character when no successful
  canvas draw is observed, while keeping it hidden whenever the native renderer is healthy.
- Replaced the page-realm-only release check with an isolated Firefox-style runtime test. The
  browser harness now requires an actual decoded Blossom image and non-transparent canvas pixels.

## 0.22.7 - 2026-08-27

- Fixed the shared Firefox regression behind both the missing room Blossom and broken Custom
  Activities. `@sandbox raw` is now the first userscript directive, keeping KikiLink in Bondage
  Club's page realm while retaining the narrowly granted Catbox/Litterbox background uploader.
- Made the Blossom independent of image loading and BC's image cache by drawing its upright flower
  artwork from cached canvas paths. KikiLink now guards both current room overlay boundaries and
  deduplicates their nested call, so the local and compatible-peer icon is drawn exactly once.
- Hardened live upgrades and account switches: a partially broken older release can no longer block
  the repaired bundle during cleanup, and delayed Room Tools refreshes cannot run after teardown.
- Reduced permanent background work by consolidating compatibility health checks and lowering the
  account-switch poll from four checks per second to one. The validation command now rebuilds the
  published userscript before runtime tests, preventing stale `dist` code from producing false passes.

## 0.22.6 - 2026-08-27

- Made Catbox/Litterbox upload failures readable and resilient: temporary HTTP 500, 502, 503, or
  504 responses are retried once, and an HTML error page is replaced with a short provider/status
  message instead of being pasted into a KikiLink notification.
- Added `Share & use as room music` to device-local Music tracks. Room administrators can temporarily
  share a compatible MP3/MP4, review it in Room Tools, and apply it exactly like a device Gallery
  background; the live link is reused until it is near expiry instead of uploading another copy.
- Taught the session-only playlist-follow switch to share local MP3/MP4 tracks automatically before
  updating Bondage Club room music. Local-only formats remain available in the private player and
  receive a clear compatibility message if selected for a room.

## 0.22.5 - 2026-08-27

- Restored the Blossom icon above the local character and compatible KikiLink peers after a BC
  hot reload or late addon replaced `ChatRoomDrawCharacterStatusIcons`. The canvas overlay now has
  the same self-healing live guard as the critical Custom Activity hooks while preserving the
  native, Echo, BCX, WCE, and AFC draw chain without duplicate rendering.

## 0.22.4 - 2026-08-26

- Restored the pre-0.22.2 upload split: temporary chat images and room media use Litterbox with
  1, 12, 24, or 72 hour retention, while Music can upload long-lived anonymous tracks to Catbox.
  Restored both userscript host permissions, multipart POST formats, strict response validation,
  generic filenames, progress reporting, and schema migration from the WaifuVault-era settings.
- Removed Music's obsolete WaifuVault lifetime control. Saved `hosted` tracks migrate to `catbox`
  without losing their URL, and current anonymous Catbox retention is described accurately.
- Fixed Custom Activity labels, vanilla pictures, and execution independently of page-function
  hooks. KikiLink now repairs native activity-card DOM and captures its click before Bondage Club can
  fall through to the missing `ActivityDictionary.csv` entry; mirrored activity groups are supported.

## 0.22.3 - 2026-08-26

- Fixed Custom Activity cards losing their label and selected vanilla picture, then falling through
  to Bondage Club's missing `ChatSelf-...-KikiLinkCustom_...` dictionary entry when used. The three
  critical activity boundaries now remain healthy after a late BC or addon function replacement.
- Added a dedicated shared-track lifetime selector directly to Music: maximum provider lifetime,
  30, 7, 3, or 1 day. Music uploads no longer inherit or require the Chat image-upload switch.
- Made the default maximum option omit a custom expiry so anonymous WaifuVault policy selects its
  longest size-based lifetime, while clearly explaining that anonymous uploads are not permanent.

## 0.22.2 - 2026-08-26

- Removed the previous upload providers, permissions, endpoints, labels, and documentation. Every
  hosted image, room-audio, and playlist upload now uses WaifuVault's anonymous API with hidden
  filenames and selectable 1, 3, 7, or 30 day expiry.
- Changed manual local Gallery imports from temporary public uploads to durable, account-isolated
  IndexedDB records. They remain on that device until explicitly deleted or the browser's site data
  is cleared; selecting one for a room background performs a separate, explicit temporary share.
- Made Gallery deletion truthful: device files are deleted from local storage, while linked chat
  media remains non-destructive. The Gallery counter now includes device-only files.
- Replaced the crowded Music playlist action row with a compact Manage menu and added an earlier
  responsive single-column breakpoint, full-width narrow-screen volume control, and safer scrolling
  so player, library, queue, and add-track cells do not overlap.
- Migrated schema 19 hosted tracks and short lifetime choices without dropping saved playlists,
  updated the userscript network allowlist, and added regressions for the new API and local Gallery.

## 0.22.1 - 2026-08-26

- Fixed Firefox `NetworkError when attempting to fetch resource` for public-host uploads.
  Uploads now use Tampermonkey's narrowly granted background request with an explicit host
  connection permission, while KikiLink remains in the page realm required by Bondage Club.
- Matched LianChat's live room-directory request by always sending Bondage Club's `Space`, `Game`,
  and full-room fields. Added a compact Female/Mixed/Male selector and kept friend rooms first.
- Redesigned Music around a lacquer-and-gold now-playing card and searchable queue. Added batch file
  import, upload progress, playlist rename/duplicate/clear, track rename/reorder/original-link tools,
  mute, playback speed, sleep timers, and browser Media Session controls.
- Cached device-local track availability instead of reopening and scanning IndexedDB on every music
  render, and now removes orphaned local blobs when clearing or deleting playlists.

## 0.22.0 - 2026-08-26

- Replaced the ambiguous top-bar Online pill with a compact profile cell containing the current
  account's avatar, name, presence, and custom status. Added a minute-aligned local clock beside it
  and kept both responsive on phones.
- Decoupled profile avatars from shared-chat image privacy. KikiLink avatars now load automatically
  in visible identity controls, while message and Gallery images still obey Ask first, Always show,
  or Links only.
- Fixed literal `{me}` leaking into room text by teaching both legacy and native Custom Activity
  paths the same case-insensitive, whitespace-tolerant one-pass variables without reinterpreting
  replacement names as templates.
- Added a compact Lobbies subtool inside Room. It calls Bondage Club's native room-search API only
  on open or explicit refresh, filters locally, sorts friend rooms first, and displays friend avatars
  without adding another primary tab or another ModSDK hook.
- Added up to twelve account-scoped Room Presets for ordinary room identity, access, roles, lists,
  native/custom backgrounds, music, layout, and sync settings. Applying remains admin-only, preserves
  the current user as an admin, and intentionally omits passwords and large map layouts.
- Added a full Music destination with up to eight playlists and one hundred tracks, direct URLs,
  device-only local files, explicit public-host upload, seeking, volume, queue removal,
  previous/next, shuffle, and repeat modes.
- Added a session-only Room follow switch. A current administrator can mirror each newly playing
  remote MP3/MP4 track into native room music; local-only and unsupported tracks are refused with a
  visible explanation, and repeated room updates are deduplicated.
- Added account-isolated IndexedDB music storage, bounded schema-19 sanitization, Firefox-safe lobby
  object copying, new native icon geometry, responsive layouts, and regressions for every new path.

## 0.21.1 - 2026-08-25

- Added a branded About category with the KikiLink wolf emblem, creator identity, running version,
  stable channel, MIT license, account-data summary, official repository, and KikiLink Discord.
- Fixed player statuses and profile avatars remaining absent until a player was selected. Visible
  chats, room players, and known contacts now use a deduplicated 140 ms Presence discovery queue;
  remote avatars under `Ask first` expose a clear one-time tap control without weakening privacy.
- Promoted Media Gallery to a labeled Chat control and a dedicated Home card without adding another
  primary navigation tab. Finder now describes both manually added images and saved-chat media.
- Added direct Gallery import for HTTPS links and privacy-prepared local uploads. Account-scoped
  saved images follow the signed-in BC account, while Remove hides only the Gallery card and never
  deletes the original chat message or hosted file.
- Kept `Use as room background` entirely out of Gallery markup for non-admins and added a live
  permission regression for losing room-admin rights while Gallery is open.
- Bounded all-chat media scanning to eight concurrent history reads so large accounts no longer
  create a burst of IndexedDB transactions when Gallery opens.

## 0.21.0 - 2026-08-25

- Added a 0–100 Alerts volume control and local custom notification sounds. Files are validated as
  browser-readable audio, rejected above five seconds or 10 MB, stored per device/account in
  IndexedDB, and decoded once per session instead of entering BC account synchronization.
- Turned Do not disturb into a functional quiet mode: incoming data and unread counts remain intact,
  while alert toasts, sounds, reaction notices, and automatic chat opening are suppressed. The
  bounded private auto-reply can now be enabled for both Idle and DND sessions.
- Made the desktop Link Deck draggable by its title bar with viewport clamping, persisted position,
  and a Navigation reset action. Reworked dialog layout so profile/avatar Save controls remain fixed
  and visible on PC.
- Added native Room Tools for administrators: custom background, all three BC resize modes, music,
  synchronized playback, Kick, Promote/Demote, and room Whitelist/Unwhitelist. Commands use BC's
  live admin state and `ChatRoomAdmin` packets; Kick requires explicit confirmation.
- Added explicit temporary room-music upload for BC-supported MP3/MP4 audio up to 20 MB. The provider
  receives a generic filename; the UI warns that embedded audio metadata is not stripped.
- Added a lazy, deduplicated Media Gallery across saved LinkChat conversations, with provider
  labels, privacy-aware full-size cards, source-chat navigation, and one-click selection as
  a room background. Temporary local image uploads can also populate the room background field.
- Added focused regressions for device audio duration/storage, custom-sound volume, DND replies,
  cross-chat media aggregation, and current BC room-admin packet shapes.

## 0.20.10 - 2026-08-25

- Fixed Custom Activity arousal applying only to the local player. Outgoing actions now include
  validated native BC `ActivityName`/`ActivityCounter` metadata, allowing the target's own BC client
  to process the effect even when KikiLink is absent, outdated, or temporarily unable to hook the
  room-message path.
- Added protocol-v2 handoff for current KikiLink targets: the configured flat arousal amount is
  applied once on the target client, then only KikiLink's native fallback fields are removed before
  BC continues. This avoids double arousal while remaining backward-compatible with v1 messages
  from 0.20.9.
- Removed the redundant screen-state membership gate from target-side processing, resolved the
  local/source characters directly from the live room roster, and consume replay nonces only after
  a successful effect so a transient unavailable runtime can still fall through to native BC.

## 0.20.9 - 2026-08-25

- Moved outgoing-message capture to the shared low-level `ServerSend("AccountBeep", ...)` path used
  by current Bondage Club and messenger addons such as LianChat. Normal messages are saved once,
  typed/service packets remain excluded, KikiLink's own sends do not duplicate, and the native Beep
  log now provides an additional outgoing recovery path.
- Reworked inline image cards to use the full available chat width and their natural aspect ratio
  instead of a fixed crop. When previews are enabled, the raw image URL is no longer repeated above
  the card; `Show original` remains the single explicit outbound link.
- Added an independent hidden-room protocol socket listener plus a compact 30-second presence
  heartbeat. Peers who enter later or finish loading KikiLink after the first handshake now become
  compatible automatically, so their native room Blossom can appear without opening a chat first.
- Added account-derived Owner, Lover, Whitelist, Blacklist, and Ghosted badges to Players beside the
  existing Here, Online, and Friend state. Values are read from the authenticated BC player's live
  relationship fields and are never copied into another account.
- Reduced the native Custom Activity Blossom from 14 px to 12 px and the internal activity-library
  marker from 23 px to 19 px while keeping both upright and fixed to the upper-left corner.

## 0.20.8 - 2026-08-25

- Redrew Blossom from scratch as an upright cartoon flower with a clean burgundy outline, solid
  pink petals, and a gold center. The new minimal SVG has no rotation or translucent overlapping
  ellipses and remains legible at both the 14 px activity-marker size and the native room-icon size.
- Moved the native Custom Activity marker flush to the upper-left corner and locked its 14 px
  geometry with inline priorities so Bondage Club's mobile activity-card rules cannot displace it.
- Replaced the always-expanded body-slot wall with a compact selected-slot summary. `Show all`
  lazily creates the full accessible radio grid, selecting a slot collapses it again, and tapping
  the character continues to update the same selection.
- Reduced editor work without changing its layout: the character canvas no longer performs a
  discarded pre-mount draw, vanilla picture nodes are built once instead of recreated on every
  click/search input, rapid searches are coalesced per frame, and offscreen pictures decode lazily.

## 0.20.7 - 2026-08-25

- Removed the Firefox cross-realm `unsafeWindow` bridge introduced in 0.20.6. KikiLink now runs as
  one raw page-realm userscript and never passes sandbox callbacks or arrays into the shared BC
  ModSDK chain, eliminating the `Permission denied to access object` crash seen with Echo, BCX,
  WCE, and AFC installed together.
- Stopped the normal-play DOM Blossom and its continuous
  `ChatRoomCharacterViewLoopCharacters` polling. Blossom now draws only through the same native
  `ChatRoomDrawCharacterStatusIcons` ModSDK entrypoint used by Echo, so it disappears naturally on
  profiles and vanilla menus; the DOM flower exists only while `Move flower` is explicitly armed.
- Moved the default room Blossom slightly below and left of the crowded addon row while retaining
  the settings-only drag control and respecting Bondage Club's native hidden-icon state.
- Reduced the Custom Activity Blossom from 24 px to 14 px and locked it to the true 1 px
  lower-right corner so Bondage Club's mobile activity-card styles cannot enlarge or displace it.
- Added a deterministic shared-router regression covering Echo-, AFC-, native-, and KikiLink-style
  status-icon handlers, plus a full R131 built-userscript test with ModSDK registration rejected.

## 0.20.6 - 2026-08-25

- Fixed the shared real-browser failure behind both missing integrations: when browser CSP or a
  userscript-manager fallback placed KikiLink in an isolated JavaScript world, its own interface
  could mount while every Bondage Club global and hook remained disconnected from the page.
- Added a live `unsafeWindow` bridge for the exact BC functions, arrays, canvas state, account data,
  and ModSDK surface KikiLink consumes. Getter/setter forwarding follows BC and addon replacements
  instead of copying stale values, while direct hooks now always wrap the real page functions.
- Aligned Blossom with current BC R129 and Echo Activities by drawing the 35-unit flower through
  `DrawImageResize` at the established status-icon-row coordinate. The DOM image is retained only
  as a delayed fallback and as the deliberate Move flower drag handle.
- Upgraded the published-userscript regression to isolate every BC global from the userscript
  window, reject ModSDK registration, execute the full built bundle, then verify the native canvas
  draw, visible fallback, live Custom Activity registry/dialog/button, and corner version badge.

## 0.20.5 - 2026-08-25

- Removed ModSDK as a dependency of the two critical UI integrations. Blossom and all six native
  Custom Activity entrypoints now use live direct wrappers with a health watchdog, including when
  ModSDK registration itself is rejected by an older addon or duplicate SDK instance.
- Fixed the built userscript's ModSDK CommonJS interop so its remaining noncritical hooks resolve
  the actual live `window.bcModSdk` API instead of a module wrapper with no `registerMod` method.
- Added a passive DOM Blossom for the authenticated character, positioned from BC's real
  `ChatRoomCharacterViewLoopCharacters` frame and the displayed `MainCanvas` rectangle. It remains
  visible and movable even if every character-overlay hook is unavailable; compatible peers still
  use the native canvas row.
- Added an independent open-dialog watchdog that repairs the exact live `DialogActivity` array and
  native button grid, plus support for BC groups that mirror another group's activities.
- Added a 7 px, 18% opacity version number in the lower-left corner so the actually running
  userscript release is always identifiable without opening KikiLink.
- Added a real-bundle browser harness that deliberately rejects ModSDK registration and verifies the
  visible Blossom, native registry entry, native dialog button, public API version, and corner badge.

## 0.20.4 - 2026-08-25

- Fixed the real runtime failure shared by Blossom and Custom Activities: ModSDK can retain a stale
  cached entrypoint after Bondage Club or another addon replaces a function. KikiLink now detects
  that state and installs a cleanup-safe direct wrapper around the current native function instead
  of treating an unreachable hook as healthy.
- Registered the Blossom renderer through both established room-addon paths used by BCX and Echo,
  with same-frame de-duplication. The explicit `Move flower` action can also recover the visible
  player's exact `CharX`, `CharY`, and `Zoom` directly from BC's character loop if no overlay frame
  has reached KikiLink yet.
- Added a second native activity-grid path at `DialogBuildActivities`, kept integrations alive after
  transient menu replacement errors, and allowed a matching saved activity to populate an otherwise
  empty native group result. Saved actions now survive stale preference and allowed-list hooks.
- Added regression coverage for replaced ModSDK entrypoints, the missing-overlay placement error,
  the final `DialogActivity` grid, and empty native activity groups. All 133 tests pass.

## 0.20.3 - 2026-08-25

- Replaced the fixed screen-space Blossom with the actual Bondage Club character-overlay pattern
  used by established addons: the 30-unit translucent flower is drawn from each character's
  `CharX`, `CharY`, and `Zoom`, respects hidden status icons, and appears for the authenticated
  player and confirmed compatible KikiLink peers.
- Kept flower movement behind the explicit Appearance button. Placement mode now drags the canvas
  flower above the current character, saves a character-relative offset, consumes no gameplay input
  outside that mode, and resets beside the normal addon-icon row.
- Aligned Custom Activities with Echo's live registration lifecycle: runtime names now include the
  owning MemberNumber, native entries explicitly carry `ActivityID`, `Target`, and `TargetSelf`,
  registration waits for both populated registries, and an already-open native activity grid is
  rebuilt after synchronization.
- Wait for the authenticated account's `ExtensionSettings` after login before opening its
  MemberNumber-specific localStorage namespace and IndexedDB. This prevents a blank or previous
  login transition from racing the current account data returned by Bondage Club.
- Migrated settings to schema version 16 and reset only the obsolete v15 viewport flower coordinate;
  account settings, chats, notebook entries, profile data, and Custom Activities remain intact.

## 0.20.2 - 2026-08-24

- Scoped settings, player records, drafts, conversations, and IndexedDB message history to the
  authenticated Bondage Club MemberNumber. Logging out now fully tears KikiLink down, and an
  in-page account switch rebuilds it with the new account instead of exposing the previous one.
- Deliberately quarantined the old unscoped browser keys instead of guessing which account owned
  them. Every new account starts with its own defaults unless it already has account-linked data.
- Added a bounded account mirror through Bondage Club `ExtensionSettings`: settings, Custom
  Activities, presence/profile preferences, player notebook data, and up to 600 recent messages
  can follow the same account to another browser while the full per-account local copy remains.
- Reduced the top Blossom from a 44 px hit area / 32 px graphic to a quiet 28 px / 20 px mark near
  the addon-icon row. It ignores input during play and permits exactly one drag only after choosing
  `Move flower` in Appearance; Escape cancels placement and reset remains separate.
- Hooked the real `ActivityAllowedForGroup` result consumed by Bondage Club's native dialog grid,
  while retaining registry registration for native lookups. This removes the remaining late-load
  path where a saved activity existed internally but never reached `DialogActivity`.
- Added account-switch, cloud-mirror, legacy-quarantine, native-dialog, and settings-only Blossom
  coverage.

## 0.20.1 - 2026-08-24

- Replaced the WCE/BCX preset selector and character-relative Blossom drawing with one visible,
  freely draggable screen badge. Its normalized position follows viewport changes, saves after a
  drag, and has a single reset action in Appearance settings.
- Made Custom Activities wait for Bondage Club's live activity registries and monitor them for
  replacement or in-place rebuilds. Saved actions are reinserted exactly once instead of silently
  disappearing when the game finishes loading a registry after KikiLink.
- Moved the Custom Activity Blossom marker to the lower-right corner of the native activity card,
  matching the addon marker placement used in the supplied reference.
- Changed the untouched AFK default to English (`Hi, I'm AFK. Message me later!`) and migrated only
  the exact accidental Russian default, preserving genuinely customized messages.
- Migrated settings to schema version 15 and removed the retired room-badge preset and offset fields.

## 0.20.0 - 2026-08-24

- Restored the original wolf-and-red-moon KikiLink emblem everywhere inside the addon and kept the
  translucent Blossom as a separate room-addon and Custom Activities marker. A visually matched,
  metadata-free 512 px WebP keeps the restored emblem inexpensive inside the userscript.
- Moved the room Blossom into selectable safe positions around common WCE and BCX icon areas, added
  bounded horizontal and vertical fine adjustment, and kept native icon hiding and compatibility checks.
- Added account-free temporary local-image uploads through the former public host with 1, 12, 24, or
  72 hour retention. Files are still validated, resized, metadata-stripped, and re-encoded locally
  before an explicit upload.
- Added direct-link profile avatars shared through the bounded presence packet. Remote avatars obey
  the existing image-preview privacy preference, offer one-session consent under `Ask`, avoid reloads
  on typing updates, and load without credentials or referrer data.
- Added configurable automatic Idle from 0–120 minutes and an optional editable AFK reply. Replies
  are private, exclude the room, run once per sender per Idle session, and have per-sender and global limits.
- Stabilized chat scrolling with fixed-aspect remote image cards, paint-only containment, disabled
  browser scroll anchoring, no viewport-lazy message creation, and explicit viewport compensation
  when the bounded feed removes its oldest rendered row.
- Refined incoming and outgoing bubbles with a restrained one-pixel top gradient and calmer surfaces.
- Rebuilt Custom Activities around an always-visible body-slot grid, deterministic smallest-zone taps,
  a canonical 33-icon vanilla-only gallery, and a single-scroll mobile editor that presents the slot
  grid before the character stage and keeps touch-safe controls.
- Keep the entire KikiLink host hidden whenever Bondage Club reports that the account logged out,
  while preserving the existing pre-login mount gate.
- Migrated settings to schema version 14, reset the former Cloudinary provider switch instead of
  treating it as consent for a replacement host, and expanded validation for bounded profile packets.

## 0.19.0 - 2026-08-24

- Replaced the old target-first Activity Studio with a dedicated Custom Activities workspace that
  starts empty and keeps the first screen to one clear `New activity` action.
- Added a character body-slot editor using Bondage Club's current player render and native zone data,
  with a normal select fallback for touch, keyboard, and unusual game layouts.
- Added a searchable gallery that reuses vanilla activity pictures, quick `{me}`, `{target}`,
  `{target's}`, and pronoun variables, and a finished-sentence live preview.
- Put self/other targeting in a collapsed `Advanced` section and made arousal an off-by-default,
  bounded `1–20` control that is shown only after its switch is enabled.
- Register saved actions directly beside vanilla activities on their chosen body slot, remove stale
  registrations before every sync, and mark each native button with the translucent Blossom.
- Send one ordinary human-readable action to the room while carrying validated KikiLink metadata;
  players without KikiLink see the sentence, never a raw configuration envelope.
- Apply optional arousal through Bondage Club's native preference-aware flat activity effect only after
  validating the server sender, intended recipient, group, amount, and replay nonce.
- Migrated settings to schema version 13, preserved user-written legacy actions, intentionally removed
  the former bundled starter activities, and kept the library bound to 100 sanitized entries.
- Removed the retired Activity Studio renderer, editor, import UI, and unused responsive styles from
  the runtime bundle instead of carrying two activity interfaces at once.
- Fixed the room Blossom overlay for Bondage Club builds where `MainCanvas` is already a drawing context,
  retained native and other-addon hook chains, and expanded the suite to 102 tests.

## 0.18.0 - 2026-08-24

- Added KikiLink's original translucent red five-petal blossom and applied it consistently to the
  launcher, workspace brand, and Home artwork.
- Added the blossom above the local room character and confirmed compatible KikiLink peers through
  the shared ModSDK overlay chain. It uses the existing presence handshake, respects Bondage Club's
  native icon-visibility state, and does not replace other addon drawing.
- Removed viewport-lazy message painting that made bubbles visibly appear while scrolling. The
  bounded chat feed is now fully painted and keeps ordinary instant scrolling.
- Prepend older history in one fragment without recreating messages already on screen, preserve the
  scroll anchor, and guard against overlapping history requests.
- Redesigned incoming and outgoing messages with quiet depth, a slim incoming accent, grouped corner
  shapes, improved text rhythm, and clearer metadata without adding more visible information.
- Batch message and conversation DOM work, reuse one conversation read per full refresh, append live
  messages before secondary UI updates, and avoid scanning every rendered row for each new Beep.
- Replaced the 146 KB raster emblem embedded as base64 with the compact SVG, reducing the built
  userscript from about 685 KB to about 501 KB, while expanding the suite to 94 tests.

## 0.17.0 - 2026-08-24

- Removed the trailing private-use marker and exact `messageType`/`messageColor` compatibility
  envelope from received normal Beeps, including native-log recovery, while preserving malformed,
  unrelated, or extended JSON-like text.
- Added optional local JPG, PNG, and WebP uploads through a user-configured Cloudinary unsigned
  preset; the feature remains disabled until a complete setup is explicitly saved.
- Added a two-source image composer for direct links and local files. Selecting a file performs no
  network request; only `Upload & send` contacts the configured provider.
- Re-encode local images to WebP before upload, discard the original filename and embedded metadata,
  cap input at 10 MB and 32 megapixels, and resize the longest edge to 2560 pixels.
- Send uploads without credentials or referrer data, use a generic filename, and accept only a direct
  HTTPS response under the configured `res.cloudinary.com` account path.
- Added a focused privacy review, schema version 12 migration, upload failure recovery, and coverage
  for metadata cleanup, file signatures, provider validation, deferred upload, and settings safety,
  bringing the suite to 93 tests.

## 0.16.0 - 2026-08-24

- Reworked LinkReactions into a focused Alerts screen with one-switch friend-online and
  room-join notifications instead of showing the full rule editor immediately.
- Moved sound selection and the existing rule engine into separate collapsed optional areas;
  advanced rules, ordering, scopes, templates, cooldowns, and guarded room emotes remain intact.
- Added three short locally synthesized notification sounds: Soft chime for chats, Sakura
  sparkle for friends online, and Gentle pop for room joins, with per-event choices and previews.
- Kept all alerts and sounds disabled by default, preserved quiet online and room baselines,
  and added a global short audio throttle to prevent rapid overlapping sounds.
- Delay mounting the KikiLink interface and launcher until Bondage Club reports an authenticated
  account with a valid member number.
- Migrated settings to schema version 11 and expanded startup, quick-alert, sound, migration,
  and simplified-interface coverage, bringing the suite to 82 tests.

## 0.15.0 - 2026-08-24

- Added LinkReactions with ordered, locally stored rules for incoming Beeps, room joins and
  leaves, and friends appearing online.
- Added anyone, friends-only, and explicit member-number scopes, optional Beep text matching,
  per-rule enable switches, templates, ordering controls, and cooldowns.
- Added private notices that remain visible beside the closed launcher and an explicit public
  room-emote action with a global 10-second send guard.
- Public reactions never substitute private `{message}` content, and LinkReactions never sends
  automatic Beep replies or uses a remote rules service.
- Added quiet room and online baselines so startup or entering a room does not react to everyone
  who was already present.
- Added an original reaction icon, a responsive sixth Settings category, LinkFinder keywords,
  and settings schema version 10.
- Added rule matching, privacy, cooldown, rate-limit, baseline, migration, and UI coverage,
  bringing the suite to 78 tests.

## 0.14.0 - 2026-08-24

- Expanded LinkActivities into a searchable library with category and pack metadata, one-click
  favorites, and dynamic Favorites, Category, and Pack filters.
- Added the merge-safe `Social Gestures` and `Scene Flourishes` built-in packs alongside the five
  original KikiLink Starter activities.
- Raised the editable activity limit from 20 to 100 and added a responsive metadata editor with
  an explicit local-library count.
- Added versioned local JSON export and import with a 1 MB UI safety limit, strict format checks,
  duplicate suppression, bounded records, and favorite preservation.
- Migrated settings to schema version 9 while recognizing and enriching the original schema-8
  starter activities without changing user-created templates.
- Added activity-library, migration, pack-installation, filtering, and favorite coverage, bringing
  the suite to 71 tests.

## 0.13.0 - 2026-08-24

- Keep the current room and roster available while a native Bondage Club profile or another
  room subscreen is open by using R131's room-session check instead of `CurrentScreen` alone.
- Added KikiLink's original dependency-free SVG icon system and applied its shared rounded line
  language to Home, navigation, Settings, favorites, pins, images, search, dialogs, and actions.
- Moved Reply and Copy out of message bubbles into a compact Discord-style side action strip with
  hover, keyboard-focus, touch, title, and accessible-label support.
- Added private per-conversation nicknames. They affect only local KikiLink presentation and are
  never substituted into outgoing messages, replies, Quick Actions, or compatibility packets.
- Added a confirmed `Remove from recent chats` action that deletes only one conversation and its
  local KikiLink history without changing the friend relationship or native Bondage Club Beep log;
  old native-log entries stay hidden after reload while a genuinely new message restores the chat.
- Image sending now extracts one direct HTTPS image URL from pasted prose, Markdown, BBCode, or
  color wrappers so unrelated formatting codes are not sent with the image.
- Added storage, room-subscreen, icon-placement, image-sanitization, local-alias privacy, and
  per-chat deletion coverage, bringing the suite to 63 tests.

## 0.12.1 - 2026-08-24

- Fixed KikiLink remaining in a false disconnected state when one or more ModSDK hooks could
  not be installed alongside another addon.
- Receive live `AccountBeep` and `OnlineFriends` events directly from the active Bondage Club
  socket, while retaining isolated ModSDK hooks as compatibility fallbacks.
- Rebind listeners automatically when Bondage Club replaces its socket during reconnect or
  relog, without accumulating duplicate handlers.
- Added a lightweight native `FriendListBeepLog` recovery cursor so an incoming message still
  reaches LinkChat if another addon interrupts the normal callback chain.
- Cross-check known and offline contacts against both `Player.FriendList` and
  `Player.FriendNames`; online state continues to come from BC's mutual online-friend result.
- Decoupled adapter readiness from the unreliable login callback once a valid player and native
  Beep API are already present.
- Added direct-socket, hook-failure, logged-in-state, reconnect cleanup, Beep-log recovery, and
  duplicate-suppression coverage, bringing the suite to 58 tests.

## 0.12.0 - 2026-08-24

- Fixed live incoming Beeps being discarded when Bondage Club supplies the normal
  `BeepType` as `null`.
- Capture the native OnlineFriends result before Bondage Club renders or mutates it, with a
  direct friend-list callback fallback and support for both native friend collections.
- Added short-lived, throttled typing indicators between compatible KikiLink users, an
  explicit Chat preference, automatic stop signals, and lost-packet expiry.
- Added the observable current room beside the player identity in the chat header, using only
  room information supplied by Bondage Club or the shared current room.
- Replaced presence-driven conversation and Players rebuilds with one animation-frame batch
  and targeted status-dot updates.
- Append live messages without rebuilding the feed, render only the newest 120 messages by
  default, and provide an anchored `Load earlier messages` control for longer histories.
- Removed costly panel backdrop blur and per-message shadows, isolated scroll paint regions,
  and stopped rebuilding Home during unchanged two-second room-roster checks.
- Migrated settings to schema version 8 and expanded incoming, online-friend, typing, room,
  bounded-DOM, and append-without-rebuild coverage to 56 tests.

## 0.11.0 - 2026-08-24

- Added truthful native Online/Offline state from Bondage Club's online-friends query and
  current-room membership.
- Added KikiLink Online, Idle, Do not disturb, and Offline choices, optional status notes,
  automatic Idle, and a clear switch for disabling presence sharing.
- Added an original versioned presence protocol using targeted typed Beeps outside rooms and
  hidden room packets inside rooms; it sends no mass friend heartbeat and creates no native
  Beep notification for compatibility traffic.
- Added status indicators to recent chats, the active conversation, known contacts, Players,
  player details, Home, and the contextual profile menu.
- Added direct HTTPS image messages with inline previews for JPG, PNG, GIF, WebP, and AVIF.
  Players without KikiLink receive the same ordinary link.
- Added privacy controls for remote images: ask before loading by default, always show, or links only.
- Added a focused image-link composer that clearly distinguishes direct links from future local-file upload.
- Added right-click, keyboard Context Menu / Shift+F10, and touch hold actions for player profiles.
- Added one compact action menu for Message, Whisper, native Profile, favorites, notes, pinning,
  marking unread, and copying member IDs.
- Added message Reply and Copy actions, compatible plain-text quotes, and optional Enter-to-send.
- Migrated settings to schema version 7 and expanded presence, protocol, media, privacy,
  context-menu, and migration coverage to 52 tests.

## 0.10.0 - 2026-08-24

- Added a third `Super compact` density that reduces decorative chrome and supporting copy
  while keeping primary labels, focus states, and phone tap targets intact.
- Rebalanced the panel, feature rail, Home, conversation list, messages, composer, Players,
  Activities, and Settings for a calmer high-information layout.
- Added versioned local JSON export and import for the Player notebook.
- Made notebook imports merge-safe: existing notes remain intact while favorites, tags,
  newer names, and encounter history are restored without duplicate players.
- Added configurable 30-day to 2-year cleanup or indefinite storage for encounter-only
  player records; notes, tags, and favorites never expire automatically.
- Added visible saved-player counts, a 2 MB import safety limit, clear confirmation copy,
  and LinkFinder keywords for compact mode and notebook tools.
- Migrated settings to schema version 6 without changing existing themes, launch behavior,
  chat preferences, Activities, or Player settings.
- Added backup, merge, retention, migration, and Super compact regression coverage,
  bringing the suite to 44 tests.

## 0.9.0 - 2026-08-24

- Added LinkFinder as a visible top-bar action available from every workspace.
- Added one local search index for destinations, recent chats, room and recorded players,
  known contacts, saved activities, and every Settings category.
- Added context-aware suggestions before typing and relevance ranking that favors exact titles,
  unread conversations, room presence, favorites, and pinned chats.
- Added direct member-number chat actions when a matching conversation does not exist yet.
- Added category labels, responsive phone presentation, and privacy copy beside the results.
- Implemented the WAI editable-combobox interaction with `aria-activedescendant`, live result
  counts, arrow-key selection, `Enter`, `Escape`, and a visible close action.
- Added an optional `Ctrl+K` / `Cmd+K` shortcut without intercepting input, textarea, select,
  or content-editable controls.
- Added regression coverage for accessible suggestions, keyboard navigation, exact player
  notebook routing, selected Activity Studio routing, and direct member-number chats,
  bringing the suite to 41 tests.

## 0.8.0 - 2026-08-24

- Reworked Guided Home around one context-aware next step instead of decorative-first content.
- Suggests reading unread Beeps, starting a first chat, viewing players in the current room,
  or continuing the most recent conversation, with a direct action for each state.
- Renamed Home cards with familiar destinations and explicit action labels: Chat, Players,
  Activities, and Settings.
- Kept the four-tool information architecture and made Focused Home remove the suggestion
  and supporting copy for people who prefer a quieter interface.
- Reflowed the new first-entry layout from a two-pane desktop composition to a one-pane
  phone composition without stretching the primary action.
- Documented the first-entry research and product decisions from Apple, Android, Fluent,
  Atlassian, Shopify Polaris, and W3C guidance.
- Added regression coverage for first-chat guidance and opening an unread suggested chat,
  bringing the suite to 37 tests.

## 0.7.0 - 2026-08-23

- Rebuilt Players, Activities, and Settings as first-class Link Deck workspaces instead of long blocking dialogs.
- Simplified mobile navigation to four primary destinations and moved Settings to a familiar top-bar utility.
- Added categorized Settings with Appearance, Navigation, Chat, Players, and Activities panes that remember the last category.
- Added Comfortable and Compact spacing, Default/Large/Extra large text, and Showcase/Focused Home preferences.
- Added contrast-aware foreground colors for arbitrary custom accents.
- Increased important control and mobile tap targets and raised the smallest supporting text sizes.
- Added `aria-current` wayfinding, keyboard-operated settings tabs, labeled form controls, dialog naming, and live status/error semantics.
- Added a button alternative for resetting the draggable launcher position.
- Made error messages persistent until dismissed while allowing informational confirmations to clear automatically.
- Migrated settings to schema version 5 and expanded regression coverage to 36 tests.

## 0.6.0 - 2026-08-23

- Replaced the chat-first launcher flow with a polished KikiLink Link Deck home screen.
- Added live feature cards for LinkChat, LinkRoster, Activity Studio, and customization.
- Added a persistent desktop navigation rail that becomes bottom tabs on phones.
- Added connection, current-room, unread-chat, recent-conversation, and room-player context to Home.
- Added a `Launcher opens` preference for Home, the last section, or LinkChat directly.
- Added five accent presets plus a native custom color picker.
- Made disabled optional features discoverable with a direct path to their setting.
- Migrated settings to schema version 4 and expanded regression coverage to 35 tests.

## 0.5.0 - 2026-08-23

- Added LinkRoster with live, nickname-first room membership and a current-player counter.
- Added native `Whisper`, `Beep`, `Profile`, and `Copy ID` actions from one player card.
- Added private per-player notes, searchable tags, and favorites stored only in the browser profile.
- Added optional last-seen, last-room, and encounter-count tracking with a bounded local store.
- Added `In room`, `Known`, and `Favorites` scopes with search across names, numbers, tags, and notes.
- Added a responsive two-pane roster for desktop and a compact mobile layout.
- Added `KikiLink.openRoster()` to the public API.
- Moved LinkActivities behind an optional shortcut that is disabled by default.
- Migrated settings to schema version 3 and expanded regression coverage to 34 tests.

## 0.4.0 - 2026-08-23

- Added the first complete LinkActivities Activity Studio.
- Added a searchable target picker populated from the current chat room with nickname support.
- Added five original starter activities, live previews, and safe target revalidation.
- Added an editable library of up to 20 room actions with `{target}`, `{member}`, and `{source}` variables.
- Send actions through Bondage Club's standard native Emote path so everyone in the room can see them.
- Added a dedicated toolbar entry and `KikiLink.openActivities()` public API.
- Migrated settings to schema version 2 while retaining all existing LinkChat preferences.
- Expanded regression coverage to 26 tests.

## 0.3.1 - 2026-08-23

- Fixed Beep sending being blocked while the compatibility hooks were still connecting.
- Store and render outgoing Beeps immediately instead of depending on the outgoing hook.
- Import Bondage Club's recent session Beeps into the left conversation list without duplicates.
- Prefer character nicknames from the current room and retain resolved nicknames in local chats.
- Added mouse and touch dragging for the launcher with a persistent viewport-relative position.
- Added a visible Recent chats heading and expanded regression coverage to 21 tests.

## 0.3.0 - 2026-08-23

- Added editable Quick Actions that insert reusable roleplay text into Beep drafts.
- Added `{name}`, `{member}`, and `{me}` variables for Quick Action templates.
- Replaced the browser prompt with a native new-chat dialog and known-contact search.
- Added a live Bondage Club connection indicator and safe send-button state.
- Added validation and tests for Quick Action settings and the contact picker.

## 0.2.1 - 2026-08-23

- Mount the KikiLink launcher before the Bondage Club connection hooks finish.
- Force userscript execution in the page context for Tampermonkey and Violentmonkey.
- Keep the interface usable while the game globals are still becoming available.
- Confirm compatibility against the live Bondage Club R131 client.

## 0.2.0 - 2026-08-23

- Integrated the selected KikiLink wolf, red moon, gold ring, and sakura emblem.
- Added dark lacquer, light paper, and follow-system appearance modes.
- Added interface controls for theme, launcher side, and reduced motion.
- Reworked phone navigation into full-width conversation and chat views.
- Preserved compatibility with settings written by 0.1.0.
- Added GitHub installation and automatic-update metadata.

## 0.1.0 - 2026-08-23

- Added the independent KikiLink core and module lifecycle.
- Added ModSDK-based Bondage Club compatibility hooks.
- Added LinkChat with persistent local Beep conversations.
- Added conversation search, unread state, pinned chats, drafts, and room sharing.
- Added a responsive red, black, and white Shadow DOM interface.
- Added local privacy controls and configurable history retention.
- Added a standalone Tampermonkey userscript build.
