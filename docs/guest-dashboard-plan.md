# UX Plan — Guest Dashboard (local-data analytics)

**Status:** draft (2026-06-12)
**Date:** 2026-06-12
**Origin:** user question — "It's feasible to enable the dashboard with only the current (local) data, right? And if you want to track across multiple months you need the database."
**Related:** [ux-schedule-editing-and-labels-plan.md](./ux-schedule-editing-and-labels-plan.md) (labels/hidden-flag work this builds on)

---

## 1. Problem statement (verified against the code)

| # | Pain | Root cause in code |
|---|---|---|
| P1 | Guests cannot see the Dashboard at all — nav shows a lock, route redirects to `/auth` | `AppLayout` marks `/app/dashboard` `requiresAuth: true`; `App.tsx` wraps the route in `ProtectedRoute`. |
| P2 | The lock is not a data limitation — it's how the page was written | `DashboardPage` bails on `if (!user)` and queries Supabase directly (`time_logs`, `categories`, `weekly_plans`, `activities`), bypassing the mode-aware `dataStore` every other page uses. |
| P3 | Only two of the four data sources are actually cloud-only | Core stats need `time_logs` + `categories`, both of which already have guest branches (`useTimeLogsInRange`, `useCategories`). Only `weekly_plans` / `weekly_reviews` (AI features, edge functions) have no localStorage mirror. |

Feasibility check (2026-06-12): the data layer is already sufficient — `useTimeLogsInRange(startISO, endISO)`, `useCategories()`, `useProfile()` in `src/lib/dataStore.ts` are mode-aware. No schema change needed.

**Honest framing of the guest limitation** (for copy and docs): capacity is not the issue — the dashboard reads one week at a time and logs are tiny. The real limits of guest data are durability (clearing site data wipes it) and single-device scope. Long-horizon, trustworthy history → sign in; `migrateGuest` already carries guest data into the account.

## 2. Decisions

1. **Dashboard opens for guests** using local data via the mode-aware data layer; AI features remain signed-in-only.
2. **AI sections become upsells for guests**, not hidden gaps: the "AI plan vs logged" card is replaced by a sign-in card; the "Review week" button and weekly-review auto-prompt are signed-in-only.
3. **No schema changes, no new storage.** Multi-month durability remains the account's value proposition — no attempt to make localStorage a long-term archive.

Delegated calls (flagged for veto):
- For guests, the **"AI slots" KPI is replaced by "Days logged"** (count of days in the week with ≥1 log) so the KPI grid stays balanced instead of showing a locked zero.
- The signed-in experience is **unchanged** (same queries' worth of data, now through the data layer).

## 3. Requirements

### 3.1 Routing & navigation
- `AppLayout`: `/app/dashboard` becomes `requiresAuth: false` (lock icon disappears for guests).
- `App.tsx`: remove `ProtectedRoute` from the dashboard route.
- `/app/settings` stays signed-in-only (unchanged).

### 3.2 Data layer refactor (the bulk of the work)
Replace `DashboardPage`'s direct Supabase queries with existing hooks:
- `time_logs` week query → `useTimeLogsInRange(weekStart, weekEnd)`.
- `categories` → `useCategories()` (**unfiltered** — the breakdown is historical display, so hidden labels must keep appearing; this matches the hidden-flag semantics from the labels plan).
- `weekly_plans` slots → fetched only when signed in (cloud branch stays as a direct query or moves behind a small helper; guests get `[]`).
- Drop the **dead `activities` fetch** — `DashboardPage` queries and stores `activities` but never reads them (`planVsActual` matches by `activity_name` from the plan slots). Found during this plan's code audit; remove state + query.

### 3.3 Guest-mode UI
- **KPI row:** Total tracked / Productive / Productive ratio work as-is from local data. Fourth KPI: guests see "Days logged"; signed-in users keep "AI slots".
- **Charts:** per-day stacked bar, productive-ratio progress, and category pie all work unchanged from local data.
- **"AI plan vs logged" card (guest):** replaced by an upsell card — icon, one line on what AI plans/reviews add, and a "Sign in" CTA to `/auth`. Reuse the `EmptyState`/card pattern; follows the existing lock-icon convention.
- **"Review week" button + auto-prompt:** rendered only when signed in (the auto-prompt effect already guards on `user`; the button needs the same guard).
- **Empty state copy:** the current text suggests "generate an AI weekly plan" — guests get a variant that only suggests logging on the Day view.
- **Personal-best celebration** (`celebrateIfPersonalBest`) already uses localStorage — works for guests unchanged.

### 3.4 i18n
All strings touched or added by this change (KPI labels, upsell card, empty-state variant) go through i18n (en + es). The page is currently hardcoded English — migrating the strings this change touches is in scope; a full-page i18n sweep is not (tracked debt).

### 3.5 Tests (TDD per CLAUDE.md)
- Component test: guest mode renders KPIs and charts from seeded localStorage logs (follow `SchedulePage.test.tsx` / `seedGuestData` factory patterns).
- Component test: guest mode shows the AI upsell card and hides "Review week"; signed-in mode shows the AI sections.
- Component test: hidden categories still appear in the category breakdown.

## 4. Out of scope
- Any guest access to AI plan generation or weekly reviews (edge functions are account-bound).
- Long-term/multi-month guest storage or export.
- Full DashboardPage i18n sweep beyond touched strings.
- Settings page guest access.

## 5. Phasing

Single OpenSpec change, size **M** (refactor + gating + tests, no schema):

| Step | Scope |
|---|---|
| 1 | Failing component tests for guest dashboard (KPIs from local data, AI gating) |
| 2 | Data-layer refactor of `DashboardPage` (hooks instead of raw Supabase; drop dead `activities` fetch) |
| 3 | Guest UI: upsell card, Days-logged KPI, empty-state variant, i18n strings |
| 4 | Routing/nav unlock + verify (tests, typecheck, lint, build) |

Follow the OpenSpec flow (`opsx:new` → `opsx:ff` → apply → verify); planning steps require Opus high reasoning (CLAUDE.md §5).

## 6. Open questions

None blocking — the two delegated calls in section 2 (Days-logged KPI for guests; signed-in experience unchanged) are open for veto until planning starts.
