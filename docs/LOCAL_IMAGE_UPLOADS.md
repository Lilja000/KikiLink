# Local image upload privacy review

KikiLink can send a local image as the same ordinary HTTPS link used by existing image
messages. It does not add a KikiLink media server or require an image-host account.

## Provider choice

Shared files use WaifuVault's anonymous API. The sender chooses a declared lifetime of 1, 3, 7, or
30 days. KikiLink stores only that preference locally and sends no account token, cookie, or original
filename. WaifuVault accepts general file types; KikiLink restricts each UI to formats that its image,
music, or Bondage Club room-media consumer can actually use.

WaifuVault links are public bearer links until they expire: anyone who obtains one can request the
image. Expiry is useful retention, not access control or proof of immediate secure deletion. A
persistent profile avatar should therefore use a separately managed durable HTTPS link instead of a
temporary sharing URL.

- <https://waifuvault.moe/>
- <https://github.com/waifuvault/WaifuVault>
- <https://github.com/waifuvault/waifuVault-node-api>

## Data flow

1. Choosing a file reads it locally and makes no network request.
2. KikiLink checks the byte signature and accepts only JPG, PNG, or WebP input up to 10 MB.
3. The browser decodes the image, limits it to 32 megapixels, resizes its longest edge to at most
   2560 pixels, and draws it to a new canvas.
4. The canvas is encoded as a new WebP. This drops the source filename, EXIF, comments, and other
   embedded file metadata. The upload uses the generic name `kikilink-image.webp`.
5. Only an explicit `Upload & send` action sends that prepared WebP with `PUT` to
   `https://waifuvault.moe/rest`, requesting the selected expiry and a hidden filename. Credentials
   and referrer information are omitted, and the request has a 60-second timeout.
6. KikiLink parses the JSON response and accepts only a direct HTTPS
   `waifuvault.moe/f/<id>.webp` URL with a non-empty deletion token and no credentials, query, or
   fragment, then sends that URL as a normal Beep.

## Device Gallery

Choosing `Add to Gallery` and selecting a local file follows the same validation and privacy
preparation, but never performs step 5. The prepared WebP is written to an IndexedDB database whose
name includes the authenticated BC MemberNumber. KikiLink asks the browser for persistent storage,
keeps the record until the user deletes it, and does not put the blob in synchronized BC settings.
Clearing the site's browser data still removes it. Selecting a device image as a room background is
a separate explicit action that creates a temporary WaifuVault link.

## Remaining risks and limits

- WaifuVault receives the prepared pixels and network request. Its published privacy policy says the
  source IP is SHA-256 hashed and is not stored in plaintext; KikiLink cannot independently verify
  provider-side operation.
- Re-encoding removes hidden file metadata, not personal information visible in the picture itself.
- A recipient can copy or re-upload a temporary image before it expires.
- KikiLink cannot revoke a link early, verify provider-side deletion, or extend a link after upload.
- Animated GIF and AVIF remain supported as direct links but are not accepted as local uploads,
  avoiding silent animation loss and inconsistent browser decoding.
- Uploads can fail because of provider availability or policy, browser content-security policy, or
  connectivity. A successful URL is kept in the link field if Beep sending fails, so it is not lost.

Remote chat previews and profile avatars remain separate privacy decisions. The default chat preview
preference is still `Ask before loading`; small profile avatars load automatically in identity lists.
`Always show` loads chat media automatically and `Links only` never does. Image requests omit
credentials and referrer data.
