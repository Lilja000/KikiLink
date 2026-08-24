# LinkReactions

KikiLink 0.15.0 adds a bounded local event-rule engine. It does not add a remote rules
service, automatic Beep replies, or a second room-chat transport.

## Event sources

- `Incoming Beep` uses KikiLink's already normalized, duplicate-suppressed Beep event.
- `Player joins room` and `Player leaves room` compare the current native room roster every
  two seconds without making a network request.
- `Friend comes online` compares Bondage Club's existing online-friends snapshots.

The first room roster and first online-friends snapshot establish a quiet baseline. Existing
players therefore do not trigger rules when KikiLink starts or the user enters a room.

## Rule model

At most 20 rules are stored. They are checked from top to bottom, and the first enabled,
matching rule that is not cooling down runs.

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
