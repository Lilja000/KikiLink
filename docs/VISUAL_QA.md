# Local interface QA — 2026-09-08

Development branch: `local/visual-qa-20260908`.
Rollback: `checkpoint/pre-visual-qa-20260908`, exact commit
`8ba47899c4aa0715f0a163ef866c4b0c629c218d`.

## Findings and local fixes

- Home SVG tiles retained 12px padding after shrinking. The actual SVG drawing
  area was only 10px in Super compact and 16px on narrow phones. Padding now
  leaves a 20px square drawing area; Comfortable/Compact desktop retains 22px.
- Seven desktop navigation buttons could exceed the available panel height.
  The side rail now scrolls, and the panel can shrink below its former fixed
  minimum height in short desktop/landscape windows.
- Mobile navigation's fixed grid row did not accommodate density overrides and
  safe-area padding. Its row now grows with its contents, with 64px/60px minimums
  and consistent top/bottom padding.
- The 320px Super compact header inherited desktop gaps/padding. Its six visible
  items now fit the available minimum width while keeping 44px action buttons.
- Density-specific minimum heights left unnecessary empty space in Focused Home.
  Only that minimum is overridden; density-specific padding remains intact.
- Home's two fixed minimum columns could exceed a narrow desktop panel. A named
  container query stacks the Guided hero when needed. Another hides the optional
  clock/context/shortcut hint in narrow panels; actions remain available.

No runtime logic, settings/storage schema, profiles, chats, group data, icon
drawings, or avatar assets were changed.

## Evidence

| Check | Result and boundary |
| --- | --- |
| Comfortable / Compact / Super compact × Guided / Focused × dark / light at 320, 390, 720, 820, 1440px | 60 CSS checks passed, using Extra large text; 820px case uses a 390px-tall viewport. These are cascade and fixed-size budget assertions, not screenshots. |
| Existing Gallery toolbar, avatar crop/flower, Rooms/Players responsive checks | 30 cases passed, including the 720/721px transition and long labels. |
| Source SVG/PNG inspection | Rendered and inspected an asset sheet for desktop/mobile tile sizes in both themes. Icons remain square and visible. This sheet is not a browser rendering of the addon. |
| Flower PNG | Original 128×128 RGBA asset has 8,638 fully transparent and 494 partially transparent pixels. CSS retains 9px group, 13px list, 20px profile badges (18px narrow profile), using `contain`. |
| TypeScript / full local suite | Typecheck passed; 696 tests in 52 files passed. |
| DevTest installer | 19 runtime/build/update tests passed; version 0.29.0, distinct identity, automatic updates disabled. |
| Original FUSAM Local Development / `KikiLink.fusam.js` | Three synthetic clients passed, including cross-room groups with non-mutual friends and a mixed scenario using public 0.29.0 peers. No GitHub update requests. |
| Browser / live BC / touch keyboard / painted overlaps | **Blocked.** The supervised local preview runs, but the browser returns `net::ERR_BLOCKED_BY_CLIENT` for its advertised URL. No alternate host or public deployment was used. |

Happy DOM does not implement painted geometry/container queries, does not map
logical padding to physical computed properties, and mishandles comma-separated
`:host()` selector rules. Tests account for those limits; passing them is not
proof that every frame, tooltip, menu, or scroll position renders correctly.

## Remaining visual pass

In the local FUSAM or private DevTest installation, check desktop 1440×900,
1024×768, narrow desktop 820×600, short landscape 844×390, and phone 390×844 /
320×740. Cross all three densities with Guided/Focused; sample both themes,
Default/Extra large text, desktop zoom, and reduced motion.

Inspect Home, Chat list/header, group members, Rooms/Manage/Presets, Players/details,
Settings, and profiles with each of the seven avatar frames. Include long names,
portrait/wide/missing avatars, a full room, unread counts, and open contextual
menus. Check keyboard focus, bottom-nav access, touch target spacing, scrolling,
and the on-screen keyboard. Confirm that container-query transitions work in a
real browser. This pass remains outstanding; this document does not certify it.

## Release safety

Public `main` and `v0.29.0` remain at
`82885c09d2be1cf22dd5423555557e96c1c1c7a3`.
The package version, production `dist/`, and FUSAM manifest remain unchanged.
Nothing was pushed or published. Files in `.local-dev/` are development artifacts.
