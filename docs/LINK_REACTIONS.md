# LinkReactions

KikiLink 0.16.0 presents LinkReactions as a simple local notification feature first. The
bounded rule engine remains available under Advanced, without adding a remote rules service,
automatic Beep replies, or a second room-chat transport.

## Simple alerts

The main Alerts screen contains only three switches:

- `Friends come online` shows a local notice for a newly online friend;
- `Someone joins your room` shows a local notice for a later room arrival;
- `Notification sounds` adds distinct sounds to incoming chats and the enabled alerts.

All three are disabled by default. Sound selection is kept in a collapsed `Choose sounds`
area. KikiLink includes Soft chime, Sakura sparkle, and Gentle pop presets, with a Play button
for each choice. They are synthesized locally through Web Audio and do not download media.

## Event sources

- `Incoming Beep` uses KikiLink's already normalized, duplicate-suppressed Beep event.
- `Player joins room` and `Player leaves room` compare the current native room roster every
  two seconds without making a network request.
- `Friend comes online` compares Bondage Club's existing online-friends snapshots.

The first room roster and first online-friends snapshot establish a quiet baseline. Existing
players therefore do not trigger rules when KikiLink starts or the user enters a room.

## Advanced rule model

The complete editor is kept inside a collapsed `Advanced` area. At most 20 rules are stored.
They are checked from top to bottom, and the first enabled, matching rule that is not cooling
down runs.

Each rule contains:

- a local ID, display name, and enable switch;
- one event trigger;
- an `Anyone`, `Friends only`, or `Specific members` scope;
- up to 20 member numbers for an explicit scope;
- an optional case-insensitive `Beep contains` match;
- a private notice or public room-emote action;
- a message template and a 0–3,600 second cooldown.

## Template variables and privacy

Templates support `{name}`, `{member}`, `{message}`, `{room}`, `{me}`, and `{event}`.
Control characters and repeated whitespace are removed before a result is shown or sent.

`{message}` is available to private local notices. For a public room emote it always expands
to an empty value, so a private Beep cannot be copied into the room by a reaction rule.
LinkReactions does not send automatic Beep replies, avoiding reply loops between addons.

Public room emotes use Bondage Club's native emote function, retain its 1,000-character limit,
and share a global 10-second guard even when several rules have shorter cooldowns. If the user
is not in a room or the native emote function is unavailable, no public reaction is sent.

Rule configuration remains in the current browser profile. Cooldown timers reset when the addon
session ends.
