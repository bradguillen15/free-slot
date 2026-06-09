## 1. Edge function: generate-weekly-plan

- [x] 1.1 Replace `LOVABLE_API_KEY` guard with `ANTHROPIC_API_KEY` guard in `supabase/functions/generate-weekly-plan/index.ts`
- [x] 1.2 Replace the Lovable Gateway fetch with an Anthropic tool-use call (`POST https://api.anthropic.com/v1/messages`, model `claude-haiku-4-5-20251001`, using `tools` + `tool_choice`)
- [x] 1.3 Update response parsing from `choices[0].message.tool_calls[0].function.arguments` to `content.find(b => b.type === "tool_use").input`
- [x] 1.4 Remove 402-credits error branch (Lovable-specific); keep 429 and generic 500

## 2. Edge function: weekly-review

- [x] 2.1 Replace `LOVABLE_API_KEY` guard with `ANTHROPIC_API_KEY` guard in `supabase/functions/weekly-review/index.ts`
- [x] 2.2 Replace the Lovable Gateway fetch with an Anthropic messages call (`POST https://api.anthropic.com/v1/messages`, model `claude-haiku-4-5-20251001`, `system` at top level, single user message)
- [x] 2.3 Update response parsing from `choices[0].message.content` to `content[0].text`
- [x] 2.4 Remove 402-credits error branch; keep 429 and generic 500

## 3. Config and environment

- [x] 3.1 Update `supabase/config.toml`: set `project_id = "<YOUR_PROJECT_REF>"`
- [x] 3.2 Create `.env.example` at the project root with documented placeholder values for `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

## 4. Documentation

- [x] 4.1 Rewrite `docs/CLOUD.md`: remove all Lovable Cloud / Lovable AI Gateway references; document self-managed setup, correct secrets list (replace `LOVABLE_API_KEY` with `ANTHROPIC_API_KEY`), and Supabase CLI deploy commands
- [x] 4.2 Create `docs/MIGRATION_RUNBOOK.md` with step-by-step instructions: create Supabase project → link CLI → push migrations → configure Auth (email confirm, Google OAuth redirect URLs) → set secrets → deploy edge functions → update `.env`

## 5. Verification

- [x] 5.1 Run `bun run build` — must exit 0
- [x] 5.2 Run `bun run test` — must exit 0 with no regressions
- [x] 5.3 Grep for `LOVABLE_API_KEY` and `lovable.dev` across the repo — must return no results in `supabase/functions/` or `docs/`
