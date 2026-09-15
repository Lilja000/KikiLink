# KikiLink Cloud API v1

All `/v1` calls require one exact allowed BC `Origin`. Except for BC/device identity
challenge and exchange, calls require `Authorization: Bearer <opaque session>`. No cookies,
refresh token, token-bearing query strings or wildcard CORS. JSON writes require
`application/json`; uploads require a raw supported image with a declared bounded
Content-Length. The private verifier is a different listener, never public API.

Strict request schemas are in `src/validation.mjs` and route-local Zod schemas in
`src/app.mjs`. Unknown properties are rejected. IDs are UUIDs for groups/conversations/
messages/assets and positive integers for members/posts/comments/reports. Timestamps
are Unix milliseconds. Error bodies contain `error` and a random `requestId`, never
exception internals. Common statuses: 400 validation, 401 session, 403 permission,
404 unavailable/hidden, 409 revision or membership conflict, 413/415 image size/type,
429 throttle, 503 dependency/capacity. Auth-hidden resources use 404.

| Area | Routes |
| --- | --- |
| Health | `GET /health/live`, `GET /health/ready` |
| Identity | `POST /v1/auth/challenges`, `POST /v1/auth/exchange`, `POST /v1/auth/device-challenges`, `POST /v1/auth/device-exchange`, `POST /v1/auth/logout`, `POST /v1/auth/logout-all`, `GET /v1/me` |
| Privacy | `GET /v1/privacy` |
| Profiles | `GET /v1/profiles/:member`, `PUT /v1/profiles/me`, `DELETE /v1/profiles/me` |
| Blocks | `GET /v1/blocks`, `PUT/DELETE /v1/blocks/:member` |
| Groups | `GET/POST /v1/groups`, `GET/PATCH/DELETE /v1/groups/:id` |
| Membership | `GET /v1/group-invitations`, `POST /v1/groups/:id/invitations`, `POST /v1/groups/:id/accept`, `DELETE /v1/groups/:id/invitation`, `DELETE /v1/groups/:id/members/:member`, `PUT /v1/groups/:id/members/:member/role` |
| Messages | `GET/POST /v1/conversations/:id/messages`, `DELETE /v1/conversations/:id/messages/:messageId` |
| Media | `POST /v1/media/:kind` (`avatar`, `banner`, `feed`), `GET/DELETE /v1/media/:id` |
| Feed | `GET/POST /v1/feed`, `GET/PATCH/DELETE /v1/feed/:id` |
| Comments | `GET/POST /v1/feed/:id/comments`, `PATCH/DELETE /v1/comments/:id` |
| Reactions | `PUT /v1/reactions/:type/:id` (`post` or `comment`) |
| Reports | `POST /v1/reports` |
| Moderation | `GET /v1/moderation/reports`, `GET /v1/moderation/reports/:id`, `GET /v1/moderation/reports/:id/media/:assetId`, `POST /v1/moderation/remove`, `POST /v1/moderation/reports/:id/dismiss`, `POST /v1/moderation/users/:member/suspend` |
| Presence/events | `PUT/DELETE /v1/presence`, `GET /v1/presence/:member`, `GET /v1/events` |

BC challenges accept `{memberNumber, publicKey?}` and return a challenge ID, proof, separate
exchange secret, verifier Member Number and expiry. The client sends the proof
through BC and retains the exchange secret. The trusted verifier sends
`{challengeId,proof,sender}` to loopback `/verify` under its separate credential,
where `sender` comes from the native BC server envelope. The browser exchanges
`{challengeId,exchange}` only after verification. No caller-supplied owner or member
field is accepted as authorization for subsequent writes.

The optional public key is a strict P-256 JWK containing only `kty`, `crv`, `x`, `y`.
It is bound before BC verification and registered only when that verification is
exchanged successfully. The response then includes `device: {id, expiresAt}`.
`device-challenges` accepts `{deviceId, memberNumber}` and returns a random nonce,
challenge ID and a one-minute expiry. `device-exchange` accepts those identifiers,
nonce and a base64url 64-byte ECDSA/SHA-256 signature (IEEE P1363). The canonical
message is `KIKILINK_DEVICE_V1` followed by challenge ID, nonce, device ID, member
number and the exact BC Origin, each separated by a newline. Replay, wrong origin,
wrong member, disabled accounts, expiry and missing possession are rejected.
Device grants last at most 30 days without sliding extension. Access sessions last
at most one hour and never outlive the device. Logout removes the current grant
and its sessions; logout-all removes all of that member's grants and sessions.

Profile updates include `revision` (0 for initial creation), displayName, optional
bio and supported customization metadata, visibility and owned avatar/banner IDs.
A group creation needs a title and 2–4 distinct invited Member Numbers. Only verified
registered users can be invited. Acceptance authorizes membership; merely listing
someone in a request does not. Groups initially cap at 5 active/invited members.
The owner can transfer ownership; admins cannot escalate themselves or remove owners.

Message creation requires `clientId`, text, current `membershipVersion`, current
`keyVersion`, `schemaVersion:1`, `encryption:"server-aes-256-gcm"`. Stale versions fail
with 409. Reusing an acknowledged clientId with different text also fails. The
server creates an authenticated encrypted envelope and sequence number. Proper E2EE
will require a separately reviewed protocol/schema migration; invented encryption
modes are rejected in v1. Chat attachments remain in the existing native Catbox chat
path; the initial Cloud chat composer sends text only.

Paged lists return `{items,nextCursor}`; limit is 1–40. Feed uses descending ID keysets
and a cursor of 0 for newest. Comments/reports use ascending ID keysets. Messages
use sequences: `direction=forward` for after-cursor or `direction=backward` for tail/
older history, returned in ascending display order. Clients must stop at null cursor.
Feed create accepts text, up to 4 owned media IDs and an optional clientId; the addon
always supplies one. Edits require the current revision. Reactions allow one of
`heart`, `like`, `laugh`, `support`, or null to remove the actor's reaction.

Media input allows still PNG/JPEG/WebP, 5 MiB (2 MiB avatar), at least 16 pixels per
side and at most 24 million pixels. Outputs are metadata-free WebP, at most 3 MiB,
resized to 512px avatars, 1600×800 banners or 1920px feed bounds. SVG/GIF/animation,
MIME mismatch and undecodable inputs are rejected. Quotas reserve space BEFORE
asynchronous upload: 128 MiB and 200 assets per user, 8 GiB across media. Two uploads
process concurrently, with 30 attempts/user/day. There is no arbitrary URL importer,
public presigned PUT, binary database column or unbounded user-controlled object key.

Initial limits also include 3000 total API requests/minute, 300/IP/minute,
180 authenticated requests/user/minute, 40 writes/user/minute, 30 messages/minute,
20 posts/day, 60 comments/day and 10 reports/day. Quota/rate counters persist across
service restarts. The DB admission threshold is 1 GiB of used pages; deletes remain
available for recovery. Monitor capacity before expanding the allowlist.

SSE accepts fetch headers (not EventSource query-token workarounds), caps at two
streams/user and 100 globally, and sends only `ready`, `feed`, `groups` hints with
empty data. Authorization is rechecked on events/heartbeats and session expiry.
Current membership is required for conversation hints; a removed member receives
only the membership-change invalidation. Consumers refresh when appropriate, not
on a fixed polling interval. No message body, key, typing state or room location
is broadcast in these events.
