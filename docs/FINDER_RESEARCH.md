# LinkFinder research and interaction decisions

This note records the evidence and decisions behind LinkFinder in KikiLink 0.9.0. The
research was reviewed on 2026-08-24 and uses current platform and accessibility guidance.

## Evidence

Apple's June 2026 Search fields guidance recommends placeholder copy that explains scope,
immediate search while typing, useful suggestions before input, relevant results first, and
visible categories when they help people understand mixed results. It also treats a toolbar
button as a familiar entry point for transient global search.

- [Apple Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)

The WAI editable-combobox pattern keeps DOM focus in the input, exposes the popup through
`aria-controls` and `aria-expanded`, moves the active option with `aria-activedescendant`, and
defines `Arrow Up`, `Arrow Down`, `Enter`, and `Escape` behavior without replacing native text
editing commands.

- [WAI combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

WAI's dialog pattern requires focus to move inside an opened modal, keeps the tab sequence
contained, closes on Escape, returns focus logically, and includes a visible close control.

- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

Material 3 describes search as a distinct component that can change presentation across
available space. KikiLink follows this at the component level: the desktop trigger includes a
label and shortcut, while the phone trigger condenses to a reachable icon without adding a fifth
bottom-navigation destination.

- [Material 3 Search](https://m3.material.io/components/search/guidelines)

## Applied decisions

| Guidance | LinkFinder decision |
| --- | --- |
| Explain search scope | Placeholder names chats, players, activities, and settings |
| Start immediately | Results refine on every input event; there is no submit-only state |
| Help before typing | Empty search shows up to five contextual shortcuts |
| Put relevance first | Exact titles outrank prefixes; unread, pinned, present, and favorite items receive contextual priority |
| Categorize mixed results | Every option carries a visible Destination, Chat, Player, Activity, Settings, or Action label |
| Preserve stable navigation | LinkFinder is a top-bar utility; Home, Chat, Players, and Activities remain visible |
| Support keyboard and assistive technology | Native dialog plus listbox/combobox semantics, live count, arrows, Enter, Escape, and visible close |
| Respect editing commands | The optional `Ctrl+K` / `Cmd+K` shortcut is ignored inside editors and form controls |
| Protect private data | The catalog is rebuilt in memory from local KikiLink and Bondage Club state; nothing is sent to a search service |

## Deliberately excluded

- Remote or semantic search: unnecessary for the current dataset and incompatible with the
  local-first privacy promise.
- Search as a fifth mobile tab: it would weaken the four-destination navigation hierarchy.
- Persistent recent-search history: suggestions already use current context, so storing queries
  would add privacy cost without enough benefit.
- Fuzzy typo correction in the first release: deterministic substring ranking is predictable;
  aliases and typo tolerance can be added later with explicit tests.
