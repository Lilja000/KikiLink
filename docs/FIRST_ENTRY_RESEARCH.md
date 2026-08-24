# KikiLink first-entry UX research

This note records the evidence and product decisions behind Guided Home in KikiLink 0.8.0.
The research was reviewed on 2026-08-24 and favors primary design-system and accessibility
guidance over trend galleries.

## What the guidance consistently says

### Teach in context, without becoming a barrier

Apple recommends letting people begin immediately with strong defaults, postponing
nonessential setup, and teaching features near the moment they are useful. Fluent describes
effective onboarding as relevant, non-distracting, optional, benefit-focused, and written for
action. Atlassian similarly recommends one contextual spotlight at a time and short,
dismissible guidance.

- [Apple onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
- [Fluent onboarding](https://fluent2.microsoft.design/onboarding)
- [Atlassian first impressions](https://atlassian.design/patterns/first-impressions/)

### Make the important choice obvious

W3C cognitive-accessibility guidance recommends five or fewer main choices, putting the
important content first, separating choices with space, and avoiding non-meaningful imagery.
Clear titles, selected destinations, consistent controls, and stable structure reduce the work
required to understand a page.

- [W3C Avoid Too Much Content](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p03-manageable-quantity/)
- [W3C Clear Purpose](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p01-clear-purpose/)
- [W3C Consistent Design](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p03-consistent-design/)
- [W3C Clear Page Structure](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o2p03-page-structure/)

### Blank states need a next step

Shopify Polaris treats an empty screen as an opportunity to explain what belongs there and
provide a prominent first action. Fluent makes the same recommendation for contextual empty
states and asks interface copy to favor strong verbs over passive explanation.

- [Shopify Polaris empty state](https://shopify.dev/docs/api/app-home/patterns/compositions/empty-state)
- [Fluent onboarding content guidance](https://fluent2.microsoft.design/onboarding#content)

### Adapt components, not only the outer frame

Android's current adaptive-layout guidance recommends reflow, containment, presentation
changes, and maximum widths instead of stretching desktop components into smaller or larger
windows. Compact sizes should use one pane; larger sizes can use multiple panes.

- [Android adaptive layouts](https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout)

### Keep settings optional and close to their consequence

Apple recommends strong defaults, minimizing settings, and placing task-specific choices in
context. KikiLink therefore starts in Guided mode but preserves Focused Home for people who
want less information after they understand the deck.

- [Apple settings](https://developer.apple.com/design/human-interface-guidelines/settings)

## Decisions applied in 0.8.0

| Research implication | KikiLink decision |
| --- | --- |
| Do not block the primary goal | No mandatory welcome dialog, carousel, or tour |
| Put the important thing first | One “Suggested next step” responds to unread chats, first use, room presence, or recency |
| Limit main choices | One suggestion plus four stable destinations, never a crowded feature catalog |
| Write for action | Visible labels such as “Read message”, “Start a chat”, “View players”, and “Customize” |
| Use familiar wayfinding | Stable Home, Chat, Players, and Activities navigation with the current page exposed |
| Explain an empty product state | A new user sees “Start your first chat” and a direct button instead of an empty dashboard |
| Preserve user control | Focused Home removes the suggestion and supporting descriptions without changing features |
| Adapt by presentation | Guided Home uses two panes when space permits and reflows to one pane on phones |

## Rejected patterns

- A mandatory multi-step tour: too interruptive for an addon opened during another task.
- Many pulsing coach marks: visually noisy and hard to dismiss as a group.
- A command palette as the default entry: powerful later, but it asks a new user to know what
  to search for before the product has established its vocabulary.
- More top-level tabs: the existing four destinations already cover the primary jobs, and
  adding utilities to mobile navigation would weaken the hierarchy.
