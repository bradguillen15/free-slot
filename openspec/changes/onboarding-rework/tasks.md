## 1. Database Migration

- [x] 1.1 Create migration file `supabase/migrations/20260612140000_add_onboarding_skipped.sql` that adds `onboarding_skipped BOOLEAN NOT NULL DEFAULT false` to the `profiles` table
- [x] 1.2 Apply the migration to the local Supabase instance and verify the column appears in `profiles`

## 2. Guest Store — `onboarding_skipped` support

- [x] 2.1 Add `onboarding_skipped: boolean` to the `LocalProfile` type in `src/lib/localStore.ts`
- [x] 2.2 Set `onboarding_skipped: false` in `DEFAULT_PROFILE` in `src/lib/localStore.ts`
- [x] 2.3 Verify `updateProfile` patches `onboarding_skipped` correctly (it accepts `Partial<LocalProfile>` so no code change needed — just confirm with a unit test)

## 3. Guest Migration — carry skip flag

- [x] 3.1 In `src/lib/migrateGuest.ts`, extend step 5 (profile update) to include `onboarding_skipped: snap.profile.onboarding_skipped` when writing to `profiles`

## 4. OnboardingGate — non-blocking

- [x] 4.1 Update `OnboardingGate.tsx` to read both `onboarding_completed` and `onboarding_skipped` from the profile
- [x] 4.2 Change the redirect condition: only redirect to `/onboarding` when `!onboarding_completed && !onboarding_skipped`
- [x] 4.3 Keep the reverse redirect (onboarding → `/app`) when either flag is true

## 5. i18n — new keys

- [x] 5.1 Add `skip` key under `onboarding` in `src/i18n/locales/en.ts` (e.g., `"Skip for now"`)
- [x] 5.2 Add `skip` key under `onboarding` in `src/i18n/locales/es.ts` (e.g., `"Omitir por ahora"`)
- [x] 5.3 Add `schedule.countLabel` and `schedule.cta` keys (e.g., `"{{count}} blocks added"` / `"Set up on Schedule page"`) in both locales
- [x] 5.4 Add `activities.countLabel` and `activities.cta` keys (e.g., `"{{count}} activities added"` / `"Set up on Activities page"`) in both locales
- [x] 5.5 Remove the now-unused `onboarding.schedule.countLabel*`/`onboarding.schedule.cta` and `onboarding.activities.countLabel*`/`onboarding.activities.cta` keys from both locales — the embedded editors (Decision 2) render no count cards or navigation CTAs. Keep `onboarding.schedule.title/subtitle` and `onboarding.activities.title/subtitle`.

## 6. Onboarding.tsx — Step 1: Embedded ScheduleEditor (Decision 2)

History: this step was first built as a count card + link to `/app/schedule` (tasks 6.1–6.4, done). Decision 2 was revised to embed the shared editor instead; tasks 6.5–6.9 capture that end state.

- [x] 6.1 Remove the `blocks` state, `addPreset`, `addCustomBlock`, `updateBlock`, `removeBlock` functions and all inline block editor JSX from `Onboarding.tsx`
- [x] 6.2 Add `useScheduleBlocks()` hook call at the top of the component to get live block count
- [x] 6.3 ~~Replace Step 1 content with a count card + `/app/schedule` link~~ — superseded by 6.7
- [x] 6.4 Remove `upsertLocalBlock` and the block-insert loop from `finish()` for both guest and cloud paths
- [x] 6.5 Extract the schedule editor body from `src/pages/SchedulePage.tsx` into a new `src/components/schedule/ScheduleEditor.tsx`: move `previewSegs`, `SortableScheduleRow`, `IconTooltipButton`, `DAY_ORDER`, the preset chips, block-row list + DnD, overlap-warning `Alert`, mini week preview, `ScheduleBlockDialog` and delete `AlertDialog`, plus all their state/handlers (`dialogOpen`, `deleteTarget`, `orderedIds`, `update`, `toggleDay`, `duplicate`, `confirmDelete`, `addPreset`, `onDragEnd`, etc.). The component takes no required props. (Add button moved into the editor, co-located with preset chips.)
- [x] 6.6 Slim `SchedulePage.tsx` to its `<header>` (title + subtitle) followed by `<ScheduleEditor />`; verify `/app/schedule` renders identically (9 SchedulePage tests still pass)
- [x] 6.7 Replace Step 1 content in `Onboarding.tsx` with the step header (`onboarding.schedule.title/subtitle`) followed by `<ScheduleEditor />`
- [x] 6.8 Remove the now-unused Step-1 imports/usages (`CalendarDays`, `ExternalLink`, `Link`, count-card markup)
- [x] 6.9 Confirm `ScheduleEditor` works for guests and authenticated users via the existing `useAuth`-derived `mode` (no prop wiring needed)
- [x] 6.10 Widen the onboarding content container from `max-w-3xl` to `max-w-5xl` so the embedded editor has the same width as `/app/schedule` and the block rows render identically (horizontal at the `lg` breakpoint instead of cramped/stacked)

## 7. Onboarding.tsx — Step 2: Embedded ActivityEditor (Decision 2)

History: this step was first built as a count card + link to `/app/activities` (tasks 7.1–7.4, done). Decision 2 was revised to embed the existing `ActivityEditor`; tasks 7.5–7.7 capture that end state. `ActivityEditor` already exists (the Activities page is a thin wrapper), so no extraction is required.

- [x] 7.1 Remove the `activities` state, `addActivityPreset`, `addCustomActivity`, `updateActivity`, `removeActivity` functions and all inline activity editor JSX
- [x] 7.2 Add `useActivities()` hook call at the top of the component to get live activity count
- [x] 7.3 ~~Replace Step 2 content with a count card + `/app/activities` link~~ — superseded by 7.5
- [x] 7.4 Remove `upsertLocalActivity` and the activity-insert loop from `finish()` for both guest and cloud paths
- [x] 7.5 Replace Step 2 content in `Onboarding.tsx` with the step header (`onboarding.activities.title/subtitle`) followed by `<ActivityEditor userId={user?.id ?? null} categories={…} activities={…} onChange={reloadActivities} />`, sourcing `categories`/`activities` from `useVisibleCategories()`/`useActivities()` as the Activities page does
- [x] 7.6 Decided editor-only (no `<PriorityRanker>` in onboarding) to keep the step focused; ranking stays on `/app/activities`
- [x] 7.7 Remove the now-unused Step-2 imports/usages (`Dumbbell`, count-card markup)

## 8. Onboarding.tsx — Step 3: Pre-populate preferences

- [x] 8.1 Add `useProfile()` hook call at the top of the component
- [x] 8.2 Change `peakStart`, `peakEnd`, `includeWeekends`, `reviewDay` initial state to read from `profile` when available, falling back to `"09:00"`, `"12:00"`, `true`, `0`
- [x] 8.3 Replace `useState` initialisers with `useMemo`/`useEffect` that sync from profile on first load (only set once, do not track profile changes live to avoid overwriting user edits mid-step)

## 9. Onboarding.tsx — Skip button

- [x] 9.1 Add a `skip` async function that sets `onboarding_skipped = true` in the profile (guest: `updateLocalProfile`; cloud: `supabase.from("profiles").update(...)`) then navigates to `/app`
- [x] 9.2 Add the Skip button to the navigation row (between Back and Continue/Finish), using `t("onboarding.skip")` as label and variant `ghost`
- [x] 9.3 Disable the Skip button while `saving` is true

## 10. Onboarding.tsx — finish() cleanup

- [x] 10.1 Verify `finish()` for guests only calls `updateLocalProfile` with preferences + `onboarding_completed: true` and navigates to `/app`
- [x] 10.2 Verify `finish()` for cloud only calls `supabase.from("profiles").update(...)` with preferences + `onboarding_completed: true` (no block/activity inserts)
- [x] 10.3 Remove now-unused imports: `BLOCK_PRESETS`, `ACTIVITY_PRESETS`, `upsertLocalBlock`, `upsertLocalActivity`

## 11. Tests

- [x] 11.1 Update `src/components/OnboardingGate.test.tsx`: add scenarios for `onboarding_skipped=true` (gate passes through) and both flags false (redirects)
- [x] 11.2 Write `src/pages/Onboarding.test.tsx` covering: skip sets flag + navigates; step 1 shows block count from mock `useScheduleBlocks`; step 3 pre-populates from mock profile; finish() writes only profile fields
- [x] 11.4 (Decision 2) Update `src/pages/Onboarding.test.tsx`: replaced the count-card/CTA-link assertions for steps 1 & 2 with stubbed `ScheduleEditor`/`ActivityEditor` and assertions that they render in-flow (and that the guest `userId` is passed); kept skip, step-3 pre-populate, and finish-writes-profile-only coverage
- [x] 11.5 (Decision 2) `src/pages/SchedulePage.test.tsx` still passes against the extracted `ScheduleEditor` (renders through the page); no separate editor test needed
- [x] 11.3 Run `npm run test` and verify all tests pass — 195/195 pass

## 12. Manual Verification

- [x] 12.1 Guest mode: open the app fresh, verify redirect to `/onboarding`; click Skip → lands on `/app`; refresh → stays on `/app` (not redirected again)
- [x] 12.2 Guest mode: complete all 3 steps → Finish → lands on `/app`; verify `freeslot.guest.profile` in localStorage has `onboarding_completed: true`
- [ ] 12.3 Authenticated mode: sign in with a fresh account → redirect to `/onboarding`; click Skip → lands on `/app`; reload → not redirected
- [x] 12.4 Step 1 count card: add a block on SchedulePage; navigate back to onboarding step 1 → count shows 1
- [x] 12.7 (Decision 2) Onboarding step 1 (guest, browser): embedded editor shows existing blocks (Work, Sleep) with day toggles + edit/duplicate/delete; preset chips and "Add block" button present; "Add block" opens the shared `ScheduleBlockDialog`. No console errors.
- [x] 12.8 (Decision 2) Onboarding step 2 (guest, browser): embedded `ActivityEditor` ("Goal stack") shows presets + add form in-flow.
- [x] 12.9 (Decision 2) `/app/schedule` still renders/behaves identically after extraction (9 page tests pass).
- [x] 12.5 Step 3 preferences: set custom peak hours on SettingsPage (if available) or via direct profile update; re-enter onboarding → step 3 shows the saved values
- [x] 12.6 Verify no duplicate blocks or activities appear in the Schedule/Activities pages after finishing onboarding

## 13. Documentation Update

- [x] 13.1 Update `docs/ARCHITECTURE.md` routing table to note `onboarding_skipped` as an alternative gate pass-through
- [x] 13.2 Update `docs/CLOUD.md` profiles table row to include `onboarding_skipped` column
- [x] 13.3 Update `docs/data-model.md` if it documents the `profiles` entity
