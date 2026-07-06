# ai-plan-context Specification (delta)

## ADDED Requirements

### Requirement: Daily notes influence the generated weekly plan

The `generate-weekly-plan` edge function SHALL read `daily_notes` from the request body and pass them to the prompt builder, so notes the user wrote during the week inform slot placement. Notes SHALL be size-capped server-side (per-note text truncation and a max note count) before entering the prompt.

#### Scenario: Notes reach the prompt

- **WHEN** the client sends `daily_notes: [{ date, text }, ...]` with the plan request
- **THEN** the Gemini prompt contains the notes block built by `buildPlanPrompts`
- **AND** each note's text is truncated to the configured cap and at most the configured number of notes is included

#### Scenario: Oversized payloads are bounded

- **WHEN** a request arrives with more notes, gaps, or activities than the configured caps
- **THEN** the function truncates (notes) or rejects with 400 (structural arrays beyond sanity limits) instead of forwarding an unbounded prompt

### Requirement: Plan generation has no inbox input

The plan request/response contract SHALL NOT include `inbox_items`; neither the client payload, the `ResourcesProvider.functions.generateWeeklyPlan` signature, nor `buildPlanPrompts` reference inbox items.

#### Scenario: No inbox references remain

- **WHEN** the repo is searched for `inbox_items`/`inboxItems` in non-test source
- **THEN** there are no matches outside generated Supabase types (`src/integrations/supabase/types.ts`)

### Requirement: Edge functions restrict CORS to app origins

Edge functions SHALL send an `Access-Control-Allow-Origin` derived from an `ALLOWED_ORIGIN` environment value, falling back to `*` only when it is unset (local development).

#### Scenario: Production origin is pinned

- **WHEN** `ALLOWED_ORIGIN` is set in Supabase secrets
- **THEN** responses carry that origin instead of `*`
