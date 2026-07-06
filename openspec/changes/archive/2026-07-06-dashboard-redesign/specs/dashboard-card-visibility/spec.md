## ADDED Requirements

### Requirement: Users can toggle dashboard card visibility

The Dashboard SHALL allow users to show or hide individual cards (per-day bar chart, category breakdown, plan-vs-actual, agenda view). Visibility preferences SHALL be persisted in `localStorage` and survive page reloads.

#### Scenario: All cards are visible by default

- **WHEN** the user opens the Dashboard for the first time (no localStorage entry)
- **THEN** all dashboard cards are visible

#### Scenario: Hiding a card removes it from the layout

- **WHEN** the user toggles a card off via the visibility menu
- **THEN** that card disappears from the Dashboard immediately
- **AND** the remaining cards reflow to fill the space

#### Scenario: Card visibility preference is persisted

- **WHEN** the user hides one or more cards and reloads the page
- **THEN** the hidden cards remain hidden (preference read from `freeslot.dashboard.visible_cards` in localStorage)

#### Scenario: Showing a previously hidden card restores it

- **WHEN** the user re-enables a hidden card from the visibility menu
- **THEN** the card reappears in the Dashboard layout
- **AND** the localStorage entry is updated accordingly
