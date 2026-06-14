# Full Codebase Review Plan & Tracker

**Goal:** Objectively review the entire codebase in parts, across multiple sessions, with persistent progress tracking.
**Scope:** All app code. Excluded: `src/components/ui/` (vendored shadcn primitives), `node_modules`, lockfiles, generated assets.
**Method:** Based on the `code-auditing` skill (`.claude/skills/code-auditing/SKILL.md`).

---

## How to use this document (session protocol)

Each review session follows the same loop:

1. **Resume:** Read this file. Pick the first unit with status `pending` (or finish one marked `in-progress`).
2. **Mark in-progress:** Set the unit's status and date before starting.
3. **Review:** Read every file in the unit line by line. Apply the per-unit checklist below plus the fixed analysis categories (see "Objectivity rules").
4. **Verify:** Every finding must cite `file:line` and a concrete failure scenario (inputs/state → wrong outcome). Verify against the actual code before recording — no speculative findings. Pre-seeded candidates from earlier sessions must be re-verified (line numbers drift).
5. **Record:** Append findings to the unit's findings section at the bottom of this file, with severity (Critical / High / Medium / Low / Quick Win).
6. **Mark done:** Set status `done` with the date. Note anything deliberately skipped.
7. **Final session:** After all units are done, run the cross-cutting passes (Unit 10) and consolidate everything into a refreshed `CODE_AUDIT.md` report.

**Do not fix code during review sessions.** Review and fixing are separate tasks; fixes go through the normal OpenSpec workflow (CLAUDE.md §7).

## Objectivity rules

Applied identically to every unit so no part gets a softer pass:

- **Fixed categories per file:** correctness bugs · missing error handling · security (input validation, RLS assumptions, secrets) · performance (wasted fetches/renders, N+1) · dead code · duplication / reinventing installed libs (date-fns, react-query, zod) · type safety (`any`, `as unknown as`, drifting local type copies) · guest/cloud parity (both `dataStore` and `localStore` paths behave the same).
- **Severity rubric:** Critical = data loss, broken build, blank screen, security hole. High = wrong results shown to user, race conditions, unmaintainable hot spot. Medium = quality/best-practice deviation with concrete cost. Low/Quick Win = style, minor, <30 min fix.
- **Evidence rule:** a finding without a quotable line and a nameable failure scenario doesn't get recorded.
- **Cross-references:** when the same defect pattern appears in multiple units, record it once in each affected unit and link them — repeated patterns feed the Unit 10 consolidation.

## Baseline commands (run at the start of Session 0 and again before the final report)

```sh
pnpm lint
npx tsc -p tsconfig.app.json --noEmit
pnpm test
npx knip --reporter json   # dead code / unused deps (verify findings manually)
pnpm build                 # known to fail per CODE_AUDIT.md C-2 — confirm status
```

---

## Review units & status

Units are sized ~600–1,200 lines so one unit fits comfortably in a single session, ordered highest-risk first.

| # | Unit | Files | ~Lines | Status | Date | Session notes |
|---|------|-------|-------:|--------|------|---------------|
| 0 | Baseline & tooling | configs (`vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `tsconfig*`, `package.json`), run baseline commands | ~200 | done | 2026-06-10 | Lint: 0 errors/9 warnings. tsc: 1 ERROR. Tests: 1/1 (example only). Build: PASSES (CODE_AUDIT C-2 stale). knip skipped (not installed) |
| 1 | Data core | `src/lib/*` (dataStore, localStore, migrateGuest, time, week, gaps, schedule, celebrate, utils) | 1,081 | done | 2026-06-10 | Covered by multi-agent review; findings recorded below |
| 2 | Backend surface | `supabase/functions/*` (delete-account, weekly-review, generate-weekly-plan), `supabase/migrations/*.sql`, `src/integrations/supabase/*` | ~960 | done | 2026-06-10 | RLS solid on all 9 tables; findings below. types.ts skimmed only (generated) |
| 3 | Auth & app shell | `src/contexts/AuthContext.tsx`, `src/App.tsx`, `src/main.tsx`, `src/components/{ProtectedRoute,OnboardingGate,AppLayout,GuestBanner,PublicHeader,ViewSwitcher,LanguageSwitcher,EmptyState}.tsx`, `src/hooks/*` | ~820 | done | 2026-06-10 | Shell is clean overall; findings below |
| 4 | Day & logging flow | `src/components/day/*` (DayTimeline, ScheduleBlockDialog, QuickLogDialog, DaySummary), `src/pages/CalendarPage.tsx` | ~1,190 | done | 2026-06-10 | All 3 pre-seeded findings re-confirmed; new findings added below |
| 5 | Week & AI planning | `src/pages/WeekPage.tsx`, `src/components/week/{WeekGrid,AIPlanPanel}.tsx`, `src/components/calendar/*` | ~930 | done | 2026-06-10 | All 3 pre-seeded candidates verified; new findings added below |
| 6 | Month, dashboard & review | `src/pages/{MonthPage,DashboardPage}.tsx`, `src/components/dashboard/WeeklyReviewModal.tsx` | ~790 | done | 2026-06-10 | Pre-seeds confirmed; new classification-inconsistency + chart-matching findings below |
| 7 | Activities & settings | `src/pages/{ActivitiesPage,SettingsPage}.tsx`, `src/components/activities/{ActivityEditor,PriorityRanker}.tsx` | ~800 | done | 2026-06-10 | All pre-seeds confirmed. CODE_AUDIT C-1 (guest-blank ActivitiesPage) is FIXED — page now uses dataStore hooks |
| 8 | Onboarding & public pages | `src/pages/{Onboarding,Auth,Landing,NotFound}.tsx` | ~810 | done | 2026-06-10 | Pre-seeds confirmed; non-atomic cloud finish() + startFresh findings added |
| 9 | i18n & tests | `src/i18n/*` (index + en/es locales), `src/test/*` | ~250 | done | 2026-06-10 | en↔es key parity perfect (81/81); coverage is the gap — app interior hardcodes English |
| 10 | Cross-cutting consolidation | knip dead-code pass, dependency audit, pattern consolidation across units, refresh `CODE_AUDIT.md` | — | done | 2026-06-10 | CODE_AUDIT.md reconciled (status table prepended); stale docs updated (README, ARCHITECTURE, TECH_STACK, data-model). knip not run — do in a follow-up |

**Prior art to reconcile, not redo:**
- `CODE_AUDIT.md` (2026-06-09) — earlier single-pass audit; its findings (C-1 ActivitiesPage guest blank, C-2 build failure, C-3 gaps clamp, etc.) must be checked during the matching unit: still open, fixed, or stale.
- Unit findings below dated 2026-06-10 — verified by the multi-agent review; re-verify line numbers if the file changed since (`git log -1 --format=%cs -- <file>`).

---

## Fixes applied — 2026-06-10 (verified: 18/18 tests, tsc clean, lint 0 errors, build passes)

New tests added: `src/lib/time.test.ts`, `src/lib/gaps.test.ts`, `src/lib/localStore.test.ts` (TDD — written failing first).

**Fixed (Critical/High):**
- migrateGuest.ts — error checks on every step (incl. categories/profile); retry-idempotent (dedupes activities by name, blocks by name+times, logs by date+times; priorities upsert on conflict); `clearGuestData()` only after full success.
- dataStore.ts — all 5 read hooks check `error`, keep last data instead of clobbering with `[]`, and expose `error`; `useTimeLogsInRange` has a stale-response sequence guard.
- gaps.ts blocksOnDay — overnight blocks now occupy the FOLLOWING morning; zero-length blocks occupy nothing. WeekPage passes the unfiltered block list.
- time.ts — `expandRange(s, s)` returns `[]`; new shared `durationMinutes()` (overnight-aware) replaces all three `durMin` copies; MonthPage now wraps overnight and uses the stored log type (consistent with Dashboard/DaySummary).
- localStore.ts — month iteration is string-based (timezone bug fixed); `readArray`/getProfile shape validation; `updateLog` throws on missing id (cloud parity).
- DashboardPage.tsx:152 — type predicate fixed; **tsc passes again**.
- SettingsPage — category rename works (uncontrolled input + key, trims, skips no-ops).
- PriorityRanker — guest rankings persist to localStore (migration path is live); cloud path is a single race-safe upsert; fetch error logged.
- ScheduleBlockDialog — rejects equal start/end times.
- Auth — "Start fresh" clears guest data.
- AIPlanPanel — slot weekday labels parse as local dates (UTC bug); clearPlan checks the delete error; "Lovable AI" copy removed.
- CalendarPage — auto-scroll no longer re-fires on the minute tick.
- QuickLogDialog — success toast only after the insert resolves.
- ActivityEditor — NaN/negative target hours rejected and reverted; dead snapshot block removed.
- DayTimeline — ScheduleBlock.type matches the DB enum. NotFound uses `<Link>`. Onboarding dead `canNext` removed.

**Still open (deliberately deferred — each deserves its own change):** i18n interior coverage (High), react-query adoption or provider removal, dead toast stack + unused deps (knip pass), Onboarding finish() atomicity + dataStore routing, AIPlanPanel accepted-state dedup against existing logs, per-slot full-week refetch, WeekGrid index keys, DashboardPage/WeeklyReviewModal shared pipeline extraction, name-based plan-vs-actual matching, DB CHECK constraints, `strict: false`, bundle code-splitting, OnboardingGate error handling, guest-change event key filtering, ViewSwitcher labels, DayTimeline CustomEvent → prop.

**Update 2026-06-10 (testing-plan execution):** two more edge-function findings fixed while extracting testable helpers — `generate-weekly-plan` now validates AI slot output (`_shared/planning.ts: validateSlots`) before persisting, and `weekly-review` uses an atomic upsert instead of delete+insert. Both are unit-tested. CI (GitHub Actions) now gates lint+typecheck+test+build.

**Note:** two unarchived OpenSpec changes exist (`calendar-google-style`, `supabase-self-managed-migration`); these review fixes are outside their scope, but both changes should be verified/archived (`opsx:verify` → `opsx:archive`).

## Findings log

Append per-unit. Format: `severity — file:line — summary — failure scenario`.

### Unit 0 — Baseline & tooling (reviewed 2026-06-10)

- **High — src/pages/DashboardPage.tsx:152 — typecheck fails.** `tsc -p tsconfig.app.json --noEmit` errors: type predicate `type: string` not assignable to `"productive" | "unproductive"`. The build passes because Vite doesn't typecheck — CI/`tsc` is broken.
- **Medium — vite build emits a single 1.4 MB chunk (412 KB gzip).** No route-level code splitting (`React.lazy`) or `manualChunks`; recharts/framer-motion/all pages load up front.
- **Medium — test suite is a placeholder.** Only `src/test/example.test.ts` (1 trivial test). None of the date/gap/migration logic in src/lib — where all Critical findings live — has tests, despite vitest being fully configured.
- **Low — three lockfiles coexist** (`package-lock.json`, `bun.lockb`, `pnpm-lock.yaml` — the latter untracked). Pick one package manager and delete the others.
- **Stale (CODE_AUDIT C-2):** production build now passes; the `@tanstack/query-core` dedupe issue is no longer reproducible with the pnpm lockfile.

### Unit 1 — Data core (reviewed 2026-06-10, verified)

- **Critical — src/lib/migrateGuest.ts:14 — category select/insert errors silently ignored.** On failure, catIdMap is empty → all activities/blocks/logs migrate with `category_id=null` (or default categories duplicate), then `clearGuestData()` still wipes localStorage with a success toast. Permanent data loss.
- **Critical — src/lib/migrateGuest.ts:47 — migration not idempotent.** Mid-migration throw leaves cloud half-populated, guest data intact, dialog retryable → retry duplicates activities/blocks/log chunks (no unique constraints). A retry reaching the priorities step hits UNIQUE(user_id, week_start, activity_id) and can never complete.
- **High — src/lib/dataStore.ts:45 — all five read hooks ignore Supabase `error`.** Failed query → `setData([])`: real data silently replaced by empty state, no error surfaced. Same pattern at lines 70, 95, 119, 146.
- **High — src/lib/gaps.ts:51 — overnight wrap segment applied to the block's own weekday.** Sleep 23:00→07:30 Mon–Fri blocks Monday 00:00–07:30 (wrong) and leaves Saturday morning free (wrong); AI planner schedules into sleep time.
- **High — src/lib/localStore.ts:217 — listLogsInRange skips the final month bucket west of UTC.** `new Date(endISO)` is UTC midnight vs local-time month iteration; weeks ending on the 1st drop that day's logs in guest mode.
- **High — src/lib/time.ts:58 — expandRange treats end === start as full-day overnight wrap.** `[[start,1440],[0,start]]` occupies 24h; no caller or dialog validates equal times (see Unit 4).
- **Medium — src/lib/localStore.ts:87 — read() has no shape validation.** Valid-JSON-wrong-shape localStorage (e.g. `"null"`, `"{}"`) returned as typed value → TypeError white-screen with no recovery.
- **Medium — src/lib/localStore.ts:273 — updateLog silently resolves undefined on missing id** while cloud `updateTimeLog` (.single()) throws; callers toast success for a no-op (CalendarPage.tsx:138).
- **Medium — src/lib/dataStore.ts:129 — useTimeLogsInRange has no stale-response guard.** Rapid week navigation lets a slow old response overwrite the newer week's data.
- **Medium — src/lib/dataStore.ts:33 — five hooks are near-identical copy-paste** (mode branch + tick + refresh); a generic dual-source hook (or react-query, already installed and provided but unused) removes ~120 lines and fixes the error/race issues once.
- **Cross-cutting note:** guest/cloud adapter has asymmetric error contracts (cloud reads swallow errors; guest writes no-op where cloud throws). Root cause behind several findings — fix at the adapter layer.

### Unit 2 — Backend surface (reviewed 2026-06-10)

- **Medium — supabase/functions/weekly-review/index.ts:85 — non-atomic delete-then-insert** for `weekly_reviews` despite `UNIQUE (user_id, week_start)` existing; two concurrent calls race (second insert hits the constraint → 500, or review lost). `generate-weekly-plan` already shows the correct pattern: `upsert(..., { onConflict: "user_id,week_start" })`.
- **Medium — supabase/functions/generate-weekly-plan/index.ts:125 — AI slot output stored unvalidated** (`parsed.slots: unknown[]`). `day`/`start`/`end` values are never checked (format, end > start, inside a real free window) before being persisted and later inserted into `time_logs` by AIPlanPanel — the server is the right place to validate, and an `end === start` slot triggers the time.ts full-day bug client-side.
- **Medium — migrations — no CHECK constraints back up client validation:** `activities.target_hours_per_week` accepts negatives/NaN-as-null (pairs with ActivityEditor finding), `weekly_priorities.rank` unconstrained, `days_of_week INT[]` accepts values outside 0–6. (Note: `end_time > start_time` is intentionally NOT checkable — overnight blocks are a feature.)
- **Low — duplicate UNIQUE constraint on weekly_plans:** the initial migration already declares `UNIQUE (user_id, week_start)` (20260427044211 line 103) and migration 20260501022919 adds `weekly_plans_user_week_unique` for the same columns — two redundant unique indexes.
- **Low — supabase/migrations/20260427044240_*.sql is an empty file** (0 bytes); stale artifact.
- **Low — supabase-js version drift across edge functions** (delete-account pins esm.sh 2.45.0; the other two pin 2.57.4).
- **Low — src/integrations/supabase/client.ts:5 — env vars used without validation;** missing `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` produces a cryptic runtime crash instead of a clear startup error.
- **Note (data model) — time_logs.type duplicates the category's type;** changing a category from productive→unproductive leaves old logs with the stale type. Possibly intentional (historical accuracy) — should be documented in docs/data-model.md.
- **Positive:** RLS enabled on all 9 tables with correct owner policies; `handle_new_user` trigger is SECURITY DEFINER with pinned `search_path`; all FKs cascade from auth.users; edge functions authenticate via user JWT and write through RLS (anon key), not service role.

### Unit 3 — Auth & app shell (reviewed 2026-06-10)

- **Medium — src/components/OnboardingGate.tsx:31 — profiles query ignores `error`.** On a failed query `data` is undefined → status "needs" → a fully-onboarded user is redirected to /onboarding; re-completing it re-inserts blocks/activities (duplicates). Same root pattern as dataStore error-swallowing.
- **Medium — dead toast system.** `src/hooks/use-toast.ts` (186 lines) and `<Toaster />` (App.tsx:4/26, ui/toaster, ui/toast) have zero consumers — all 10 toast call sites import from `sonner`. Two toast systems are mounted; one is dead weight in the bundle.
- **Medium — App.tsx:21 — QueryClientProvider mounted but react-query is never used** (zero `useQuery`/`useMutation` in src). Either adopt it in dataStore (recommended; fixes the error/race findings) or remove the provider + dependency.
- **Low — src/components/ViewSwitcher.tsx:7 — hardcoded English labels** ("Day"/"Week"/"Month") in an otherwise fully i18n'd shell (AppLayout nav uses `t()`); Spanish users see mixed languages in the calendar switcher.
- **Low — src/contexts/AuthContext.tsx:34 — signOut ignores the returned error;** offline sign-out fails silently and the UI continues to show the user as signed in.
- **Low — src/hooks/use-mobile.tsx — no consumers outside vendored ui/** (only ui/sidebar imports it); dead-code candidate together with unused ui primitives (defer to Unit 10 knip pass).
- **Positive:** AuthContext subscribes before getSession and unsubscribes on cleanup; OnboardingGate cancels in-flight async on unmount; route gating (ProtectedRoute for cloud-only pages, OnboardingGate for both modes) matches the nav's `requiresAuth` flags exactly.

### Unit 4 — Day & logging flow (pre-seeded 2026-06-10, verified; re-verify on review)

- **High — src/components/day/ScheduleBlockDialog.tsx:75 — save() never validates start vs end time** (only name and days); equal times + time.ts:58 → block occupies whole day, zero free windows.
- **Medium — src/pages/CalendarPage.tsx:74 — auto-scroll effect depends on `now` (60s interval)** → today's view smooth-scrolls back to the now-line every minute, yanking user scroll.
- **Medium — src/components/day/DayTimeline.tsx:214 — context menu talks to CalendarPage via getElementById + CustomEvent('add-block-here')** instead of an `onAddBlock` prop; invisible contract, breaks with a second instance.
- **Medium — src/components/day/DayTimeline.tsx:14 — hand-written ScheduleBlock type drifts from the schema:** declares `type: "fixed" | "flexible" | "buffer"` but the DB enum is `'fixed' | 'waste_expected'`. The `as unknown as` cast in CalendarPage.tsx:61 hides the mismatch — concrete instance of the type-duplication risk.
- **Medium — overnight-log rule is inconsistent at creation vs aggregation:** QuickLogDialog.tsx:69 rejects `end <= start` ("End time must be after start"), yet DashboardPage/WeeklyReviewModal wrap overnight durations and AIPlanPanel can insert overnight slots unvalidated. Decide once (are overnight logs legal?) and enforce it in the data layer.
- **Low — src/components/day/QuickLogDialog.tsx:99 — success toast fires before `insertTimeLog` resolves;** on failure the user sees "Logged 1h" followed by "Save failed" and the optimistic row lingers until the refresh corrects it.
- **Low — src/components/day/ScheduleBlockDialog.tsx:87 — `type: "fixed"` hardcoded;** the schema's `waste_expected` block type is unreachable from any UI.
- **Low — src/pages/CalendarPage.tsx:19 — `?date=` URL param is used unvalidated** (`searchParams.get("date") || todayISO()`); ViewSwitcher validates with an ISO regex but CalendarPage doesn't, so `?date=garbage` produces NaN weekday/Invalid Date navigation.
- **Low — src/components/day/DaySummary.tsx:67 — list keyed by `c.name`;** two categories with the same name (one productive, one unproductive) collide as React keys.

### Unit 5 — Week & AI planning (reviewed 2026-06-10)

- **Medium — src/components/week/AIPlanPanel.tsx:269 — slot weekday label is timezone-wrong:** `new Date(s.day).toLocaleDateString(..., { weekday: "short" })` parses the ISO date as UTC midnight, so users west of UTC see every AI slot labeled with the previous weekday. Same UTC-vs-local class as the localStore.listLogsInRange bug.
- **Medium — src/components/week/AIPlanPanel.tsx:53 — accepted-slot state is session-only with no dedup guard.** Reload or revisit the week → all slots show "Accept" again even though logs were already inserted; accepting again duplicates time_logs (slotKey is never checked against existing logs).
- **Medium — src/components/week/WeekGrid.tsx:150/177/204 — index keys (`gap-${i}`, `b-${i}`, `l-${i}`) on motion elements** → every refetch remounts and replays animations across all 7 columns; items carry stable ids.
- **Medium — src/components/week/AIPlanPanel.tsx:159 — accepting one AI slot triggers a full-week logs refetch** (N accepts → N refetches); the insert could return the row for a local append.
- **Low — src/components/week/AIPlanPanel.tsx:126 — clearPlan ignores the delete error;** on failure the plan disappears locally and reappears on next visit.
- **Low — src/components/week/AIPlanPanel.tsx:222 — stale branding: "Let Lovable AI fit your priorities…"** — the app migrated off Lovable; user-facing copy still names it.
- **Low — src/components/week/AIPlanPanel.tsx:84 — generate() re-queries activities directly from supabase** although WeekPage already holds them via useActivities (third independent weekly_priorities query path; see Unit 7 altitude finding).
- **Low — src/pages/WeekPage.tsx:114/129 — inline midnight-wrap split duplicated twice** instead of using `expandRange` from src/lib/time.ts.
- **Low — src/components/week/WeekGrid.tsx:10 — grid clips to 06:00–23:00;** segments outside the window (overnight wraps, early mornings) are silently hidden with no visual indicator, while DayTimeline shows all 24h.
- **Low — src/pages/WeekPage.tsx:42 — weekStart is never synced back to the URL** (CalendarPage syncs `?date=`); after navigating weeks, ViewSwitcher links and reloads lose the position.

### Unit 6 — Month, dashboard & review (pre-seeded 2026-06-10, verified; re-verify on review)

- **High — DashboardPage.tsx:30 / WeeklyReviewModal.tsx:25 / MonthPage.tsx:91 — overnight-duration rule implemented 3× with contradictory semantics** (wrap = 120min vs clamp = 0min); month totals disagree with dashboard for the same log. Belongs in src/lib/time.ts.
- **Medium — src/pages/DashboardPage.tsx:56 — raw supabase queries bypass dataStore hooks**; dashboard is hard-wired cloud-only and drifts from the shared layer (WeeklyReviewModal duplicates the same pipeline at :48 — same durMin copy, same 4-query Promise.all, same name-matching aggregation).
- **High — src/pages/DashboardPage.tsx:152 — the tsc error from Unit 0 lives here:** the type predicate in `.filter((x): x is {...type: string} => ...)` contradicts the inferred literal union. One-line fix unblocks typechecking for the whole repo.
- **Medium — productive/unproductive classification differs between views:** MonthPage.tsx:94 classifies a log by its category's *current* type (`cat?.type ?? l.type`) while DashboardPage.tsx:80 and DaySummary use the log's *stored* `l.type`. After a user changes a category's type, the same log counts differently in month vs dashboard/day views.
- **Medium — src/pages/DashboardPage.tsx:157 — "AI plan vs logged" matches planned *activity names* against actual *category names*.** An activity "Guitar" in category "Creative work" never matches; the chart shows planned-with-zero-actual and actual-with-zero-planned rows for the same real work. Same flawed matching feeds the weekly-review AI payload (WeeklyReviewModal.tsx:61-71), so the AI reflects on misleading numbers.
- **Low — src/pages/MonthPage.tsx:11-33 — hand-rolled pad/ym/isoDate/month math + English MONTHS/WEEKDAY_SHORT constants** duplicate src/lib/time.ts helpers and date-fns (installed); also the Monday-offset trick `(firstWeekday + 6) % 7` re-encodes the week-start convention privately (third place after week.ts and WeekPage).

### Unit 7 — Activities & settings (pre-seeded 2026-06-10, verified; re-verify on review)

- **High — src/pages/SettingsPage.tsx:248 — category rename is broken.** Controlled input whose onChange discards its result (`void updated`); value snaps back every keystroke, onBlur sends the original name.
- **High — src/components/activities/PriorityRanker.tsx:102 — guest drag-reorder silently dropped** (`if (!userId) return`); `localStore.setPriorities` is never called anywhere → migrateGuest priorities step is dead code. Cloud path is racy fire-and-forget delete-then-insert (use upsert with onConflict).
- **Medium — src/components/activities/ActivityEditor.tsx:151 — target_hours_per_week accepts negative/NaN** (Number(e.target.value) on blur, no guard, no DB CHECK).
- **Medium — src/pages/SettingsPage.tsx:108/121 — category update/delete omit `.eq('user_id')`** unlike all dataStore mutations. RLS covers it ("own cats all" policy) — defense-in-depth inconsistency only.
- **Low — src/components/activities/ActivityEditor.tsx:59 — dead snapshot block + misleading comments** in the optimistic-update revert path.
- **Low — src/components/activities/PriorityRanker.tsx:82 — priorities select ignores `error`** (only `.data` read) — same swallow pattern as dataStore; a failed fetch silently renders alphabetical order as if no ranking existed.
- **Low — src/pages/SettingsPage.tsx:119 — deleteCategory uses the browser `confirm()` dialog** while account deletion uses the styled AlertDialog; inconsistent destructive-action UX.
- **Note — Settings is auth-gated (ProtectedRoute + nav lock), so guests can never adjust peak hours/buffer after onboarding** even though the profile card's guest branch (`mode = "guest"`) is fully implemented dead code on this route. Either expose Settings (profile card only) to guests or drop the guest branch.

### Unit 8 — Onboarding & public pages (reviewed 2026-06-10)

- **Medium — src/pages/Onboarding.tsx:138-160 — cloud finish() is non-atomic and non-idempotent.** Blocks insert, then activities, then the profile update; if the profile update fails, `onboarding_completed` stays false, OnboardingGate routes the user back, and re-finishing duplicates blocks/activities. Same failure class as migrateGuest.
- **Medium — src/pages/Auth.tsx:101 — "Start fresh" never clears guest data.** It only closes the dialog; `hasGuestData()` stays true, so the migrate prompt re-appears on every later /auth visit and stale guest data resurfaces after sign-out. It should call `clearGuestData()` (with confirmation).
- **Medium — src/pages/Onboarding.tsx:107 — finish() re-implements the guest/cloud persistence switch inline**, bypassing dataStore mutations; onboarding-created records skip any validation added to the shared layer (categories fetch at :71 also ignores `error`).
- **Low — src/pages/Onboarding.tsx:170 — `canNext` ternary chain always evaluates true**; dead validation scaffolding wired to `disabled`.
- **Low — src/pages/NotFound.tsx:16 — `<a href="/">` forces a full page reload** (should be `<Link>`), and the page is hardcoded English while Landing/Auth/Onboarding are fully translated.
- **Positive:** Auth correctly gates the post-signup redirect on the migration dialog; Onboarding/Landing/Auth are the i18n gold standard the rest of the app should match.

### Unit 9 — i18n & tests (reviewed 2026-06-10)

- **High — i18n coverage stops at the front door.** en/es key parity is perfect (81/81 keys), and Landing/Auth/Onboarding/AppLayout shell use `t()` consistently — but the entire app interior is hardcoded English: CalendarPage, DayTimeline, QuickLogDialog, ScheduleBlockDialog, DaySummary, WeekPage, WeekGrid, AIPlanPanel, MonthPage, DashboardPage, WeeklyReviewModal, SettingsPage, ActivityEditor, PriorityRanker, ViewSwitcher, NotFound, plus all toast messages. A Spanish user gets a translated landing/onboarding, then an English app.
- **Medium — test suite is a placeholder** (restating Unit 0 with scope): vitest + jsdom + testing-library are fully configured, but the only test is `expect(true).toBe(true)`. Highest-value targets, in order: src/lib/time.ts (expandRange edge cases), src/lib/gaps.ts (overnight/day attribution), src/lib/week.ts + localStore.listLogsInRange (timezone boundaries), migrateGuest (error paths) — i.e., exactly where this review found the Critical/High bugs.
- **Positive:** i18n config (src/i18n/index.ts) is sound — localStorage persistence under `freeslot.lang`, navigator fallback, supportedLngs whitelist.

### Unit 10 — Consolidation (2026-06-10)

**Review complete: all units done.** Cross-cutting themes, in priority order:

1. **The dataStore adapter has asymmetric error contracts** — cloud reads swallow `error` (5 hooks), guest writes silently no-op where cloud throws, and the same swallow pattern leaked into OnboardingGate, PriorityRanker, AIPlanPanel, and Onboarding. One fix at the adapter layer (or adopting react-query, already installed) resolves ~10 recorded findings.
2. **Multi-step writes are non-atomic and non-idempotent** — migrateGuest (Critical), Onboarding finish(), PriorityRanker delete+insert, weekly-review edge function. Pattern fix: upserts with unique keys + error checks before destructive steps (clearGuestData).
3. **Date/time math is hand-rolled in 6+ places with 3 disagreeing conventions** — overnight wrap (wrap vs clamp vs reject), UTC-vs-local parsing (localStore month iteration, AIPlanPanel weekday labels), Monday-week-start encoded 3×. Consolidate into src/lib/time.ts + week.ts and add the missing unit tests there.
4. **Business rules live in the UI instead of the data layer** — time validation (QuickLog yes, ScheduleBlock no, AI slots never), type classification (stored vs current category type), guest/cloud branching re-implemented per page.
5. **Dead weight**: radix toast stack, react-query provider (unless adopted per #1), zod + react-hook-form, ~20 unused ui/ primitives + their packages, `strict: false` hiding it all. tsc currently fails on DashboardPage.tsx:152.

**Reconciliation of CODE_AUDIT.md (2026-06-09):** 11 of 17 items fixed, 4 still open (H-3 partial, M-3, L-3/L-4, L-6, T-1), 2 superseded by sharper findings here. Status table prepended to CODE_AUDIT.md; this file is now the canonical findings list.

**Docs updated this session:** README.md, docs/ARCHITECTURE.md, docs/TECH_STACK.md (stale Lovable Cloud / Lovable AI Gateway / Google OAuth references → self-managed Supabase + Anthropic API), docs/data-model.md (time_logs.type denormalization note).

**Deferred to a follow-up session:** `npx knip` dead-code/dependency pass (needs install approval); fixing anything (this was review-only — route fixes through OpenSpec per CLAUDE.md §7).

### Refuted candidates (do not re-report without new evidence)

- delete-account orphaned rows — all 9 tables have `ON DELETE CASCADE` to auth.users (migration 20260427044211).
- Guest-empty dashboard as a *bug* — `/dashboard` is behind ProtectedRoute; guests never reach it (cloud-only dashboard remains a product limitation).
- SettingsPage missing user_id filter as a *security hole* — RLS policy "own cats all" blocks cross-tenant writes.
- celebrate.ts threshold off-by-one — sole caller passes integer ratios with default minDelta=2, where `<= best + minDelta - 1` is exactly equivalent to the documented rule.
