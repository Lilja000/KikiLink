# Privacy

KikiLink does not use analytics, telemetry or advertising. Starting with 0.30.0, the official build
connects to KikiLink Cloud for profiles, Feed and persistent groups using your signed-in BC identity.
It can automatically synchronize the public profile fields you already configured, including supported
avatar/banner images. Signing out of Cloud pauses automatic connection on this browser.

KikiLink data is not secret from the hosting service or trusted page code. KikiLink runs inside
Bondage Club, stores readable browser/account data, and uses external media hosts for selected features.
The separate FUSAM-to-Catbox relay remains disabled pending the provider's written permission.
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
  Cloud profile/feed uploads use private object storage and authorized reads, rather than public
  Catbox links. The BC password is never sent to Cloud.
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
- Explicit upload actions send a prepared file to Catbox or Litterbox as described below. In released
  builds, those providers receive the file, source IP address, request time, and normal transport
  metadata. The disabled FUSAM relay would change the Catbox path as described below.

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

### Prepared FUSAM relay (not deployed or enabled)

The prepared relay is limited to four explicit long-lived Catbox actions: profile-banner uploads,
managed-group-avatar uploads, an explicitly selected Gallery Catbox destination, and playlist-music
Catbox uploads. Choosing a file alone does not contact the relay. Temporary chat-image and room-media
uploads keep their existing direct Litterbox path, and the standalone userscript keeps its existing
direct Catbox userscript bridge.

Before a FUSAM Catbox upload, a separate Cloudflare Turnstile page would verify an intentional action
and return a short-lived bearer token kept only in page memory. The Cloudflare Worker would require an
exact allowed Bondage Club origin, validate the token, file type, declared and actual size, and request
and byte quotas, and stream an admitted file to Catbox without retaining it. It would construct the
fixed Catbox multipart request itself and would not forward a Catbox `userhash`, Catbox account cookie,
arbitrary destination, caller-supplied provider fields, or caller authorization headers.

Cloudflare could transiently observe the uploader's network IP address, Bondage Club origin, request
timing, and file bytes. Catbox would receive the file, request timing, and the Worker connection.
Cloudflare may also add the uploader IP to an upstream `CF-Connecting-IP` header, as
[its documentation explains](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip-in-worker-subrequests),
so the relay does not promise IP anonymity. Turnstile and a short-lived token reduce automated misuse but do not hide
the upload from Cloudflare or Catbox and do not make the resulting `files.catbox.moe` URL private. Image
uploads are metadata-free WebP files prepared locally; playlist audio is not re-encoded and may retain
embedded tags, artwork, author names, device fields, or other metadata.

This path remains disabled because Catbox's [Terms](https://catbox.moe/legal.php) prohibit reselling
or otherwise supplying its service to others and Catbox's
[April 14, 2026 notice](https://blog.catbox.moe/post/813932072453455872/happy-11th-birthday-catbox)
restricted anonymous uploads from datacenter/proxy networks. It will not be deployed or enabled
without Catbox's explicit written permission and any required whitelisting. Even with permission,
anonymous Catbox retention is not guaranteed: Catbox's [FAQ](https://catbox.moe/faq.php) says an
anonymous file may be removed after two years without a download.

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
a standalone userscript. The standalone wrapper keeps its cross-origin upload privilege in a userscript
sandbox and applies request limits, but this is not a confidentiality boundary against hostile code in
the page.

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
