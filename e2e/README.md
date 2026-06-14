# E2E tests

Two Playwright lanes, deliberately separated:

| Lane      | Specs                  | Config                      | Backend                         |
| --------- | ---------------------- | --------------------------- | ------------------------------- |
| **Guest** | `e2e/*.e2e.ts`         | `playwright.config.ts`      | None — localStorage guest mode  |
| **Cloud** | `e2e/cloud/*.cloud.e2e.ts` | `playwright.cloud.config.ts` | **Local Supabase** (Docker)     |

## Guest lane (default)

```sh
pnpm test:e2e        # headless
pnpm test:e2e:ui     # Playwright UI
```

Boots the app in `e2e` mode (`.env.e2e`, a non-functional Supabase URL). The app
falls back to guest mode, so no backend is contacted. Fast; runs in the pre-push
hook and the deploy-gate CI workflow.

## Cloud lane (real auth + DB)

Covers what the guest lane can't: sign up/in, the **authenticated** onboarding
gate, data persisted to Postgres, and the guest→cloud migration.

**Prerequisites:** Docker running + the [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
pnpm test:e2e:cloud      # headless (auto-starts Supabase + resets the schema)
pnpm test:e2e:cloud:ui   # Playwright UI
```

What happens:

1. `e2e/cloud/global-setup.ts` runs `supabase start`, then `supabase db reset` to
   apply all `supabase/migrations/*` to a clean schema, and captures the local URL +
   service-role key into `e2e/cloud/.supabase-status.json` (gitignored).
2. The app boots in `e2e-cloud` mode (`.env.e2e-cloud`) pointing at
   `http://127.0.0.1:54321`, on port **8091** (the guest lane uses 8090).
3. Specs sign up real users via the Auth form. Local Supabase **auto-confirms**
   signups (`[auth] enable_confirmations = false`), so no email step is needed.

### Isolation

Every test signs up a **unique email** (`e2e+<uuid>@example.com`). Because all
tables enforce RLS (`auth.uid() = user_id`) and `handle_new_user` seeds each new
user's profile + default categories, each test owns a fully isolated dataset — no
truncation between tests. In-test assertions read Postgres directly through a
**service-role** client (`serviceClient()` in `e2e/cloud/fixtures/auth.ts`), which
bypasses RLS.

The committed keys in `.env.e2e-cloud` are the standard Supabase **local demo
keys** — not secrets; they only work against a local stack. `global-setup.ts`
validates the anon key against `supabase status` and fails loudly if a CLI upgrade
ever changes it.

### Skipping

The cloud lane runs in the pre-push hook only when Docker + the Supabase CLI are
present. To skip it explicitly:

```sh
SKIP_CLOUD_E2E=1 git push
```

Helper scripts: `pnpm supabase:start`, `pnpm supabase:reset`.
