## Context

`eslint.config.js` currently restricts `@/integrations/supabase/client` for `src/pages/**` and
`src/components/**` (ignoring `Auth.tsx`), but a second config block turns the rule **off** for a list
of straggler files (DashboardPage, SettingsPage, Onboarding, OnboardingGate, WeeklyReviewModal,
AIPlanPanel, PriorityRanker). After Phases 2–4 remove those files' supabase usage, the override list is
obsolete and the matrix can be locked. Several docs still describe the older `dataFetchers`/inline-
supabase guidance.

## Goals / Non-Goals

**Goals:**
- Lock the import matrix in ESLint with no override list; auth + `_providers/supabase` excepted.
- Update all standards docs to the resources-layer pattern; retire stale guidance.
- Make this the completion gate for the resources-layer plan.

**Non-Goals:**
- Any code behavior change (prior phases moved the I/O).
- Touching edge-function server code.

## Decisions

- **Single `no-restricted-imports` policy** allowing the client only in
  `src/resources/_providers/supabase/**` and `src/integrations/**`, plus the auth files (`AuthContext`,
  `Auth.tsx`) and test files. Delete the override block. Comment cites `resources-layer-plan.md`.
- **Sequence Phase 5 last.** It must run after Phases 2–4 (this change depends on them); otherwise lint
  would fail on still-present straggler imports.
- **Doc sweep follows the plan §7 table verbatim** so each doc gets the specific edits listed
  (ARCHITECTURE diagram + checklist, frontend Data Access rules, backend parity/edge-function rules,
  conventions, development guide, CLOUD, react-query plan banner, README tree, resources README).
- **Audit with ripgrep** the retired phrases and confirm `rg "dataFetchers" docs/` only hits migration
  plans.

## Risks / Trade-offs

- [A missed straggler breaks the build when the override is removed] → Run `bun run lint` as the gate;
  fix or, if a legitimate new exception, document it explicitly (not via a broad override).
- [Docs drift again later] → The ESLint rule is the durable enforcement; docs point to this plan as the
  authority.

## Migration Plan

Config + docs only; ships with code. Rollback = revert. No DB/API/behavior change. Gate = `bun run lint`
clean with the matrix enforced and the doc audit passing.

## Open Questions

None.
