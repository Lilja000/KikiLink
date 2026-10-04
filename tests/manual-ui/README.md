# Local visual review

Run `node scripts/preview-ui.mjs` from the repository, then open the printed local address in a browser. The harness mounts the existing `LinkChatView` and its shared components; it is not a second UI implementation.

BC identities and Cloud responses are synthetic. It cannot prove that a real Cloud deployment accepts profile saves. Use `cloud/test/client-delivery.test.mjs` for local HTTP/SQLite integration; staging requires a separately authorized logged-in client.

Review the current room and lower lobby columns; Mixed/Refresh edges; unknown profile presence; Feed and roster avatar outlines; avatar choices and gradient controls; chat Mute; roster row clicks/tags; Mailbox and Unread icons. Repeat at 1280×800, 980×740 (Desktop-site layout approximation), 390×844 and 390×340, with all three density settings. Do not describe viewport emulation as testing a physical Android device.

For the density follow-up, also check 660px and 760px window widths and switch
between mouse and touch input. In Compact and Comfortable, the entire Close
button and Feed aside must remain inside the panel. News and Mailbox must have
equal outer heights, including touch at desktop viewport widths. The room
fixtures include different languages, creator-name lengths, one/two/no friends,
and Join/Full/Locked. Their friend groups must start at the same left inset;
metadata wraps to the row above them only when the Rooms pane is narrow.

The manual harness itself does not establish painted browser geometry. Record
the actual browser and viewport when screenshots are produced; a successful
Happy DOM test or fixture build alone is not visual verification.

Match preferences follow-up: open the existing own-profile editor from the
topbar. Scroll to Bio and click the Match preferences label, arrow and count.
The header must reveal Quick setup; the profile body must scroll through the
choices without clipping them to the header. Check this in the same density
and viewport cases above, including 980px Desktop-site layout and short height.
Choose Like, then a detailed Neutral or Hard Limit; collapse/reopen the section
and reopen the profile. The fixture now handles the real PATCH payload, so it
retains these choices for this fixture session. Add `preferences=unavailable`
to the query to review the visible Cloud error and Retry action. This remains
a synthetic API; it does not confirm VPS persistence or survive a page reload.

Keyboard regression (owner's Firefox screenshot of 2026-09-20 17:39): the
previous min-content minimum left only a red border where Match preferences
belonged. Its parent now uses a non-shrinking vertical flex layout, as the
existing people-picker body does; the disclosure again has a 64px minimum.
Review both the closed header and expanded loading/error/loaded content, focus
the avatar URL to open the keyboard, then close it. The preference header must
remain visible in the scroll flow, and the footer must remain separate from it.
Also scroll to the final profile settings to confirm they are reachable.
The automated resize test verifies state and CSS rules only, not phone geometry.

Topbar title follow-up: at widths where the title is visible, switch repeatedly
between Chat, Players and Custom Activities in all three densities, including
Desktop-site mode and increased text size. The title should start close to the
Mailbox button and use the previously empty space; its text must not shift News,
Mailbox, the clock, presence, Find, Settings or Close. At the existing narrow
breakpoints, the title stays hidden and the flexible drag space is restored.
The automated CSS checks do not establish rendered positions or Android results.

Chat focus follow-up (Zen / Firefox report): in Direct, native Groups and Cloud
Groups, type a message, press Enter, then immediately type the next one without
clicking the field. Repeat several sends, with Shift+Enter for a newline and
Ctrl+Enter when Enter-to-send is off. While a send is pending, also click another
field or switch chats: completion must neither take focus back nor erase a newer
draft. Test failure/retry and a slow connection; pending Enter must not duplicate
the send. Record the exact DevTest build ID, browser version and chat route.
Native Groups now keeps its textarea enabled and focuses only on explicit Send;
the conditional draft clear is serialized with other writes. Direct and Cloud
Groups already used the non-disabling send path and now have focus regressions.
Happy DOM checks focus ownership and state only; they do not reproduce Gecko,
Zen extensions, a physical keyboard or the Android on-screen keyboard. The
ordinary BC room chat is a separate input and is not changed by this patch.

Enter escaping into BC follow-up: the shared KikiLink shadow root now contains
keydown, keypress and releases of keys started inside the addon. This also covers
Feed, dialogs and controls; it is not another forced-focus timer. A key pressed in
BC before focus enters KikiLink must still release in BC, including autorepeat.
The native GameKeyDown/GamePaste SDK guards remain for capture-phase callers.
The BC R131 source at 0de770190c9e72790d3be6be70e7901d68cc78a0 delegates keyup
to map movement release and does not itself focus InputChat there. The exact
page/addon listener and loaded build in the user's Zen session are still unknown.
The regression deliberately installs a page-wide Enter handler that focuses the
native chat, and verifies that addon typing never reaches it.

Feed's confirmed post is now inserted into the bounded existing list instead of
rebuilding the editor. Verify ordinary Enter/newlines, Ctrl+Enter publishing,
continued typing, choosing another field during a slow post, retry after failure,
an active search filter and the 100-post window. Empty Post/Send controls remain
disabled after the common Cloud action runner finishes. A transient failure or
lost response retains the exact submitted text, attachments, poll and client ID
for retry, including after a reload. New typing remains a separate next draft;
confirmation removes only the accepted submission. An explicit non-retryable
validation rejection allows editing and a new attempt. No actual Zen/Firefox
or live Cloud test is implied by the DOM fixtures.

## Feed expansion review

To produce the self-contained preview shared with the owner, run:

```sh
node scripts/preview-ui.mjs --feed-preview --build-only
node tests/manual-ui/check-feed-preview.mjs
```

The export is `.local-dev/manual-ui/KikiLink-<package version>-Feed-Preview.html`.
Open that file directly in a browser; no local server, real account or production
API is required. Its declarative defaults open Feed, retain local settings and
use creator account `72385`. Minimal Russian controls change density and insert
a synthetic incoming post. The ordinary harness keeps account `101`; add
`creator=1` to its query when inspecting creator names and administrator shields.
Uploaded photos are kept in a session-only map capped at 16 entries / 32 MiB.
The mock preserves their chosen bytes under Cloud's normalized media header;
it does not run the real server image conversion or persistence pipeline.

The standalone smoke check boots the exact export at a `file:` URL with no query
parameters. It checks automatic Feed entry, seven visible posts, creator-only
name markers, administrator shields, all advertised reaction choices, a new
reaction mutation, plain Vote text and retention of selected image bytes. This
also catches accidental bundle corruption while embedding it in HTML. It is a
DOM/API fixture check, not a painted-browser or server image-processing test.

Open `http://127.0.0.1:8765/?page=feed&persist=1` after starting the preview.
The fixture imports the actual `LinkChatView`, `CloudFeedView`, poll controls,
text formatter and styles. Only accounts, API data and SSE hints are synthetic.
It supplies a pinned post, Featured poll, image/text spoilers, a closed poll,
comments with a reply, a saved/watched post and a hidden post. Mutations update
the synthetic data, so reopening filters and menus exercises the real app flow.

Query options:

- `density=comfortable|compact|super-compact` sets initial density.
- `creator=1` uses creator account `72385` for the complete synthetic session;
  other authors keep their ordinary name appearance.
- `persist=1` retains fixture shell settings; the actual Feed draft store retains
  drafts and images in browser storage independently.
- `latency=1500` delays mutations to check continued typing and duplicate-submit
  prevention. `failPostOnce=1` rejects the first post attempt for retry review.
- `legacy=1` omits new capability flags, representing an older Cloud server.

Review the new controls at 1280×800, 980×740, 390×844 and 390×340 in every
density. The short phone viewport approximates an open keyboard; it is not a
physical device test. Check these flows with mouse/keyboard and touch:

1. Save/unsave, follow/unfollow and hide/restore through the reused post menu.
   Inspect Saved, Friends, My posts and Hidden. Undo a hide. Keyboard focus must
   remain usable, and a hidden post must not remain in ordinary Feed results.
2. Open comments on post 2, reply to comment 1, cancel the reply, send it and
   reopen the thread. Verify the parent context and own-comment menu. Comments
   from live hints must not erase a draft or scroll to another post.
3. Vote, change a vote and view results. Open the composer Poll editor, use six
   long options, then remove an option. Check closing time, disabled invalid
   submission, multiline wrapping and the closed poll on post 3.
4. Reveal text and image spoilers with keyboard and touch. Confirm no protected
   image request appears in Request trace until reveal. Live events should
   retain the reveal state, existing decoded image, open comments and focus.
5. Type a post, add images with spoiler choices and a poll, reload and confirm
   restoration. Publish during the delay while typing a new suffix; the suffix
   must remain. Failed sends must keep the full draft and attachments.
6. Use Feed incoming while reading lower in the feed and Feed event repeatedly.
   Check stable scroll position and focus, no full editor rebuild, bounded
   requests, and no repeated idle polling. Request trace shows synthetic fetches.
7. At `legacy=1`, new server controls must be absent; existing Feed still opens,
   and a saved unsupported poll draft must not be silently discarded or posted.

For an optional repeatable Chromium geometry/screenshot pass, with a separate
Playwright installation and its Chromium executable available, run:

```sh
node tests/manual-ui/review-feed.mjs
```

Without a browser, `node tests/manual-ui/check-feed-dom.mjs` exercises the full
fixture with the real app in Happy DOM: poll votes, save/follow/hide/undo/restore,
filters, reply parenting, deferred spoiler image creation, stable focus/drafts
and a burst of live hints. It explicitly simulates an image entering the
viewport because Happy DOM does not paint or calculate intersections.

It writes the browser version, measurements and screenshots beneath
`.local-dev/feed-review/`, checks horizontal clipping across twelve viewport /
density cases, then checks live draft/focus preservation, draft reload, Friends
and Hidden restoration. It does not replace the Cloud integration tests or
manual assistive-technology / Android / Firefox review. A missing browser is a
failed prerequisite, not a passing or silently skipped visual check.
