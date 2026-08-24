# KikiLink UX principles

KikiLink should feel like a small, dependable part of Bondage Club rather than a
second game layered over it. These principles guide interface work from 0.7.0 onward.

## 1. The first screen answers “what can I do now?”

- Lead with one useful, context-aware next step rather than decoration or a forced tour.
- Keep onboarding optional and embedded in the task; do not block the workspace with lessons.
- Use strong verbs on actions and familiar nouns for destinations.
- Limit Home to one suggested action and four stable tools so the important choices stand out.
- Give empty states a short explanation and a direct first action.

References:

- [Microsoft Fluent onboarding](https://fluent2.microsoft.design/onboarding)
- [W3C Avoid Too Much Content](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p03-manageable-quantity/)
- [Shopify Polaris empty state composition](https://shopify.dev/docs/api/app-home/patterns/compositions/empty-state)
- [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding)

## 2. Navigation is for places; buttons are for actions

- Keep the primary destinations few, stable, visible, and named with familiar words.
- Use Home, Chat, Players, and Activities as the main information architecture.
- Keep Settings available but visually separate from the primary mobile destinations.
- Always expose the current destination visually and with `aria-current="page"`.

References:

- [Microsoft Fluent Nav guidance](https://fluent2.microsoft.design/components/web/react/core/nav/usage)
- [Material bottom navigation](https://m2.material.io/components/bottom-navigation/)
- [WAI navigation landmark example](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html)

## 3. Search supplements navigation; it does not replace it

- Keep stable destinations visible so nobody has to search for basic wayfinding.
- Offer global search in the top bar when it spans several content types and workspaces.
- Show useful suggestions before typing and refine results immediately during input.
- Put the most relevant matches first and expose a visible category on every result.
- Keep DOM focus in the search field while arrow keys move the active result.
- Build the search catalog locally; private content must never be uploaded for indexing.

References:

- [Apple Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)
- [WAI editable combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## 4. Keep context visible

- Use the workspace for features people browse or use for more than a quick decision.
- Reserve modal dialogs for short, focused tasks such as choosing a new chat contact.
- Avoid stacking or chaining blocking surfaces.
- Keep page titles and the current room or connection context close to the task.

References:

- [Microsoft Fluent Drawer guidance](https://fluent2.microsoft.design/components/web/react/core/drawer/usage)
- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## 5. Personalization must change comfort, not just decoration

- Themes and accents express identity, but text size, density, motion, and simplification
  determine whether the interface remains comfortable over time.
- Treat Super compact as information prioritization rather than indiscriminate shrinking:
  remove decorative chrome and repeated descriptions before reducing essential controls.
- Preserve finger-sized primary actions on phones even when Super compact is selected.
- Provide safe presets and preserve readable text for every custom accent.
- Let people choose a Focused Home that removes the suggestion, nonessential artwork,
  and supporting descriptions.
- Remember stable preferences and the last settings category locally.

References:

- [W3C adaptation and personalization objective](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o8-personalization/)
- [Apple settings guidance](https://developer.apple.com/design/human-interface-guidelines/settings)
- [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility/)

## 6. Clarity beats cleverness

- Keep visible labels beside controls; icons supplement words rather than replace them.
- Prefer common names such as Settings, Chat, and Players in navigation.
- Put consequences and privacy context beside the setting or action they describe.
- Keep data tools together as one quiet backup surface with plain Export and Import verbs.
- Empty, loading, disabled, success, and error states must explain the next useful step.

References:

- [W3C clear visible labels pattern](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p06-clear-labels/)
- [Microsoft Fluent accessibility guidance](https://fluent2.microsoft.design/accessibility)

## 7. Every important interaction has more than one path

- Important pointer targets should be generous; all interactive targets must meet the
  WCAG 2.2 minimum or have sufficient spacing.
- Keyboard focus must remain strongly visible.
- Dragging the launcher has a button-based reset alternative.
- Status changes use live-region semantics without unexpectedly moving focus.
- Errors remain until dismissed; transient success confirmations may clear on their own.

References:

- [WCAG target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [WCAG dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

## Review checklist

Before a UI release, verify:

- The primary task is reachable without opening more than one temporary surface.
- Current location and selected state are visible without relying only on color.
- Controls have nearby visible labels and useful accessible names.
- Keyboard order follows the visual order and focus never becomes invisible.
- Mobile controls are comfortable to tap and content reflows without horizontal page scroll.
- Home never presents more than five prominent choices and its suggested action remains optional.
- Global search works by pointer and keyboard, announces its result count, and retains no remote index.
- Default, Large, and Extra large text remain usable in both themes and both densities.
- Reduced motion and system motion preferences are respected.
- Custom accents keep readable foreground text.
- Destructive actions explain exactly what local data they remove.
- Notebook imports are bounded, validated, and merge-safe; existing private notes are not overwritten.
- Encounter retention never removes favorites or records containing notes or tags.
- No chat, note, identity, or preference data is sent to a KikiLink server.
