# Changelog

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
