# Independent BC identity verifier

The verifier is a separate service using its own BC account. It has no player-facing
role and must not reuse a player's session. `connection.mjs` validates the authenticated
account and Member Number before attaching message handlers. Credentials go only to
the source-pinned BC endpoint in `config.mjs`, never to a caller-selected URL.

Only native `AccountBeep.MemberNumber` and `ChatRoomMessage.Sender` envelopes establish
who sent a proof. The message body cannot choose that identity. A separate browser
exchange secret is not sent through BC. The adapter validates bounded proofs and
forwards them to the authenticated loopback verifier API with concurrency/time limits.
Production recipient preparation is driven by pending verification challenges; staging
uses explicit independent tester identities. Receiving a Beep is not itself a Cloud
session: the challenge, native sender and browser exchange must all agree.

The service does not join rooms, answer chat, collect room locations or perform gameplay.
It can adjust only its own bounded native receive permissions needed for verification.
No API database, object-store credentials or message encryption keys belong in its
runtime environment. Private credential files require owner-only access and must not
be committed or included in client builds.

Login has a fixed deadline. Terminal rejection, identity mismatch or forced disconnect
suspends automatic login; ordinary connection loss uses bounded backoff. Persisted
suspension requires operator review, not an automatic retry loop. Teardown removes
handlers and pending work before a new authenticated socket is attached.

Transport fields were checked against cached BC R131 source at
`0de770190c9e72790d3be6be70e7901d68cc78a0`. No BC source or assets are distributed here.
Local tests cover pinned identity, sender attribution, malformed/replayed proofs,
receive preparation, lifecycle and account isolation using controlled sockets. They
are not a substitute for real BC verification after a transport change.
