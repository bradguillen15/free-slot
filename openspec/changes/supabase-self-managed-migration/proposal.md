## Why

FreeSlot's backend is currently provisioned and managed by Lovable Cloud, which hard-couples the project to a third-party platform (project `rlawgaoxtjabszgkkpwg`). The developer cannot manage secrets, billing, database access, or deploy edge functions independently. Migrating to a self-managed Supabase project restores full ownership.

## What Changes

- **Edge functions** (`generate-weekly-plan`, `weekly-review`): replace the Lovable AI Gateway (`https://ai.gateway.lovable.dev`) and `LOVABLE_API_KEY` with the Anthropic Messages API using `claude-haiku-4-5-20251001`.
- **`delete-account`**: no AI call — no AI change needed; only secret references confirmed to work on any Supabase project.
- **`supabase/config.toml`**: update `project_id` to a placeholder (`<YOUR_PROJECT_REF>`) so it no longer points to the Lovable project.
- **`.env.example`**: add a documented template of required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
- **`docs/CLOUD.md`**: rewrite to describe the self-managed setup, remove all Lovable-specific language, document secrets and CLI deploy steps.
- **`docs/MIGRATION_RUNBOOK.md`**: new file with the step-by-step process to bootstrap a fresh Supabase project for this codebase.

## Capabilities

### New Capabilities
- `supabase-migration`: Anthropic-backed edge functions + self-managed Supabase bootstrap runbook

### Modified Capabilities
- *(none — no existing OpenSpec specs are affected)*

## Impact

- `supabase/functions/generate-weekly-plan/index.ts` — replaces AI Gateway fetch with Anthropic SDK call
- `supabase/functions/weekly-review/index.ts` — replaces AI Gateway fetch with Anthropic SDK call
- `supabase/config.toml` — project_id placeholder
- `.env` / `.env.example` — env var documentation
- `docs/CLOUD.md` — full rewrite
- `docs/MIGRATION_RUNBOOK.md` — new file
- No React source files or tests are modified; `bun run test` must still pass
