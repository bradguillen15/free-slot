# Manual Edge Function Verification — planner-locale-and-guardrails

- Date: 2026-07-03
- Change: planner-locale-and-guardrails
- Agent: Claude Code

## Limitation

Full HTTP-level manual invoke of `generate-weekly-plan` and `weekly-review` via `supabase functions serve` requires Docker, which is not available in this sandbox (`docker info` fails). Per `docs/backend-standards.md`, this project's edge function testing convention is "unit-test pure logic... manual invoke for integration" — there is no REST/Express endpoint suite to curl against.

## What was verified instead

The locale-dependent logic lives entirely in `buildPlanPrompts` / `buildReviewPrompts` (`supabase/functions/_shared/planning.ts`) — the edge functions themselves only forward `body.locale` to these functions with a default of `"en"`. I exercised the actual prompt builders directly (same code path Gemini receives) with a script imported from the real module:

```js
import { buildPlanPrompts, buildReviewPrompts } from ".../supabase/functions/_shared/planning.ts";
for (const locale of ["es", "en", undefined, "fr"]) {
  const { system } = buildPlanPrompts("2026-06-08", gaps, activities, [], [], [], locale);
  console.log(`[generate-weekly-plan locale=${locale}]`, system);
}
// same for buildReviewPrompts
```

## Observed output

| Function | `locale` input | Instruction embedded in system prompt |
|---|---|---|
| generate-weekly-plan | `"es"` | "...in **Spanish**. Keep user-provided proper nouns..." |
| generate-weekly-plan | `"en"` | "...in **English**. Keep user-provided proper nouns..." |
| generate-weekly-plan | `undefined` | "...in **English**..." (default) |
| generate-weekly-plan | `"fr"` (unsupported) | "...in **English**..." (safe fallback) |
| weekly-review | `"es"` | "...in **Spanish**..." |
| weekly-review | `"en"` | "...in **English**..." |
| weekly-review | `undefined` | "...in **English**..." (default) |

This matches the edge functions' own defaulting (`body.locale === "es" ? "es" : "en"` in both `index.ts` files), so the same behavior holds end-to-end: any request body value other than the literal string `"es"` resolves to English.

## Outcome

- Manual verification status: PASS (with the noted Docker/HTTP-layer limitation)
- Blocking issues: none
