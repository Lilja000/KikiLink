# Local image upload privacy review

KikiLink can send a local image as the same ordinary HTTPS link used by existing image
messages. It does not add a KikiLink media server or require an image-host account.

## Provider choice

Temporary chat images and room media use Litterbox's anonymous API with a selected lifetime of
1, 12, 24, or 72 hours. Playlist music uses Catbox's anonymous file-upload API instead. Catbox's
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
   embedded file metadata. The upload uses the generic name `kikilink-image.webp`.
5. Only an explicit `Upload & send` action sends that prepared WebP as multipart `POST` data to
   `https://litterbox.catbox.moe/resources/internals/api.php`, with `reqtype=fileupload` and the
   selected `time`. Credentials and referrer information are omitted, and the request has a
   60-second timeout.
6. KikiLink accepts only a direct HTTPS `litter.catbox.moe/<id>.webp` response with no credentials,
   query, or fragment, then sends that URL as a normal Beep.

## Device Gallery

Choosing `Add to Gallery` and selecting a local file follows the same validation and privacy
preparation, but never performs step 5. The prepared WebP is written to an IndexedDB database whose
name includes the authenticated BC MemberNumber. KikiLink asks the browser for persistent storage,
keeps the record until the user deletes it, and does not put the blob in synchronized BC settings.
Clearing the site's browser data still removes it. Selecting a device image as a room background is
a separate explicit action that creates a temporary Litterbox link.

## Remaining risks and limits

- Catbox/Litterbox receives the prepared pixels and network request. KikiLink cannot independently
  verify provider-side storage or deletion.
- Re-encoding removes hidden file metadata, not personal information visible in the picture itself.
- A recipient can copy or re-upload a temporary image before it expires.
- KikiLink cannot revoke an anonymous link early, verify provider-side deletion, or extend a
  Litterbox link after upload.
- Animated GIF and AVIF remain supported as direct links but are not accepted as local uploads,
  avoiding silent animation loss and inconsistent browser decoding.
- Uploads can fail because of provider availability or policy, browser content-security policy, or
  connectivity. A successful URL is kept in the link field if Beep sending fails, so it is not lost.

Remote chat previews and profile avatars remain separate privacy decisions. The default chat preview
preference is still `Ask before loading`; small profile avatars load automatically in identity lists.
`Always show` loads chat media automatically and `Links only` never does. Image requests omit
credentials and referrer data.
