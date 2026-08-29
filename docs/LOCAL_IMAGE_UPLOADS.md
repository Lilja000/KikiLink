# Local image upload privacy review

KikiLink can send a local image as the same ordinary HTTPS link used by existing image
messages. It does not add a KikiLink media server or require an image-host account.

## Provider choice

Temporary chat images and room media use Litterbox's anonymous API with a selected lifetime of
1, 12, 24, or 72 hours. Playlist music uses Catbox's account-unlinked file-upload form without a
`userhash` instead. Catbox's
current FAQ says anonymous files are removed after two years without a download; account-associated
files are permanent. KikiLink does not request or send a Catbox account token, so Music describes
its uploads as long-lived rather than guaranteed permanent.

Both services return public bearer links: anyone who obtains a link can request the file. Expiry or
inactivity retention is not access control and cannot remove copies another person already saved. A
persistent profile avatar should use a separately managed durable HTTPS link.

- <https://litterbox.catbox.moe/tools.php>
- <https://catbox.moe/tools.php>
- <https://catbox.moe/faq.php>

## Data flow

1. Choosing a file reads it locally and makes no network request.
2. KikiLink checks the byte signature and accepts only JPG, PNG, or WebP input up to 10 MB.
3. The browser decodes the image, limits it to 32 megapixels, resizes its longest edge to at most
   2560 pixels, and draws it to a new canvas.
4. The canvas is encoded as a new WebP. This drops the source filename, EXIF, comments, and other
   embedded file metadata. Before browser decode, the bounded source bytes are structurally inspected
   for JPG/PNG/WebP declared canvases and animation frames against the 32-megapixel surface limit,
   240-frame cap, and 64-megapixel animation-cycle budget; a malformed, inconsistent, or oversized
   declaration fails without allocating the decoded surface. The upload uses the generic name
   `kikilink-image.webp`.
5. Only an explicit `Upload & send` action sends that prepared WebP as multipart `POST` data to
   `https://litterbox.catbox.moe/resources/internals/api.php`, with `reqtype=fileupload` and the
   selected `time`. The Litterbox request uses the userscript manager's anonymous mode, and the
   request has a 60-second total deadline. Upload POSTs are never retried automatically: provider,
   timeout, cancellation, and network failures require another explicit user action, because neither
   host offers an idempotency key and an ambiguous retry could create a second untracked public file.
6. KikiLink accepts only a direct HTTPS `litter.catbox.moe/<id>.webp` response with no credentials,
   query, or fragment, then sends that URL as a normal Beep.

## Privileged upload bridge boundary

The userscript sandbox keeps `GM_xmlhttpRequest`; Bondage Club and the KikiLink page runtime do not
receive that privilege. Each page load creates a cryptographically random 256-bit capability and
passes it only into the injected runtime's lexical scope. Upload requests must carry that capability,
come from the same top-level window and exact HTTPS origin, use one of the two fixed provider
endpoints, and pass the bounded multipart schema before the sandbox starts a request. The capability
is never stored in the DOM marker or a window property. Accepted/progress/final bridge replies echo
it intentionally so the page runtime can authenticate and correlate the exact exchange.

A hostile page-realm addon could still observe a legitimate upload request and learn its capability,
so the token is defense in depth rather than the sole resource boundary. The sandbox independently
allows at most two concurrent uploads, 12 admitted requests and 160 MiB per rolling 10-minute window,
and one file of at most 80 MiB per request. Exceeding either rolling limit fails closed behind a
one-minute cooldown. Final navigation aborts active transports and clears this state; a BFCache
freeze retains the same capability and listener so restored uploads continue to work.

The page-side request carries a unique ID and supports authenticated accepted, progress, response,
and cancel messages. A marker alone is not treated as proof of a live host: if the sandbox does not
acknowledge the exact request and capability within three seconds, KikiLink fails with a
reload/permission hint. Cancel, dialog close, timeout, navigation, and host teardown abort the
underlying `GM_xmlhttpRequest`, remove listeners and timers once, and release the active-upload slot
even if a userscript manager omits its normal timeout callback. Upload screens may show
byte/percentage progress when the provider reports a total. KikiLink never falls back to a normal
page fetch that Catbox or Litterbox is expected to block.

Profile banners use the same bridge only after local signature validation, centered 1200×400 cropping,
metadata-removing WebP re-encoding, and a 2 MiB cap. They go to long-lived public Catbox storage. The
Presence dialog exposes progress and a Cancel action; closing it aborts the actual transfer and leaves
the saved profile unchanged. Catbox's API still receives no `userhash`, but its userscript request does
not set Tampermonkey's unrelated `anonymous` option: that option can force fetch mode in Chromium,
where native upload progress and timeout handling are unavailable. Keeping Catbox on the manager's XHR
transport fixes the former indefinite-looking banner upload while the explicit watchdog remains the
final deadline. This transport choice means the userscript manager may attach an existing Catbox
browser cookie; KikiLink neither reads nor supplies that cookie and does not claim the request is
unlinkable from a Catbox browser session. Banner uploads use a dedicated 180-second total deadline so
a valid 2 MiB file can complete on a slow upstream connection; temporary chat-image uploads keep their
60-second limit.

Managed-group creators also have an explicit `Choose & upload to Catbox` avatar action. The selected
file goes through KikiLink's local image validation, metadata-removing WebP preparation, and bounded
size checks before the same long-lived public Catbox transport is used. The control states the public
storage consequence before the file picker opens. A late result is discarded if the BC identity,
group ownership, group existence, or previously saved avatar changed while the upload was running.

## Device Gallery

Choosing `Add to Gallery` and selecting a local file follows the same validation and privacy
preparation, but selection itself makes no network request. The final save action offers three
explicit storage choices:

- `This device` writes the prepared WebP to an IndexedDB database whose name includes the
  authenticated BC MemberNumber. KikiLink asks the browser for persistent storage, keeps the record
  until the user deletes it, and does not put the blob in synchronized BC settings. Clearing the
  site's browser data still removes it.
- `Catbox` uploads the prepared WebP without a `userhash` and saves its long-lived public bearer link.
  The userscript-manager cookie caveat above still applies. KikiLink does not set an automatic expiry,
  but the file is not guaranteed permanent: Catbox's
  current policy can remove an anonymous file after two years without a download.
- `Litterbox` uploads the prepared WebP anonymously and saves its public bearer link for the selected
  1, 12, 24, or 72-hour lifetime.

Device storage is the default. Catbox and Litterbox require choosing public storage and then the
final upload action. Selecting a device image as a room background is a separate explicit action
that creates a temporary Litterbox link.

## Device Music and room sharing

Music tracks saved `On this device` remain private IndexedDB blobs during ordinary playback. A room
administrator can explicitly choose `Share & use as room music`, or enable the session-only playlist
follow switch. For a compatible MP3/MP4 up to 20 MB, that action creates a generically named temporary
Litterbox upload using the same 1/12/24/72-hour setting as other room media. KikiLink keeps the returned
URL only in memory and reuses it until shortly before expiry, avoiding repeated uploads of the same track.
Other browser-playable formats remain device-only because Bondage Club room music accepts MP3/MP4 links.

Catbox/Litterbox HTTP errors are not retried automatically. If a provider returns an HTML error page,
KikiLink shows a short provider/status notice rather than exposing the page source; the user can
decide whether to try a new upload.

## Remaining risks and limits

- Catbox/Litterbox receives the prepared pixels and network request. KikiLink cannot independently
  verify provider-side storage or deletion.
- Catbox XHR compatibility may include an ambient Catbox cookie as described above. Use a browser
  profile without a Catbox login if separating the upload from that provider session matters.
- Re-encoding removes hidden file metadata, not personal information visible in the picture itself.
- A recipient can copy or re-upload a temporary image before it expires.
- KikiLink cannot revoke an anonymous link early, verify provider-side deletion, or extend a
  Litterbox link after upload.
- Animated GIF remains supported as a direct link but is not accepted as a local upload, avoiding
  silent animation loss. AVIF links fail closed because their container metadata does not provide a
  sufficiently reliable pre-decode resource bound for the guarded preview pipeline.
- Uploads can fail because of provider availability or policy, browser content-security policy, or
  connectivity. A successful URL is kept in the link field if Beep sending fails, so it is not lost.

Remote chat previews and profile avatars follow the same privacy preference. The default is
`Ask before loading`: chat media stays behind a button and profile avatars stay as initials until
`Show profile avatar` is chosen for that exact member-and-normalized-URL pair in the browser session;
changing the advertised URL asks again. `Always show` loads both automatically; `Links only` loads
neither. Image requests use anonymous CORS, omit credentials and referrer data, refuse redirects,
reject local/private/reserved IP literals, and require the MIME type to agree with a validated
JPG/PNG/GIF/WebP signature. Before exposing a local blob URL, the loader enforces 5 MiB, 4096 pixels
per axis, 8 megapixels per static canvas, and bounded animation frame, aggregate-pixel, and declared
pixel-rate limits; animation delays below 20 ms and AVIF both fail closed because they cannot be
bounded consistently enough before browser decode.
The shared loader allows at most four active fetches, four leased browser decodes, and 32
active-plus-queued requests, uses a 15-second queue-and-transfer deadline, starts UI images only near
visibility, retains at most six rich message previews, and cancels detached or replaced work. A host
without CORS support can still be opened through the original link.
