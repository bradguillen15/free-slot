# Code Review Rubric — FreeSlot

The standing checklist every code review (human or AI) grades a change against. It is the
**R&D log of the architecture and patterns we have decided to follow** — distilled from
[`ARCHITECTURE.md`](./ARCHITECTURE.md), [`frontend-standards.md`](./frontend-standards.md),
[`../src/resources/README.md`](../src/resources/README.md), and patterns observed in the live code.

When you review, walk every section below and record findings against the rubric IDs (e.g. `R-DATA-2`).
When an architectural decision changes, **update this file in the same change** — it is the source of
truth for "what good looks like here", and a review is only complete if the rubric still matches reality.

> How to use: a reviewer copies the [Review checklist](#review-checklist) into the review, marks each
> line pass/fail/n-a, and links failures to findings. New durable patterns get a new `R-*` rule here.

---

## R-ARCH — Architectural invariants

- **R-ARCH-1 — Guest/cloud parity.** Any feature reachable by a guest must work identically in
  guest mode (`localStorage`) and cloud mode (Supabase). New persisted fields must be mirrored in
  `localStore.ts` *and* the Supabase schema. Guest-only or cloud-only features must be deliberate and
  documented (e.g. the AI planner is intentionally cloud-only as a signup incentive).
- **R-ARCH-2 — dataStore is the only data boundary for views.** Pages and feature components read and
  write through `dataStore` hooks. They must never import `@/integrations/supabase/client`
  (ESLint-enforced via `no-restricted-imports`; the allow-list in `eslint.config.js` is a shrinking
  migration debt, not a pattern to copy).
- **R-ARCH-3 — Resources layer import direction.** Only `src/resources/_providers/supabase/*` may
  import the Supabase client. `dataStore` → `@/resources` + `localStore`; pages → `@/resources` types
  only. See the import table in `src/resources/README.md`. No upward or sideways imports.
- **R-ARCH-4 — RLS is mandatory.** Every user table has an `auth.uid() = user_id` policy. New tables
  ship with RLS enabled and an owner policy in the same migration. No cross-user reads.
- **R-ARCH-5 — Schedule is a guide, log is truth.** Presentation-only clipping (DayTimeline) must not
  leak into free-window math (`gaps.ts` treats planned + logged as busy). Don't "fix" one by changing
  the other.

## R-DATA — Data access & React Query

- **R-DATA-1 — No data fetching in `useEffect`.** No hand-rolled `useState` + Supabase/localStorage
  reads in components. Reads go through `dataStore` React Query hooks.
- **R-DATA-2 — Writes invalidate, callers don't.** Mutations invalidate the relevant query keys
  themselves; do not thread manual `refresh()` / `onSaved` callbacks through props.
- **R-DATA-3 — Query keys are centralized.** Always use `queryKeys.*` from `@/lib/queryKeys`. Never
  inline string-array keys (note: `useUpsertDailyNote` currently inlines keys — that is a violation to
  fix, not a precedent).
- **R-DATA-4 — Optimistic updates restore on error.** `onMutate` snapshots, `onError` rolls back,
  `onSettled` invalidates (see inbox mutations for the reference shape).

## R-SYNC — Cross-source consistency (high-bug-density area)

- **R-SYNC-1 — Guest seed == cloud signup defaults.** `DEFAULT_CATEGORY_SEED` in `localStore.ts` must
  match the `handle_new_user()` trigger's category inserts (name, type, color). Enforced by
  `defaultCategorySeed.test.ts`. **When you change category defaults you must change the SQL
  trigger.** An `UPDATE` migration that fixes existing rows does **not** update the trigger — new
  signups will diverge. Always `CREATE OR REPLACE FUNCTION handle_new_user()` too.
- **R-SYNC-2 — Enum/union changes propagate to every layer.** Adding a value to a domain union (e.g.
  category `type`) requires updating: the SQL enum, `LocalTimeLog`/`LocalCategory` types, every
  inline param type in `localStore.ts` (`insertLog`, `updateLog`, `moveLog`, …), `dataStore.ts`,
  the resources mappers, and the seed. Run `pnpm typecheck` to prove the union is threaded through.
- **R-SYNC-3 — Migration round-trips are loss-free and retry-safe.** `migrateGuest.ts` must carry
  every persisted field (incl. `note_json`) and every step must dedupe against existing cloud rows so
  a partial-failure retry never duplicates. The "clear guest data" step runs only after all steps
  succeed.

## R-TYPE — Type safety

- **R-TYPE-1 — `pnpm typecheck` is green.** A failing `tsc` blocks merge. Never report typecheck as
  passing from a `| tail` / `| grep` pipeline — the pipe's exit code masks `tsc`'s. Run it bare.
- **R-TYPE-2 — No `any` / no escape-hatch casts.** No `any`, no `as unknown as X` double-casts. Model
  the type at the boundary instead. Explicit types on props and hook return shapes.

## R-COMP — Component conventions

- **R-COMP-1 — Use the shared surfaces.** Panels → `Surface`; KPI tiles → `StatCard` + `toneClasses`;
  titled forms → shadcn `Card`. Never re-implement `rounded-2xl border bg-surface` inline, never
  define a local component named `Card` in a page.
- **R-COMP-2 — Semantic tokens only.** Colors from `index.css` / `tailwind.config.ts`. No `bg-white`,
  `text-black`, or raw hex in components.
- **R-COMP-3 — Named imports only.** No `import * as` (ESLint-enforced). Alias on conflict.
- **R-COMP-4 — Co-locate heavy component logic.** Substantial component-specific effects/derivations
  become `Foo/useX.ts` hooks beside `Foo/index.tsx`; genuinely reusable hooks go in `src/hooks/`.
- **R-COMP-5 — Comments explain *why*, not *what*.** Invariants, guest/cloud semantics, workarounds,
  security/product decisions. No restating of variable names. JSDoc exported APIs with non-obvious
  contracts.

## R-TEST — Testing

- **R-TEST-1 — Test behavior, not brittle markup.** Assert on roles/labels/text and rendered output,
  not on private CSS class strings or responsive utility classes (`hidden sm:block`). The MonthPage
  strip tests are the anti-example: they broke on a visual refactor that didn't change behavior.
- **R-TEST-2 — Pure logic in `src/lib` gets focused unit tests** (`gaps`, `schedule`, `time`,
  `weeklyReview`, collisions). Edge cases: overnight wrap, DST-free minute math, empty inputs.
- **R-TEST-3 — Mock the data layer, never hit Supabase.** Inject `createMockResourcesProvider` or
  mock `dataStore`/`localStore`. Component tests wrap with `renderWithProviders()`.
- **R-TEST-4 — Guard cross-source invariants with sync tests** (see `defaultCategorySeed.test.ts`).
  Such tests must resolve the *latest* relevant migration, not hardcode a filename that goes stale.
- **R-TEST-5 — Fast checks while iterating; full verify once at the end.** During implementation run
  `pnpm lint`, `pnpm typecheck`, and `pnpm test` as needed. Run `pnpm verify` **once** when you
  believe the change is complete (before archive/PR) — that is when guest E2E runs. Update
  `e2e/*.e2e.ts` in the same change when guest UX, testids, or dialog requirements change.

## R-SEC — Security

- **R-SEC-1 — Edge functions verify the caller.** Build a user-scoped client from the `Authorization`
  header and `getUser()` before any privileged work; service-role clients act only on `user.id`.
- **R-SEC-2 — Don't leak internals to clients.** Never return raw DB / exception messages
  (`insErr.message`, `e.message`) in responses — log server-side, return a generic message. (Current
  violations: all three edge functions.)
- **R-SEC-3 — Secrets stay server-side.** AI / service-role keys live in Supabase secrets, never in
  client bundles or `dataStore`.
- **R-SEC-4 — Untrusted model output is validated** before persistence (see `validateSlots`).

## R-DEP — Dependencies & dead code

- **R-DEP-1 — No unused deps / dead files.** Run `npx knip` before sweeping; verify dynamic imports,
  re-exports, and shadcn primitives kept on purpose before deleting.
- **R-DEP-2 — One notification system.** Use `sonner` for toasts. No second Radix-toast stack.

---

## Review checklist

Copy into each review; mark ✅ / ❌ / N-A and link failures.

```
ARCH  [ ] guest/cloud parity   [ ] dataStore boundary   [ ] resources import dirs   [ ] RLS on new tables
DATA  [ ] no useEffect fetch   [ ] mutations invalidate  [ ] queryKeys.* only        [ ] optimistic rollback
SYNC  [ ] seed == trigger      [ ] union threaded (tsc)  [ ] migration loss-free + retry-safe
TYPE  [ ] tsc green (bare)     [ ] no any / double-cast
COMP  [ ] Surface/StatCard     [ ] semantic tokens       [ ] named imports           [ ] logic co-located
TEST  [ ] behavior not markup  [ ] lib unit coverage     [ ] data layer mocked       [ ] sync guards
SEC   [ ] caller verified      [ ] no leaked internals   [ ] secrets server-only     [ ] model output validated
DEP   [ ] no dead code/deps    [ ] single toast system
```

## Findings tracker

Living per-review findings live in `docs/code-review-plan.md` (historical) and dated review reports
(e.g. `docs/code-review-2026-06-21.md`). This rubric holds the *rules*; reports hold the *findings*.
