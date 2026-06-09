# Supabase Migration Runbook

This guide walks you through setting up a **new, self-managed Supabase project** for FreeSlot from scratch. Follow every step in order.

> **What this does NOT cover**: migrating existing user data from the old Lovable Cloud project. This is a fresh backend setup. Existing users will need to create new accounts on the new instance.

---

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) installed: `brew install supabase/tap/supabase`
- Logged in to the CLI: `supabase login`
- A Google Cloud project (only if you want Google OAuth)
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

---

## Step 1 — Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose your organisation, pick a project name (e.g. `plan-grow`), set a strong database password, and select the region closest to your users.
3. Wait for the project to reach **ACTIVE_HEALTHY** status (usually 1–2 minutes).
4. Note your **Project Reference ID** — it's the slug in your project URL:
   `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>`

---

## Step 2 — Link the Supabase CLI to your project

```bash
cd /path/to/plan-grow
supabase link --project-ref <YOUR_PROJECT_REF>
```

Enter your database password when prompted.

---

## Step 3 — Push the database migrations

This creates all tables, enums, indexes, RLS policies, and triggers:

```bash
supabase db push --project-ref <YOUR_PROJECT_REF>
```

Verify in the Supabase dashboard → **Table Editor** that these tables exist:
`profiles`, `categories`, `activities`, `schedule_blocks`, `time_logs`, `weekly_priorities`, `weekly_plans`, `weekly_reviews`, `daily_nudges`

---

## Step 4 — Configure Authentication

### Email/Password

1. Dashboard → **Authentication** → **Providers** → **Email**.
2. Enable **"Email provider"**.
3. **Disable "Confirm email"** (auto-confirm keeps the guest→account signup flow instant).

### Google OAuth (optional but recommended)

**In Google Cloud Console:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, add:
   ```
   https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**.

**In Supabase dashboard:**

1. Dashboard → **Authentication** → **Providers** → **Google**.
2. Enable Google, paste your Client ID and Client Secret.
3. Save.

### Site URL and redirect URLs

1. Dashboard → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your app's URL (e.g. `http://localhost:8080` for dev, or your production domain).
3. Add the same URL to **Redirect URLs**.

---

## Step 5 — Set edge function secrets

```bash
# Your Anthropic API key — used by generate-weekly-plan and weekly-review
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <YOUR_PROJECT_REF>

# The service role key — used by delete-account to bypass RLS
# Get this from: Dashboard → Settings → API → service_role (secret) key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY> --project-ref <YOUR_PROJECT_REF>
```

Verify secrets are set:

```bash
supabase secrets list --project-ref <YOUR_PROJECT_REF>
```

You should see `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` listed.

> `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically — do not set them manually.

---

## Step 6 — Deploy edge functions

```bash
supabase functions deploy --project-ref <YOUR_PROJECT_REF>
```

This deploys all three functions: `generate-weekly-plan`, `weekly-review`, `delete-account`.

Verify in dashboard → **Edge Functions** that all three show as **Active**.

---

## Step 7 — Update your local `.env`

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_ANON_KEY>
VITE_SUPABASE_PROJECT_ID=<YOUR_PROJECT_REF>
```

Get the anon key from: **Dashboard → Settings → API → Project API keys → anon / public**.

---

## Step 8 — Update `supabase/config.toml`

Open `supabase/config.toml` and replace the placeholder with your actual project ref:

```toml
project_id = "<YOUR_PROJECT_REF>"
```

---

## Step 9 — Regenerate TypeScript types

After any schema change (or on first setup), regenerate the client types:

```bash
supabase gen types typescript --project-id <YOUR_PROJECT_REF> \
  > src/integrations/supabase/types.ts
```

---

## Step 10 — Verify everything works

```bash
# Start the dev server
bun run dev
```

1. Open `http://localhost:8080`.
2. Create a new account with email/password — you should land on the app immediately (no email confirmation).
3. Log some time entries (guest mode) then sign in — guest data should migrate.
4. Go to the **Week view** → click **Generate Plan** — verify the AI planner returns a plan (requires `ANTHROPIC_API_KEY` to be set correctly).
5. Go to **Dashboard** → **Weekly Review** — verify a review is generated.
6. Go to **Settings** → **Delete account** — verify the function runs without error (you can use a throwaway account).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `AI not configured` error from edge function | `ANTHROPIC_API_KEY` secret not set | Re-run Step 5 |
| Auth redirect loop after Google sign-in | Redirect URL mismatch | Check Step 4 — URL must match exactly |
| Tables missing after `db push` | Migration failed silently | Check `supabase db push` output for errors; run `supabase db diff` |
| `Invalid API key` from Supabase client | Wrong anon key in `.env` | Re-check Step 7 — copy the **anon** key, not the service role key |
| Edge function returns 500 | Cold start or secret not propagated | Wait 30 s and retry; check function logs in dashboard → Edge Functions → Logs |
| `SUPABASE_SERVICE_ROLE_KEY` missing in delete-account | Secret not set | Re-run Step 5 for that secret |

---

## Useful CLI commands

```bash
# Check which project the CLI is linked to
supabase status

# View edge function logs
supabase functions logs generate-weekly-plan --project-ref <YOUR_PROJECT_REF>

# Re-deploy a single function after changes
supabase functions deploy generate-weekly-plan --project-ref <YOUR_PROJECT_REF>

# List all secrets
supabase secrets list --project-ref <YOUR_PROJECT_REF>

# Open the Supabase dashboard for this project
open https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>
```
