# Step 7 Report - Manual Endpoint Testing

- Date: 2026-06-30
- Change: migrate-anthropic-to-gemini
- Agent: Auto

## Commands Executed

### Gemini API — missing API key (HTTP 403)

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"hi"}]}]}'
```

**Result:** `403` — confirms endpoint URL and request shape are valid; API rejects unauthenticated calls.

### Edge function — missing `GEMINI_API_KEY`

**Behavior (code review):** Both `generate-weekly-plan/index.ts` and `weekly-review/index.ts` return HTTP 500 with `{ error: "AI not configured" }` when `Deno.env.get("GEMINI_API_KEY")` is falsy.

**Live curl against deployed functions:** Skipped — no Supabase JWT or deployed function URL in this environment. Smoke test after deploy: set `GEMINI_API_KEY` via `supabase secrets set`, redeploy functions, then use Week view → Generate Plan and Dashboard → Weekly Review.

## GEMINI_API_KEY smoke test

**Status:** Skipped — `GEMINI_API_KEY` not available in agent environment. User must set key in Supabase secrets and verify in app per `docs/MIGRATION_RUNBOOK.md` Step 10.
