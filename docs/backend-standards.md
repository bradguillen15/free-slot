---
description: Backend standards for FreeSlot (plan-grow) — self-managed Supabase, Postgres, RLS, Deno edge functions
globs: ["supabase/**/*", "src/integrations/supabase/**/*", "src/lib/dataStore.ts", "src/lib/localStore.ts", "src/lib/migrateGuest.ts"]
alwaysApply: true
---

# Backend Standards — FreeSlot (plan-grow)

## Overview

FreeSlot's backend is a **self-managed Supabase project**: Postgres with RLS, Auth, and Deno edge functions. There is no separate Express/Node API server.

**Canonical references:** `docs/CLOUD.md`, `docs/ARCHITECTURE.md`, `docs/data-model.md`, `docs/api-spec.yml`

## Technology Stack

| Layer | Choice |
|---|---|
| Database | Postgres (Supabase) |
| Auth | Supabase Auth (email + Google) |
| Client SDK | `@supabase/supabase-js` (generated client in `src/integrations/supabase/`) |
| Serverless | Deno edge functions under `supabase/functions/` |
| AI | Gemini `generateContent` API (`GEMINI_API_KEY` Supabase secret, server-side only) |
| Migrations | `supabase/migrations/` (applied via `supabase db push`) |

## Security — Row-Level Security

Every user-owned table must:

1. Include `user_id uuid not null` (or `profiles.id = auth.uid()` for profiles).
2. Have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
3. Use an own-data policy: `USING (auth.uid() = user_id)` and `WITH CHECK (auth.uid() = user_id)`.

No table is publicly readable. Service-role access is only for edge functions like `delete-account`.

## Guest / Cloud Parity

When adding a table the client reads/writes:

1. Add Supabase migration + RLS.
2. Mirror schema in `src/lib/localStore.ts`.
3. Expose via `src/lib/dataStore.ts` hook.
4. Update `src/lib/migrateGuest.ts` if data should migrate on signup.

## Edge Functions

- Location: `supabase/functions/<name>/`
- Runtime: Deno
- Invoke from client: `supabase.functions.invoke("<name>", { body })`
- Document request/response in `docs/api-spec.yml`
- JWT required unless explicitly internal/service-role
- Guard expensive writes with DB constraints (e.g. `UNIQUE`) and client-side in-flight locks

Current functions: `generate-weekly-plan`, `weekly-review`, `delete-account`

## Generated Files — Do Not Edit

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

Regenerate after schema changes: `supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts`.

## Database Changes Checklist

1. Write migration SQL in `supabase/migrations/`
2. Enable RLS and add policies
3. Update `docs/data-model.md` and `docs/CLOUD.md`
4. Add guest parity if client-accessible
5. Verify with signed-in user; confirm RLS blocks cross-user access

## Testing

- Unit-test pure logic in `src/lib/` with Vitest.
- Edge functions: test handler logic where extractable; manual invoke for integration.
- No Prisma or Express test patterns — this project does not use them.

## Environment

`.env` keys (copy from `.env.example`; never commit):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
