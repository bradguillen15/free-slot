## Context

The AI planner (`generate-weekly-plan`) and weekly review (`weekly-review`) are Deno edge functions that call Gemini via shared prompt builders in `supabase/functions/_shared/planning.ts`. Prompts are always written in English with no locale awareness, while the frontend UI is fully bilingual (en/es, TS-enforced parity via `src/i18n/locales/*.ts`).

Investigation during design surfaced that the "0 hours" guard problem is actually two separate defects:
1. `src/components/week/AIPlanPanel.tsx` (`generate()`, line ~122) hardcodes `target_hours_per_week: 0` in the request body for every activity, and its local `ActivityLite` type doesn't carry the field. The real value lives on the activity object (`useActivities()` → `dataStore.ts`/`localStore.ts` both define `target_hours_per_week: number`) but is discarded by a type cast (`activities as ActivityLite[]`) before reaching `AIPlanPanel`.
2. There is no guard at all for the case where the payload's targets are genuinely all zero — the edge function silently returns an empty plan with an English-only explanation.

## Goals / Non-Goals

**Goals:**
- AI-generated user-facing text (plan rationales via `AISlot.rationale`, weekly review `insights`) matches the user's UI language (en/es), with English fallback for anything else.
- The real `target_hours_per_week` per activity reaches the edge function (fixing the root cause of the confusing message).
- When every active activity still has a genuine 0-hour target, plan generation is blocked client-side (no network call) with a localized message and a direct link to `/app/activities`.

**Non-Goals:**
- Server-side translation/localization framework beyond prompt instructions (no i18n library on the Deno side).
- Locales beyond `en`/`es`.
- Changing planning/ranking logic itself (`rankActivities`, `validateSlots`) beyond the data now being correct.

## Decisions

**1. Locale threading via request body field, not header.**
Add an optional `locale: "en" | "es"` field to the `generate-weekly-plan` and `weekly-review` request bodies, populated client-side from `i18n.language`. Alternative considered: an `Accept-Language` header — rejected because Supabase Functions invoke via the JS client doesn't make custom headers as convenient to set per-call as the existing `body` pattern already used by both call sites, and keeping it in the body keeps the contract in one place (`docs/api-spec.yml`) alongside the rest of the payload.

**2. Locale enforcement lives in the prompt, not post-processing.**
`buildPlanPrompts` and `buildReviewPrompts` in `_shared/planning.ts` gain a `locale` parameter and append an explicit instruction to the system prompt: e.g. "Write all user-facing text (rationale, review) in {Spanish|English}. Do not mix languages." Alternative considered: translating Gemini's English output with a second call or library — rejected as extra latency/cost for a problem the model can solve directly in one pass. Unknown/missing locale defaults to `"en"` at the edge-function boundary (not the client), so old cached clients or direct API calls degrade safely.

**3. Fix the activity payload at the source, not by re-deriving it in the edge function.**
`ActivityLite` (in `AIPlanPanel.tsx`) gains `target_hours_per_week: number` and `is_active: boolean`. `WeekPage.tsx` already filters to active activities and passes the full activity objects through a cast — the fix removes the lossy cast path by making `ActivityLite` a proper structural supertype of what's already available, and `generate()` maps `target_hours_per_week: a.target_hours_per_week` instead of the literal `0`. No backend change needed for this part; `_shared/planning.ts` already consumes `target_hours_per_week` correctly (`rankActivities`, prompt text) — it was only ever fed a wrong value.

**4. Zero-target guard is a pure client-side predicate, evaluated before the mutation fires.**
`generate()` in `AIPlanPanel.tsx` checks `activities.every(a => a.target_hours_per_week <= 0)` immediately after the existing `activities.length === 0` check (same pattern, same toast mechanism) and returns early with a new localized toast (`aiPanel.allTargetsZeroTitle` / `...Desc`) plus a CTA. Alternative considered: doing this check server-side in the edge function — rejected because it would still cost a round trip and the data needed (the activities list) is already client-side; server-side validation is unnecessary for a UX guard with no security implication (the edge function already handles an empty-activities/empty-plan response safely today).
The CTA is a `Link`/`navigate` to `/app/activities`, consistent with the existing `week.addActivitiesCta` pattern used for the zero-activities empty state a few lines above in `WeekPage.tsx`.

## Risks / Trade-offs

- **[Risk]** Gemini may not perfectly respect the language instruction for edge-case output (e.g. proper nouns, activity names already in English). → **Mitigation**: instruction explicitly allows keeping user-provided proper nouns (activity names, notes content) as-is; only generated prose (rationale, review paragraph) must match locale. Acceptable given this is guidance text, not a hard contract.
- **[Risk]** `ActivityLite` widening could mask future accidental omission of other fields if callers rely on structural typing loosely. → **Mitigation**: keep `ActivityLite` an explicit interface (not `Activity`) so it stays a deliberate, reviewed contract between `WeekPage` and `AIPlanPanel`.
- **[Trade-off]** Guard is evaluated on the already-active-filtered list; if a user has activities but all are inactive, the existing `activities.length === 0` empty state (`week.addActivitiesDesc`) fires first (activities array passed in is pre-filtered to active-only), which is acceptable — it already points them to `/app/activities`.

## Migration Plan

No data migration required. `locale` is an additive optional field on two edge function request bodies (backward compatible with any cached/older client — defaults to English). Deploy edge function changes and frontend together (same PR/commit) since the client change (adding `locale` to the body) and server change (reading it) are coupled by contract, though the server defaulting to `"en"` makes them independently deployable if needed.

## Open Questions

None outstanding — behaviors confirmed with the user before drafting: guard blocks + guides to Activities (not silent, not AI-decided).
