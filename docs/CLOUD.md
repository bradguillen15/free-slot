# Backend (Self-managed Supabase)

FreeSlot's backend runs on a self-managed Supabase project. This doc covers the schema, security, edge functions, secrets, and how to operate the backend.

---

## Connection

The Supabase client is generated at `src/integrations/supabase/client.ts`:

```ts
import { supabase } from "@/integrations/supabase/client";
```

Generated TypeScript types live in `src/integrations/supabase/types.ts`.

> ⚠️ Never edit either of these files manually — regenerate them with `supabase gen types typescript --project-id <YOUR_PROJECT_REF> > src/integrations/supabase/types.ts` after schema changes.

Environment variables (`.env` — copy from `.env.example`):

- `VITE_SUPABASE_URL` — your project URL (`https://<ref>.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the anon/public key
- `VITE_SUPABASE_PROJECT_ID` — your project reference ID

---

## Database schema

| Table | Key columns | Purpose |
|---|---|---|
| `profiles` | `id (= auth.uid)`, `buffer_minutes`, `peak_hours jsonb`, `include_weekends`, `weekly_review_day`, `onboarding_completed` | Per-user preferences. Created by trigger on signup. |
| `categories` | `id`, `user_id`, `name`, `type` (productive/unproductive), `color`, `is_default` | Tags for activities and logs. 9 defaults seeded per user. |
| `activities` | `id`, `user_id`, `name`, `category_id`, `target_hours_per_week`, `is_active` | What the user wants to spend time on. |
| `schedule_blocks` | `id`, `user_id`, `name`, `start_time`, `end_time`, `days_of_week int[]`, `type`, `color`, `category_id` | Recurring fixed time. |
| `time_logs` | `id`, `user_id`, `date`, `start_time`, `end_time`, `category_id`, `type`, `notes` | What actually happened. |
| `weekly_priorities` | `user_id`, `week_start`, `activity_id`, `rank` | Drag-ranked focus per week — drives AI planning. |
| `weekly_plans` | `user_id`, `week_start`, `slots jsonb`, `raw_prompt`, `raw_response` | AI-generated week plan. **`UNIQUE(user_id, week_start)`** to prevent duplicates. |
| `weekly_reviews` | `user_id`, `week_start`, `planned_vs_actual jsonb`, `insights` | One per completed week. |
| `daily_nudges` | `user_id`, `date`, `content` | One AI nudge per day. |

### Trigger

`handle_new_user()` runs `AFTER INSERT ON auth.users`. It creates the `profiles` row and seeds 9 default categories. `SECURITY DEFINER` with `search_path=public`.

---

## Row-Level Security

Every table has RLS enabled with the same shape:

```sql
CREATE POLICY "own X all"
  ON public.<table>
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

`profiles` is split into separate `select / insert / update` policies keyed on `auth.uid() = id` (no delete — accounts are removed via the `delete-account` edge function which uses the service role).

**No table is publicly readable.** No PII is shared.

### Adding a new table — checklist

1. Always include a `user_id uuid not null` column.
2. `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
3. Add an `own x all` policy (template above).
4. If the row will be touched by the user from the client, add it to `localStore.ts` and the corresponding `dataStore` hook for guest parity.
5. Update `migrateGuest.ts` if it should carry over on signup.

---

## Edge functions

Located under `supabase/functions/`. Deno runtime.

Deploy all functions:

```bash
supabase functions deploy --project-ref <YOUR_PROJECT_REF>
```

Deploy a single function:

```bash
supabase functions deploy generate-weekly-plan --project-ref <YOUR_PROJECT_REF>
```

| Function | Purpose | JWT | AI |
|---|---|---|---|
| `generate-weekly-plan` | Calls Anthropic with the user's gaps + activities + priorities; upserts the result into `weekly_plans`. | required | `claude-haiku-4-5-20251001` |
| `weekly-review` | Aggregates planned-vs-actual for a week, asks the AI for insights, writes `weekly_reviews`. | required | `claude-haiku-4-5-20251001` |
| `delete-account` | Service-role cleanup + auth user deletion. | required | none |

### Calling an edge function

```ts
const { data, error } = await supabase.functions.invoke("generate-weekly-plan", {
  body: { week_start, gaps, activities, priorities },
});
```

### Guarding against double-fires

The AI planner uses both:

- a DB-level `UNIQUE(user_id, week_start)` constraint with `upsert(..., { onConflict: "user_id,week_start" })`;
- and a `useRef` lock in the React component during the in-flight request.

Apply the same belt-and-braces approach for any expensive write.

---

## AI: Anthropic API

Edge functions call the Anthropic Messages API directly using `ANTHROPIC_API_KEY` (a Supabase secret). No additional gateway or proxy is needed.

Model in use: `claude-haiku-4-5-20251001` — fast and cost-efficient for structured planning and short reflections.

Always parse responses defensively:

```ts
// Text response (weekly-review)
const text = aiJson.content?.[0]?.text?.trim() ?? "fallback";

// Tool-use response (generate-weekly-plan)
const toolBlock = aiJson.content?.find((b) => b.type === "tool_use");
const parsed = toolBlock?.input;
```

---

## Secrets

Managed via Supabase CLI or the project dashboard (Settings → Edge Functions → Secrets). Never hardcode these or echo them in logs.

Set secrets via CLI:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <YOUR_PROJECT_REF>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... --project-ref <YOUR_PROJECT_REF>
```

Currently required:

| Secret | Used by | How to get |
|---|---|---|
| `ANTHROPIC_API_KEY` | `generate-weekly-plan`, `weekly-review` | console.anthropic.com → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | `delete-account` | Supabase dashboard → Settings → API → service_role key |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by Supabase into every edge function — you do not need to set these manually.

---

## Authentication

- **Methods**: email + password, Google OAuth.
- **Email confirmation**: set to auto-confirm (instant signin) — keeps the guest→account transition fluid. Configure in Supabase dashboard → Authentication → Providers → Email → "Confirm email" toggle.
- **Google OAuth**: configure in Supabase dashboard → Authentication → Providers → Google. Add your OAuth client ID + secret. Add your site URL and redirect URL (`https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`) to the Google Cloud Console OAuth app.
- **Session handling**: `AuthContext.tsx` subscribes to `onAuthStateChange` *before* calling `getSession()`, otherwise the initial session event can be missed.
- **Account deletion**: `delete-account` edge function with the service role.

---

## Migrations

SQL migrations live under `supabase/migrations/` and are managed through the Supabase CLI.

Push all pending migrations:

```bash
supabase db push --project-ref <YOUR_PROJECT_REF>
```

**Rules**:

- Never include `ALTER DATABASE postgres` statements.
- Don't touch `auth`, `storage`, `realtime`, `supabase_functions`, `vault` schemas.
- Prefer **validation triggers** over CHECK constraints for time-based rules (CHECK must be immutable).

---

## Realtime

Not currently enabled. If a feature needs it (e.g. multi-device live sync of the day timeline):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_logs;
```

Then subscribe via `supabase.channel(...).on('postgres_changes', ...)`. RLS still applies.

---

## Storage

No buckets currently. Add one via the Supabase dashboard if a feature requires file uploads (avatars, exports), and apply per-user RLS on `storage.objects`.

---

## Operational notes

- **Backend status**: if writes fail mysteriously, check the project is `ACTIVE_HEALTHY` in the Supabase dashboard before retrying destructive operations.
- **Quotas**: Supabase free tier has row limits and function invocation limits. Guest mode (localStorage) acts as a soft cap that pushes heavy users toward signup before they cost real DB rows.
- **Backups**: handled by Supabase. Use the dashboard → Database → Backups for point-in-time recovery.
- **Type regeneration**: after any schema change, run `supabase gen types typescript --project-id <YOUR_PROJECT_REF> > src/integrations/supabase/types.ts`.
