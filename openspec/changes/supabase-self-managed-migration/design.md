## Context

FreeSlot's edge functions (`generate-weekly-plan`, `weekly-review`) currently call the Lovable AI Gateway at `https://ai.gateway.lovable.dev/v1/chat/completions` using an OpenAI-compatible request format with `LOVABLE_API_KEY`. Migrating to self-managed Supabase means this key and gateway will not be available.

The Anthropic Messages API is a direct replacement: it accepts a system prompt + user message and returns a text completion. The main structural difference is the request/response shape (Anthropic vs OpenAI format).

No React source files are affected. The `delete-account` function performs no AI calls and needs no logic changes.

## Goals / Non-Goals

**Goals**
- Replace the two AI-calling edge functions with Anthropic SDK calls
- Remove all references to Lovable Cloud from config and docs
- Provide a runbook so any developer can stand up the backend independently

**Non-Goals**
- Data migration from the Lovable Supabase project (user data stays in the old project; this is a code/config migration only)
- Changing AI model behavior or prompts (prompts stay identical, only the transport changes)
- Adding new features

## Decisions

### Use native `fetch` to Anthropic API, not the Deno SDK package

**Decision**: Call `https://api.anthropic.com/v1/messages` directly via `fetch` rather than importing `@anthropic-ai/sdk` via esm.sh.

**Rationale**: The Deno edge function environment at Supabase can have cold-start and import resolution issues with large SDK packages. A direct fetch call with typed request/response bodies has zero overhead, no version pinning risk, and is what the existing Lovable Gateway call already does (it was also a raw fetch). The Anthropic API surface we need is a single endpoint.

**Alternatives considered**: `import Anthropic from "https://esm.sh/@anthropic-ai/sdk"` — works but adds ~150 KB to the bundle and a third-party CDN dependency in the critical path.

### Keep the same prompt text

**Decision**: Preserve the existing `systemPrompt` and `userPrompt` strings verbatim. Only the transport layer (fetch URL, headers, request body shape, response parsing) changes.

**Rationale**: Avoids mixing a behavioral change with an infrastructure change. If the AI output quality needs tuning, that's a separate change.

### Request body shape: Anthropic Messages API

Anthropic's format differs from OpenAI's:

```ts
// Request
{
  model: "claude-haiku-4-5-20251001",
  max_tokens: 1024,
  system: systemPrompt,          // top-level, not in messages[]
  messages: [{ role: "user", content: userPrompt }]
}

// Response — text is at:
data.content[0].text
// vs OpenAI:
data.choices[0].message.content
```

Both functions will use this shape. The tool-use response (`generate-weekly-plan`) needs `tool_choice` and `tools` replaced with a JSON-in-text approach or Anthropic tool use — see Migration Plan below.

### generate-weekly-plan: switch from OpenAI tool_use to Anthropic tool_use

The current implementation uses `tool_choice: "required"` and parses `choices[0].message.tool_calls[0].function.arguments`. Anthropic supports native tool use with the same concept.

**Decision**: Use Anthropic tool use (`tools: [...]`, `tool_choice: { type: "tool", name: "..." }`). The response is at `content.find(b => b.type === "tool_use").input`.

This keeps structured JSON output without relying on fragile JSON-in-text parsing.

## Risks / Trade-offs

- **Cold start latency** — direct fetch is slightly faster than SDK import; no new risk introduced.
- **Anthropic rate limits** — `claude-haiku-4-5-20251001` is the cheapest/fastest model; risk is low for personal use.
- **Response parsing** — if Anthropic changes its response shape, parsing will break silently. Mitigation: defensive parsing with fallback error messages (already done in existing code).

## Migration Plan

1. Update `generate-weekly-plan/index.ts` — replace Gateway fetch with Anthropic tool-use call.
2. Update `weekly-review/index.ts` — replace Gateway fetch with Anthropic messages call.
3. Update `supabase/config.toml` — project_id placeholder.
4. Create `.env.example` at project root.
5. Rewrite `docs/CLOUD.md`.
6. Create `docs/MIGRATION_RUNBOOK.md`.
7. Run `bun run build` and `bun run test` — verify 0 regressions.

**Rollback**: The only changed files in `src/` are none (edge functions live in `supabase/functions/`, outside the React build). Rolling back is a git revert of the edge function files + re-deploying the old functions.

## Open Questions

- *(none — all decisions resolved above)*
