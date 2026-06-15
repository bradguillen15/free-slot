# supabase-migration Specification

## Purpose
TBD - created by archiving change supabase-self-managed-migration. Update Purpose after archive.
## Requirements
### Requirement: Edge functions use Anthropic API instead of Lovable AI Gateway

The `generate-weekly-plan` and `weekly-review` edge functions SHALL call the Anthropic Messages API (`https://api.anthropic.com/v1/messages`) using the `claude-haiku-4-5-20251001` model. They MUST NOT reference `LOVABLE_API_KEY` or `ai.gateway.lovable.dev`.

The `delete-account` function has no AI call and SHALL require no AI-related changes.

#### Scenario: generate-weekly-plan calls Anthropic

- **WHEN** the function is invoked with valid JWT and body
- **THEN** it reads `ANTHROPIC_API_KEY` from `Deno.env`
- **AND** POSTs to `https://api.anthropic.com/v1/messages` with `model: "claude-haiku-4-5-20251001"`
- **AND** returns the same JSON shape as before (`{ slots: [...] }`)

#### Scenario: weekly-review calls Anthropic

- **WHEN** the function is invoked with valid JWT and body
- **THEN** it reads `ANTHROPIC_API_KEY` from `Deno.env`
- **AND** POSTs to `https://api.anthropic.com/v1/messages` with `model: "claude-haiku-4-5-20251001"`
- **AND** returns `{ insights: "<string>" }`

#### Scenario: missing ANTHROPIC_API_KEY

- **WHEN** `ANTHROPIC_API_KEY` is not set
- **THEN** the function returns HTTP 500 with `{ error: "AI not configured" }`

---

### Requirement: supabase/config.toml uses a placeholder project_id

`supabase/config.toml` SHALL set `project_id = "<YOUR_PROJECT_REF>"` so new contributors are not silently pointed at the old Lovable project.

#### Scenario: config.toml does not reference the Lovable project ID

- **WHEN** a developer opens `supabase/config.toml`
- **THEN** `project_id` equals `"<YOUR_PROJECT_REF>"` (a placeholder string, not a live project ref)

---

### Requirement: .env.example documents all required variables

A `.env.example` file SHALL exist at the project root and list all required environment variables with placeholder values and inline comments.

#### Scenario: new developer sets up the project

- **WHEN** a developer clones the repo and reads `.env.example`
- **THEN** they see `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` with placeholder values and short descriptions

---

### Requirement: docs/CLOUD.md describes self-managed Supabase

`docs/CLOUD.md` SHALL describe the self-managed Supabase setup. It MUST NOT reference "Lovable Cloud", "Lovable AI Gateway", or `LOVABLE_API_KEY`. It SHALL document the correct secrets list and CLI commands for deploying edge functions.

#### Scenario: developer reads CLOUD.md to understand the backend

- **WHEN** a developer reads `docs/CLOUD.md`
- **THEN** they find accurate connection instructions, schema overview, RLS description, edge function list, and secrets list (including `ANTHROPIC_API_KEY`)
- **AND** find no references to Lovable Cloud or its managed services

---

### Requirement: docs/MIGRATION_RUNBOOK.md provides a bootstrap guide

A `docs/MIGRATION_RUNBOOK.md` file SHALL document the complete step-by-step process to set up a new Supabase project for this codebase, from project creation to first deploy.

#### Scenario: developer bootstraps a fresh Supabase project

- **WHEN** a developer follows `docs/MIGRATION_RUNBOOK.md`
- **THEN** they can create a Supabase project, link the CLI, push migrations, configure Auth, set secrets, and deploy edge functions without needing to ask anyone

---

### Requirement: application compiles and tests pass after changes

After all changes, `bun run build` SHALL succeed and `bun run test` SHALL pass with no regressions.

#### Scenario: CI verification

- **WHEN** `bun run build` and `bun run test` are run after all changes
- **THEN** both exit with code 0

