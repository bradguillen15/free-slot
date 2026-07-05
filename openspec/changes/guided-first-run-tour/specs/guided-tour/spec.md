# guided-tour Delta Specification

## ADDED Requirements

### Requirement: Tour auto-starts once for new users
The app SHALL automatically start the guided tour on `/app` for a user whose profile has `tour_completed = false` (cloud: `profiles.tour_completed`; guest: local profile field). Completing the tour or skipping it at any step SHALL set `tour_completed = true` so the tour never auto-starts again.

#### Scenario: New guest sees the tour on first load
- **WHEN** a brand-new guest opens `/app` for the first time
- **THEN** the tour's welcome step is shown on the Day view

#### Scenario: Skipping persists dismissal
- **WHEN** the user clicks Skip on any tour step
- **THEN** the tour closes and `tour_completed` is set to `true`
- **THEN** reloading `/app` does not auto-start the tour

#### Scenario: Completing persists dismissal
- **WHEN** the user clicks Done on the final step
- **THEN** `tour_completed` is set to `true` and the tour does not auto-start again

### Requirement: Tour drives navigation itself
Each tour step SHALL declare the route it belongs to; when the user advances to a step on a different route, the tour SHALL navigate there programmatically. Tour bubbles SHALL anchor to page content via `data-tour` attributes, never to navigation links (mobile navigation is hidden inside a sheet).

#### Scenario: Advancing from welcome navigates to Schedule
- **WHEN** the user clicks Start on the Day-view welcome step
- **THEN** the app navigates to `/app/schedule` and the next bubble anchors to the apply-suggested-schedule action

#### Scenario: Tour works at mobile width
- **WHEN** the tour runs at a ~390px viewport
- **THEN** every bubble is fully visible and anchored to on-page content without requiring the navigation menu to be open

### Requirement: Tour follows the five-step script
The tour SHALL present exactly these steps, localized via `tour.*` i18n keys in both English and Spanish: (1) Day view welcome with Start/Skip; (2) Schedule page pointing at the apply-suggested-schedule action, advancing when the template is applied or via Next; (3) Schedule page hint that blocks can be edited to match the user's real week; (4) Day view pointing at the Confirm Day button, also mentioning one-tap logging by clicking a scheduled block; (5) Day view closing step describing the daily loop, mentioning the Dashboard, and pointing to the replay button.

#### Scenario: Step order and content
- **WHEN** a user advances through the whole tour
- **THEN** the steps appear in the order Day → Schedule → Schedule → Day → Day with the content above

#### Scenario: Applying the template advances the tour
- **WHEN** the tour is on step 2 and the user applies the suggested schedule
- **THEN** the tour advances to step 3 automatically

### Requirement: Tour is replayable on demand
The app layout SHALL expose a help (`?`) control in the desktop sidebar footer and in the mobile navigation sheet footer that restarts the tour from step 1, regardless of `tour_completed`.

#### Scenario: Replay from the sidebar
- **WHEN** a user who already completed the tour clicks the help control
- **THEN** the tour restarts at the welcome step
