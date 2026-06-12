# Security Review Plan — FreeSlot (plan-grow)

**Status:** planned — not started
**Goal:** whole-project security review, executable in small per-session units with persistent tracking (same protocol as [code-review-plan.md](./code-review-plan.md)).
**Method:** `ai-specs/skills/owasp-security-audit/SKILL.md`, **adapted** — the skill targets Express/Prisma backends; FreeSlot is a static React SPA + self-managed Supabase (Postgres/RLS, Auth, Deno edge functions). Express-specific checks (Helmet, body limits, hpp) map to their Supabase/static-host equivalents below.
**Companion docs:** [CLOUD.md](./CLOUD.md) (schema, RLS, secrets), [ARCHITECTURE.md](./ARCHITECTURE.md), `CODE_AUDIT.md`, [code-review-plan.md](./code-review-plan.md) (prior findings to reconcile, not redo).

---

## Threat model (what we are defending)

Trust boundaries, from least to most privileged:

1. **Browser (untrusted)** → Supabase PostgREST with the anon key. The ONLY server-side defense for CRUD is **RLS**. Client-side checks (`ProtectedRoute`, gating) are UX, not security.
2. **Browser** → **edge functions** (`generate-weekly-plan`, `weekly-review`, `delete-account`) with a user JWT. Functions validate the JWT, then act with the user's RLS-scoped client — except `delete-account`, which escalates to the **service role**.
3. **Edge functions** → **Anthropic API** with `ANTHROPIC_API_KEY`. User-controlled strings (activity names, gap labels) flow into prompts; model output flows back into the DB.
4. **Guest mode** is localStorage-only — no server trust involved until `migrateGuest.ts` writes it to the cloud on signup.

Assets: per-user time/schedule data (low-sensitivity PII: daily routines reveal behavior patterns), Supabase service-role key, Anthropic API key, user accounts.

Out of scope: Supabase platform internals, Anthropic API internals, DoS/rate-exhaustion beyond config review.

## Session protocol

1. Pick the first `pending` unit; mark `in-progress` with date.
2. Run the unit's checks. Every finding needs `file:line`, a concrete exploit scenario, a severity, and a recommended fix. No speculative findings.
3. Mark `N/A` checks explicitly with justification — do not silently skip.
4. Record findings in the Findings section at the bottom; mark the unit `done`.
5. Final session: consolidate into a report (template in the skill), produce the remediation phases, and wire the CI gates (Unit 7).

**Severity matrix** (from the skill): Critical = remotely exploitable, no auth, data breach likely · High = exploitable with effort, significant impact · Medium = conditional, moderate impact · Low = defense-in-depth.

---

## Units & status

| # | Unit | Scope | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 0 | Automated baseline | dependency audit, secret scans, git history | pending | | no live env needed |
| 1 | RLS & database | all `supabase/migrations/*.sql` | pending | | partly needs live env |
| 2 | Edge functions | `supabase/functions/*` | pending | | static + live verification |
| 3 | Auth & session | `AuthContext`, `Auth.tsx`, gates, Supabase auth config | pending | | config checks need dashboard |
| 4 | Client data layer & XSS | `dataStore`, `localStore`, `migrateGuest`, rendering | pending | | static |
| 5 | AI / prompt injection | `_shared/planning.ts`, prompt + output flow | pending | | static |
| 6 | Supply chain & CI | lockfiles, pinned deps, workflow permissions | pending | | static |
| 7 | Hosting, headers & hardening report | CSP, deploy config, CI security gates, final report | pending | | needs deployed env |

### Unit 0 — Automated baseline (no live environment needed)

- `pnpm audit` (or `bun pm audit`) — record critical/high counts. **Note:** repo currently has `bun.lockb` committed and `pnpm-lock.yaml` untracked while CI runs `pnpm install --frozen-lockfile` — resolve the lockfile story first or the audit target is ambiguous.
- Secret scan: `rg -i '(password|secret|api_key|apikey|token|sk-ant)\s*[:=]' --glob '!node_modules' --glob '!*.lock*'`
- Git history: `git log --all --diff-filter=A -- '*.env' '*.pem' '*.key'` and confirm `.env` is gitignored and never committed.
- `rg 'eval\(|new Function\(' src supabase` and `rg 'dangerouslySetInnerHTML' src`.
- `rg 'localhost:[0-9]{4}|127\.0\.0\.1' src supabase` — leftover dev endpoints.
- Record baseline metrics in Findings.

### Unit 1 — RLS & database (OWASP A01, A03)

The single most important unit: RLS is the only authorization layer for all CRUD.

- Enumerate every table across ALL migrations (later migrations can add tables or weaken policies); verify each has `ENABLE ROW LEVEL SECURITY` **and** a `USING`/`WITH CHECK` policy on `auth.uid()`. Watch for: tables added later (`sort_order`, `title` migrations are column-only — confirm), policies `FOR SELECT` only (writes left open), missing `WITH CHECK` (read-scoped but write-open).
- `handle_new_user()` trigger: `SECURITY DEFINER` — verify `search_path` is pinned and it can't be invoked outside the auth insert path.
- Check no `GRANT` to `anon` beyond what PostgREST needs; confirm no view/function exposes cross-user data.
- **Live check (needs env):** with two test accounts, attempt cross-user `select`/`update`/`delete` via the REST API directly (curl with user A's JWT against user B's row ids) — RLS must block all four verbs on all nine tables.
- Foreign keys: `category_id` on logs/activities — can user A reference user B's category id (IDOR-by-reference)? Verify FK + RLS interplay.

### Unit 2 — Edge functions (A01, A04, A05, data exposure)

Pre-seeded candidates to verify (from reading the code on 2026-06-12 — re-verify, don't assume):

- **CORS is `Access-Control-Allow-Origin: *` in all three functions.** JWT-in-header means CSRF-style abuse is limited, but combined with `supabase.functions.invoke` from any origin, any site the user visits can call these functions if it obtains a token; document and decide an allowlist (`generate-weekly-plan/index.ts:11`, `delete-account/index.ts:5`, `weekly-review`).
- **`generate-weekly-plan` trusts client-supplied `gaps`/`activities`/`priorities` wholesale** (`index.ts:34-36`): no size caps, no schema validation, strings flow into the AI prompt and `raw_prompt` is persisted. Server could re-derive activities/priorities from the DB instead. (The old SEC-1/SEC-3 findings from `CODE_AUDIT.md` — the Express rewrite that was meant to fix them never happened; check current status honestly.)
- **Error detail leakage:** `insErr.message` and `e.message` are returned to the client (`generate-weekly-plan/index.ts:128,134`) — verify nothing sensitive (connection strings, table internals) can surface.
- **`delete-account` swallows per-table delete errors** (`index.ts:41` — `console.error` then continues) and then deletes the auth user. Failure ordering can orphan rows that no longer have an owner but still exist. Also verify it cannot be replayed/aimed at another uid (it derives uid from the JWT — confirm no body params are trusted).
- **`raw_response` / `raw_prompt` stored verbatim** in `weekly_plans` — confirm RLS covers them and no other surface (dashboard queries, future exports) leaks them.
- `verify_jwt` setting in `supabase/config.toml` for each function — functions also check manually, but confirm the platform gate is on.
- Version skew: functions import `supabase-js@2.57.4` and `@2.45.0` from esm.sh — pin consistently; check advisories for both (feeds Unit 6).

### Unit 3 — Auth & session (A07)

- `AuthContext.tsx`: listener-before-getSession order (already verified in code review), token storage location (supabase-js default = localStorage; document the XSS-implies-token-theft tradeoff), signOut completeness.
- **Auto-confirm email is ON by design** (instant guest→account). Consequences to document: anyone can register any email address they don't own; password reset flow then sends mail to the real owner. Decide if acceptable for current scale.
- Password policy: check Supabase dashboard setting (min length, leaked-password protection toggle). **Needs dashboard access.**
- Brute-force protection: Supabase auth rate limits — confirm defaults are active. **Needs dashboard.**
- `Auth.tsx`: error messages must not distinguish "wrong password" from "no such user" beyond what Supabase already returns.
- Redirect/Site URL allowlist in Supabase auth config — open-redirect prevention for OAuth flows if Google is enabled.

### Unit 4 — Client data layer & XSS (A03, A08)

- React escapes by default; confirm zero `dangerouslySetInnerHTML` / `javascript:` hrefs (Unit 0 grep) including in chart/tooltip rendering of user strings (category names, log titles, AI `rationale`/`summary` strings — **model output is rendered**: treat as untrusted).
- `migrateGuest.ts`: guest localStorage is attacker-influenceable (any XSS or shared machine); verify migration validates shapes/sizes before inserting and can't write to another user (uses the user-scoped client → RLS backstop).
- `localStore.ts`: corrupt-shape fallbacks exist (per code review) — confirm quota/size caps so a hostile page on the same origin can't poison state in a way that breaks rendering on signup.
- URL state (`useSearchParams` dates/weeks): parsed values bounded, no reflected output.
- i18n: interpolated values escaped (no `dangerouslySetInnerHTML`-based trans rendering).

### Unit 5 — AI / prompt injection & output handling (A03 adapted)

- `buildPlanPrompts` in `_shared/planning.ts`: user-controlled activity names / gap labels are prompt-injectable by the user themselves. Single-user blast radius (their own plan) — but verify: caps on string length and array sizes (cost abuse via huge prompts is excluded as DoS, but unbounded input → unbounded stored `raw_prompt` is a data-integrity issue), and that the model cannot be steered into writing slots for other users (it can't — upsert is keyed to `user.id` server-side; confirm that stays true).
- `validateSlots` (already added): confirm it bounds slot count, validates `HH:MM`/ISO-date formats, and rejects slots outside submitted gaps. Add tests if missing edge cases (overnight, duplicate slots).
- `weekly-review`: same checks for `planned`/`actual` arrays and the insights text path; confirm upsert (not delete+insert) and that AI text is rendered as plain text in `WeeklyReviewModal`.

### Unit 6 — Supply chain & CI (A06, A08)

- Resolve the **lockfile situation** (bun.lockb committed, pnpm-lock.yaml untracked, CI uses pnpm frozen-lockfile → CI cannot pass as-is). One package manager, one committed lockfile, audited in CI.
- `pnpm audit` / advisories for: supabase-js (both pinned esm.sh versions in functions), vite, react-router, dnd-kit.
- GitHub Actions: actions pinned to major versions (`@v4`) — consider SHA-pinning; workflow has no `permissions:` block (defaults to read-write token) — add `permissions: contents: read`.
- No `postinstall` scripts from suspicious packages; spot-check unusual names.
- esm.sh imports in edge functions are remote code at deploy time — pin exact versions (done) and prefer `npm:` specifiers or vendoring if Supabase CLI supports it.

### Unit 7 — Hosting, headers & final report (A05 adapted + skill Phases 2–4)

- Static host (TBD) must set: `Content-Security-Policy` (script-src 'self'; connect-src limited to the Supabase project URL + nothing else), `X-Content-Type-Options`, `Referrer-Policy`, HSTS. **Needs the deployed environment — this is the part that cannot be completed with the current code/repo alone.**
- `index.html`: no inline scripts/handlers that would force `unsafe-inline`.
- Runtime verification (adapted from the skill): curl the deployed site for headers; curl edge functions without/with-invalid JWT expecting 401; cross-user RLS curls from Unit 1.
- Produce the final report (skill's template), severity-phased remediation plan (A: <1 day, B: 1–3 days, C: 1–2 weeks), and CI integration: `pnpm audit` gate, gitleaks/trufflehog secret scan, Dependabot/Renovate.

---

## What blocks full completion today

| Blocker | Affected checks | Unblock by |
|---|---|---|
| No committed pnpm lockfile (CI broken, audit target ambiguous) | Unit 0, 6 | commit `pnpm-lock.yaml` (or move CI to bun) |
| No deployed/static-host environment decided | Unit 7 headers/CSP, runtime curls | choose host, deploy |
| Dashboard-only auth settings (password policy, rate limits, auto-confirm) | Unit 3 | dashboard session during the review |
| Two live test accounts for cross-user RLS probing | Unit 1, 7 | create throwaway accounts on the project |

Everything else (Units 0–6 static portions) is executable against the repo as-is.

---

## Findings

_(append per unit during execution — `file:line`, severity, exploit scenario, fix)_
