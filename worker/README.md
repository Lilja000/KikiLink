# KikiLink Catbox relay

This Cloudflare Worker gives the FUSAM build an explicit, abuse-limited path for long-lived Catbox
uploads. It is not a general CORS proxy: callers cannot choose the upstream URL, form fields,
filename, or forwarded headers.

The checked-in configuration is deliberately disabled with `UPLOADS_ENABLED=false`. Keep it that
way until Catbox has given written permission for this use. Catbox announced on 14 April 2026 that
anonymous uploads from datacenter and public-proxy IP addresses are restricted, so written approval
must include any necessary Worker-egress whitelisting. Do not assume a deployed Worker can upload:
run a small anonymous probe from the final production route after approval. A deployment with the
kill switch off serves a status response but cannot mint sessions or forward files.

## Security model

- `/authorize` receives the Bondage Club origin and a random state value only through the URL
  fragment, shows the privacy boundary, and runs a Turnstile challenge.
- `/v1/session` verifies the challenge hostname, action, state (`cdata`), relay origin, and client IP.
  It returns a random 256-bit bearer token to the opener. The client keeps that token only in memory.
- A SQLite-backed Durable Object binds the hashed bearer token to the exact Bondage Club origin and
  a daily HMAC of the client IP for ten minutes. It atomically enforces 12 attempts, 160 MiB, and two
  concurrent uploads per session; unsuccessful admitted attempts still consume quota. One shared
  ledger prevents arbitrary bearer values from allocating separate databases, and a storage alarm
  deletes origin and IP-HMAC session rows shortly after expiry.
- `/v1/upload` accepts only a raw WebP image (8 MiB maximum) or one of the explicit audio formats
  (80 MiB maximum). It checks declared length, extension, MIME type, and a bounded magic prefix.
- The Worker constructs the two fixed Catbox multipart fields itself, substitutes a generic
  filename, streams the body through `FixedLengthStream`, follows no redirects, and never retries.
- Only exact HTTPS origins in the five Bondage Club host families receive CORS access. Cookies and
  arbitrary request headers are neither accepted nor forwarded.
- The Worker stores no file. Cloudflare can observe the client IP, Bondage Club origin, file bytes,
  size, and timing. Catbox receives the file, generic filename, timing, and the Worker connection;
  Cloudflare may also add the original client IP to an upstream `CF-Connecting-IP` header, as
  [its documentation explains](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip-in-worker-subrequests).
  The relay
  is a CORS and abuse-control boundary, not an IP-anonymity service. Verify the actual production
  headers with a controlled origin and Catbox before enabling uploads.

The global Durable Object defaults to 100 admitted uploads, 2 GiB per UTC day, and two simultaneous
upstream streams across all sessions. Cloudflare rate limiting bindings are an additional coarse
shield, not quota accounting. The Workers Free plan's current 10 ms CPU allowance per request is a
separate production gate: network wait is excluded, but the JavaScript chunk pump for an 80 MiB file
still needs measurement. Free operation is not assumed.

## Configuration

Create a Turnstile widget restricted to the relay's final hostname, then set secrets without putting
them in source control:

```sh
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put IP_HASH_SECRET
```

Set `TURNSTILE_SITE_KEY` as a non-secret Worker variable in the Cloudflare dashboard or Wrangler
configuration. Set `RELAY_CANONICAL_ORIGIN` to the one exact production HTTPS origin; requests to
preview or alias hosts then fail closed. `IP_HASH_SECRET` should be at least 32 random bytes encoded
as a secret string. The checked-in `keep_vars` setting preserves dashboard-only non-secret variables
on later Wrangler deployments; keep their values under deployment review. The two rate-limit
`namespace_id` values in `wrangler.jsonc` must also be checked
for uniqueness within the destination Cloudflare account before deployment; shared IDs intentionally
share counters with other Workers.

Run local checks with:

```sh
npm ci
npm run check
```

Before enabling uploads, verify Catbox's written approval and Worker-egress allowance, a successful
small probe from the final route, the final Turnstile hostname restriction, all production secrets,
the final `workers.dev` or custom hostname, a real 80 MiB streaming upload with CPU metrics under the
selected Workers plan, the daily caps, and the abuse/kill-switch procedure. Compile that one exact
origin into KikiLink. If a custom domain is selected, disable `workers_dev` so an extra unadvertised
route is not left active. Then change only the deployed environment's `UPLOADS_ENABLED` value; the
repository default should remain `false`.
