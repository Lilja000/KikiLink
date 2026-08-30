# Privacy

KikiLink has no analytics, telemetry, advertising, or KikiLink-operated account, media, relay, or
sync server. That does not make its data secret: KikiLink runs inside Bondage Club, stores readable
data in the browser and Bondage Club account settings, and uses third parties for features that the
user explicitly invokes.

## Data stored by KikiLink

| Location | Examples | Scope and limits |
| --- | --- | --- |
| Browser `localStorage` | Settings, player notebook, group state, public-profile cache, and a portable-state mirror | Keys are prefixed with the authenticated BC `MemberNumber`. This prevents KikiLink from mixing accounts; it is not encryption or an access-control boundary against other code on the same site. |
| Browser IndexedDB | Direct-chat history and device Gallery, Music, and custom-notification files | Database names are derived from the authenticated account. Device files are not placed in BC account sync, but remain readable to code with the same Bondage Club origin. Clearing site data removes them. |
| `Player.ExtensionSettings.KikiLink` | Sanitized settings, activities, profile preferences, player notebook data, playlist metadata/remote URLs, a bounded recent direct-chat snapshot, and direct-chat deletion/retention markers | Saved through Bondage Club's native extension-settings sync. The payload is JSON or reversibly compressed/base64-encoded JSON, not encrypted. It is available to Bondage Club, the signed-in page, and code running in that page. Group-chat history and device file blobs are not included. |
| Memory for the current page | Live presence, typing indicators, current-session unsaved chat, reveal decisions, and temporary room-media links | Discarded on teardown or reload, except where the same information was also saved or sent through another channel. |

KikiLink validates the account owner recorded in portable state and does not deliberately show one
account's namespace to another. Anyone with access to the browser profile or Bondage Club account may
still be able to read the corresponding data.

Direct and group messages, presence packets, profile details, typing indicators, custom-activity
metadata, and room actions use Bondage Club's existing transports. They inherit Bondage Club's
logging, delivery, retention, and access properties. KikiLink does not add end-to-end encryption.

## Network requests

KikiLink does not send background analytics. Its additional network activity is limited to these
feature paths:

- The standalone userscript performs one bounded, credential-free request to the official GitHub raw
  `package.json` when Home is opened on a production Bondage Club host. It sends no cookies or
  referrer, does not poll, and shows an update only after a valid newer version is found. The FUSAM
  build leaves update discovery to FUSAM and does not perform this GitHub check.
- Opening a repository, Discord, provider, or media link makes an ordinary browser navigation chosen
  by the user.
- Loading a remote chat image, avatar, banner, group image, Gallery link, or remote artwork contacts
  that file's host. Requests omit credentials and referrer data and are validated and bounded, but the
  host still learns the requester's network IP address and request time. Chat and profile image
  previews default to **Ask before loading**; **Links only** makes no preview request, while **Always
  show** opts into automatic requests.
- Explicit upload actions send a prepared file to Catbox or Litterbox as described below. Those
  providers receive the file, source IP address, request time, and normal transport metadata.

## Public Catbox and Litterbox uploads

Catbox and Litterbox return public bearer URLs. Anyone who receives or discovers a URL can download
the file. Expiration or inactivity cleanup is not access control, does not recall copies, and cannot
be verified or accelerated by KikiLink.

- Images selected for upload are signature-checked, bounded, resized/re-encoded to WebP, given a
  generic filename, and stripped of embedded image metadata before the final explicit upload action.
  Visible information in the pixels is not removed.
- Audio is validated and renamed but is not re-encoded. Embedded tags, artwork, author names, device
  fields, or other metadata already in an MP3/MP4 may remain in the uploaded file.
- Litterbox creates public links with a selected 1, 12, 24, or 72 hour lifetime. The standalone
  userscript requests it through the userscript bridge in anonymous mode; the FUSAM build uses a
  credential-omitting browser request.
- Standalone Catbox uploads omit `userhash`, but the userscript manager may attach an existing Catbox
  browser-session cookie. KikiLink neither reads nor supplies that cookie and cannot promise that the
  provider will treat the request as unlinkable from a Catbox session.
- FUSAM cannot perform Catbox uploads because Catbox's upload endpoint does not provide the required
  cross-origin browser access. KikiLink disables those upload choices in FUSAM. Device storage,
  direct HTTPS links, and supported temporary Litterbox uploads remain available.

Removing a Gallery entry, profile/banner URL, group avatar, or playlist item does not delete a file
already uploaded to Catbox/Litterbox or a file hosted elsewhere.

More implementation detail is in [docs/LOCAL_IMAGE_UPLOADS.md](docs/LOCAL_IMAGE_UPLOADS.md).

## Page-realm trust boundary

KikiLink's application code runs in Bondage Club's page realm, both under FUSAM and when installed as
a standalone userscript. The standalone wrapper keeps its cross-origin upload privilege in a userscript
sandbox and applies request limits, but this is not a confidentiality boundary against hostile code in
the page.

Treat every co-installed page-realm addon as trusted. Another addon, the site, or a browser extension
with suitable permissions may be able to inspect page state, DOM events, `Player.ExtensionSettings`,
same-origin `localStorage`/IndexedDB, BC messages, or an in-progress upload exchange. Do not install
unreviewed addons alongside data you expect to keep confidential.

## Retention and deletion

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
