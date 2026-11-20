# Cloud runtime isolation

The old schema-11 controller checks the gameplay Runner container every 15
seconds. A missing or unhealthy Runner stops the Cloud API and withdraws its
public route. Verifier configuration and process-lock checks also precede API
startup, so an unavailable verification process can prevent existing devices
from reaching Cloud.

This update removes the Runner availability checks and places verifier runtime
checks inside its independent supervisor. The API starts with its own database,
image, configuration and proxy checks. Terminal verifier suspension records are
preserved, and transient verifier process retries retain their five-minute bound.
Verifier errors become bounded diagnostics rather than API shutdowns.

`phase: online`, `apiReady: true` and `liveReady: true` describe public API
availability. `verificationReady` and `verifierState` separately describe initial
BC-account verification. If verification is unavailable, already verified device
keys and sessions continue to work. New proofs still require the native verifier;
expired, revoked, replayed or wrong-account device credentials remain rejected.

## Build

The builder accepts the corrected, previously delivered
`KikiLink-Cloud-Feed11-Update.txt`. Its compressed input and all four schema-11
predecessor manifests are pinned. It also accepts the extracted `.b64` payload
for reproducible local checks; that route enforces the identical payload hash.

```sh
python3 scripts/build-cloud-runtime-isolation.py \
  --feed11-handoff /path/to/KikiLink-Cloud-Feed11-Update.txt \
  --output .local-dev/runtime-isolation-release

python3 scripts/cloud-runtime-isolation-package.test.py \
  --feed11-handoff /path/to/KikiLink-Cloud-Feed11-Update.txt

npm --prefix cloud test
```

The handoff is deterministic. It supports schema-11 packages `667a84ed7707`,
`a9001529ea12`, `da7052b1dcf4` and `00f139253cc5`, plus observation of their exact
updated successors. Unknown, modified or older installations are refused.
No live host is contacted by the builder or local tests.

Generated readable package trees and `report.json` retain hashes, source revision
and dirty-state evidence. Unchanged API, verifier, migration and dependency bytes
are copied from the pinned predecessors. No private runtime package or opaque
handoff payload is stored in the public repository.

## Install on the existing VPS

Upload `KikiLink-Cloud-Reliability-Update.txt` to `/home/ubuntu/` using Termius:

```sh
bash /home/ubuntu/KikiLink-Cloud-Reliability-Update.txt
```

The fixed-host installer verifies the immutable predecessor and builds an updated
immutable controller package. Before switching, it checks installed unit and
launcher bytes, configuration hashes, image identities, the existing proxy plan,
the database verifier and an active backup timer. An existing fresh verified
backup is retained; a stale backup is refreshed and verified before shutdown.
It runs the candidate's stubbed controller tests before changing services.

The update runs as a systemd job and continues if Termius disconnects. It changes
controller files, launcher and unit paths, then restarts the Cloud containers with
their exact installed API/verifier images. It never restarts or modifies the
gameplay Runner, edits BC credentials, removes verifier suspension markers,
changes the database schema, restores a database snapshot, or revokes sessions.
The service switch causes a brief Cloud interruption.

Success is `KIKI_CLOUD_RUNTIME_ISOLATION_READY`, which requires a reachable API;
it does not claim that a suspended verifier has resumed. If the handoff reports
`STILL_WORKING`, rerun the same handoff to observe the existing job. Normal status:

```sh
sudo kikilink-cloud-private status
```

A failed activation restores the previous controller, unit paths and state
without restoring or downgrading the database. The update journal is
`/var/lib/kikilink-cloud-private-control/runtime-isolation-upgrade.json`; unknown
or changed state stops recovery for review. Historical migration journals and
old immutable packages remain intact. Do not rerun an old schema upgrade or edit
manifest hashes to force a mismatched package.

A prepared handoff and passing local checks are not proof of live installation.
The success marker and live API status are the deployment evidence.
