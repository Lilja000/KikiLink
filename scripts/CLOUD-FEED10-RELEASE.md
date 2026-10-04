# Feed 10 Cloud update

`build-cloud-feed10-release.py` creates an owner-run update for the existing
private VPS deployment. It does not execute an installer or contact the VPS.
Its input is the exact previously delivered `KikiLink-Cloud-Feed9-Update.txt`.
The old infrastructure source is decoded as data from that pinned artifact;
it is never executed by the builder or stored as an opaque repository blob.

```sh
python3 scripts/build-cloud-feed10-release.py \
  --feed9-handoff /path/to/KikiLink-Cloud-Feed9-Update.txt \
  --output .local-dev/feed10-release
```

Rebuild after the Cloud sources, tests, news, or final source commit change.
The same inputs produce identical output bytes. The release identity hashes
every packaged file; the manifest also records source commit and dirty state.
`Feed10-build-report.json` records the generated identities and handoff hash.
Readable package trees and installers accompany the `.txt` handoff for review.
Only the `.txt` file is needed on the VPS.

The two supported predecessors are `1d11cc2db7cc` and `c6f47ef3fe1d`, each with
its original manifest and every file hash pinned. The dispatcher also accepts
the generated target for an idempotent rerun. Any other current release causes
`UNRECOGNIZED_CURRENT_RELEASE` before package creation. It does not guess a
lineage, skip releases, reset journals, or silently overwrite an existing
package. Installed files and directories must pass root ownership, permission,
path, and hash checks. The owner must run it on `kiki-bot-01`.

The resulting upgrade preserves the Feed 9 deployment sequence:

1. Verify the current deployment, configuration, original database, immutable
   source package, available disk space, container ownership, units and launcher.
2. Build the candidate offline from the exact currently installed API image.
   No dependencies are downloaded. The source dependency lock must match Feed 9.
   The verifier image and its identity remain unchanged.
3. Run the established isolated API tests plus Feed tools and deployment tests
   with disposable databases, no production mounts, no credentials, no external
   network, a read-only container and the existing non-root identity.
4. Probe schema 9 → 10 on a disposable database copy and verify the digest of
   all existing table columns. Verify a fresh encrypted remote backup by restore.
5. Withdraw the public route, stop the service and backup timer, and create a
   checked offline schema 9 checkpoint. Apply migration 010 explicitly and
   verify old rows, checksums, foreign keys and integrity before switching.
6. Start the candidate, verify readiness, verify another encrypted backup,
   restart the timer and discard the checkpoint. If discard fails, record that
   the checkpoint remains rather than declaring it deleted.

The fixed systemd job survives a Termius disconnection. The existing recovery
logic can restore schema 9 only before starting the new service. Once startup
is attempted, a downgrade is refused so that new writes cannot be lost. A
failure requiring review keeps the journal and data; do not clear them to force
a retry. This artifact does not claim a live deployment has been verified.

For the owner, after uploading the generated file:

```sh
bash /home/ubuntu/KikiLink-Cloud-Feed10-Update.txt
kikilink-cloud-private status
```

Success prints `KIKI_CLOUD_FEED10_READY`, with schema version 10 and a ready API,
proxy, automatic startup, active backup timer and fresh verified backup. Logs
use the existing protected control directory and `feed10-build.log`,
`feed10-tests.log`, and `schema10-upgrade.json`. The systemd job is
`kikilink-cloud-private-feed10-upgrade.service`.

## Local verification

The builder compiles the generated Python syntax without executing it and
verifies all payload, manifest, path and file hashes. The deployment test
template is `cloud-feed10-deployment.test.mjs`; it runs only after being copied
into the generated API package. It tests schema 9 data preservation, a probe
that leaves the source untouched, checkpoint hash refusal, migration,
pre-exposure recovery, checkpoint discard and migration checksum refusal.

To run the packaged test set locally, link that package's `api/node_modules`
to the already installed `cloud/node_modules`, then run:

```sh
node --test --test-concurrency=1 \
  .local-dev/feed10-release/packages/RELEASE/api/test/*.test.mjs
```

Do not include the local dependency symlink in a deliverable. The generated
handoff contains only manifest-listed text files. Local success validates the
packaged code; the VPS independently repeats its isolated tests against the
exact installed dependency image before stopping the running service.
