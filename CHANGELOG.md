# Changelog

## 0.21.2 - 2026-08-26

- Moved the userscript installation and automatic update channel from `raw.githubusercontent.com`
  to jsDelivr so Firefox users whose network cannot reach GitHub Raw can install and update KikiLink.

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
- Added a lazy, deduplicated Media Gallery across saved LinkChat conversations, with Catbox and
  Litterbox labels, privacy-aware full-size cards, source-chat navigation, and one-click selection as
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
- Added account-free temporary local-image uploads through Catbox's Litterbox with 1, 12, 24, or
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
  treating it as Litterbox consent, and expanded validation for bounded profile packets.

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
