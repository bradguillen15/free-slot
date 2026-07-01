## Context

The `generate-weekly-plan` and `weekly-review` Supabase edge functions call Anthropic's Messages API via raw `fetch`, using `ANTHROPIC_API_KEY` as a Supabase secret. Prompt text lives in `_shared/planning.ts` and stays provider-agnostic. The frontend invokes edge functions through `supabase.functions.invoke` — it never touches the AI provider directly.

## Goals / Non-Goals

**Goals:**
- Swap the AI transport layer to Google Gemini `generateContent` REST API.
- Use `gemini-2.5-flash` for both functions (free-tier eligible, fast, sufficient for structured planning and short reflections).
- Centralize Gemini URL, headers, and response parsing in `_shared/gemini.ts`.
- Keep prompt strings, validation (`validateSlots`), DB upserts, and client JSON shapes identical.
- Update documentation and secrets guidance.

**Non-Goals:**
- Changing prompts, UI, or guest/cloud data flows.
- Migrating `delete-account` (no AI).
- Adding a Gemini SDK package to Deno edge functions.

## Decisions

### Use native `fetch` to Gemini REST API, not `@google/genai` SDK

**Decision**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` with header `x-goog-api-key`.

**Rationale**: Same pattern as the current Anthropic integration — zero SDK cold-start cost, no esm.sh pinning risk.

**Alternatives considered**: `@google/genai` via esm.sh — heavier bundle, unnecessary for two endpoints.

### Model: `gemini-2.5-flash`

**Decision**: Single model constant in `_shared/gemini.ts`.

**Rationale**: Eligible for Gemini API free tier, fast enough for planning workloads. `gemini-2.0-flash` was retired June 2026.

**Alternatives considered**: `gemini-3.5-flash` — newer long-term replacement; can adopt when 2.5 is deprecated.

### generate-weekly-plan: Gemini function calling (not JSON-in-text)

**Decision**: Declare `propose_plan` via `tools.functionDeclarations` and force call with:

```json
"toolConfig": {
  "functionCallingConfig": {
    "mode": "ANY",
    "allowedFunctionNames": ["propose_plan"]
  }
}
```

Parse `candidates[0].content.parts[0].functionCall.args` (same semantic as Anthropic `tool_use.input`).

**Rationale**: Structured output without fragile JSON extraction; mirrors existing Anthropic tool-use flow.

**Alternatives considered**: `generationConfig.responseFormat` JSON schema — viable fallback if function calling proves flaky.

### weekly-review: plain text generation

**Decision**: `systemInstruction` + single user `contents` part; read `candidates[0].content.parts[0].text`.

**Rationale**: Direct equivalent of Anthropic messages text response.

### Secret rename: `GEMINI_API_KEY`

**Decision**: Read `GEMINI_API_KEY` from `Deno.env`. Missing key → `{ error: "AI not configured" }` HTTP 500 (unchanged UX).

**Rationale**: Clear naming; avoids accidentally using an Anthropic key against Gemini endpoints.

## Risks / Trade-offs

- **Gemini schema differences** — Gemini uses `OBJECT`/`STRING` uppercase types vs JSON Schema lowercase. → Define schemas in Gemini format in the shared helper.
- **Function-call reliability** — Model may occasionally return text instead of a function call. → Check `functionCall` presence; return `{ error: "No plan returned" }` (existing behavior).
- **Free-tier rate limits** — 429 possible at high volume. → Keep existing 429 handler.
- **Ops migration** — Deployments must set new secret before removing Anthropic key. → Document in runbook; set both during transition if desired.

## Migration Plan

1. Add `_shared/gemini.ts` + unit tests for parsers and schema builders.
2. Update `generate-weekly-plan/index.ts` and `weekly-review/index.ts`.
3. Update docs and `.coderabbit.yaml`.
4. Deploy: `supabase secrets set GEMINI_API_KEY=...` then `supabase functions deploy`.
5. Verify with `bun run test` and `pnpm verify`.
6. Optionally unset `ANTHROPIC_API_KEY` after smoke test.

## Open Questions

_None — provider swap is straightforward._
