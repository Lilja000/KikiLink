# KikiLink - DevTest

## Current screenshot corrections — 2026-09-20

The current local branch is `local/ui-details-recovery-20260920`, reconstructed from
the saved `5ab70241df48-dirty-5e7011cd1052` DevTest and its archived source diff on
top of `8469b6e`. The source archive is complete; the lost original commit history
is not claimed to be recovered. Profile width remains 640px and the shared editor
width 460px. The new Mute-only dialog limit is 360px.

The private build targets `https://vps-18734a9e.vps.ovh.net/kikilink-test` for the
same approved accounts 72385, 95634 and 259875. Staging health responded `mode=staging`
and `schemaVersion=7`; authenticated feature/save tests against that VPS remain
unverified. Local HTTP/SQLite tests cover both gradients, media, preference privacy,
Mailbox and offline Direct across client/API restarts.

No new visual screenshots are claimed: the available browser rejected both local
HTTP and file access to the development harness. Run `node scripts/preview-ui.mjs`
for the actual UI with explicitly synthetic data. Physical Firefox Android and
Desktop-site review are still required. The supplied archive's review identifies
the exact DevTest build ID and checks. No release, public version, public bundle,
FUSAM manifest or production deployment changes are part of this work.

## Previous targeted correction candidate — 2026-09-19

The previous branch was `local/social-preferences-20260919`. See
[DEVTEST_REVIEW_20260919.md](DEVTEST_REVIEW_20260919.md) for the exact source/build ID,
restored profile/editor dimensions, local client/server and browser checks, and
the **unverified VPS/physical Android** acceptance steps. Its privately supplied
DevTest targets `/kikilink-test` on the existing VPS; successful staging connection
has not been confirmed. No public version, release bundle or FUSAM manifest changed.
The Cloud-disabled and `.invalid` artifacts described below are earlier candidates,
not the current download.

## Social/profile development — 2026-09-19

The earlier private development branch was `local/social-profile-20260919`, based on
the preserved stable 0.30.0 source. Runtime/package versions remain **0.30.0**.
See [SOCIAL_PROFILE_DEVELOPMENT.md](SOCIAL_PROFILE_DEVELOPMENT.md) for the implemented
features, exact test results, source catalog and remaining visual/live checks, and
[SOCIAL_PROFILE_DEPLOYMENT.md](SOCIAL_PROFILE_DEPLOYMENT.md) for the separate future
deployment plan. No release or production service was updated.

The supplied `KikiLink-DevTest.user.js` is built by `--dev-test` with **Cloud disabled**.
It is suitable for local UI, native chat and appearance checks. New relationships,
Mailbox, offline Direct delivery and Preferences require the updated backend in an
explicitly configured staging environment. The separately built Cloud artifact uses
`https://cloud-staging.example.invalid`, an intentionally unusable placeholder. Do not
expect it to connect until a reviewed staging origin is selected and the artifact rebuilt.

Final automated results: 1,081 addon tests passed, one existing opt-in native-server
fixture skipped; 94 Cloud tests passed; 19 DevTest artifact checks passed. FUSAM Local
passed with three development clients and with preserved stable 0.30.0 peers using
synthetic BC transport. These checks do not constitute browser screenshots or an
Android/real-BC acceptance test.

## Earlier development history

An additional local Tampermonkey installer, requested for testing KikiLink on a phone.
The earlier build restored the QoL interface from `cb8aee3`, with focused presence
and compatibility fixes. Pulse and the subsequent interface redesign are absent.
The follow-up `local/compact-ui-fixes-20260907` branch preserves that layout and
fixes the three reported screenshot defects: responsive Gallery/group/chat
buttons, portraits cropped inside their existing frames, and smaller transparent
PNG presence flowers. The PNG is a 128×128 export of the existing Blossom SVG;
the native character overlay and its settings remain unchanged.

The `local/rooms-players-20260907` update builds on those fixes. Rooms
opens a single filtered directory, with a compact current-room card and separate
Manage/Presets views. Players opens In room/Friends/Known lists, with optional
favorites, online, and detected-KikiLink filters. Desktop has adjacent details;
narrow layouts open details with a back button. Room/player cross-navigation
preserves search, filters, selection, and scroll. See [ROOMS_PLAYERS.md](ROOMS_PLAYERS.md).

The follow-up `local/visual-qa-20260908` branch fixes icon padding in Super compact
and narrow Home cards, short-window navigation, mobile navigation height, the
320px Super compact header, and excess Focused hero height. Narrow desktop
Home/header content now adapts to its available container width. The existing
SVG set, PNG flower, themes, borders, and avatar crop are preserved.
See [VISUAL_QA.md](VISUAL_QA.md) for the checks and remaining browser limitation.

That earlier 696-test suite included 90 CSS-cascade cases across desktop/mobile widths,
all three density modes, both Home styles, and extra-large text. TypeScript, 19 DevTest tests, and
both original-loader FUSAM scenarios pass. These are DOM/CSS checks: the browser
blocked the running local preview, so painted layout and live BC remain unverified.
It uses the existing userscript loader, page runtime, upload bridge, and BC-account
storage. The runtime version remains **0.29.0** for existing protocol compatibility.

```sh
node scripts/build.mjs --dev-test
```

This always writes to `.local-dev/devtest/`, even without `--local`. It cannot write
to production `dist/`. The internal test artifact remains `KikiLink.user.js` so the
existing built-userscript test suite can run against the exact DevTest bundle:

```sh
KIKILINK_TEST_DIST=.local-dev/devtest ./node_modules/.bin/vitest run tests/userscript-runtime.test.ts tests/fusam-build.test.ts tests/version-update-checker.test.ts
./node_modules/.bin/tsc --noEmit
```

Use **KikiLink-DevTest.user.js** as the delivery filename. Its Tampermonkey name is
**KikiLink - DevTest** and namespace is `kikilink.bc.devtest`, so installation does
not replace the normal script. Both update URLs are `none`, and the compiled app
does not request production update metadata. The menu also displays **DevTest**.
Existing account-scoped storage remains in use; the development settings migration is
additive, preserves inactive appearance values and adds a normalized appearance mode. Existing legitimate settings,
profiles, chats, and groups remain available in the same BC browser/origin/account.

## Phone installation

1. Download the provided ZIP archive. Do not extract it for the ZIP import flow.
2. Open Tampermonkey's Dashboard, then **Utilities → ZIP → Import / Choose file**,
   choose the archive, and confirm importing **KikiLink - DevTest**. UI labels may
   vary by language/version. The ZIP contains only the userscript, no exported
   Tampermonkey settings or user data.
3. Disable the normal KikiLink script and the normal KikiLink entry in FUSAM, if
   enabled. Keep other addons and FUSAM itself enabled. Enable **KikiLink - DevTest**.
4. Fully reload the Bondage Club page. Its KikiLink menu should say **DevTest**.

To return to stable, disable DevTest, re-enable the ordinary KikiLink installation,
and reload. There is no need to delete settings or reinstall other addons.

This is private file delivery, not a public release. Public `main`, the package version,
release artifacts, and the production FUSAM manifest remain unchanged. The normal
FUSAM Local Development workflow and `KikiLink.fusam.js` remain available separately.

The restored build is documented in [QOL_RESTORED.md](QOL_RESTORED.md).
Import its ZIP over the earlier **KikiLink - DevTest** entry; keep only one DevTest
copy enabled. No settings deletion is needed.

Installation reference: https://www.tampermonkey.net/faq.php?locale=en&q=Q106
Update metadata reference: https://www.tampermonkey.net/documentation.php?locale=en&q=update_url
