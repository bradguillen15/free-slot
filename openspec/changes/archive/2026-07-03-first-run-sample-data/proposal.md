# Proposal: first-run-sample-data

## Why

User testing (2026-07-01) showed the first-run experience fails its one job: a new user said "no entendí qué hace el app" and "me abrumó tanta cosa". The current onboarding wizard front-loads configuration work (full schedule editor, activity editor, preferences) before the user has seen any value; nothing ever *shows* what FreeSlot does — sketch a week, log time, see free windows.

## What Changes

- New users land directly in Day view with **seeded sample data** instead of being redirected to the configuration wizard: a template weekly schedule (e.g. sleep, work, meals) plus 2–3 sample time logs on the current day, with free windows visibly present.
- Sample content is **real, persisted data** (guest localStorage or cloud rows), visually marked as examples, and fully editable — editing an example is a valid way to start using the app.
- A one-click **"clear examples"** action removes all remaining sample items at once; individually edited items lose their example marking and are kept.
- The onboarding wizard is demoted from a blocking gate to an optional, contextual path: `OnboardingGate` no longer redirects new users to `/onboarding`; setup steps are offered in context (e.g. from empty states or a "set up your week" prompt).
- Sample data participates in guest-to-cloud migration rules: untouched examples are excluded from migration; edited (de-marked) items migrate normally.
- All new copy in English and Spanish (TS-enforced parity).

## Capabilities

### New Capabilities
- `first-run-sample-data`: Seeding, marking, editing, and clearing of example schedule blocks and time logs for new users, in both guest and cloud modes.

### Modified Capabilities
- `onboarding-flow`: The gate requirement changes — new users (both flags false) are no longer redirected to `/onboarding`; they enter `/app` with sample data, and the wizard becomes reachable on demand. Skip semantics and flag storage are superseded accordingly.

## Impact

- **Frontend**: `src/components/OnboardingGate.tsx` (gate inversion), `src/lib/localStore.ts` bootstrap (guest seeding), Day view components (example marking, clear-examples affordance), `src/pages/Onboarding.tsx` (becomes opt-in), i18n locales.
- **Data layer**: an `is_example` (or equivalent) marker on schedule blocks and time logs across the guest/cloud dataStore abstraction; Supabase migration for cloud columns; `src/lib/migrateGuest.ts` filtering.
- **Dashboard/free-window logic**: consumes example logs like real ones by design (that is the demo); design phase must confirm no KPI distortion concerns once examples are cleared.
- **Tests**: unit tests for seeding/clearing/migration filtering; existing `OnboardingGate.test.tsx` and `Onboarding.test.tsx` expectations change; guest E2E flow updated.
- **Docs/specs**: delta spec for `onboarding-flow`; `docs/data-model.md` gains the example marker.
