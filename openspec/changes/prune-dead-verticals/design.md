# Design: prune-dead-verticals

## Context

Post-redesign structural review found two fully orphaned verticals (inbox, weekly review), one half-dead AI context path (daily notes sent but discarded; inbox items read but uncreatable), a migration fidelity gap (`note_json`), and assorted dead exports. Owner decision: delete the inbox vertical; deletion of weekly-review follows the same logic (zero UI callers, deliberate product removal per ARCHITECTURE §"Dashboard Activity Trends").

## Goals / Non-Goals

**Goals:** working daily-notes → AI-plan path; zero dormant vertical code; migration carries `note_json`; CORS/payload hardening; green suite with tests updated only where they exercised deleted code.

**Non-Goals:** dropping DB tables (`inbox_items`, `weekly_reviews`, `profiles.weekly_review_day` stay — no destructive migrations in this change); rebuilding any removed UI; the deferred `LocalResourcesProvider`.

## Decisions

1. **Delete, don't deprecate**: git history is the archive; dormant code costs review attention and misleads AI tooling (this session repeatedly "discovered" dead features). Verticals are removed end-to-end in one change so no half-states remain.
2. **Daily notes wired with caps** (`MAX_NOTES = 14`, `MAX_NOTE_CHARS = 500`, structural array sanity caps for gaps/activities): the injection directive already exists in `planning.ts`; caps bound Gemini cost from authenticated abuse.
3. **`weekly_review_day` stays in `LocalProfile`/DB, leaves the UI**: the type mirrors the schema (which is untouched); only the Settings form field, its zod schema entry, save mapping, and i18n keys are removed.
4. **CORS via `ALLOWED_ORIGIN` env with `*` fallback**: zero-config local dev keeps working; production pins after setting one Supabase secret. Applied to the two remaining functions (`generate-weekly-plan`, `delete-account`).
5. **Tests touching deleted code are deleted/updated with the code** (e.g. `client.writes.test.ts` inbox/review blocks, `AIPlanPanel.test.tsx` inbox mocks, `weeklyReview.test.ts`, `celebrate.test.ts`, planning inbox/review test cases). All other tests must pass unmodified.
6. **Edge function folder deletion** stops future deploys of `weekly-review`; the already-deployed remote instance is deleted manually (`supabase functions delete weekly-review`) — documented, not automated, since CD has no delete step.

## Risks / Trade-offs

- [Guest inbox data already in localStorage/cloud becomes permanently unreachable] → it already is unreachable (no UI); accepted by owner.
- [Deleting `useOptimisticListMutation` loses a reusable helper] → recoverable from git; reintroduce when a second optimistic list exists.
- [Sonar coverage % may shift as low-coverage dead files disappear] → improvement, not regression.
- [`sonar-project.properties`/`vitest.config.ts` coverage lists may reference deleted files] → checked in the sweep task.

## Migration Plan

Phased tasks on `feature/prune-dead-verticals`; each phase gated by `tsc` + lint + unit suite; single `pnpm verify` (incl. guest E2E) before PR. Rollback = revert the PR; no data migrations involved.

## Open Questions

None — inbox deletion approved by owner (2026-07-06); weekly-review deletion follows the identical rationale and is called out in the proposal for PR review.
