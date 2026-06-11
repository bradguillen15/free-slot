# Code Audit Report — plan-grow (FreeSlot)
**Date:** 2026-06-09  
**Auditor:** Claude  
**Scope:** Full `src/` tree, `supabase/functions/`, `vite.config.ts`, `package.json`

---

## Status update — 2026-06-10 reconciliation

A full follow-up review (see [`docs/code-review-plan.md`](./docs/code-review-plan.md) — the living tracker with all current findings) re-verified every item below against the code:

| Item | Status 2026-06-10 |
|---|---|
| C-1 ActivitiesPage guest blank | ✅ Fixed — page now uses dataStore hooks |
| C-2 build fails (`@tanstack/query-core`) | ✅ Fixed — `pnpm build` passes |
| C-3 gaps.ts buffer clamp | ✅ Fixed — clamps to `w.end` (gaps.ts:115) |
| H-1 AuthContext loading hang | ✅ Fixed — catch + finally present |
| H-2 missing async cleanup | ✅ Fixed — `cancelled` guards in place |
| H-3 pages bypass dataStore | ⚠️ Partially fixed — ActivitiesPage/ActivityEditor ported; DashboardPage, SettingsPage categories, PriorityRanker, AIPlanPanel still raw |
| M-1 MonthPage unstable useMemo | ✅ Fixed |
| M-2 AIPlanPanel toast import | ✅ Fixed — uses sonner |
| M-3 Dashboard duplicate effects | ❌ Still open (DashboardPage.tsx:51 + :108) |
| L-1 dead scaffold files | ✅ Fixed — all five deleted |
| L-2 lovable-tagger | ✅ Fixed — removed |
| L-3/L-4 unused deps (radix stubs, zod, react-hook-form) | ❌ Still open |
| L-5 duplicate use-toast | ⚠️ ui/use-toast.ts deleted, but `src/hooks/use-toast.ts` + `<Toaster />` are now fully dead (zero consumers) |
| L-6 i18n half-implemented | ❌ Still open — en/es parity is perfect (81/81 keys) but the app interior is hardcoded English |
| T-1 `strict: false` | ❌ Still open; tsc currently FAILS on DashboardPage.tsx:152 |
| T-2 WeekPage `any` casts | ⚠️ Replaced with `as unknown as` double-casts — lint-clean but still type-unsafe |
| T-3 tailwind require() | ✅ Fixed |

The 2026-06-10 review also found new Critical issues not in this report — most importantly guest-migration data loss (`migrateGuest.ts` swallows category errors then wipes localStorage) and silent error-swallowing across all dataStore read hooks. **`docs/code-review-plan.md` is the canonical, up-to-date findings list; treat this file as historical.**

---

## Executive Summary

The codebase is generally well-structured with a clean guest/cloud abstraction (`dataStore`). The recent Supabase self-managed migration and calendar improvements are solid. However, there are **3 critical bugs** (one causes a blank screen for guest users on Activities, one causes the production build to fail, one is a logic error in gap detection), **several pages that bypass the `dataStore` abstraction** (breaking guest parity), and a significant amount of dead code and unused dependencies accumulated from the Lovable scaffold.

| Category | Critical | High | Medium | Low/Quick Win |
|---|---|---|---|---|
| Bugs | 3 | 2 | 3 | — |
| Architecture | — | 3 | 2 | — |
| Dead code | — | 1 | — | 6 |
| Dependencies | — | 2 | 1 | 2 |
| TypeScript | — | — | 3 | 2 |

---

## Critical Issues

### C-1 — ActivitiesPage is blank for guest users
**File:** `src/pages/ActivitiesPage.tsx:25`

```ts
useEffect(() => {
  if (!user) return;  // ← guest: early return, setLoading(false) never called
  (async () => {
    // ...
    setLoading(false);   // ← only reached for cloud users
  })();
}, [user, tick]);
```

Guest users land on a permanently loading (blank) Activities page. The page should use `dataStore` hooks (`useCategories`, `useActivities`) instead of calling Supabase directly — then it works for both modes automatically.

**Fix:** Replace the manual `supabase.from()` calls with `useActivities()` and `useCategories()` from `dataStore`, as all other pages do.

---

### C-2 — Production build fails: `@tanstack/query-core` missing direct dependency
**File:** `vite.config.ts:12`, `package.json`

`vite.config.ts` adds `@tanstack/query-core` to `dedupe` to prevent duplicate React Query instances, but the package is not a direct dependency. pnpm hoists it inside `@tanstack/react-query`'s own `node_modules`, so Rollup cannot resolve it at build time:

```
Rollup failed to resolve import "@tanstack/query-core" from 
".../node_modules/@tanstack/react-query/..."
```

**Fix:** Add `"@tanstack/query-core": "*"` to `dependencies` in `package.json` (or pin it to match the react-query version), then run `pnpm install`.

---

### C-3 — `gaps.ts` clamps free-window start to midnight instead of day boundary
**File:** `src/lib/gaps.ts:115`

```ts
// BUG: clamps to 1440 (midnight), not the window's end
const start = Math.min(MIN_PER_DAY, w.start + bufferMinutes);
```

`MIN_PER_DAY = 1440` is midnight. This means adding the buffer to a late evening start can "succeed" by wrapping to midnight, producing a window with `start > end`. The correct clamp is:

```ts
const start = Math.min(w.end, w.start + bufferMinutes);
```

This silently produces zero-duration or negative windows that pass the `>= minWindowMinutes` filter only because they're filtered to zero — but it still causes misleading gap calculations near 23:00.

---

## High Priority

### H-1 — AuthContext: `loading` stays `true` forever if `getSession()` throws
**File:** `src/contexts/AuthContext.tsx:24-28`

```ts
supabase.auth.getSession().then(({ data }) => {
  // ...
  setLoading(false);
});
// No .catch — if this rejects, loading never becomes false
```

A network error at startup leaves the entire app in a perpetual loading state.

**Fix:**
```ts
supabase.auth.getSession()
  .then(({ data }) => { setSession(data.session); setUser(data.session?.user ?? null); })
  .catch(() => { /* swallow — onAuthStateChange will eventually fire */ })
  .finally(() => setLoading(false));
```

---

### H-2 — DashboardPage and ActivitiesPage: missing async cleanup
**Files:** `src/pages/DashboardPage.tsx:51-66`, `src/pages/ActivitiesPage.tsx:24-35`

Both use `useEffect(() => { (async () => { ... setState(...); })() }, [...])` with no cancellation. If the component unmounts before the async resolves (e.g. navigation), it attempts state updates on an unmounted component — React 18 no longer throws a warning but it's still a memory leak.

**Fix (dashboard example):**
```ts
useEffect(() => {
  if (!user) return;
  let cancelled = false;
  (async () => {
    const [...] = await Promise.all([...]);
    if (cancelled) return;
    setLogs(...);
  })();
  return () => { cancelled = true; };
}, [user, weekStart, weekEnd]);
```

---

### H-3 — Several pages bypass `dataStore`, breaking guest mode
**Files:** `DashboardPage`, `ActivitiesPage`, `SettingsPage`, `ActivityEditor`, `PriorityRanker`

These call `supabase.from()` directly, so guest users get empty data or silent failures. `dataStore` exists precisely to unify both modes:

| Page / Component | Direct Supabase call | Available `dataStore` alternative |
|---|---|---|
| `DashboardPage` | `time_logs`, `categories`, `weekly_plans`, `activities` | `useTimeLogsInRange`, `useCategories`, `useActivities` |
| `ActivitiesPage` | `categories`, `activities` | `useCategories`, `useActivities` |
| `SettingsPage` | `profiles`, `categories` | `useProfile`, `useCategories`, `updateProfile` |
| `ActivityEditor` | `activities` CRUD | `upsertActivity`, `deleteActivity` |
| `PriorityRanker` | `weekly_priorities` | not in dataStore yet — needs adding |

Note: `DashboardPage` is tagged account-only (requires sign-in) so guest parity isn't strictly needed there. `ActivitiesPage`, `ActivityEditor`, and `SettingsPage` are exposed to guests.

---

## Medium Priority

### M-1 — `MonthPage` unstable `useMemo` dependency (ESLint warning)
**File:** `src/pages/MonthPage.tsx:56`

```ts
const categories = data ?? []; // new array reference on every render
// then used inside useMemo → effectively disables memoization
useMemo(() => { ... }, [categories]); // ESLint: "could make dependencies change on every render"
```

**Fix:** Memoize `categories` before using it in the second `useMemo`:
```ts
const categories = useMemo(() => data ?? [], [data]);
```

---

### M-2 — `AIPlanPanel` uses different `toast` import than the rest of the app
**File:** `src/components/week/AIPlanPanel.tsx:8`

```ts
import { toast } from "@/hooks/use-toast";  // ← non-standard
// Every other component:
import { toast } from "sonner";             // ← standard
```

`@/hooks/use-toast` is a Radix Toast wrapper from the shadcn scaffold — it's a different notification system than Sonner. Only `AIPlanPanel` uses it; this produces a separate toast stack.

**Fix:** Replace with `import { toast } from "sonner"` and update the call sites (`.toast({ title })` → `toast("title")`).

---

### M-3 — `DashboardPage` has two independent useEffects fetching data on the same keys
**File:** `src/pages/DashboardPage.tsx:51` and `src/pages/DashboardPage.tsx:106`

Two `useEffect` hooks both depend on `[user, weekStart]`. On week navigation both fire simultaneously — one fetches logs/cats/plans, the other checks review status. This causes 2 Supabase connections on every week change. They should be merged or the review check should wait for data.

---

## Low Priority / Quick Wins

### L-1 — Dead source files (Lovable scaffold residue)
These files are never imported by any live code path:

| File | Reason |
|---|---|
| `src/App.css` | Empty stylesheet, never imported |
| `src/pages/Index.tsx` | Contains Lovable placeholder markup (`data-lovable-blank-page-placeholder`) |
| `src/pages/Placeholder.tsx` | Empty placeholder page |
| `src/components/NavLink.tsx` | Thin wrapper around react-router `NavLink`, never used |
| `src/components/SignupGate.tsx` | Auth gate component, never mounted |

Safe to delete all five.

---

### L-2 — `lovable-tagger` devDependency should be removed
**File:** `package.json`, `vite.config.ts`

`lovable-tagger` is a Lovable-specific build plugin that stamps components with source-map metadata for the Lovable editor. It serves no purpose in a self-managed project and adds ~2 MB to the dev bundle. Remove from `devDependencies` and remove from `vite.config.ts`.

---

### L-3 — 20+ unused Radix UI and shadcn component packages
Knip confirms these are installed but never imported anywhere in app code (they exist only as shadcn UI primitives in `src/components/ui/` which are themselves unused):

`@radix-ui/react-accordion`, `react-aspect-ratio`, `react-avatar`, `react-checkbox`, `react-collapsible`, `react-context-menu`, `react-hover-card`, `react-menubar`, `react-navigation-menu`, `react-popover`, `react-radio-group`, `react-scroll-area`, `react-separator`, `react-tabs`, `react-toggle`, `react-toggle-group`, `cmdk`, `embla-carousel-react`, `input-otp`, `vaul`, `react-resizable-panels`, `react-day-picker`

These and their corresponding `src/components/ui/` files can be removed if they aren't planned for future features. This reduces `node_modules` by ~40 packages.

---

### L-4 — `react-hook-form`, `@hookform/resolvers`, and `zod` are installed but never used
`react-hook-form` is only referenced in `src/components/ui/form.tsx` which is itself never imported. `zod` has zero imports anywhere in `src/`. Both can be removed.

---

### L-5 — Duplicate `use-toast` hook files
Both `src/hooks/use-toast.ts` and `src/components/ui/use-toast.ts` exist. The latter is the standard shadcn file; the former is a copy. Only `AIPlanPanel` imports from `@/hooks/use-toast`. Once M-2 is fixed, delete `src/hooks/use-toast.ts`.

---

### L-6 — `i18n` is half-implemented
Translations exist for `en` and `es`, but only `Landing`, `Auth`, `PublicHeader`, `AppLayout`, and `Onboarding` use `useTranslation()`. All feature pages (`CalendarPage`, `WeekPage`, `DashboardPage`, `ActivitiesPage`, `SettingsPage`) are hardcoded English. Either complete it or remove the i18n system to reduce bundle size.

---

## TypeScript Issues

### T-1 — `strict: false` globally disables meaningful TS checks
**File:** `tsconfig.app.json`

```json
"strict": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noImplicitAny": false,
```

These settings allow silent any-typed code to slip through. The 29 ESLint `@typescript-eslint/no-explicit-any` errors are a symptom. Recommend enabling `strict: true` incrementally (start with `noImplicitAny: true`).

---

### T-2 — `WeekPage` has 6 explicit `any` casts flagged by ESLint
**File:** `src/pages/WeekPage.tsx` (lines 73, 91, 102, 133, 205, 268)

Most can be replaced with proper typed access from `dataStore` types. For example:
```ts
// Before
(l as any).date === iso
// After: add date to TimeLog type in DayTimeline or cast via LocalTimeLog
(l as LocalTimeLog).date === iso
```

---

### T-3 — `tailwind.config.ts` uses `require()` (ESLint error)
**File:** `tailwind.config.ts:102`

```ts
require("@tailwindcss/typography")  // ← forbidden by @typescript-eslint/no-require-imports
```

**Fix:** Replace with:
```ts
import typography from "@tailwindcss/typography";
// then use: typography
```

---

## Prioritized Action Plan

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| 🔴 C-2 | Add `@tanstack/query-core` to deps | 5 min | Fixes production build |
| 🔴 C-1 | Fix ActivitiesPage guest blank screen | 30 min | Guest parity |
| 🔴 C-3 | Fix `gaps.ts` buffer clamp | 5 min | Correct free-window math |
| 🟠 H-1 | AuthContext catch + finally | 10 min | App reliability |
| 🟠 H-2 | Add cancellation to async useEffects | 30 min | Memory hygiene |
| 🟠 H-3 | Port ActivitiesPage + SettingsPage to dataStore | 2 h | Guest parity |
| 🟡 M-2 | Unify toast to Sonner | 15 min | Consistent UX |
| 🟡 M-1 | Fix MonthPage useMemo | 5 min | Perf correctness |
| 🟢 L-1 | Delete 5 dead files | 5 min | Cleaner repo |
| 🟢 L-2 | Remove lovable-tagger | 5 min | Smaller dev bundle |
| 🟢 L-3–4 | Remove unused deps + shadcn stubs | 1 h | ~40 fewer packages |
| 🟢 L-5 | Delete duplicate use-toast | 2 min | After M-2 |
| 🟢 T-3 | Fix require() in tailwind config | 2 min | Clean lint |
