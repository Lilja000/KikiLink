# Privacy

KikiLink does not use analytics, telemetry or advertising. Starting with 0.30.0, the official build
connects to KikiLink Cloud for profiles, Feed and persistent groups using your signed-in BC identity.
It can automatically synchronize the public profile fields you already configured, including supported
avatar/banner images. Signing out of Cloud pauses automatic connection on this browser.

New Cloud profiles are searchable by name and Member Number. Online status, the current public room,
About, communities and recent activity are visible to eligible KikiLink users by default. Private rooms
stay hidden, and community membership and content access rules still apply. You can change these
settings in Edit profile. Existing selections, including hidden profiles and disabled sharing, are kept.

People and Match can suggest members who have filled in public details, even if you have never met or
have not filled in your own signal. A new account starts with its basic signal enabled. Interests,
languages and availability appear only when entered. Blocking and visibility settings apply to discovery.

### Matches swipe cards

When you save a Matches card, KikiLink Cloud receives the display name, Club background,
availability setting and chosen image. Wardrobe previews are rendered in your browser.
Only the selected snapshot is uploaded. Worn items and the other Wardrobe slots stay in the game.
The slot number and name are private to the card owner. Eligible players can see the card
while your profile and matching settings allow discovery. A mutual like appears after both
players choose Like. On an updated Matches server, either player can then send a Direct message. Undoing a like or removing a card ends that permission unless the players also have confirmed friendship grants. Passing and one-sided likes are private to the player making the choice.
Removing your card also removes its portrait, swipes involving that card and mutual likes.

If you choose a custom background, eligible players also receive its image URL. Their external
image preview preference controls whether their browser contacts the image host. A background
uploaded from a file or device gallery uses the same file host and lifetime as room background
uploads. The Club background is used if the external image expires or cannot load.

KikiLink data is not secret from the hosting service or trusted page code. KikiLink runs inside
Bondage Club, stores readable browser/account data, and uses external media hosts for selected features.
See [Cloud data and retention](cloud/PRIVACY.md) for authentication, published data, deletion and limits.

## Data stored by KikiLink

| Location                            | Examples                                                                                                                                                                                    | Scope and limits                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser `localStorage`              | Settings, player notebook, group state, public-profile cache, and a portable-state mirror                                                                                                   | Keys are prefixed with the authenticated BC `MemberNumber`. This prevents KikiLink from mixing accounts; it is not encryption or an access-control boundary against other code on the same site.                                                                                             |
| Browser IndexedDB                   | Direct-chat history and device Gallery, Music, and custom-notification files                                                                                                                | Database names are derived from the authenticated account. Device files are not placed in BC account sync, but remain readable to code with the same Bondage Club origin. Clearing site data removes them.                                                                                   |
| `Player.ExtensionSettings.KikiLink` | Sanitized settings, activities, profile preferences, player notebook data, playlist metadata/remote URLs, a bounded recent direct-chat snapshot, and direct-chat deletion/retention markers | Saved through Bondage Club's native extension-settings sync. The payload is JSON or reversibly compressed/base64-encoded JSON, not encrypted. It is available to Bondage Club, the signed-in page, and code running in that page. Group-chat history and device file blobs are not included. |
| Memory for the current page         | Live presence, typing indicators, current-session unsaved chat, reveal decisions, and temporary room-media links                                                                            | Discarded on teardown or reload, except where the same information was also saved or sent through another channel.                                                                                                                                                                           |

KikiLink validates the account owner recorded in portable state and does not deliberately show one
account's namespace to another. Anyone with access to the browser profile or Bondage Club account may
still be able to read the corresponding data.

Direct messages, legacy BC group messages, compatibility presence/profile/typing packets,
custom-activity metadata and room actions use Bondage Club's transports. Cloud groups, Feed and
Cloud profiles use the authenticated Cloud API. Neither path adds end-to-end encryption.

Cloud also keeps an account/origin-scoped device key and grant in browser IndexedDB, separate from
the BC account mirror. A non-extractable key limits accidental export; it does not prevent trusted
same-origin page code from using that key. Access sessions stay in page memory. Cloud content and
profile caches are bounded and refreshed independently of native chat history.

## Network requests

KikiLink does not send background analytics. Its additional network activity is limited to these
feature paths:

- Automatic BC identity verification and HTTPS Cloud connection, public-profile synchronization,
  Feed/group operations, current availability and active typing. Cloud uses bounded requests and
  authenticated event streams. Its operator and infrastructure providers can observe network metadata.
  Cloud profile and Feed uploads use private object storage and authorized reads. The BC password is never sent to Cloud.
- The standalone userscript performs one bounded, credential-free request to the official GitHub raw
  `package.json` when Home is opened on a production Bondage Club host. It sends no cookies or
  referrer, does not poll, and shows an update only after a valid newer version is found. The FUSAM
  build leaves update discovery to FUSAM and does not perform this GitHub check.
- Opening a repository, Discord, provider, or media link makes an ordinary browser navigation chosen
  by the user.
- Loading a remote chat image, avatar, banner, group image, Gallery link, or remote artwork contacts
  that file's host. Requests omit credentials and referrer data and are validated and bounded, but the
  host still learns the requester's network IP address and request time. Chat and profile image
  previews default to **Always show**, making automatic requests. **Ask before loading** requires a
  reveal first; **Links only** makes no preview request. Both preferences remain available in Settings.
- Selecting an external upload sends the file to the provider named in the upload dialog.
  Anyone who obtains the resulting file link can open it.

## Public shared files

In Chat, Gallery, Room Tools and Music, temporary sharing sends files directly from the browser
to WaifuVault. The sender chooses 1, 12, 24 or 72 hours. Long-lived sharing sends Gallery
images, playlist tracks and compatibility banner or group images to AnonDrop. AnonDrop
sets no fixed expiry for these links and can remove inactive files on its free service.
Each host receives the file and network request. KikiLink omits account credentials and uses
a generated filename. Images are re-encoded as WebP before sharing. Audio may contain
identifying tags or other metadata. Removing an item from a playlist or Gallery removes the
local reference. Someone who downloaded a copy can keep it after the link expires.

Existing Catbox and Litterbox links keep their original URLs and retention rules.
Cloud profile avatars, banners, Feed and authenticated Cloud attachments use the existing
access-controlled KikiLink Cloud media service. See the providers’ policies for external
uploads. [WaifuVault](https://waifuvault.moe/) · [AnonDrop](https://anondrop.net/faq)

KikiLink persists each confirmed playlist URL before starting another file, saves confirmed profile
banners to Gallery as a recovery copy, and saves a confirmed managed-group avatar URL there if the
group update fails. It keeps the profile dialog open while an upload result is pending. Reloading or
closing the browser can still lose a late response, and timeouts, cancellations, connection failures,
or server-side 5xx responses after bytes were sent may mean a file became public without KikiLink
receiving its URL. Those ambiguous uploads are not retried automatically.

Removing a Gallery entry, profile/banner URL, group avatar, or playlist item does not delete a file
already uploaded to Catbox/Litterbox or a file hosted elsewhere.

More implementation detail is in [docs/LOCAL_IMAGE_UPLOADS.md](docs/LOCAL_IMAGE_UPLOADS.md).

## Page-realm trust boundary

KikiLink's application code runs in Bondage Club's page realm, both under FUSAM and when installed as
a standalone userscript. Both distributions send external file uploads directly to their selected provider.

Treat every co-installed page-realm addon as trusted. Another addon, the site, or a browser extension
with suitable permissions may be able to inspect page state, DOM events, `Player.ExtensionSettings`,
same-origin `localStorage`/IndexedDB, BC messages, or an in-progress upload exchange. Do not install
unreviewed addons alongside data you expect to keep confidential.

## Retention and deletion

The controls below apply to device/native history. Cloud's separate retention and deletion rules
are described in [cloud/PRIVACY.md](cloud/PRIVACY.md); clearing local history does not erase Cloud groups.

- With **Save message history** enabled, direct and group messages are pruned using the configured
  retention period. Conversation previews are cleared or recomputed when their source messages expire.
  A bounded direct-chat snapshot follows the BC account; group history remains in the browser record.
- With history disabled, new direct-chat content stays in memory for the current page and persisted
  group content/drafts are omitted. Turning the switch off is not a substitute for deleting previously
  saved direct history; use **Clear all LinkChat history** for that.
- Removing one direct conversation deletes its local rows and records a bounded account-synced deletion
  marker so an older portable snapshot does not immediately restore them. A genuinely newer message can
  create the conversation again.
- **Clear all LinkChat history** clears local direct and group messages and drafts. Direct-chat clear and
  retention markers are included in the portable BC mirror; group clearing is device-local. Sync and
  browser writes are best effort, and KikiLink warns when it cannot verify durable storage. The action
  does not erase Bondage Club's native Beep history, another participant's copy, or provider-hosted files.
- Player-notebook encounter-only records follow their configured retention. Favorites and records with
  notes or tags are kept until explicitly cleared. The public-profile cache is bounded and expires
  cached records; current live presence and typing history are not stored.
- Device Gallery, Music, and custom-sound blobs remain until removed in KikiLink or until the site's
  browser data is cleared. Removing or uninstalling the loader alone does not necessarily erase site
  storage or the existing Bondage Club `ExtensionSettings` mirror.

Deletion cannot retract data already delivered to another player, Bondage Club, GitHub, a remote-image
host, Catbox/Litterbox, or a person who saved a copy.

## Questions and reports

Security-sensitive privacy problems should be reported privately under [SECURITY.md](SECURITY.md).
Ordinary documentation questions may use the project's public repository.

## Offline Direct and optional Preferences

Cloud delivers new Direct messages between eligible confirmed Cloud friends. Servers supporting mutual-match messaging also allow delivery between two players with a current mutual like. Signing out pauses Cloud on that browser. Its local
retry queue is distinct from Save message history and may briefly persist message text
until delivery, expiry processing or explicit clearing. Remove chat and Clear history
stop local retries; they cannot recall a message already stored by Cloud. Existing local
history is never uploaded automatically. Optional preference ratings use separate authenticated endpoints and encrypted storage.
New accounts start with **Public in KikiLink**, so eligible signed-in members can read any ratings you
choose to enter. You can choose a different audience in Preferences. Ratings stay out of profile and
presence packets and BC account sync.
See [the controls and retention](cloud/PRIVACY.md#optional-social-delivery-and-preferences)
for visibility modes, bilateral grants, server storage, score inference and deletion.
