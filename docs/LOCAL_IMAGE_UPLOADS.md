# Local image upload privacy review

KikiLink 0.17.0 adds an optional path for sending a local image as the same ordinary HTTPS link
used by existing image messages. It does not add a KikiLink media server.

## Provider choice

The first supported provider is a Cloudinary account controlled by the user. KikiLink stores only
the cloud name and an unsigned upload-preset name in the same local settings record as other addon
preferences. These are public identifiers, not an API secret. Cloudinary documents direct browser
uploads and the security tradeoffs of unsigned presets:

- <https://cloudinary.com/documentation/client_side_uploading>
- <https://cloudinary.com/documentation/upload_presets>

An anonymous shared host was rejected as the default because a sensitive upload may be difficult
or impossible for the sender to remove later. With a user-owned provider account, the sender can
review and manage their uploaded assets in that account.

## Data flow

1. The feature is off by default.
2. Choosing a file reads it locally and makes no network request.
3. KikiLink checks the byte signature and accepts only JPG, PNG, or WebP input up to 10 MB.
4. The browser decodes the image, limits it to 32 megapixels, resizes its longest edge to at most
   2560 pixels, and draws it to a new canvas.
5. The canvas is encoded as a new WebP. This drops the source filename, EXIF, comments, and other
   embedded file metadata. The upload uses the generic name `kikilink-image.webp`.
6. Only an explicit `Upload & send` action posts that prepared WebP to the configured Cloudinary
   upload endpoint. Cookies and referrer information are omitted.
7. KikiLink accepts only an HTTPS direct-image URL under
   `res.cloudinary.com/<configured cloud>/image/upload/`, then sends that URL as a normal Beep.

## Remaining risks and limits

- The resulting URL is public to anyone who receives or later obtains it. KikiLink cannot revoke a
  copied link or control the recipient.
- Cloudinary receives the prepared pixels and the uploader's network address. KikiLink cannot make
  a third-party upload anonymous.
- Re-encoding removes hidden file metadata, not personal information visible in the picture itself.
- Unsigned presets are intentionally usable without a secret and can be abused if their identifiers
  are exposed. Users should restrict allowed formats, sizes, and other preset behavior in Cloudinary.
- KikiLink does not silently delete provider assets. The user manages retention and deletion in the
  configured account.
- Animated GIF and AVIF remain supported as direct links but are not accepted as local uploads in
  this first version, avoiding silent animation loss and inconsistent browser decoding.
- Uploads can still fail because of provider policy, browser content-security policy, connectivity,
  account quota, or an invalid preset. A successful URL is kept in the link field if Beep sending
  fails, so it is not silently lost.

Remote previews remain a separate privacy decision. Their default is still `Ask before loading`,
and KikiLink requests preview images without a referrer.
