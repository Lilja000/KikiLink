# Local image upload privacy review

Since KikiLink 0.20.0, a local image can be sent as the same ordinary HTTPS link used by existing image
messages. It does not add a KikiLink media server or require an image-host account.

## Provider choice

Local files use Litterbox, Catbox's temporary upload service. The sender chooses a declared lifetime
of 1, 12, 24, or 72 hours. KikiLink stores only that preference locally and sends no account token,
cookie, or original filename.

Litterbox links are public bearer links until they expire: anyone who obtains one can request the
image. Expiry is useful retention, not access control or proof of immediate secure deletion. A
persistent profile avatar should therefore use a separately managed direct HTTPS link from Catbox,
Imgur, or another host instead of a temporary Litterbox URL.

- <https://catbox.moe/tools.php>
- <https://catbox.moe/faq.php>

## Data flow

1. Choosing a file reads it locally and makes no network request.
2. KikiLink checks the byte signature and accepts only JPG, PNG, or WebP input up to 10 MB.
3. The browser decodes the image, limits it to 32 megapixels, resizes its longest edge to at most
   2560 pixels, and draws it to a new canvas.
4. The canvas is encoded as a new WebP. This drops the source filename, EXIF, comments, and other
   embedded file metadata. The upload uses the generic name `kikilink-image.webp`.
5. Only an explicit `Upload & send` action posts that prepared WebP to
   `https://litterbox.catbox.moe/resources/internals/api.php`. Credentials and referrer information
   are omitted, and the request has a 60-second timeout.
6. KikiLink accepts only a plain HTTPS `litter.catbox.moe/<id>.webp` response with no credentials,
   query, or fragment, then sends that URL as a normal Beep.

## Remaining risks and limits

- Litterbox receives the prepared pixels and the uploader's network address. KikiLink cannot make a
  third-party upload anonymous.
- Re-encoding removes hidden file metadata, not personal information visible in the picture itself.
- A recipient can copy or re-upload a temporary image before it expires.
- KikiLink cannot revoke a link early, verify provider-side deletion, or extend a link after upload.
- Animated GIF and AVIF remain supported as direct links but are not accepted as local uploads,
  avoiding silent animation loss and inconsistent browser decoding.
- Uploads can fail because of provider availability or policy, browser content-security policy, or
  connectivity. A successful URL is kept in the link field if Beep sending fails, so it is not lost.

Remote chat previews and remote profile avatars remain separate privacy decisions. The default chat
preview preference is still `Ask before loading`; remote avatars remain initials until the player
uses the one-time `Show profile avatar` action. `Always show` loads them automatically and `Links only`
never does. Image requests omit credentials and referrer data.
