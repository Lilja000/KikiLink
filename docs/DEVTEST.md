# KikiLink - DevTest

An additional local Tampermonkey installer, requested for testing KikiLink on a phone.
The current build restores the QoL interface from `cb8aee3`, with focused presence
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

The 696-test suite includes 90 CSS-cascade cases across desktop/mobile widths,
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
Storage keys and version numbers do not change; existing legitimate settings,
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
