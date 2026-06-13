# Tech Plan — Shared surface components & CVA usage

**Status:** draft (2026-06-13)  
**Date:** 2026-06-13  
**Origin:** discussion — avoid project-wide CVA adoption; deduplicate repeated Tailwind surface/stat patterns instead.  
**Related:** [DESIGN.md](./DESIGN.md) (tokens, motion, shadcn/CVA guidance), [frontend-standards.md](./frontend-standards.md), [ARCHITECTURE.md](./ARCHITECTURE.md) (ui primitives)

---

## 1. Problem statement (verified against the code)

The app already depends on **`class-variance-authority`** (`^0.7.1`) and uses it correctly in shadcn primitives (`button`, `badge`, `alert`, `sheet`, …). Feature code does **not** need more CVA — it needs **fewer copy-pasted class strings**.

### Repeated patterns

| Pattern | Example classes | Occurrences (approx.) |
|---|---|---|
| **Primary panel** | `rounded-2xl border border-border bg-surface …` | `DaySummary`, `WeekGrid`, `DayTimeline`, `SchedulePage`, Dashboard local `Card` |
| **Glass section** | `rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6` | `ActivityEditor`, `PriorityRanker` |
| **Compact row surface** | `rounded-lg border border-border bg-card/40` | `LabelsPage` rows, `AIPlanPanel` chips |
| **Schedule row** | `rounded-xl border border-border bg-card/40 p-3` | `SchedulePage` sortable rows |
| **Stat / KPI tile** | `rounded-2xl border border-border bg-surface px-4 py-3` + optional `ring-1` + `toneClasses` | `DashboardPage` `Kpi`, `WeekPage` `SummaryCard`, `MonthPage` `Stat` |
| **Header stat chip** | `px-4 py-2 rounded-lg bg-card/60 border border-border` | `ActivitiesPage` header counters |

### Naming collision to fix

`DashboardPage` defines a local `Card` component (`rounded-2xl … bg-surface`) that **shadows the mental model** of shadcn `Card` (`rounded-lg bg-card shadow-sm`), used on `LabelsPage` and `SettingsPage`. Two different “cards” with the same name in different files.

### What already works — keep it

- **`toneClasses`** in [src/lib/toneClasses.ts](../src/lib/toneClasses.ts) — three tones, returns `{ ring, bg }`. Fine as-is until tones multiply.
- **shadcn `Card`** — good for settings/labels forms with `CardHeader` / `CardTitle`. Do not force-fit dashboard panels into it without aligning radius/token (`bg-surface` vs `bg-card`).
- **CVA in `src/components/ui/`** — continue extending shadcn variants there only.

---

## 2. Decisions

1. **No project-wide CVA rule.** CVA stays for interactive primitives with variant props (`variant`, `size`, `tone`). Page layout and one-off spacing stay plain Tailwind + `cn()`.
2. **Extract shared layout components first; add CVA only when a component exposes a variant API.** Prefer a `<Surface>` over `surfaceVariants()` until we have call sites that need `elevation="glass" | "solid"`.
3. **One shared `StatCard` replaces four near-duplicate KPI implementations** (Dashboard, Week, Month, Activities header chips are related but not identical — see §3.2).
4. **Align with design tokens** (`bg-surface`, `border-border`, `rounded-2xl` for primary panels — per [DESIGN.md](./DESIGN.md)).
5. **Motion stays at the call site** — `StatCard` / `Surface` are presentational; pages wrap with `motion.div` when they need enter animation (Dashboard pattern).
6. **Class sort order is out of scope** — if desired later, add `prettier-plugin-tailwindcss`; that is separate from CVA.
7. **Do not adopt TanStack Table** as part of this plan (separate decision; not needed today).

---

## 3. Target components

All live under **`src/components/`** (feature-level layout), not `ui/`, unless we later promote `Surface` to a design-system primitive.

### 3.1 `Surface`

Generic bordered container for panels, sections, and rows.

**Proposed API (initial — no CVA yet):**

```tsx
type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  /** Visual weight. Default matches most dashboard panels. */
  elevation?: "solid" | "muted" | "glass";
  /** Corner radius. Default `2xl` for page panels; `lg`/`xl` for rows. */
  radius?: "lg" | "xl" | "2xl";
  padding?: "none" | "sm" | "md" | "lg"; // maps to p-3, p-4, p-6
};
```

**Class mapping (single source of truth):**

| `elevation` | Classes |
|---|---|
| `solid` (default) | `bg-surface border-border` |
| `muted` | `bg-card/40 border-border` |
| `glass` | `bg-card/40 backdrop-blur-sm border-border` |

**Migrate first (Tier 1):**

- [DaySummary.tsx](../src/components/day/DaySummary.tsx) — 3× identical panel divs
- [WeekGrid.tsx](../src/components/week/WeekGrid.tsx) — outer wrapper
- [ActivityEditor.tsx](../src/components/activities/ActivityEditor.tsx) — section shell (`glass`, `p-6`)
- [PriorityRanker/index.tsx](../src/components/activities/PriorityRanker/index.tsx) — same as ActivityEditor
- [SchedulePage.tsx](../src/pages/SchedulePage.tsx) — bottom panel + row surfaces
- [DashboardPage/index.tsx](../src/pages/DashboardPage/index.tsx) — rename local `Card` → use `Surface` + title slot

**When to add CVA:** if `elevation` × `radius` × `padding` combinations grow past ~6 and we export `surfaceVariants` for reuse outside the component (e.g. docs Storybook). Until then, an internal `const elevationClasses = { … }` record is enough.

### 3.2 `StatCard`

KPI / summary tile shared across dashboard views.

**Proposed API:**

```tsx
type StatCardProps = {
  label: string;
  value: string;
  tone?: StatTone;           // from toneClasses — default "muted"
  icon?: ReactNode;          // when set, renders icon badge (Dashboard / Week style)
  className?: string;
};
```

**Replaces:**

| File | Local component | Notes |
|---|---|---|
| [DashboardPage/index.tsx](../src/pages/DashboardPage/index.tsx) | `Kpi` | icon + tone on icon badge |
| [WeekPage.tsx](../src/pages/WeekPage.tsx) | `SummaryCard` | duplicate of `Kpi` |
| [MonthPage.tsx](../src/pages/MonthPage.tsx) | `Stat` | no icon; ring from tone |
| [ActivitiesPage.tsx](../src/pages/ActivitiesPage.tsx) | inline header divs | smaller variant — see below |

**`StatCard` size variant (optional prop, CVA candidate):**

| `size` | Use | Classes |
|---|---|---|
| `default` | Dashboard / Week / Month KPI grid | current `px-4 py-3`, `text-2xl` value |
| `compact` | Activities header counters | `px-4 py-2`, `text-xl` value, `rounded-lg`, `bg-card/60` |

Add `size` only if both shapes stay after migration; if Activities chips feel too different, leave them as a one-off or a separate `StatChip` — do not over-unify.

**CVA here:** defer until `size` + `tone` + optional `icon` layout needs compound variants. Start with `toneClasses(tone)` + conditional icon markup (same as today).

### 3.3 `SectionHeader` (optional, Tier 3)

Repeated page header block: icon + `font-display text-3xl` title + muted subtitle + optional right-side actions. Appears on Activities, Schedule, Calendar, Week, Month with small variations.

**Decision:** audit only in Tier 3 — extract if a third copy-paste of the same structure appears during Tier 1/2 work. Not a day-one deliverable.

---

## 4. shadcn `Card` vs new `Surface`

| | shadcn `Card` | `Surface` (proposed) |
|---|---|---|
| Token | `bg-card`, `rounded-lg`, `shadow-sm` | `bg-surface` / `bg-card/40`, `rounded-2xl`, often no shadow |
| Structure | `CardHeader`, `CardTitle`, `CardContent` | Single div; titles stay in page or optional `children` |
| Used on | Labels, Settings | Dashboard, Week, Day, Schedule, Activities |

**Rule after migration:**

- **Form/settings pages with titled sections** → keep shadcn `Card`.
- **Analytics / calendar / schedule panels** → `Surface`.
- Never define another local component named `Card` in a page file.

---

## 5. CVA decision matrix (for contributors)

| Situation | Use |
|---|---|
| shadcn primitive with `variant` / `size` props | `cva` in `src/components/ui/` |
| Shared layout with 2–3 enum props (`elevation`, `padding`) | Component with internal class map; CVA optional |
| Shared layout, single shape | Plain component + `cn()` |
| One page, unique layout | Inline Tailwind |
| Tone colors for stats | `toneClasses()` until >3 tones or compound variants |
| Merging caller `className` | Always `cn()` from `@/lib/utils` |

Document this matrix in [frontend-standards.md](./frontend-standards.md) § Coding Standards (one short subsection — see §7).

---

## 6. Implementation phases

Work in small PRs; one phase at a time per CLAUDE.md.

### Phase 0 — Plan only (this document)

- [x] Audit duplicated patterns
- [x] Decide Surface / StatCard scope
- [ ] Review & approve plan

### Phase 1 — `Surface` + tests

- [x] Add [src/components/Surface.tsx](../src/components/Surface.tsx) with `elevation`, `radius`, `padding` props
- [x] Unit test: 8 tests in `Surface.test.tsx` covering all elevation/radius/padding variants, passthrough, and children
- [x] Migrate **DaySummary** (3 panels) to `<Surface padding="md">`
- [x] Migrate **WeekGrid** outer wrapper to `<Surface className="overflow-hidden">`
- [x] `bun run test` (189 tests green), `bun run lint` (clean)

### Phase 2 — `StatCard`

- [x] Add [src/components/StatCard.tsx](../src/components/StatCard.tsx) using `toneClasses`; 6 tests in `StatCard.test.tsx`
- [x] Replace `Kpi` (Dashboard) — motion.div wrappers kept at call site; local `Card` panels migrated to `<Surface padding="md">` too
- [x] Replace `SummaryCard` (Week) — removed local component; `toneClasses`/`StatTone` imports cleaned up
- [x] Replace `Stat` (Month) — removed local component
- [x] Activities header chips — deferred to Phase 3; left inline (chips feel meaningfully different)
- [x] All 33 test files (195 tests) green; lint clean

### Phase 3 — Glass sections & schedule rows

- [x] Added `forwardRef` to `Surface` for dnd-kit ref compatibility (tests still green)
- [x] `ActivityEditor.tsx` → `<Surface elevation="glass" padding="lg" className="space-y-5">`
- [x] `PriorityRanker/index.tsx` → `<Surface elevation="glass" padding="lg" className="space-y-4">`
- [x] `SchedulePage.tsx` sort row → `<Surface ref={...} elevation="muted" radius="xl" padding="sm" className="flex…">`
- [x] `SchedulePage.tsx` mini-week preview panel → `<Surface padding="md">`
- [x] `LabelsPage.tsx` category row → `<Surface elevation="muted" radius="lg" className={cn("flex… p-2", …)}>`
- [x] Dashboard local `Card` already renamed to `Surface` + inline title in Phase 2

### Phase 4 — Docs & optional polish

- [x] Updated [frontend-standards.md](./frontend-standards.md) — added "Layout surfaces & variants" and "CVA decision matrix" subsections under Coding Standards
- [ ] Optional: add one-line cross-link in [DESIGN.md](./DESIGN.md) Components section
- [ ] Optional: add `prettier-plugin-tailwindcss` for class order (separate commit if desired)
- [ ] Optional: promote `Surface` to `ui/surface.tsx` with CVA if variant API stabilizes

---

## 7. Documentation updates (Phase 4)

Add to **frontend-standards.md** under Coding Standards:

```markdown
### Layout surfaces & variants

- **Dashboard/calendar/schedule panels** → `Surface` ([src/components/Surface.tsx](../src/components/Surface.tsx)).
- **KPI / stat tiles** → `StatCard` + `toneClasses` — do not copy `rounded-2xl border border-border bg-surface` into pages.
- **Settings/forms with titled sections** → shadcn `Card`.
- **CVA** → shadcn `ui/` primitives and components that expose `variant`/`size` props; not for page layout.
```

---

## 8. Out of scope

- TanStack Table / data-table pattern
- Rewriting shadcn `Card` tokens to match `bg-surface`
- Project-wide CVA adoption or ESLint rule for CVA
- Full-page header extraction (`SectionHeader`) unless Phase 3 reveals clear duplication
- i18n changes (no user-facing copy in Surface/StatCard)
- Motion abstraction (`MotionSurface`) — YAGNI

---

## 9. Success criteria

- Zero local components named `Card` in page files
- KPI markup exists in exactly one component (`StatCard`)
- Primary panel classes (`rounded-2xl border border-border bg-surface`) defined in one place (`Surface`)
- No new CVA definitions outside `ui/` unless `Surface` gains exported `surfaceVariants` in Phase 4
- All existing tests pass; new tests cover `Surface` elevation and `StatCard` tone/icon variants

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Visual drift during migration | Migrate one screen per PR; compare before/after in browser |
| Over-abstraction (Activities chips) | Allow compact stat to stay inline if `StatCard` API gets awkward |
| shadcn vs Surface confusion | Document decision table (§4); code review checklist |
| CVA creep in feature code | CVA matrix in standards (§5); reject drive-by `cva()` in pages |
