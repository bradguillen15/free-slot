## 0. Setup

- [x] 0.1 Confirm work happens on the shared feature branch `feature/user-feedback-fixes` (created once for all three feedback changes per user instruction — not a new branch per change)

## 1. Shared prompt builders: locale support (TDD)

- [x] 1.1 Add failing unit tests in `supabase/functions/_shared/planning.test.ts` (or equivalent Vitest file) for `buildPlanPrompts` and `buildReviewPrompts` accepting a `locale: "en" | "es"` parameter and embedding a language instruction in the system prompt
- [x] 1.2 Add a test for unknown/missing locale defaulting to English instruction text
- [x] 1.3 Implement the `locale` parameter on `buildPlanPrompts` and `buildReviewPrompts` in `supabase/functions/_shared/planning.ts`, appending the language instruction to the system prompt
- [x] 1.4 Run the new/updated tests and confirm green

## 2. Edge functions: thread locale from request body

- [x] 2.1 Update `supabase/functions/generate-weekly-plan/index.ts` to read `body.locale`, default to `"en"` for missing/unsupported values, and pass it to `buildPlanPrompts`
- [x] 2.2 Update `supabase/functions/weekly-review/index.ts` to read `body.locale`, default to `"en"`, and pass it to `buildReviewPrompts`
- [x] 2.3 Update `docs/api-spec.yml` to document the new optional `locale` field on both request bodies

## 3. Frontend: send locale with AI requests

- [x] 3.1 Update the `generateWeeklyPlan` and `generateWeeklyReview` call sites (`src/components/week/AIPlanPanel.tsx`, `src/components/dashboard/WeeklyReviewModal/useWeeklyReviewData.ts`) to include `locale: i18n.language` in the request body
- [x] 3.2 Add `locale?: "en" | "es"` to the `generateWeeklyPlan`/`generateWeeklyReview` contract in `src/resources/_providers/types.ts`. `client.test.ts`/`dataStore.test.ts` pass opaque `body` objects through unchanged (locale is optional, no assertion needed there); real caller behavior is covered by the new `AIPlanPanel.test.tsx` instead, which asserts `locale: "en"` is sent
- [x] 3.3 Run `pnpm test` for the touched frontend files and confirm green

## 4. Root-cause fix: real activity targets reach the planner

- [x] 4.1 Add a failing test asserting `AIPlanPanel`'s `generate()` sends each activity's actual `target_hours_per_week` (not a hardcoded `0`) in the request body
- [x] 4.2 Widen the `ActivityLite` type in `src/components/week/AIPlanPanel.tsx` to include `target_hours_per_week: number` and `is_active: boolean`
- [x] 4.3 Replace the hardcoded `target_hours_per_week: 0` / `is_active: true` in `generate()` with the real values from each activity
- [x] 4.4 Run the test from 4.1 and confirm it passes; run the full `AIPlanPanel` test file to confirm no regressions

## 5. Zero-target guard (TDD)

- [x] 5.1 Add failing tests for a new guard in `AIPlanPanel.generate()`: when every active activity has `target_hours_per_week <= 0`, no mutation is called and a localized toast with a CTA to `/app/activities` is shown instead
- [x] 5.2 Add a test confirming generation proceeds normally when at least one activity has a positive target (including a mix of zero and positive targets)
- [x] 5.3 Implement the guard in `generate()`, placed alongside the existing `activities.length === 0` and `gaps.length === 0` checks
- [x] 5.4 Add `aiPanel.allTargetsZeroTitle` / `aiPanel.allTargetsZeroDesc` (with a CTA label) to `src/i18n/locales/en.ts` and `es.ts`, keeping TS-enforced parity
- [x] 5.5 Wire the CTA to navigate to `/app/activities` (consistent with the existing `week.addActivitiesCta` pattern in `WeekPage.tsx`)
- [x] 5.6 Run the tests from 5.1–5.2 and confirm green

## 6. Review and update existing unit tests (MANDATORY)

- [x] 6.1 Review `src/resources/_providers/supabase/client.test.ts`, `src/lib/dataStore.test.ts`, and any `AIPlanPanel` test file for assumptions broken by the `locale` field or the `ActivityLite` change, and update them (no changes needed — both files pass opaque bodies through; new coverage lives in `AIPlanPanel.test.tsx`)
- [x] 6.2 Run `pnpm test` for the full touched area (`src/components/week`, `src/resources/_providers/supabase`, `src/lib/dataStore.test.ts`, `supabase/functions/_shared`) and confirm all green — 146/146 passed

## 7. Manual verification of edge function behavior

- [x] 7.1 Manually invoke `generate-weekly-plan` and `weekly-review` locally (via `supabase functions serve` or equivalent) with `locale: "es"` and `locale` omitted, and confirm the prompt text sent to Gemini matches the expected language instruction — Docker unavailable in this environment for the full HTTP layer (per `docs/backend-standards.md`'s "manual invoke for integration" convention, no curl/Express-style endpoint suite applies here); verified instead by directly exercising the actual `buildPlanPrompts`/`buildReviewPrompts` functions with `es`/`en`/omitted/unsupported locale values
- [x] 7.2 Document the manual invoke commands and observed prompt output in `openspec/changes/planner-locale-and-guardrails/reports/2026-07-03-manual-edge-function-verification.md`

## 8. Documentation

- [x] 8.1 Update `docs/api-spec.yml` (if not already done in 2.3) to reflect the final request/response contract
- [x] 8.2 Note the `ActivityLite` shape change and locale threading in `docs/data-model.md` or `docs/ARCHITECTURE.md` if either documents the AI planner data flow — updated `docs/ARCHITECTURE.md` §6

## 9. Final verification

- [x] 9.1 Update `e2e/*.e2e.ts` if any guest-visible flow changed (the AI planner is account-only; confirmed no guest E2E fixtures reference it — no changes needed)
- [x] 9.2 Run `pnpm verify` once for this change and confirm it passes — lint ✓, typecheck ✓, unit tests 525/525 ✓, guest E2E 49/49 ✓
- [x] 9.3 Fix any failures before considering the change ready to archive — no failures encountered
