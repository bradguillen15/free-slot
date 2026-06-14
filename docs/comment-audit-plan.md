# Tech Plan — Comment audit & noise reduction

**Status:** implemented (2026-06-13) — comment policy added to `frontend-standards.md` (§7) and Phases 0–5 completed in `c235d17`; Phase 6 (shadcn `ui/` sweep) is intentionally deferred. Kept as the design record.  
**Date:** 2026-06-13  
**Origin:** user request — review project comments, remove noise, keep only comments that add real value.  
**Related:** [frontend-standards.md](./frontend-standards.md), [documentation-standards.md](./documentation-standards.md), [code-review-plan.md](./code-review-plan.md) (Unit 7 — misleading comments in `ActivityEditor`), [ui-surface-components-plan.md](./ui-surface-components-plan.md) (separate UI refactor track)

---

## 1. Problem statement

Comments are inconsistent: some files document non-obvious business rules well (`migrateGuest.ts`, `localStore.ts`), while others restate what the code already says (`CalendarPage` state labels, vendored shadcn sidebar notes). Noise makes **high-signal comments harder to spot** and increases maintenance cost (comments drift when code changes).

There is **no comment policy** in the standards today beyond “English only.” There is **no linter** for comment quality; enforcement is manual review + this cleanup pass.

### Rough inventory (2026-06-13, `src/`)

| Area | `//` line comments (approx.) | `/**` blocks (approx.) | Notes |
|---|---|---|---|
| `src/lib/` | ~120 | ~25 | Mix of high-value module headers and step markers |
| `src/components/` | ~80 | ~35 | Includes vendored `ui/` shadcn noise |
| `src/pages/` | ~45 | ~10 | Many “dialog state” labels |
| `src/hooks/` | ~5 | ~1 | Mostly shadcn `use-toast` |
| `src/test/` | ~35 | ~5 | Section banners in large test files |
| **Total `src/`** | **~285** | **~76** | Excludes `integrations/supabase/types.ts` (generated) |

No `TODO` / `FIXME` / `HACK` markers found in `src/` (good). A few **commented-out code** lines exist (see §4.4).

---

## 2. Decisions

1. **Default stance: no comment** unless it passes the keep test in §3. Prefer clearer names, small extractions, and types over comments.
2. **Explain *why*, not *what*.** If a comment describes *what* the next line does, delete it or rename the symbol.
3. **Module/file headers are allowed** when they describe role, invariants, or architecture a reader cannot infer from imports alone (e.g. guest/cloud adapter, localStorage layout).
4. **JSDoc on exported APIs** — keep when it documents contract, units, edge cases, or guest/cloud behavior. Remove when it duplicates the function name.
5. **Vendored shadcn (`src/components/ui/`)** — do not bulk-edit upstream-style comments in one pass; only remove obvious noise when touching a file for other work, except `sidebar.tsx` (heavily customized, many restate-the-obvious comments).
6. **Test comments** — keep when they explain *test intent*, timing races, timezone pins, or mock ordering. Remove decorative section banners unless the file is 200+ lines and banners aid navigation.
7. **`eslint-disable` comments** — always pair with a one-line *why* on the same or preceding line; prefer `eslint-disable-next-line` over file-wide disables.
8. **Do not delete** comments that document product/security decisions referenced elsewhere (Auth auto-confirm, migrate retry safety, RLS-adjacent edge-function behavior).
9. **Document the policy** in [frontend-standards.md](./frontend-standards.md) so future PRs stay clean (§7).

---

## 3. Keep vs remove criteria

### Keep (high value)

| Category | Example | Location |
|---|---|---|
| **Non-obvious invariant** | Overnight blocks: `end < start` is valid; equal times expand to nothing | `ScheduleBlockDialog.tsx` |
| **Workaround with external cause** | Dialog scroll-lock swallows wheel events on portaled popovers | `CategoryPicker.tsx` |
| **Migration / retry semantics** | Dedupe on `(date, start, end)` so partial retry does not duplicate | `migrateGuest.ts` |
| **Storage schema** | `freeslot.guest.time_logs.YYYY-MM` bucket layout | `localStore.ts` |
| **Product decision** | Auto-confirm email; guest copy cleared to avoid re-prompt | `Auth.tsx` |
| **Security / atomicity** | Upsert instead of delete-then-insert to avoid race | `weekly-review` edge function |
| **Test intent** | Week A’s slow response must be ignored after week B | `dataStore.test.ts` |
| **Plan cross-reference** | Guest dashboard scope pointer | `DashboardPage/index.test.ts` |
| **Public API contract** | `pickerCategories` hidden-label semantics | exported helpers with non-obvious behavior |
| **ESLint exception reason** | Intentionally omit `searchParams` from deps | `CalendarPage/index.tsx` |

### Remove (noise)

| Category | Example | Action |
|---|---|---|
| **Restates identifier** | `// Quick-log dialog state` above `logOpen` | Delete |
| **Restates structure** | `// Sub-components` section banner before obvious split | Delete or collapse file |
| **Obvious shadcn/ui** | `// Helper to toggle the sidebar` | Delete when editing file |
| **Stale / misleading** | Optimistic-update revert comment that no longer matches code | Fix or delete ([code-review-plan](./code-review-plan.md) Unit 7) |
| **Commented-out code** | Old import example in `client.ts` | Delete (use docs or git history) |
| **Empty JSDoc** | `/** Color palette cycled... */` when `nextCreateColor` is self-explanatory | Delete unless palette rationale is non-obvious |
| **Decorative test banners** | `// ── Auth mock ──` in medium-sized files | Delete unless file exceeds ~250 lines |

### Gray area — judge per PR

| Category | Guidance |
|---|---|
| **Section dividers** (`// ---------- Categories ----------`) in long files | Keep in `dataStore.ts` / `localStore.ts` until file is split; remove if module gets co-located hooks |
| **Single-line file purpose** | `// Pure segment math for the day timeline` — keep if file has no other doc; merge into JSDoc on export if one main export |
| **Prop JSDoc on internal components** | Keep on shared/reused props; remove on private page subcomponents |

---

## 4. Audit findings by area

### 4.1 High priority — misleading or stale (fix first)

| File | Issue | Action |
|---|---|---|
| [ActivityEditor.tsx](../src/components/activities/ActivityEditor.tsx) | Misleading comment on optimistic-update revert path (flagged in code-review Unit 7) | Re-read block; delete or rewrite to match actual behavior |
| [use-toast.ts](../src/hooks/use-toast.ts) | shadcn boilerplate: `// ! Side effects ! - This could be extracted...` | Delete (no action implied) |
| [integrations/supabase/client.ts](../src/integrations/supabase/client.ts) | Commented-out import example | Delete lines; usage is documented in frontend-standards |

### 4.2 Medium priority — page orchestration noise

| File | Pattern | Est. removals |
|---|---|---|
| [CalendarPage/index.tsx](../src/pages/CalendarPage/index.tsx) | `// Quick-log dialog state`, `// Sync ?date= on change`, etc. | ~5–6 |
| [WeekPage.tsx](../src/pages/WeekPage.tsx) | Inline section / state labels | ~4–6 |
| [Onboarding.tsx](../src/pages/Onboarding.tsx) | Step labels where `step` enum/name is clear | ~1–2 |
| [SettingsPage.tsx](../src/pages/SettingsPage.tsx) | Hydration comment — **keep** if effect is non-obvious; tighten wording | 0–1 |

### 4.3 Medium priority — component noise

| File | Pattern | Action |
|---|---|---|
| [DayTimeline.tsx](../src/components/day/DayTimeline.tsx) | `// Long-press tracking`, `// Sub-components`, `// Treat as a click` | Remove obvious; **keep** fixed-position viewport comment if non-obvious |
| [ui/sidebar.tsx](../src/components/ui/sidebar.tsx) | ~11 comments explaining standard React/shadcn patterns | Remove on dedicated pass (customized file) |
| [ui/chart.tsx](../src/components/ui/chart.tsx) | Generic helper labels | Remove when touched |
| [categoryColors.ts](../src/lib/categoryColors.ts) | One-line file header | Optional delete |

### 4.4 Low priority — keep mostly as-is

| File | Why |
|---|---|
| [migrateGuest.ts](../src/lib/migrateGuest.ts) | Step comments document retry/dedupe — core onboarding knowledge |
| [localStore.ts](../src/lib/localStore.ts) | Storage layout + guest semantics |
| [dataStore.ts](../src/lib/dataStore.ts) | Module header + section markers in 580-line adapter |
| [time.ts](../src/lib/time.ts) / [gaps.ts](../src/lib/gaps.ts) / [daySegments.ts](../src/lib/daySegments.ts) | Overnight/time math invariants |
| [supabase/functions/_shared/planning.ts](../supabase/functions/_shared/planning.ts) | Lexical HH:MM comparison assumption |
| [test/supabaseMock.ts](../src/test/supabaseMock.ts) | Usage docs at top — **keep**; trim commented mock example at L4–5 |

### 4.5 Explicitly out of scope

- [integrations/supabase/types.ts](../src/integrations/supabase/types.ts) — generated
- [eslint.config.js](../eslint.config.js) — rule rationale comments are documentation
- User-facing copy, i18n keys, README, plan docs
- Auto-generated shadcn files never customized (`table.tsx`, etc.) — no comment pass unless edited for other reasons

---

## 5. Implementation phases

Small PRs; one phase per session. Run `pnpm lint` and `pnpm test` after each.

### Phase 0 — Policy (this document + standards)

- [x] Draft audit plan
- [x] Add comment policy to [frontend-standards.md](./frontend-standards.md) (§7)
- [ ] Optional: add PR review bullet to [documentation-standards.md](./documentation-standards.md) (“new comments must pass keep test”)

### Phase 1 — Fix misleading / dead comments

- [x] `ActivityEditor.tsx` — re-read block; comments are accurate and pass keep test (no change needed)
- [x] `use-toast.ts` — removed `// ! Side effects !` shadcn noise
- [x] `client.ts` — removed commented import example
- [x] `supabaseMock.ts` — header doc passes keep test (non-obvious usage); left as-is

**Gate:** no behavior changes; tests green. ✓

### Phase 2 — Pages (`src/pages/`)

- [x] `CalendarPage/index.tsx` — removed 5 state labels; tightened eslint-disable with "sync loop" reason; kept weekday-default and currentMinute invariant comments
- [x] `WeekPage.tsx` — removed 5 state/map labels + JSX section banner; kept overnight-block invariant
- [x] `MonthPage.tsx` — both comments pass keep test; no change
- [x] `Auth.tsx` — removed "already signed-in" label; kept all 3 product/security comments
- [x] `Onboarding.tsx` — removed `{/* Progress */}` JSX banner; kept step-3 one-load-only comment
- [x] `SettingsPage.tsx` — hydrate guard + reset-after-save comments both pass keep test; no change

**Gate:** visual smoke-test Calendar + Week; tests green. ✓

### Phase 3 — Feature components (`src/components/` excluding bulk `ui/`)

- [x] `day/DayTimeline.tsx` — removed `// Long-press tracking`, `// Sub-components` banner, `// Position relative to viewport`; kept `// Treat as a click` and custom-event comment
- [x] `day/ScheduleBlockDialog.tsx` — added why to `eslint-disable-next-line`; kept re-sync comment
- [x] `day/CategoryPicker.tsx` — no comments; already clean
- [x] `activities/*` — ActivityEditor comments accurate; no change
- [x] `AppLayout`, `OnboardingGate` — no comments; already clean
- [x] `pages/*/use*.ts` — added why to `eslint-disable-line` in `useAutoScrollToHour` and `useWeeklyReviewPrompt`

### Phase 4 — Lib & edge functions

- [x] `src/lib/` — all comments pass keep test; section markers kept in dataStore.ts/localStore.ts; `week.ts` one-liner kept (Monday convention)
- [x] `supabase/functions/` — all edge-function comments are security/atomicity docs; no changes

### Phase 5 — Tests

- [x] No decorative banners found in test files under 200 lines
- [x] `Onboarding.test.tsx` (209 lines) — banners kept for navigation
- [x] `dataStore.test.ts` comments: race-condition, ordering, and scenario comments all kept

### Phase 6 — shadcn sidebar (optional cleanup)

- [ ] `ui/sidebar.tsx` — remove obvious React pattern comments (~11 lines)
- [ ] Other `ui/*` — **only when already editing** for another task; no dedicated 40-file sweep

---

## 6. Review checklist (for PRs and agents)

Before merging comment changes:

- [ ] Every remaining comment passes §3 **Keep** test
- [ ] No new comments that restate variable/function names
- [ ] No commented-out code introduced or left behind
- [ ] `eslint-disable` lines have an adjacent *why*
- [ ] Exported functions with non-obvious contracts still have JSDoc
- [ ] English only
- [ ] If a comment references behavior, run the nearest test file

**PR description template (optional):**

```markdown
## Comment audit
- Removed: N noise comments (state labels / obvious shadcn / stale)
- Kept/rewrote: N high-signal comments (invariants, workarounds, product rules)
- Misleading fixes: (list files)
```

---

## 7. Documentation updates (Phase 0)

Add to **frontend-standards.md** under Coding Standards:

```markdown
### Comments

- **Default: no comment.** Code should be self-explanatory via naming and types.
- **Do comment** when explaining *why*: non-obvious invariants, guest/cloud semantics, retry/dedupe logic, browser/library workarounds, product or security decisions, non-obvious test setup.
- **Do not comment** what the code already says (state variable labels, “helper function”, section titles mirroring the next function name).
- **JSDoc** on exported APIs when behavior, units, or edge cases are not obvious from the signature.
- **`eslint-disable`** must include a one-line reason.
- Vendored shadcn files: do not add noise; remove obvious upstream comments when editing those files.
```

Cross-link from [base-standards.md](./base-standards.md) is unnecessary (frontend-standards is already linked).

---

## 8. Tooling (optional, later)

Not required for this plan; manual review is sufficient at current size.

| Tool | Purpose | Verdict |
|---|---|---|
| `grep` / ripgrep | Find `//`, `/**`, `eslint-disable`, commented-out imports | Use during each phase |
| `eslint-plugin-no-commented-out-code` | Fail CI on commented code | Optional; low ROI today (almost none found) |
| LLM-assisted pass | Batch classify keep/remove | Use with §3 checklist; human review required |
| `knip` / dead code | Unrelated but pairs well with comment cleanup | See code-review-plan Unit 10 |

---

## 9. Success criteria

- Comment count in `src/` reduced by **~25–35%** (mostly noise in pages + ui/sidebar), without losing migrateGuest/localStore/dataStore architectural docs
- Zero misleading comments flagged in code-review-plan Unit 7
- Zero commented-out code in `src/` (except intentional eslint/tsconfig directives)
- Policy documented in frontend-standards; future PRs use §6 checklist
- All tests pass; no runtime behavior changes

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Deleting a comment that hid a subtle bug | Prefer rewrite over delete for gray areas; run tests; keep invariant comments |
| Re-introducing noise via shadcn regen | Document “no obvious comments” in standards; strip on regen PRs |
| Over-pruning test comments | Phase 5 rule: if deleting makes test intent unclear, keep |
| Two agents re-comment differently | Single policy in frontend-standards + PR checklist |

---

## 11. Relationship to other plans

- **[ui-surface-components-plan.md](./ui-surface-components-plan.md)** — orthogonal; new `Surface` / `StatCard` should follow this comment policy from day one (minimal headers).
- **[code-review-plan.md](./code-review-plan.md)** — Unit 7 `ActivityEditor` item closes in Phase 1 of this plan.
