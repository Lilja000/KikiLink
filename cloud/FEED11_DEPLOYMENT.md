# Feed 11 Cloud handoff

KikiLink 1.1.0 needs Cloud schema 011 for the complete Feed update: saved and hidden
posts, filters, replies, polls, comment subscriptions, image spoilers, and all 20
reactions. The client checks the server's advertised capabilities. It can be
published before Cloud is upgraded, but new server-backed controls appear only
after the updated capabilities are loaded. Existing Feed operations remain usable.

## Build and verify

From a clean, committed checkout with the unchanged Cloud dependency lock:

```sh
python3 scripts/build-cloud-feed11-release.py \
  --feed9-handoff /path/to/KikiLink-Cloud-Feed9-Update.txt \
  --preferences-handoff /path/to/KikiLink-Cloud-Preferences-1.0.4.txt \
  --feed11-handoff /path/to/original-KikiLink-Cloud-Feed11-Update.txt \
  --output .local-dev/feed11-release
```

The three input handoffs, predecessor packages and their manifests are hash-pinned.
They are decoded as data, never executed during the build. The output includes
readable package trees, readable installers, a provenance report and
`KikiLink-Cloud-Feed11-Update.txt`. No host is contacted and no deployment is run.
The report records source revision, dirty state and artifact SHA-256. Build from
the final clean release commit to produce new lineages. The two original Feed11
packages retain their original provenance and exact installer/payload/manifest
bytes, including for already-installed reruns. The required original handoff has
SHA-256 `ec10c70b731e378c1cac66c62db5a796f530f1134eecf25fadb874cd82a136a1`;
keep that historical input separate from the corrected output.

This is a direct schema 9 → 11 update for the two reviewed Feed9 runtime lineages
and their Preferences 1.0.4 successors, `a09502488f4d` and `7fbcf099dc7e`.
The first handoff omitted the Preferences successors and refused those runtimes
with `UNRECOGNIZED_CURRENT_RELEASE` before extracting packages or changing services
or data. The corrected handoff authenticates the recovered successor packages;
it does not bypass the exact-release or source-hash guards.
It includes migrations 010 and 011, the current shared reaction catalog and News.
The earlier Feed10 artifact remains historical and must not be run first.
Unknown installations, changed package files, changed migration checksums or a
changed dependency lock are refused rather than guessed around.

Preferences 1.0.4 used a same-schema 9 → 9 operator. The new branches inherit its
runtime and dependency identity but use the reviewed Feed9-derived 9 → 11 migration
operator. The upgrade controller pins the actual Preferences predecessor manifest
and source. Its checkpoint and journal use the Feed11 namespace. Every API source
file remains identical to the original Feed11 package, preserving the published
Preferences fixes and release behavior.

The generated package includes `feed11-deployment.test.mjs`: it tests a disposable
schema-9 database, direct migration and repeatability, unchanged existing records,
both reaction targets, all 20 reaction identifiers, the Featured index, checkpoint
hash rejection, changed-data rejection and offline restoration. The rest of the
included API tests run with it inside the isolated pre-switch candidate container.
`scripts/cloud-feed11-package.test.py`, run with the same three handoff arguments,
also verifies all eight routes without executing their installers, preserved old
package identity, actual Preferences predecessor pins and rejection of modified
handoffs/manifests/sources before payload extraction.

## Owner-operated installation

Upload the final `KikiLink-Cloud-Feed11-Update.txt` to `/home/ubuntu/` on the existing
Cloud VPS using Termius, then run:

```sh
bash /home/ubuntu/KikiLink-Cloud-Feed11-Update.txt
```

The installer checks the expected host, root-owned runtime/control files, exact
predecessor release, dependency image and configuration. It requires an online
runtime, an active backup timer and at least 3 GiB of free space under `/var/lib`.
Credentials, service identities, the verifier image and dependency versions remain
the installed ones. The API candidate is built offline from the exact installed
image and tested before touching production data.

The operator probes the migration on a disposable database copy, verifies a fresh
encrypted remote backup, withdraws the public API route, stops writers and creates
a checked local checkpoint. It applies both migrations, starts the updated runtime,
checks readiness and verifies a new remote backup before completing. A brief Cloud
interruption is expected during the service switch.

Success ends with `KIKI_CLOUD_FEED11_READY`. The upgrade runs under systemd, so a
disconnected terminal does not cancel it. Re-running the same handoff observes
that exact upgrade; it does not create a second deployment. Status is available:

```sh
kikilink-cloud-private status
```

If it reports `STILL_WORKING`, check status again. For a failure, preserve the
output and inspect the exact failure before retrying. Do not edit checksums,
delete the upgrade journal, substitute a different predecessor, or force a
database downgrade. A prepared package is not evidence that production was updated;
retain the successful owner output or live status as deployment evidence.

## Recovery boundary

The existing controller may restore its checked schema-9 checkpoint only while
writers and the public route are stopped, before new-runtime activation. Once
activation starts, automatic downgrade is refused to preserve possible new writes.
The pre- and post-upgrade verified remote backups remain the recovery boundary;
do not start an old schema-9 backend on a schema-11 database.
