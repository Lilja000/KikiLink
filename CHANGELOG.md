# Changelog

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
