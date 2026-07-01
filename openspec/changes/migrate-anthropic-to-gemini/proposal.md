## Why

FreeSlot's AI edge functions currently call the Anthropic Messages API, which requires a paid API key and bills per token. Google Gemini offers a generous free tier (~1,500 requests/day on Flash models), which is a better fit for a personal side project while preserving the same planner and weekly-review features.

## What Changes

- Replace Anthropic API calls in `generate-weekly-plan` and `weekly-review` with the Gemini `generateContent` REST API.
- Swap the Supabase secret from `ANTHROPIC_API_KEY` to `GEMINI_API_KEY`.
- Use model `gemini-2.5-flash` (fast, cost-efficient, free-tier eligible).
- Add a shared `_shared/gemini.ts` helper for fetch, auth header, and response parsing.
- Update all docs, runbook, and API spec references from Anthropic to Gemini.
- **BREAKING (ops)**: Deployments must set `GEMINI_API_KEY` and may remove `ANTHROPIC_API_KEY`. No frontend or client contract changes.

## Capabilities

### New Capabilities

_None — this is a provider swap under the existing backend capability._

### Modified Capabilities

- `supabase-migration`: Edge-function AI provider requirement changes from Anthropic Messages API to Gemini `generateContent` API; secret name changes from `ANTHROPIC_API_KEY` to `GEMINI_API_KEY`.

## Impact

- `supabase/functions/generate-weekly-plan/index.ts`
- `supabase/functions/weekly-review/index.ts`
- `supabase/functions/_shared/gemini.ts` (new)
- `docs/CLOUD.md`, `docs/MIGRATION_RUNBOOK.md`, `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, `docs/backend-standards.md`, `docs/api-spec.yml`, `README.md`
- `.coderabbit.yaml`
- No React source changes; edge function request/response shapes unchanged for the client.
