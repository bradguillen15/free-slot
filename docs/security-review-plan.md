# Security Review Plan — FreeSlot (plan-grow)

**Status:** units 0–6 complete (static); unit 7 partial — blocked on deploy + live env
**Goal:** whole-project security review, executable in small per-session units with persistent tracking (same protocol as [code-review-plan.md](./code-review-plan.md)).
**Method:** `ai-specs/skills/owasp-security-audit/SKILL.md`, **adapted** — the skill targets Express/Prisma backends; FreeSlot is a static React SPA + self-managed Supabase (Postgres/RLS, Auth, Deno edge functions). Express-specific checks (Helmet, body limits, hpp) map to their Supabase/static-host equivalents below.
**Companion docs:** [CLOUD.md](./CLOUD.md) (schema, RLS, secrets), [ARCHITECTURE.md](./ARCHITECTURE.md), `CODE_AUDIT.md`, [code-review-plan.md](./code-review-plan.md) (prior findings to reconcile, not redo).

---

## Threat model (what we are defending)

Trust boundaries, from least to most privileged:

1. **Browser (untrusted)** → Supabase PostgREST with the anon key. The ONLY server-side defense for CRUD is **RLS**. Client-side checks (`ProtectedRoute`, gating) are UX, not security.
2. **Browser** → **edge functions** (`generate-weekly-plan`, `weekly-review`, `delete-account`) with a user JWT. Functions validate the JWT, then act with the user's RLS-scoped client — except `delete-account`, which escalates to the **service role**.
3. **Edge functions** → **Gemini API** with `GEMINI_API_KEY`. User-controlled strings (activity names, gap labels) flow into prompts; model output flows back into the DB.
4. **Guest mode** is localStorage-only — no server trust involved until `migrateGuest.ts` writes it to the cloud on signup.

Assets: per-user time/schedule data (low-sensitivity PII: daily routines reveal behavior patterns), Supabase service-role key, Gemini API key, user accounts.

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
| 0 | Automated baseline | dependency audit, secret scans, git history | done | 2026-06-12 | see Findings U0 |
| 1 | RLS & database | all `supabase/migrations/*.sql` | done (static) | 2026-06-12 | live cross-user curls blocked — no test accounts |
| 2 | Edge functions | `supabase/functions/*` | done | 2026-06-12 | |
| 3 | Auth & session | `AuthContext`, `Auth.tsx`, gates, Supabase auth config | done (static) | 2026-06-12 | dashboard checks blocked |
| 4 | Client data layer & XSS | `dataStore`, `localStore`, `migrateGuest`, rendering | done | 2026-06-12 | |
| 5 | AI / prompt injection | `_shared/planning.ts`, prompt + output flow | done | 2026-06-12 | |
| 6 | Supply chain & CI | lockfiles, pinned deps, workflow permissions | done | 2026-06-12 | |
| 7 | Hosting, headers & hardening report | CSP, deploy config, CI security gates, final report | partial | 2026-06-12 | `index.html` clean; deploy curls blocked |

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
- **`generate-weekly-plan` trusts client-supplied `gaps`/`activities`/`priorities` wholesale** (`index.ts:34-36`): no size caps, no schema validation, and strings flow into the AI prompt. Server could re-derive activities/priorities from the DB instead. (The old SEC-1/SEC-3 findings from `CODE_AUDIT.md` — the Express rewrite that was meant to fix them never happened; check current status honestly.)
- **Error detail leakage:** `insErr.message` and `e.message` are returned to the client (`generate-weekly-plan/index.ts:128,134`) — verify nothing sensitive (connection strings, table internals) can surface.
- **`delete-account` swallows per-table delete errors** (`index.ts:41` — `console.error` then continues) and then deletes the auth user. Failure ordering can orphan rows that no longer have an owner but still exist. Also verify it cannot be replayed/aimed at another uid (it derives uid from the JWT — confirm no body params are trusted).
- **AI prompt/response storage removed** from `weekly_plans`; re-check if debug persistence is reintroduced.
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

- `buildPlanPrompts` in `_shared/planning.ts`: user-controlled activity names / gap labels are prompt-injectable by the user themselves. Single-user blast radius (their own plan) — but verify caps on string length and array sizes, and that the model cannot be steered into writing slots for other users (it can't — upsert is keyed to `user.id` server-side; confirm that stays true).
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

### Unit 0 — Automated baseline

**Baseline metrics (pnpm audit, 2026-06-12):** critical 1 · high 0 · moderate 5 · low 1 · total 7  
Key packages: `vitest@3.2.4` (critical, dev-only — Vitest UI exposed to network), `vite@5.4.21` + `esbuild` (moderate, dev-server only), `react-router-dom` open-redirect (moderate), `ws` via jsdom (moderate, test only).

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U0-1 | **High** | `.gitignore:1-35`, `.env` (tracked) | `.env` is **not** gitignored and is **still tracked** (`git ls-files .env`). Commit `e74d293` added live `VITE_SUPABASE_URL`, project ref, and anon JWT. Any future secret (service role, Gemini key) added to `.env` would be committed again. | Add `.env`, `.env.*`, `!.env.example` to `.gitignore`; `git rm --cached .env`; rotate keys if repo is/was public; purge history with `git filter-repo` if needed. |
| U0-2 | **High** | lockfiles: `bun.lockb`, `package-lock.json` tracked; `pnpm-lock.yaml` untracked; `.github/workflows/ci.yml:24` | CI runs `pnpm install --frozen-lockfile` but `pnpm-lock.yaml` is not committed — CI cannot reproduce installs. Three lockfiles = ambiguous audit surface. | Pick pnpm; commit `pnpm-lock.yaml`; remove `bun.lockb` and `package-lock.json` from git. |
| U0-3 | N/A | `src/`, `supabase/` | `eval(` / `new Function(` — **none found**. | — |
| U0-4 | N/A | `src/` (except chart) | `dangerouslySetInnerHTML` — **one hit** in `chart.tsx:70` (see U4-1). | — |
| U0-5 | N/A | `src/`, `supabase/` | `localhost` / `127.0.0.1` hardcoded endpoints — **none found**. | — |
| U0-6 | N/A | secret scan | No hardcoded `sk-ant`, service-role, or live passwords in source. Docs use placeholder `sk-ant-...`. `client.ts:5-6` reads from `import.meta.env` (correct). | — |

### Unit 1 — RLS & database (static)

**Tables enumerated:** `profiles`, `categories`, `schedule_blocks`, `time_logs`, `activities`, `weekly_priorities`, `weekly_plans`, `weekly_reviews`, `daily_notes`, `inbox_items`.

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U1-1 | N/A | `20260427044211_*.sql` | All 9 tables have `ENABLE ROW LEVEL SECURITY` and `auth.uid()`-scoped policies. Eight tables use `FOR ALL` with both `USING` and `WITH CHECK`. `profiles` uses separate SELECT/INSERT/UPDATE policies. | — |
| U1-2 | N/A | `20260427044240_*.sql:1` | `handle_new_user()` — `SECURITY DEFINER SET search_path = public`; `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated`. Not callable outside auth trigger path. | — |
| U1-3 | Low | `time_logs` / `activities` / `schedule_blocks` FK on `category_id` | User A can insert a row they own with `category_id` pointing at user B's category UUID (FK checks existence, not ownership). No cross-user read, but integrity pollution and possible confused UI if UUID is guessed. | Add `CHECK` trigger or composite FK ensuring `categories.user_id = row.user_id`; or validate in RLS `WITH CHECK` via subquery. |
| U1-4 | **Blocked** | live REST | Cross-user SELECT/UPDATE/DELETE with two JWTs — **not run** (no throwaway accounts in this session). | Create two test users; curl PostgREST with user A JWT against user B row IDs on all 9 tables; expect 0 rows / 403. |

### Unit 2 — Edge functions

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U2-1 | Medium | `generate-weekly-plan/index.ts:11`, `delete-account/index.ts:5`, `weekly-review/index.ts:5` | `Access-Control-Allow-Origin: *`. Any origin can invoke functions if it holds the user's JWT (e.g. XSS on another site reading `localStorage`). CSRF via cookies is N/A (Bearer header). | Restrict `Origin` to production allowlist; or accept risk and document dependency on XSS prevention. |
| U2-2 | Medium | `generate-weekly-plan/index.ts:32-36` | Client supplies `gaps`, `activities`, `priorities` wholesale — no count/length caps, no schema validation. Attacker (authenticated) can send huge arrays → inflated Gemini API cost. SEC-1/SEC-3 from old Express audit were never ported; status unchanged. | Re-fetch activities/priorities from DB server-side; cap array sizes and string lengths; validate `week_start` ISO format. |
| U2-3 | Low | `generate-weekly-plan/index.ts:128,134`, `weekly-review/index.ts:86,92` | `insErr.message` / `e.message` returned to client. Postgres errors can include constraint/column names (info disclosure). | Return generic `{ error: "Internal error" }`; log details server-side only. |
| U2-4 | Medium | `delete-account/index.ts:38-42` | Per-table delete errors are logged and **swallowed**; auth user is still deleted. Partial failure → orphaned rows without owner, or account deleted while data remains. | Abort on first delete error; use transaction or single `DELETE FROM auth.users` relying on `ON DELETE CASCADE` (add missing cascades if needed). |
| U2-5 | N/A | `weekly_plans` | Prompt/response debug columns removed; current table stores generated slots only. | — |
| U2-6 | N/A | all three functions | UID derived from JWT via `getUser()` — no trusted body `user_id`. `delete-account` cannot target another uid. Replay deletes same user again (idempotent 404/ok). | — |
| U2-7 | Low | `delete-account/index.ts:2` vs others `@2.57.4` | Version skew on esm.sh imports (`2.45.0` vs `2.57.4`). | Pin one version everywhere; track advisories in CI. |
| U2-8 | **Blocked** | `supabase/config.toml` | Repo has placeholder `project_id` only — no `verify_jwt` entries to verify. Functions do manual JWT checks. | Add function entries to `config.toml` with `verify_jwt = true`; confirm in Supabase dashboard. |

### Unit 3 — Auth & session (static)

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U3-1 | N/A | `AuthContext.tsx:20-30` | `onAuthStateChange` registered before `getSession()` (correct order). | — |
| U3-2 | Low (documented) | `client.ts:13` | JWT in `localStorage` — any XSS steals session. Standard supabase-js SPA tradeoff. | CSP + XSS hygiene; consider httpOnly cookie flow if threat model tightens. |
| U3-3 | Medium (accepted) | `Auth.tsx:55-56`, comment L55 | Auto-confirm email: anyone can register an unowned address; password reset emails go to real owner. Documented product choice for guest→account flow. | Document in privacy policy; consider email verification before sensitive actions at scale. |
| U3-4 | Low | `Auth.tsx:161`, `Auth.tsx:74` | Client `minLength={6}` only; server policy unknown. Supabase error messages passed through toast (may distinguish error types). | Enforce min length in Supabase dashboard; map auth errors to generic user-facing messages. |
| U3-5 | N/A | `Auth.tsx:52` | `emailRedirectTo` uses `window.location.origin` — safe if Supabase Site URL allowlist matches production only. | Verify allowlist in dashboard (blocked). |
| U3-6 | N/A | `ProtectedRoute.tsx` | Dashboard/settings require auth. `/app/*` routes allow guest mode by design (localStorage only). | — |
| U3-7 | **Blocked** | Supabase dashboard | Password policy, leaked-password protection, auth rate limits — not verifiable from repo. | Dashboard review during deploy prep. |

### Unit 4 — Client data layer & XSS

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U4-1 | N/A | `chart.tsx:70-85` | `dangerouslySetInnerHTML` injects **CSS variables from chart config colors** (`--color-${key}`), not user/content strings. | — |
| U4-2 | N/A | `AIPlanPanel.tsx:259,291`, `WeeklyReviewModal.tsx:171`, `WeekGrid.tsx:264` | AI `summary`, `rationale`, `insights` rendered as React text children — auto-escaped. | — |
| U4-3 | N/A | `src/` | No `javascript:` hrefs. i18n uses `t()` only — no `Trans` with HTML. | — |
| U4-4 | Low | `CalendarPage.tsx:26-27` | `?date=` taken from URL without ISO validation (unlike `WeekPage.tsx:30-37`). Invalid date strings may produce odd UI; not reflected HTML. | Reuse `ISO` regex from `WeekPage` before `setDate`. |
| U4-5 | Medium | `migrateGuest.ts:13-189` | Guest `localStorage` is attacker-influenceable (XSS, shared machine). Migration inserts arbitrary snapshot shapes with no array-length or string-length caps. RLS backstop prevents cross-user writes (`user_id` from session). | Add caps (max categories/logs/blocks); validate required fields before insert. |
| U4-6 | Low | `localStore.ts:88-114` | Corrupt-shape fallbacks exist (`readArray`), but no quota/size limits on writes — hostile same-origin script could fill `localStorage` until quota, breaking guest UX pre-migration. | Cap list sizes; catch `QuotaExceededError` with user feedback. |

### Unit 5 — AI / prompt injection

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U5-1 | Low | `planning.ts:42-68` | User-controlled activity names / gap labels are prompt-injectable by the account owner. Blast radius is own plan only; upsert keyed to `user.id` server-side (`generate-weekly-plan/index.ts:114`). | Optional: strip control chars; cap string lengths in `buildPlanPrompts`. |
| U5-2 | Medium | `planning.ts:77-106`, `generate-weekly-plan/index.ts` | No cap on slot count or prompt size. `validateSlots` filters format/gap fit but not count. | `if (out.length > MAX_SLOTS) out.length = MAX_SLOTS`; reject requests with `gaps.length > N`. |
| U5-3 | N/A | `planning.test.ts` | `validateSlots` tests malformed dates, inverted slots, outside-window — good coverage. Overnight wrap not applicable (gaps don't cross midnight per comment L92). | Add test for duplicate slots if product cares. |
| U5-4 | N/A | `weekly-review/index.ts:75-80` | Uses upsert on `(user_id, week_start)` — no delete+insert race. | — |
| U5-5 | Low | `weekly-review/index.ts:27-28` | `planned` / `actual` arrays unbounded — same storage/cost pattern as U2-2. | Cap array length and name string size before prompt build. |

### Unit 6 — Supply chain & CI

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U6-1 | **High** | (same as U0-2) | Lockfile / package-manager split breaks reproducible CI and audit. | See U0-2. |
| U6-2 | Medium | `package.json:71`, audit | `react-router-dom@6.30.1` — GHSA-2j2x-hqr9-3h42 open redirect (moderate). | Upgrade to `>=6.30.4`. |
| U6-3 | Medium | `package.json:100-101` | `vite@5.4.19`, `vitest@3.2.4` — dev-tool CVEs; vitest critical if UI exposed to network. | Upgrade vitest `>=3.2.6`, vite `>=5.4.21` patched path per advisory (or 6.4.2+). |
| U6-4 | Medium | `.github/workflows/ci.yml:1-40` | No `permissions:` block (defaults to read-write `GITHUB_TOKEN`). No `pnpm audit`, secret scan, or Dependabot config in repo. | Add `permissions: contents: read`; fail CI on critical/high audit; add gitleaks/trufflehog + Dependabot. |
| U6-5 | N/A | `package.json` scripts | No `postinstall` / `preinstall` in root package.json. | — |
| U6-6 | Low | edge function imports | Remote esm.sh bundles at deploy — versions pinned but supply-chain trust in esm.sh CDN. | Prefer vendored `npm:` imports when Supabase CLI supports. |

### Unit 7 — Hosting & headers (partial)

| ID | Severity | Location | Exploit scenario | Fix |
|----|----------|----------|------------------|-----|
| U7-1 | N/A | `index.html:23-26` | No inline scripts/handlers — single `type="module"` entry. External Google Fonts (CSP `style-src`/`font-src` implication when CSP added). | — |
| U7-2 | **Blocked** | deployed host | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` — no host chosen. | Configure on static host; verify with `curl -sI`. |
| U7-3 | **Blocked** | edge functions live | JWT-less / invalid-JWT curl expecting 401 — not run. | curl smoke test after deploy. |

---

## Remediation priority matrix

| Phase | ID | Severity | Effort | Action |
|-------|-----|----------|--------|--------|
| **A** | U0-1 | High | 1–2 h | ~~Gitignore `.env`, untrack~~ **done 2026-06-12** — still need history purge before public |
| **A** | U0-2 / U6-1 | High | 1 h | ~~Single lockfile (pnpm)~~ **done 2026-06-12** — commit `pnpm-lock.yaml`, drop bun/npm locks |
| **A** | U2-4 | Medium | 2–4 h | ~~`delete-account` cascade-only delete~~ **done 2026-06-12** |
| **B** | U2-2 / U5-2 | Medium | 4–8 h | Server-side data fetch + input caps on edge functions |
| **B** | U2-1 | Medium | 1–2 h | CORS allowlist decision + implementation |
| **B** | U6-2, U6-3 | Medium | 1–2 h | Dependency upgrades (react-router, vitest, vite) |
| **B** | U6-4 | Medium | 2–4 h | CI permissions + audit gate + secret scan |
| **C** | U1-3 | Low | 2–4 h | category_id ownership constraint |
| **C** | U4-5, U4-6 | Low–Med | 4 h | migrateGuest / localStore caps |
| **C** | U2-3, U3-4 | Low | 1–2 h | Generic error messages |
| **C** | U7-2, U7-3 | High (when deploy exists) | 2–4 h | Security headers + runtime verification |

## CI/CD security integration (recommended)

- [ ] `pnpm audit --audit-level=high` in CI (after U0-2)
- [ ] gitleaks or trufflehog on push/PR
- [ ] Dependabot or Renovate for `package.json` + GitHub Actions
- [ ] `permissions: contents: read` on workflow (U6-4)
- [ ] Optional: ESLint `eslint-plugin-security` on `src/` and `supabase/functions/`

## OWASP Top 10 summary (adapted)

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken access control | **Medium** | RLS looks correct statically; CORS `*` on functions; live RLS unverified |
| A02 Cryptographic failures | **High** | `.env` in git history; anon key exposure (expected in SPA, bad hygiene) |
| A03 Injection | **Low–Med** | No SQL injection path; prompt injection self-scoped; XSS mitigated by React |
| A04 Insecure design | **Medium** | Client-trusted edge inputs; delete-account partial failure |
| A05 Misconfiguration | **Blocked** | No deploy headers yet; edge error leakage |
| A06 Vulnerable components | **Medium** | 7 audit findings, mostly dev-deps |
| A07 Auth failures | **Medium** | Auto-confirm tradeoff; dashboard policy unverified |
| A08 Integrity failures | **Medium** | Lockfile chaos; esm.sh remote imports |
| A09 Logging/monitoring | **Low** | `console.error` in functions only — acceptable for MVP |
| A10 SSRF | **N/A** | No user-controlled outbound URLs |

---

_Report generated 2026-06-12. Re-run Unit 1 live probes and Unit 7 deploy checks when test accounts and hosting exist._
