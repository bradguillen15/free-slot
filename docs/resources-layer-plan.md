# Tech Plan — Resources Layer (Centralized Data Access)

**Status:** proposed  
**Date:** 2026-06-14  
**Origin:** user request — encapsulate all remote fetch/submit logic in a single `resources` layer so components and feature hooks never talk to Supabase directly, and a future backend swap only touches one place.  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [react-query-migration-plan.md](./react-query-migration-plan.md) (Phase 3 stragglers), [frontend-standards.md](./frontend-standards.md) §Data Access, [backend-standards.md](./backend-standards.md)

---

## 1. Goals

| Goal | What it means in practice |
|---|---|
| **Single I/O boundary** | Every `supabase.from(...)`, `supabase.functions.invoke(...)`, and future REST/GraphQL call lives under `src/resources/`. Nowhere else in app code. |
| **Portable backend** | To leave Supabase, replace the provider implementation under `src/resources/_providers/supabase/` (and edge-function adapters) while keeping the public resource API and domain types unchanged. |
| **Thin UI layer** | Pages, components, and feature hooks (`useWeeklyReviewData`, `usePriorityData`, …) contain **presentation and domain aggregation only** — no HTTP, no table names, no `useEffect` fetches. |
| **Guest/cloud stays unified** | `dataStore` remains the mode-aware façade (guest `localStore` vs cloud `resources`). Components still call `useCategories()`, not `resources.categories.list()`. |
| **Schema visibility** | DB structure is documented by migrations + generated types, **expressed** through resource modules and domain DTOs — not scattered as string literals in UI code. |

### Non-goals

- Replacing Supabase in this change (plan only prepares for it).
- Moving auth session management (`AuthContext`, `Auth.tsx`) — auth is not cacheable entity data.
- Changing edge-function server code under `supabase/functions/`.
- Forcing guest parity on account-only resources (weekly plans, AI, reviews).

---

## 2. Problem statement (current state)

The project already started the right direction:

- `src/lib/dataFetchers.ts` — cloud read functions (partial coverage).
- `src/lib/dataStore.ts` — React Query hooks + guest/cloud branching + **many inline Supabase mutations**.
- `src/lib/localStore.ts` — guest persistence mirror.
- `src/integrations/supabase/types.ts` — generated schema types.

But I/O is still **split across four places**, and several feature areas bypass the adapter entirely:

| Location | Issue |
|---|---|
| `dataStore.ts` | Mutations call `supabase.from(...)` inline (~15 call sites). Reads split between `dataFetchers` and inline calls. |
| `dataFetchers.ts` | Exists but is not the single cloud I/O module; naming doesn't signal "all requests live here". |
| `migrateGuest.ts` | Direct Supabase inserts/updates during signup migration. |
| `WeeklyReviewModal/useWeeklyReviewData.ts` | 4-table `Promise.all` + edge-function invoke in a feature hook. |
| `AIPlanPanel.tsx` | 6+ direct Supabase calls + `generate-weekly-plan` invoke. |
| `DashboardPage/useWeeklyReviewPrompt.ts` | Profile + review existence check in `useEffect`. |
| `PriorityRanker/` | `weekly_priorities` read/write in component hook. |
| `Onboarding.tsx`, `OnboardingGate.tsx`, `SettingsPage.tsx` | Residual direct profile/account calls. |

**Symptom:** `useWeeklyReviewData.ts` lines 35–42 embed table names, column lists, and filters — request logic that belongs in a resource module, not a dashboard hook.

**Risk if we migrate backend:** Every straggler file must be found and edited manually. No compile-time guarantee that Supabase is isolated.

---

## 3. Target architecture

Four layers, strict import direction (top → bottom only):

```
┌─────────────────────────────────────────────────────────────────┐
│  Pages / Components / Feature hooks                             │
│  (UI, form state, derived views — NO remote I/O)                │
└────────────────────────────┬────────────────────────────────────┘
                             │ useCategories(), upsertCategory(), …
┌────────────────────────────▼────────────────────────────────────┐
│  dataStore (+ queryKeys, queryClient)                           │
│  React Query hooks, guest/cloud switch, cache invalidation      │
└──────────────┬─────────────────────────────┬──────────────────────┘
               │ mode === "guest"           │ mode === "cloud"
┌──────────────▼──────────────┐   ┌─────────▼──────────────────────┐
│  localStore                 │   │  resources (public API)        │
│  localStorage persistence   │   │  domain-shaped async functions │
└─────────────────────────────┘   └─────────┬──────────────────────┘
                                            │
                              ┌─────────────▼──────────────────────┐
                              │  resources/_providers/supabase     │
                              │  (only place that imports supabase │
                              │   client — maps rows ↔ DTOs)       │
                              └────────────────────────────────────┘
```

### Layer responsibilities

| Layer | Owns | Must NOT own |
|---|---|---|
| **resources** | Cloud read/write/request contracts, error normalization, DTO mapping from DB rows | React, React Query, guest mode, toasts, UI state |
| **dataStore** | `useQuery` / `useMutation`, `queryKeys`, guest vs cloud dispatch, `enabled: !!user` | Table names, PostgREST filter strings, raw Supabase responses |
| **Feature hooks** | Compose multiple `dataStore` hooks, derive chart/modal state, wire mutations to UI events | `supabase`, `fetch`, `useEffect` data loads |
| **Components** | Render, user input, call feature hooks or `dataStore` directly | Any persistence or network code |

### Future backend swap

When moving off Supabase:

1. Implement `resources/_providers/rest/` (or `/_providers/prisma/`, etc.) behind the **same** public functions exported from `resources/index.ts`.
2. Change one wiring line (provider factory) — e.g. `createResourcesProvider()` returns `RestProvider` instead of `SupabaseProvider`.
3. `dataStore`, components, and feature hooks: **zero changes** if resource contracts were designed as domain operations, not PostgREST leaks.

---

## 4. Proposed folder structure

```
src/resources/
  index.ts                      # Public barrel — ONLY import path for dataStore / migrateGuest

  types/                        # Domain DTOs (stable app shapes, not Supabase Row types)
    category.ts
    activity.ts
    schedule-block.ts
    time-log.ts
    profile.ts
    weekly-plan.ts
    weekly-review.ts
    weekly-priority.ts

  categories.ts                 # list, upsert, delete
  activities.ts
  schedule-blocks.ts
  time-logs.ts
  profiles.ts
  weekly-plans.ts
  weekly-reviews.ts
  weekly-priorities.ts

  functions/                    # Remote procedures (today: edge functions)
    generate-weekly-plan.ts
    weekly-review.ts
    delete-account.ts

  _providers/
    types.ts                    # ResourcesProvider interface
    supabase/
      client.ts                 # thin re-export of integrations client (private)
      mappers.ts                # Database['public']['Tables'][...]['Row'] → domain DTO
      categories.ts               # provider impl fragments (optional split)
      ...
    index.ts                    # export function createSupabaseProvider(): ResourcesProvider
```

### Naming convention

Resource modules expose **verbs on domain nouns**, not SQL:

```ts
// ✅ Good — domain operation
timeLogs.listInRange({ userId, startISO, endISO })
weeklyReviews.getForWeek({ userId, weekStart })
weeklyReviewFunctions.generate({ weekStart, planned, actual, ... })

// ❌ Bad — leaks storage
supabase.from("time_logs").select("date,start_time,...").eq(...)
```

### Types strategy

| Type source | Use for |
|---|---|
| `integrations/supabase/types.ts` (`Database`) | **Inside** `_providers/supabase` only — mapper input |
| `resources/types/*.ts` | Public return/input types for resources + dataStore |
| `localStore.ts` shapes | Guest mode — already domain-aligned; converge naming with `resources/types` over time |

Keep DTOs aligned with `localStore` types where guest/cloud share entities (`LocalCategory` ≈ `CategoryDTO`) to avoid duplicate mapping in `dataStore`.

---

## 5. Public API sketch

`src/resources/index.ts` exports a single provider instance:

```ts
import { createSupabaseProvider } from "./_providers";

export const resources = createSupabaseProvider();

// Re-export types consumers need
export type { Category, TimeLog, WeeklyReviewBundle } from "./types";
```

Example resource module (`time-logs.ts`):

```ts
export function createTimeLogResource(provider: ResourcesProvider) {
  return {
    listInRange(args: { userId: string; startISO: string; endISO: string }): Promise<TimeLog[]> {
      return provider.timeLogs.listInRange(args);
    },
    insert(args: { userId: string; input: TimeLogInsert }): Promise<TimeLog> { ... },
    update(args: { userId: string; id: string; patch: TimeLogPatch }): Promise<TimeLog> { ... },
    delete(args: { userId: string; id: string }): Promise<void> { ... },
  };
}
```

`dataStore` after migration (cloud branch only):

```ts
// Before (today)
const { data, error } = await supabase.from("time_logs").select("*")...

// After
const rows = await resources.timeLogs.listInRange({ userId: userId!, startISO, endISO });
```

Feature hook after migration (`useWeeklyReviewData`):

```ts
// Reads via dataStore — no resources import in the hook
const { data: logs } = useTimeLogsInRange(weekStart, weekEnd);
const { data: categories } = useCategories();
const { data: plan } = useWeeklyPlan(weekStart);
const { data: savedReview } = useWeeklyReview(weekStart);

// Hook only aggregates logs + categories + plan → planned/actual arrays
// Generate action calls useGenerateWeeklyReviewMutation() from dataStore
```

---

## 6. Full migration inventory

### Phase A — Already partially done (move, don't rewrite)

| Current | Target resource module |
|---|---|
| `dataFetchers.fetchCategories` | `resources.categories.list` |
| `dataFetchers.fetchActivities` | `resources.activities.list` |
| `dataFetchers.fetchScheduleBlocks` | `resources.scheduleBlocks.list` |
| `dataFetchers.fetchTimeLogsInRange` | `resources.timeLogs.listInRange` |
| `dataFetchers.fetchProfile` | `resources.profiles.get` |
| `dataFetchers.fetchWeeklyPlan` | `resources.weeklyPlans.getForWeek` |

### Phase B — Inline in `dataStore.ts` mutations

| Mutation in dataStore | Target |
|---|---|
| `insertTimeLog` / `updateTimeLog` / `deleteTimeLog` | `resources.timeLogs.*` |
| `upsertActivity` / `deleteActivity` | `resources.activities.*` |
| `upsertScheduleBlock` / `deleteScheduleBlock` / `reorderScheduleBlocks` | `resources.scheduleBlocks.*` |
| `upsertCategory` / `deleteCategory` | `resources.categories.*` |
| `updateProfile` | `resources.profiles.update` |

### Phase C — Stragglers (components / feature hooks)

| File | Calls to move |
|---|---|
| `WeeklyReviewModal/useWeeklyReviewData.ts` | 4 reads → `useTimeLogsInRange`, `useCategories`, `useWeeklyPlan`, new `useWeeklyReview`; invoke → `useGenerateWeeklyReviewMutation` |
| `AIPlanPanel.tsx` | plan/priorities/activities reads, plan delete, log inserts, `generate-weekly-plan` invoke |
| `DashboardPage/useWeeklyReviewPrompt.ts` | profile `weekly_review_day`, review existence → `useProfile` + `useWeeklyReviewExists` |
| `PriorityRanker/usePriorityData.ts` + `index.tsx` | `weekly_priorities` list/upsert → `resources.weeklyPriorities.*` + `useWeeklyPriorities` |
| `Onboarding.tsx` | profile reads/writes → `useProfile` / `updateProfile` |
| `OnboardingGate.tsx` | profile onboarding flag → `useProfile` |
| `SettingsPage.tsx` | `delete-account` invoke → `resources.functions.deleteAccount()` via mutation hook |

### Phase D — Lib utilities

| File | Target |
|---|---|
| `migrateGuest.ts` | All cloud inserts → batch helpers on `resources.*` (`activities.insertMany`, etc.) |

### Stays outside resources

| File | Reason |
|---|---|
| `AuthContext.tsx`, `Auth.tsx` | Auth SDK session — not entity CRUD |
| `integrations/supabase/client.ts` | Generated client; imported only by `_providers/supabase` after migration |
| `supabase/functions/*` | Server-side Deno — separate deployment surface |

---

## 7. Phased execution plan

Each phase = one OpenSpec change (`opsx:new` → `opsx:ff` → apply → verify). TDD per project rules: resource functions get unit tests with a mock provider before wiring `dataStore`.

### Phase 0 — Scaffold (S)

- [ ] Create `src/resources/` tree per §4.
- [ ] Define `ResourcesProvider` interface in `_providers/types.ts` covering all entity operations needed by Phase A–B.
- [ ] Implement `createSupabaseProvider()` — can delegate to existing `dataFetchers` initially (move files, fix imports).
- [ ] Add `src/resources/README.md` (short) — import rules: *only `dataStore` and `migrateGuest` may import from `@/resources`*.
- [ ] Test helper: `createMockResourcesProvider()` for dataStore and feature tests.

**Exit criteria:** `dataFetchers.ts` deleted or reduced to a re-export shim; all former fetcher tests pass against resource modules.

### Phase 1 — Mutations out of dataStore (M)

- [ ] Move every `dataStore` cloud mutation body into `resources/*`.
- [ ] `dataStore` mutations become: `if (guest) localStore… else resources.…`.
- [ ] Vitest: extend `dataStore.test.ts` — assert resources called, not `supabase` (mock provider).

**Exit criteria:** `dataStore.ts` has zero `supabase` imports.

### Phase 2 — Weekly review + dashboard prompt (M)

- [ ] Add `resources.weeklyReviews.getForWeek`, `resources.functions.weeklyReview.generate`.
- [ ] Add `useWeeklyReview(weekStart)`, `useGenerateWeeklyReviewMutation()` in `dataStore`.
- [ ] Refactor `useWeeklyReviewData` to aggregation-only (see §5 example).
- [ ] Refactor `useWeeklyReviewPrompt` onto `useProfile` + `useWeeklyReview`.

**Exit criteria:** `WeeklyReviewModal/**` and `DashboardPage/useWeeklyReviewPrompt.ts` have no `supabase` import; ESLint override removed for those paths.

### Phase 3 — AI plan panel + weekly priorities (M)

- [ ] `resources.weeklyPriorities.*`, `resources.weeklyPlans.delete`, `resources.functions.generateWeeklyPlan`.
- [ ] `useWeeklyPriorities(weekStart)`, `useGenerateWeeklyPlanMutation()`, `useAcceptPlanSlotsMutation()` (or equivalent).
- [ ] Refactor `AIPlanPanel.tsx` to hooks + presentation.
- [ ] Refactor `PriorityRanker` to `useWeeklyPriorities` + mutation.

**Exit criteria:** ESLint override removed for `AIPlanPanel`, `PriorityRanker`.

### Phase 4 — Onboarding, settings, migrateGuest (S) ✅ Complete (2026-06-15)

- [x] Route `Onboarding`, `OnboardingGate`, `SettingsPage` through `dataStore` / `resources.functions`.
- [x] `migrateGuest.ts` uses `resources` batch APIs.

**Added:** `resources.functions.deleteAccount`, `useDeleteAccountMutation` hook, `insertMany` on all entity resources, `isLoading` exposed in `useProfile`.

**Exit criteria:** ESLint override list in `eslint.config.js` empty; only `_providers/supabase` imports `@/integrations/supabase/client`.

### Phase 5 — Enforcement + documentation (S)

**Code enforcement**

- [ ] ESLint `no-restricted-imports`: allow `@/integrations/supabase/client` only in `src/resources/_providers/supabase/**` and `src/integrations/**`.
- [ ] Remove the temporary ESLint override block in `eslint.config.js` (WeeklyReviewModal, AIPlanPanel, …).
- [ ] Update `eslint.config.js` comment to reference `resources-layer-plan.md` as the authority.

**Documentation updates (required — makes this the pattern going forward)**

After Phase 5, contributors and AI agents must follow the **resources layer** — not direct `dataStore`/`dataFetchers`/inline `supabase` guidance from older docs. Update every file below; treat [resources-layer-plan.md](./resources-layer-plan.md) as the canonical data-access design record once implementation is complete.

| Document | What to change |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | §1 diagram: add `resources` between `dataStore` and Supabase SDK. §2 table: add `src/resources/` row. §8–§9: components → `dataStore` → `resources`; remove "call react-query directly" escape hatch. §11 "add a field" checklist: add `resources` module step. |
| [frontend-standards.md](./frontend-standards.md) | §Project Structure: add `resources/`. §Data Access Rules: replace rule 4 allowed paths (`src/lib/**`) with `_providers/supabase` only; replace rule 6 `dataFetchers.ts` → `resources/<entity>.ts` + `dataStore` hook. Add cheat-sheet row for new cloud-only tables. |
| [backend-standards.md](./backend-standards.md) | §Guest/Cloud Parity: step 3 becomes `resources` module + `dataStore` hook (not "expose via dataStore" alone). §Edge Functions: client invoke goes through `resources/functions/*`, not `supabase.functions.invoke` in app code. Update `globs` frontmatter to include `src/resources/**`. |
| [conventions.md](./conventions.md) | §Forms rule 7: still `dataStore` mutation at the UI boundary (unchanged). §Not a form: add "remote I/O → `resources`; hooks → aggregation only". Link to `resources-layer-plan.md`. |
| [development_guide.md](./development_guide.md) | §Key Docs Before Coding: add `resources-layer-plan.md`. §Manual Verification Checklist: "data access via `dataStore`; no `supabase` in components". |
| [CLOUD.md](./CLOUD.md) | §Client usage: note that app code uses `resources`, not the generated client directly. Regeneration checklist unchanged. |
| [react-query-migration-plan.md](./react-query-migration-plan.md) | Add banner: **Phase 3 superseded** by `resources-layer-plan.md` Phases 2–4. Update §2 target architecture to show `resources` under fetchers. Status note: resources layer is the next step after React Query adoption. |
| [README.md](../README.md) | §Project layout tree: add `src/resources/`. One-line pointer to architecture doc for data access. |
| `src/resources/README.md` (new, Phase 0) | Import rules, layer diagram, "adding a new entity" checklist — short on-site reference for developers. |

**Agent rules (symlinked `AGENTS.md` / `CLAUDE.md`)**

No change required to core principles. AI agents already defer to `docs/frontend-standards.md` and `docs/backend-standards.md`; updating those files is sufficient. If a Cursor rule references `dataFetchers`, update it when encountered.

**Outdated patterns to retire in docs (search-and-replace audit)**

| Old guidance (remove / replace) | New canonical guidance |
|---|---|
| "Add a fetcher in `dataFetchers.ts`" | "Add `src/resources/<entity>.ts` + provider impl in `_providers/supabase/`" |
| "`src/lib/**` may import supabase" | "Only `src/resources/_providers/supabase/**` may import supabase" |
| "Direct supabase in components (temporary exceptions)" | "No exceptions — ESLint enforced" |
| "Feature hooks may fetch with `useEffect`" | "Feature hooks compose `dataStore` hooks; aggregation in pure functions" |
| "`dataStore` talks to Supabase" | "`dataStore` talks to `resources` (cloud) or `localStore` (guest)" |

**Exit criteria:** All rows in the documentation table updated; `rg 'dataFetchers' docs/` returns only historical references in migration plans; `rg 'src/lib/\*\*' docs/` no longer appears as an allowed supabase import path.


---

## 8. Testing strategy

| Layer | Test approach |
|---|---|
| **resources/_providers/supabase** | Unit tests with mocked `supabase` client (move patterns from `src/test/supabaseMock.ts`); assert correct table/filter mapping. |
| **resources (public API)** | Contract tests via `createMockResourcesProvider()` — pure async, no React. |
| **dataStore** | Existing adapter tests — mock `resources` instead of `supabase`; guest/cloud parity matrix unchanged. |
| **Feature hooks** | `renderHook` + mock dataStore or mock query client; assert aggregation math only (e.g. planned vs actual minutes). |
| **E2E** | Unchanged — cloud lane already hits real local Supabase through the UI. |

---

## 9. ESLint import matrix (target end state)

| Path pattern | May import `@/integrations/supabase/client` | May import `@/resources` |
|---|---|---|
| `src/resources/_providers/supabase/**` | ✅ | — |
| `src/lib/dataStore.ts`, `src/lib/migrateGuest.ts` | ❌ | ✅ |
| `src/pages/**`, `src/components/**` | ❌ | ❌ (use dataStore) |
| `src/contexts/AuthContext.tsx` | ✅ (auth only) | ❌ |
| `**/*.test.{ts,tsx}`, `src/test/**` | ✅ (mocking) | ✅ |

---

## 10. Success criteria (definition of done)

1. **Zero** `supabase.from` / `supabase.functions.invoke` outside `src/resources/_providers/supabase/`.
2. **Zero** data-fetching `useEffect` blocks in `src/pages/**` and `src/components/**`.
3. Feature hooks (`useWeeklyReviewData`, `usePriorityData`, …) contain **derivation and UI state only**.
4. Replacing Supabase requires editing only `src/resources/_providers/` (+ env config + server functions if backend moves).
5. All unit tests and both E2E lanes green; ESLint enforces the import matrix without override list.

---

## 11. Sequencing and sizing

| Phase | Scope | Size | Depends on |
|---|---|---|---|
| 0 | Scaffold + move dataFetchers | S | — |
| 1 | dataStore mutations → resources | M | 0 |
| 2 | Weekly review + dashboard prompt | M | 1 |
| 3 | AI plan + priorities | M | 1 |
| 4 | Onboarding, settings, migrateGuest | S | 1 |
| 5 | ESLint + **full documentation sweep** (§7 Phase 5 table) | S | 2–4 |

**Recommended order:** 0 → 1 → 2 → 3 → 4 → 5. Phases 2 and 3 can run in parallel after Phase 1 if using separate OpenSpec changes.

> **Documentation is not optional.** Phase 5 is a completion gate: the migration is not done until standards docs, architecture, and README describe the resources pattern — otherwise the next feature (or AI agent) will revert to inline `supabase` / `dataFetchers` guidance from stale docs.

---

## 12. Open decisions (resolve in Phase 0 OpenSpec)

| # | Question | Recommendation |
|---|---|---|
| D1 | Rename `dataFetchers.ts` in place vs new `resources/` folder? | **New folder** — clearer intent; delete `dataFetchers.ts` in Phase 0. |
| D2 | One `ResourcesProvider` god-interface vs per-module factories? | **Per-module factories** composed into one `resources` object — avoids 200-line interface. |
| D3 | Keep `LocalCategory` name or alias to `Category` from resources/types? | **Type alias** `export type LocalCategory = Category` in `localStore.ts` — one canonical shape. |
| D4 | Edge functions as `resources/functions/*` or `resources/procedures/*`? | **`functions/`** — matches Supabase vocabulary already in the codebase. |

---

## 13. Example: end state for weekly review

**`src/resources/weekly-reviews.ts`** (public):

```ts
export function createWeeklyReviewResource(p: ResourcesProvider) {
  return {
    getForWeek: (args: { userId: string; weekStart: string }) => p.weeklyReviews.getForWeek(args),
  };
}
```

**`src/lib/dataStore.ts`**:

```ts
export function useWeeklyReview(weekStart: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.weeklyReview(user?.id ?? "", weekStart),
    queryFn: () => resources.weeklyReviews.getForWeek({ userId: user!.id, weekStart }),
    enabled: !!user,
  });
}
```

**`useWeeklyReviewData.ts`** (feature hook — no I/O):

```ts
export function useWeeklyReviewData({ open, weekStart }: { open: boolean; weekStart: string }) {
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);
  const { data: logs = [] } = useTimeLogsInRange(weekStart, weekEnd);
  const { data: categories = [] } = useCategories();
  const { data: plan } = useWeeklyPlan(weekStart);
  const { data: saved, isLoading } = useWeeklyReview(weekStart);
  const generate = useGenerateWeeklyReviewMutation();

  const { planned, actual, ratio, total, merged } = useMemo(
    () => aggregateWeeklyReview({ logs, categories, plan, saved }),
    [logs, categories, plan, saved],
  );

  return { loading: isLoading, insights: saved?.insights ?? null, ratio, total, merged, generate, ... };
}
```

**`aggregateWeeklyReview`** — pure function, colocated in the feature folder or `src/lib/weeklyReview.ts`, easy to unit test with fixtures and no DB.

This is the pattern to replicate for every feature that today embeds Supabase calls in a hook or page.
