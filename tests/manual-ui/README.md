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

The current environment could not open the harness in its browser. No new visual screenshots are supplied or claimed by this change.

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
disabled after the common Cloud action runner finishes. Posting with unchanged
text retries the same client ID; a changed draft uses a new ID after a failed
attempt. No actual Zen/Firefox or live Cloud test is implied by the DOM fixtures.
