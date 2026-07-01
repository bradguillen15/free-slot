## MODIFIED Requirements

### Requirement: Edge functions use Gemini API instead of Anthropic API

The `generate-weekly-plan` and `weekly-review` edge functions SHALL call the Google Gemini `generateContent` REST API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`) using model `gemini-2.5-flash`. They MUST NOT reference `ANTHROPIC_API_KEY`, `https://api.anthropic.com`, or Anthropic model IDs.

The `delete-account` function has no AI call and SHALL require no AI-related changes.

#### Scenario: generate-weekly-plan calls Gemini with function calling

- **WHEN** the function is invoked with valid JWT and body
- **THEN** it reads `GEMINI_API_KEY` from `Deno.env`
- **AND** POSTs to the Gemini `generateContent` endpoint with `propose_plan` function declarations and forced function calling
- **AND** returns the same JSON shape as before (`{ plan: {...}, summary: "..." }`)

#### Scenario: weekly-review calls Gemini for text

- **WHEN** the function is invoked with valid JWT and body
- **THEN** it reads `GEMINI_API_KEY` from `Deno.env`
- **AND** POSTs to the Gemini `generateContent` endpoint with `systemInstruction` and a user message
- **AND** returns `{ review: { insights: "<string>", ... } }`

#### Scenario: missing GEMINI_API_KEY

- **WHEN** `GEMINI_API_KEY` is not set
- **THEN** the function returns HTTP 500 with `{ error: "AI not configured" }`

---

### Requirement: docs/CLOUD.md describes self-managed Supabase

`docs/CLOUD.md` SHALL describe the self-managed Supabase setup. It MUST NOT reference "Lovable Cloud", "Lovable AI Gateway", or `LOVABLE_API_KEY`. It SHALL document the correct secrets list and CLI commands for deploying edge functions.

#### Scenario: developer reads CLOUD.md to understand the backend

- **WHEN** a developer reads `docs/CLOUD.md`
- **THEN** they find accurate connection instructions, schema overview, RLS description, edge function list, and secrets list (including `GEMINI_API_KEY`)
- **AND** find no references to Lovable Cloud, Anthropic API, or `ANTHROPIC_API_KEY`

---

### Requirement: docs/MIGRATION_RUNBOOK.md provides a bootstrap guide

A `docs/MIGRATION_RUNBOOK.md` file SHALL document the complete step-by-step process to set up a new Supabase project for this codebase, from project creation to first deploy.

#### Scenario: developer bootstraps a fresh Supabase project

- **WHEN** a developer follows `docs/MIGRATION_RUNBOOK.md`
- **THEN** they can create a Supabase project, link the CLI, push migrations, configure Auth, set secrets (including `GEMINI_API_KEY`), and deploy edge functions without needing to ask anyone

## REMOVED Requirements

### Requirement: Edge functions use Anthropic API instead of Lovable AI Gateway

**Reason**: Superseded by Gemini API requirement above; Anthropic is no longer the AI provider.
**Migration**: Replace `ANTHROPIC_API_KEY` Supabase secret with `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey); redeploy edge functions.
