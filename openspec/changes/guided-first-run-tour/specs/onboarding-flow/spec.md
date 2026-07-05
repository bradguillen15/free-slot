# onboarding-flow Delta Specification

## REMOVED Requirements

### Requirement: Skip onboarding
**Reason**: The `/onboarding` wizard is removed; new-user orientation is now the guided tour (see `guided-tour`), which has its own skip semantics.
**Migration**: The `onboarding_skipped`/`onboarding_completed` profile columns are kept for historical data but are no longer written by any UI.

### Requirement: Non-blocking OnboardingGate
**Reason**: With the `/onboarding` route deleted, the gate's redirect logic is dead code; `/app` was already never gated.
**Migration**: `OnboardingGate` is removed from `src/App.tsx`; auth/profile loading states are handled by the remaining route wrappers.

### Requirement: In-place schedule setup step
**Reason**: Wizard removed; schedule setup happens in the schedule editor, reached via the guided tour with the suggested-schedule template.
**Migration**: `ScheduleEditor` remains the single schedule-editing surface.

### Requirement: In-place activities setup step
**Reason**: Wizard removed; activities are managed on the Activities page.
**Migration**: None — `ActivityEditor` remains on its page.

### Requirement: Preferences step pre-populated from profile
**Reason**: Wizard removed; the same preferences (weekends, review day, time format) are editable in Settings.
**Migration**: None — Settings already covers these fields.

### Requirement: Idempotent finish for authenticated users
**Reason**: There is no wizard finish action anymore.
**Migration**: None.

### Requirement: Guest-to-cloud migration carries skip flag
**Reason**: The skip flag is no longer produced; the tour's `tour_completed` flag is carried instead (covered by `guided-tour`).
**Migration**: Existing migrated flags remain valid historical data.

### Requirement: i18n coverage for new UI elements
**Reason**: The wizard UI and its strings are deleted; i18n coverage for the replacement UI is specified in `guided-tour` and `schedule-template-apply`.
**Migration**: `onboarding.*` wizard-only i18n keys are removed alongside the page.
