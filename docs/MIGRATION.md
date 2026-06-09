# Migration Plan: Lovable Cloud → Self-Owned Monorepo

**Goal:** Remove dependency on Lovable's managed infrastructure. Own the database, the backend, and the AI API key. Keep everything in one repository.

**Runtime choice:** Bun + Express + TypeScript for the backend server. Bun runs TypeScript natively (no compile step), is faster than Node for HTTP servers, and is fully compatible with the Express and Supabase JS packages already in the project.

---

## Current vs Target Architecture

```
CURRENT (Lovable managed)                 TARGET (self-owned monorepo)
─────────────────────────────────         ────────────────────────────────────────
React SPA (Vite)                          React SPA (Vite)
    │                                         │
    ▼                                         ├── calls your own backend
Lovable Cloud (Supabase)                      ▼
  ├── Postgres + RLS                      Bun + Express server  ← NEW (server/)
  ├── Supabase Auth                           ├── POST /api/generate-weekly-plan
  ├── Edge Functions (Deno)                   ├── POST /api/weekly-review
  │     ├── generate-weekly-plan              └── DELETE /api/account
  │     ├── weekly-review                         │
  │     └── delete-account                        ├── calls Google Gemini API directly
  └── Lovable AI Gateway                          └── connects to your Supabase project
        └── Gemini / GPT (no key)
                                          Your Supabase project
                                            ├── Postgres + RLS (same schema)
                                            ├── Supabase Auth (email + Google)
                                            └── you own the dashboard + backups
```

---

## New Folder Structure

```
plan-grow/
├── src/                        ← frontend (React/Vite) — mostly unchanged
├── server/                     ← NEW: Bun + Express backend
│   ├── src/
│   │   ├── index.ts            ← Express entry point
│   │   ├── middleware/
│   │   │   └── auth.ts         ← JWT verification via Supabase
│   │   └── routes/
│   │       ├── ai.ts           ← generate-weekly-plan + weekly-review
│   │       └── account.ts      ← delete-account
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   └── migrations/             ← kept; used to bootstrap new DB
├── .env.example                ← NEW: template with all required vars
└── package.json                ← frontend scripts (add dev:server shortcut)
```

---

## Environment Variables You Will Need

Create a `.env` file in the project root. Never commit it.

```env
# ── Supabase (your own project) ──────────────────────────────────────
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...         # "anon/public" key

# ── Server-only secrets (never expose to the browser) ─────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...                     # same anon key, server side
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # secret key — for delete-account only

# ── AI ─────────────────────────────────────────────────────────────────
GEMINI_API_KEY=AIza...                       # Google AI Studio key (free tier available)

# ── Server ─────────────────────────────────────────────────────────────
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173         # your frontend URL (change in production)
```

Where to get each value:
- `VITE_SUPABASE_URL` + keys → Supabase dashboard → Project Settings → API
- `GEMINI_API_KEY` → https://aistudio.google.com/app/apikey (free)

---

## Phase 1 — Infrastructure Setup

> **These steps require YOUR action. Claude cannot do them for you.**

### Step 1.1 — Create a Supabase account and project

1. Go to https://supabase.com and sign up (free tier is enough to start).
2. Click **New Project**. Choose a region close to you.
3. Save the **database password** somewhere safe — you will need it once.
4. Wait ~2 minutes for provisioning.

### Step 1.2 — Install the Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# verify
supabase --version
```

### Step 1.3 — Link the CLI to your new project

```bash
# from the project root
supabase login                          # opens browser, authorise

supabase link --project-ref <your-project-ref>
# project-ref is the string in your Supabase URL: https://<ref>.supabase.co
```

### Step 1.4 — Push the existing migrations to your database

All migrations are already in `supabase/migrations/`. One command applies them:

```bash
supabase db push
```

This creates all tables, RLS policies, and the `handle_new_user` trigger in your new project. When it finishes, open the Supabase Table Editor and confirm all 9 tables are present.

### Step 1.5 — Enable Google OAuth (optional — only if you want "Sign in with Google")

1. Supabase dashboard → Authentication → Providers → Google → Enable.
2. Follow the prompt to create a Google OAuth app in Google Cloud Console.
3. Add the callback URL Supabase gives you to the Google app's Authorized Redirect URIs.

> If you skip this, email + password login still works fully.

### Step 1.6 — Get your API keys

Supabase dashboard → Project Settings → API:

| Key | Where | Use |
|---|---|---|
| `URL` | "Project URL" | both frontend and server |
| `anon / public` | "Project API keys" → anon | frontend + server |
| `service_role` | "Project API keys" → service_role | server only — keep secret |

### Step 1.7 — Get a Gemini API key

1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key**.
3. Copy it — this replaces the old Lovable AI key entirely.

Free tier: 15 requests/minute, 1 million tokens/day — more than enough for personal use.

### Step 1.8 — Fill in your `.env` file

Copy the template from `.env.example` (Claude will create this) and paste in all values from Steps 1.6 and 1.7.

---

## Phase 2 — Build the Express Server

> **Claude does all of this.**

Claude will create the following:

### `server/package.json`

Bun-managed. Dependencies:
- `express` + `@types/express`
- `cors` + `@types/cors`
- `@supabase/supabase-js`
- `@google/generative-ai` (official Gemini SDK)
- `typescript` + `@types/node`

### `server/src/middleware/auth.ts`

Extracts the `Authorization: Bearer <token>` header, calls `supabase.auth.getUser(token)`, and attaches `req.user` to the request. Returns 401 if missing or invalid. All routes use this middleware.

### `server/src/routes/ai.ts`

Replaces both Deno edge functions with two Express route handlers:

**POST `/api/generate-weekly-plan`**
- Verifies JWT via auth middleware
- **Fetches activities + priorities from DB directly** (fixes SEC-1 — no longer trusts client-supplied IDs)
- Sanitizes and caps all string inputs (fixes SEC-3)
- Calls Gemini via `@google/generative-ai` with function calling (same tool schema)
- Validates returned slots have valid `HH:MM` times and known `activity_id`s
- Upserts result into `weekly_plans`

**POST `/api/weekly-review`**
- Verifies JWT
- Sanitizes client-supplied `planned`/`actual` arrays (fixes SEC-3)
- Calls Gemini for the reflection paragraph
- Uses **upsert** instead of delete + insert (fixes SEC-7)
- Stores result in `weekly_reviews`

### `server/src/routes/account.ts`

Replaces the delete-account Deno function:

**DELETE `/api/account`**
- Verifies JWT (user-scoped client)
- Uses service-role client to cascade-delete all user data
- Calls `admin.auth.deleteUser(uid)`

### `server/src/index.ts`

Express server entry point:
- CORS locked to `ALLOWED_ORIGIN` env var (fixes SEC-5 — no more wildcard)
- JSON body parsing with a 100kb limit
- Mounts `/api/generate-weekly-plan`, `/api/weekly-review`, `/api/account`
- Listens on `PORT` env var

### Frontend changes (in `src/`)

Claude will update:
- `src/components/week/AIPlanPanel.tsx` — change `supabase.functions.invoke("generate-weekly-plan", ...)` to `fetch("/api/generate-weekly-plan", ...)`
- `src/components/dashboard/WeeklyReviewModal.tsx` — same swap for weekly-review
- `src/pages/SettingsPage.tsx` — swap delete-account call
- `src/integrations/supabase/client.ts` — ensure it reads from `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (your new project)

Claude will also apply the **client-side bug fixes** from the code review during this phase:
- CR-1: AuthContext race condition
- CR-2: AIPlanPanel stale closure
- CR-3: DashboardPage async cancellation guard
- CR-4: ActivitiesPage guest blank screen
- CR-6: gaps.ts wrong clamp constant
- SEC-2: migrateGuestToCloud session guard

### `package.json` script additions

```json
"dev:server": "cd server && bun run src/index.ts",
"dev:all": "concurrently \"bun run dev\" \"bun run dev:server\""
```

---

## Phase 3 — Local Testing Checklist

Before deploying, verify each flow locally:

| Test | How |
|---|---|
| Frontend loads | `bun run dev` — opens at localhost:5173 |
| Backend starts | `bun run dev:server` — no crash on port 3001 |
| Sign up (email) | Create a new account, check Supabase Auth dashboard |
| Sign in | Log in with the new account |
| Guest mode | Open in incognito, log a time block without signing in |
| Guest → account migration | Sign up from guest mode, verify data appears |
| Generate AI plan | Week view → AI plan button → slots appear |
| Weekly review | Dashboard → run weekly review |
| Delete account | Settings → delete account → user gone from Supabase |

---

## Phase 4 — Deployment

> **You choose where to host. Claude can write the config files.**

### Option A — Railway (recommended for first deploy, simplest)

**Backend:**
1. Create account at https://railway.app
2. New project → Deploy from GitHub repo
3. Set **Root Directory** to `server`
4. Set **Start Command** to `bun run src/index.ts`
5. Add all server-side env vars in Railway's Variables tab
6. Railway gives you a URL like `https://plan-grow-server.up.railway.app`

**Frontend:**
1. New service in same Railway project → static site
2. Or deploy to Vercel: `vercel --prod` from repo root (zero config for Vite)

### Option B — Render

Similar to Railway. Free tier available. Backend as a "Web Service", frontend as a "Static Site".

### After deploying the backend

Update `ALLOWED_ORIGIN` in backend env vars to your frontend's production URL.

Update the frontend API base URL. Claude will add a `VITE_API_URL` env var that defaults to `""` (same origin in dev via Vite proxy) and the production deploy sets it to the Railway URL.

---

## What Changes vs What Stays the Same

| | Stays | Changes |
|---|---|---|
| Frontend code | React, Vite, Tailwind, all components | Supabase client URL + key (your project), API calls swap from `supabase.functions.invoke` to `fetch` |
| Database schema | Identical — same migrations | Hosted in your Supabase project |
| Auth | Supabase Auth (email + Google) | Pointing to your project |
| RLS policies | Identical | Same file, same rules |
| AI models | Gemini 2.5 Flash | Called directly via `@google/generative-ai` instead of Lovable gateway |
| Edge functions | Logic is identical | Rewritten as Express routes in `server/` |
| `supabase/migrations/` | Kept | No longer deployed to Lovable — run via CLI |

---

## Summary: Who Does What

| # | Step | Who |
|---|---|---|
| 1.1 | Create Supabase account + project | **You** |
| 1.2 | Install Supabase CLI | **You** |
| 1.3 | Link CLI to project | **You** |
| 1.4 | `supabase db push` | **You** |
| 1.5 | Enable Google OAuth (optional) | **You** |
| 1.6–1.8 | Collect API keys, fill `.env` | **You** |
| 2.x | Create `server/` with all routes | **Claude** |
| 2.x | Update frontend API calls | **Claude** |
| 2.x | Apply client-side bug fixes | **Claude** |
| 3.x | Local testing | **You + Claude** |
| 4.x | Deploy to Railway / Render | **You** (Claude writes config) |

**Estimated time:**
- Phase 1 (your setup): ~30–45 minutes
- Phase 2 (Claude builds): one session
- Phase 3 (local testing): ~20 minutes
- Phase 4 (deploy): ~20 minutes

Total: roughly 2 hours end to end.
