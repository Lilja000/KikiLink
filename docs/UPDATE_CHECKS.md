# KikiLink update checks

When the **standalone userscript** opens Home on a production Bondage Club hostname, KikiLink performs
one credential-free request to the official raw `package.json`. It sends no cookies or referrer,
rejects redirects, accepts only a strict newer SemVer from a bounded JSON response, and stops after
four seconds. The body is capped at 8 KiB and 256 stream reads, including empty chunks. There is no
retry, interval, background polling, peer message, or room announcement.

The FUSAM build does not perform this request. FUSAM owns version discovery and installation for that
distribution.

A fixed official userscript link remains hidden unless that check succeeds. Network, CORS, parsing,
or lifecycle failure stays silent and leaves the current Home unchanged. KikiLink never sends update
Beeps to another player; checking and installing a release is exclusively a local Home/userscript-
manager action.

Regression coverage lives in `tests/version-update-checker.test.ts`. Full verification remains
`npm run check`.
