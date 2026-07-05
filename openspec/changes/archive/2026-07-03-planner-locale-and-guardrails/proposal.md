# Proposal: planner-locale-and-guardrails

## Why

User testing (2026-07-01) surfaced two failures in the AI planner that read as "the app is broken": AI-generated content (plan rationales, weekly review) always comes back in English even when the UI language is Spanish, and the planner runs even when every active activity has a 0-hour weekly target — producing an empty plan with a confusing, untranslated explanation ("No activities were scheduled as the target for Exercise was 0 hours per week").

## What Changes

- The client passes the user's current UI locale (`en` | `es` from i18next) in the request body of the `generate-weekly-plan` and `weekly-review` edge function invocations.
- Both edge functions thread the locale into the Gemini prompt (`_shared/planning.ts` and the weekly-review prompt) with an explicit instruction to write all user-facing text (rationales, review prose) in that language. Missing/unknown locale falls back to English.
- Client-side pre-flight guard: when the user requests an AI plan and **all** active activities have a 0-hour weekly target, the edge function is not called. Instead a localized explanation is shown with a direct call-to-action to set targets (link/navigation to the Activities page).
- Activities with a 0-hour target among others with positive targets remain allowed (the planner simply won't schedule them); the guard only triggers when no activity has a positive target.
- **Root cause fix**: `AIPlanPanel.generate()` currently hardcodes `target_hours_per_week: 0` for every activity in the request payload (`src/components/week/AIPlanPanel.tsx:122`), and its local `ActivityLite` type omits the field entirely — so the edge function has never received real targets. This is why JR's "Exercise" activity was reported as 0h despite presumably having a configured target. `ActivityLite` gains `target_hours_per_week`/`is_active`, and the real value is threaded through instead of the literal `0`.

## Capabilities

### New Capabilities
- `ai-output-localization`: AI-generated user-facing content (weekly plan rationales, weekly review) is produced in the user's UI language, with English fallback.
- `planner-zero-target-guard`: Plan generation is blocked client-side with localized guidance when no active activity has a positive weekly hour target.

### Modified Capabilities
<!-- none — no existing spec covers the AI planner behaviors -->

## Impact

- **Edge functions**: `supabase/functions/generate-weekly-plan`, `supabase/functions/weekly-review`, `supabase/functions/_shared/planning.ts` (prompt builder gains locale parameter).
- **Frontend**: AI planner invocation path in `src/resources/_providers/supabase/client.ts` (request bodies gain `locale`); Week view AI planner panel gains the pre-flight guard UI; new i18n strings in `src/i18n/locales/en.ts` and `es.ts` (TS-enforced parity).
- **API contract**: `docs/api-spec.yml` — request body of both functions gains an optional `locale` field (backward compatible).
- **Tests**: unit tests for prompt locale threading and the guard predicate; existing `client.test.ts` invoke tests updated for the new body field.
- Cloud-only feature (AI requires an account), so no guest-mode surface — but the guard strings still require en/es parity.
