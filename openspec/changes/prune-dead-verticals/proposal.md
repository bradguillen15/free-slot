# Proposal: prune-dead-verticals

## Why

The dashboard redesign (PR #20) removed the inbox and weekly-review UIs but left their full verticals behind: data-layer hooks with zero callers, resources methods, an edge function, prompt builders, a Settings preference that configures nothing, and an AI-payload path where the client sends `daily_notes`/`inbox_items` that `generate-weekly-plan` silently discards. A structural review (2026-07-06) also found the guest→cloud migration drops rich-text log notes (`note_json`) and several dead exports. Dormant code is maintenance cost and review noise; the one genuinely alive-but-broken path (daily notes → AI plan) should work.

## What Changes

- **Fix AI plan context**: `generate-weekly-plan` reads `body.daily_notes` (size-capped) and feeds them to `buildPlanPrompts` — the client already sends them and the prompt layer already supports them. `inbox_items` support is removed end-to-end instead (see below).
- **Delete the inbox vertical** (no UI can create items since the redesign): dataStore hooks (`useInboxItems`, `useAddInboxItem`, `useArchiveInboxItem`, and the now-single-use `useOptimisticListMutation` helper), `queryKeys.inboxItems`, localStore inbox functions/types, `resources.inboxItems` + provider/mappers/mock entries, migration step 8, e2e fixture support, `AIPlanPanel` payload usage, and `inboxItems` support in `_shared/planning.ts`. **BREAKING** for stored guest inbox data (orphaned, never shown). The `inbox_items` DB table is kept (no destructive migration); dropping it is deferred.
- **Delete the weekly-review vertical** (no UI since the redesign): dataStore hooks, `queryKeys.weeklyReview`, `resources.weeklyReviews` + `functions.generateWeeklyReview` + provider/mappers/types, `src/lib/weeklyReview.ts`, the `weekly-review` edge function, `buildReviewPrompts`/`buildReviewGeminiBody` in `_shared`, and the Settings "weekly review day" preference row (+ i18n keys). The `weekly_reviews` table and `profiles.weekly_review_day` column are kept (no destructive migration).
- **Migration fidelity**: `migrateGuest.ts` carries `note_json` on time logs so rich notes survive signup.
- **Dead-export sweep**: delete orphaned `src/lib/celebrate.ts` (+ test); delete unused exports `useMode`, `getResourcesProvider`, `segmentsForDay`, `edgeFunctionErrorMessage`; make same-file-only helpers non-exported (`monthKey`, `listAllLogs`, `listAllPriorities`, `defaultQueryClientOptions`, timeline/WeekGrid constants) where tests do not import them.
- **Edge hardening**: pin CORS `Access-Control-Allow-Origin` to the app origins (env-configurable with `*` fallback for local dev) and cap AI payload sizes in `generate-weekly-plan`.
- **Hygiene**: archive stale/completed OpenSpec changes (`dashboard-schedule-vs-actual` — superseded, never shipped; plus completed ones); document the "fake timers when the subject branches on `todayISO()`" test rule.

## Capabilities

### New Capabilities

- `ai-plan-context`: what context the AI weekly-plan generation consumes (daily notes, size caps) and the edge-function hardening requirements.

### Modified Capabilities

- `resources-layer`: REMOVE the weekly-review requirements ("Weekly-review reads and generation go through the resources layer", "Weekly-review aggregation is a pure function"); ADD a migration-fidelity requirement (rich log notes survive migration).

## Impact

- **Code**: `src/lib/{dataStore,localStore,queryKeys,migrateGuest,weeklyReview,celebrate}.ts`, `src/resources/**`, `src/components/week/AIPlanPanel.tsx`, `src/pages/SettingsPage.tsx`, `src/i18n/locales/{en,es}.ts`, `supabase/functions/{weekly-review,generate-weekly-plan}/`, `supabase/functions/_shared/{planning,gemini}.ts`, `e2e/fixtures/guest.ts`, tests of all the above.
- **User-visible**: the Settings "weekly review day" row disappears (it configured a removed feature). Nothing else.
- **DB/API**: no schema changes; `weekly-review` edge function stops being deployed (remote instance can be deleted manually later).
- **Docs**: ARCHITECTURE/data-model/api-spec references to weekly reviews and inbox updated.
