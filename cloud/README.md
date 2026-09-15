# KikiLink Cloud

Cloud provides the official addon with authenticated profiles, Feed, comments,
reactions and persistent groups. It is a separate service; building or updating the
addon does not deploy the server or migrate its production database.

The public runtime uses Node 24, Fastify, checksummed SQLite WAL migrations and private
R2/S3 object storage. Identity comes from a native BC proof received by an independent
verifier, or possession of a previously verified browser device key. Subsequent actions
use origin-bound sessions and server-side ownership/membership/role checks. Production
accepts verified ordinary members; staging retains an explicit tester allowlist.

Profiles have revision checks and owned media. Groups use explicit invitations,
roles, pins and server-encrypted messages, not end-to-end encryption. Feed creation is
idempotent; text, images, reactions, blocks, reports and moderator access are bounded.
See [API.md](API.md), [PRIVACY.md](PRIVACY.md) and [verifier/README.md](verifier/README.md).

## Local verification

Use Node 24.19 or newer in the 24.x line:

```sh
npm ci
npm run check
npm audit --omit=dev
```

Tests use temporary databases, random test-only credentials and controlled object-store
fixtures. They do not log into real BC accounts or modify production data. Integration
tests compile the real client; native BC delivery is simulated.

From the addon root, normal `npm run check` validates the production build. To preserve
release output while developing, use:

```sh
npm run typecheck
node scripts/build.mjs --local
KIKILINK_TEST_DIST=.local-dev/dist npx vitest run
```

An explicit staging artifact uses an exact HTTPS origin:

```sh
KIKILINK_CLOUD_ORIGIN=https://YOUR-STAGING-HOST node scripts/build.mjs --local --cloud
```

It writes `.local-dev/cloud/`. Ordinary local builds do not connect to Cloud.
`node scripts/build.mjs --local --production` writes `.local-dev/production/` using
identical production inputs, including the official endpoint from `src/production.mjs`.
Production builds reject staging endpoints, test fixtures and traffic instrumentation.

## Deployment boundary

The API and verifier require separate credentials and service identities. Keep the
verifier ingress on loopback, object buckets private, encryption/backup keys outside
source control and database backups verified before any migration. The supplied
`.env.example` is a staging template, not an install command or usable secret file.
Host-specific control scripts, credentials and deployment receipts are not included.
Do not run schema or recovery commands against an existing service without its reviewed
operator procedure and rollback checkpoint.

The original FUSAM-loader harness can use an independently obtained, unmodified FUSAM
checkout via `KIKILINK_FUSAM_SOURCE`. Its DOM fixtures simulate BC transport. Actual
FUSAM loading, desktop/mobile rendering and real-server operations are separate checks.
