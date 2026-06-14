# Tech Plan — Migrate Manual Form State to react-hook-form + zod

**Status:** implemented (2026-06-13) — all Tier-1/Tier-2 forms migrated on branch `feature/rhf-zod-forms`; Tier-3 intentionally untouched (§5). Tests/lint/build green (one unrelated pre-existing CalendarPage test failure).
**Date:** 2026-06-13
**Origin:** user request — migrate all manual form state (controlled inputs, `useState` field values, hand-rolled validation, separate `submitting`/`error` booleans) to `react-hook-form` + `zod`.
**Related:** [frontend-standards.md](./frontend-standards.md) (declares "Forms: react-hook-form + zod" but nothing enforces it yet), [react-query-migration-plan.md](./react-query-migration-plan.md) (writes already go through `dataStore`; this plan only changes how the form *collects and validates* input before calling those mutations), [conventions.md](./conventions.md) (new "Forms" section enforces this going forward).

---

## 0. Prerequisites — already satisfied

All required dependencies are installed; no `package.json` change is needed:

| Package | Version (from `package.json`) |
|---|---|
| `react-hook-form` | `^7.61.1` |
| `zod` | `^3.25.76` |
| `@hookform/resolvers` | `^3.10.0` |

The shadcn **`Form` primitives already exist** at [src/components/ui/form.tsx](../src/components/ui/form.tsx) and export `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField`. **They are currently used by zero feature components** — `useForm`/`zodResolver` appear nowhere in `src/` except that wrapper. This migration is the first real adoption.

---

## 1. Audit findings (2026-06-13, verified against the code)

Every component below manages form state by hand: `useState` per field, a manual `useEffect` to re-sync defaults when a dialog opens, inline validation (`name.trim()`, `toMin(end) === toMin(start)`, `confirmText !== "DELETE"`), and separate `saving`/`deleting` booleans that duplicate what `formState.isSubmitting` provides.

### Inventory

| # | Component | Fields managed by hand | Manual validation today | Submit/UI flags | Notes / non-input controls |
|---|---|---|---|---|---|
| **Tier 1 — Pure form components (highest ROI)** |
| P1 | [ScheduleBlockDialog](../src/components/day/ScheduleBlockDialog.tsx) | `name`, `startTime`, `endTime`, `color`, `days[]`, `categoryId` (6 `useState`) | `!name.trim()`, `days.length === 0`, `startTime === endTime` → `toast.error` + early return | `saving`, `deleting` | `useEffect` re-sync on `open`/`block`/defaults; color swatches + `ColorInput`; `CategoryPicker`; multi-select day toggles + presets → need `Controller` |
| P2 | [QuickLogDialog](../src/components/day/QuickLogDialog.tsx) | `title`, `start`, `end`, `categoryId`, `notes` (5 `useState`) | `!title.trim()`, `!categoryId`, `toMin(end) === toMin(start)` | `saving`, `deleting` | `useEffect` re-sync on `open` + defaults; `CategoryPicker`, `Textarea`, time inputs, optimistic-insert callback fires on submit → keep in `onSubmit` |
| P3 | [LabelsPage → `AddLabelDialog`](../src/pages/LabelsPage.tsx) | `draftName`, `draftColor` (+ `nameError`) | `!trimmed` → sets `nameError` string by hand | `saving` | `nameError` state is exactly `formState.errors.name`; `ColorInput` via `Controller`; `type` comes from which button opened it (pass as default) |
| P4 | [Auth](../src/pages/Auth.tsx) | `email`, `password` (2 `useState`) | native `required` / `minLength` only (no JS validation) | `loading`, `googleLoading` | Textbook RHF form. `mode` (signin/signup), `googleLoading`, and the guest-migration `AlertDialog` are **orchestration, not form state** — leave them as `useState` |
| P5 | [ActivityEditor → "Add activity" draft](../src/components/activities/ActivityEditor.tsx) | `draft = { name, category_id, target }` (1 `useState` object) | `!draft.name.trim()` | none (uses `dataStore` directly) | Only the **add-activity draft** is a form. The per-row inline edit (blur-to-save `name`/`target`, `Select`, `Switch`) is **not** a classic form — see §4 |
| **Tier 2 — Settings sections (medium ROI)** |
| S1 | [SettingsPage → "Planner preferences"](../src/pages/SettingsPage.tsx) | `peak_hours.start`, `peak_hours.end`, `include_weekends`, `weekly_review_day` (held in a `localProfile` mirror object) | none beyond types | `saving` | `localProfile` is a hand-rolled "dirty buffer" over the React Query `profile` — RHF `defaultValues` + `reset(profile)` replaces it. `Switch`, `Select`, time inputs → `Controller` |
| S2 | [SettingsPage → "Delete account" confirm](../src/pages/SettingsPage.tsx) | `confirmText` (1 `useState`) | `confirmText !== "DELETE"` gates the button | `deleting` | Tiny single-field form; good candidate for a `z.literal("DELETE")` schema |
| S3 | [Onboarding → step 3 "Preferences"](../src/pages/Onboarding.tsx) | `peakStart`, `peakEnd`, `includeWeekends`, `reviewDay` (+ `prefsLoaded`) | none | `saving` | `prefsLoaded` one-shot hydration `useEffect` → RHF `reset(profile)` once. Steps/`step` index, progress UI, and `skip()` stay as orchestration |
| **Tier 3 — Screen-level orchestration (lowest ROI / mostly out of scope)** |
| O1 | [WeekPage](../src/pages/WeekPage.tsx), [MonthPage](../src/pages/MonthPage.tsx), [CalendarPage](../src/pages/CalendarPage/index.tsx), [DashboardPage](../src/pages/DashboardPage/index.tsx), [SchedulePage](../src/pages/SchedulePage.tsx) | `weekStart`/`yearMonth`/`date` nav, `*Open` dialog toggles, `*Target`/`logCtx` selections, `orderedIds`, `aiPlan` | n/a | n/a | **Not forms.** These host the Tier-1 dialogs and pass defaults in. Out of scope — see §5 |

### Shared field components (migrate as `Controller`-wired inputs, not as their own forms)

- [ColorInput](../src/components/ColorInput.tsx) — `value`/`onChange` controlled pair (native `<input type="color">` + hex text). Already a clean controlled component; wrap with `Controller` at each call site.
- [CategoryPicker](../src/components/CategoryPicker.tsx) — combobox with `value`/`onChange`; its internal `open`/`query` are **popover UI state**, not form state. Wrap with `Controller`.

Neither needs an internal `useForm`. They stay presentational; the parent form owns their value.

---

## 2. Standard pattern to follow

All forms adopt the same shape. Schemas live next to the component (e.g. `ScheduleBlockDialog.schema.ts`) or in a shared `src/lib/formSchemas.ts` for cross-used ones.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  // …
});
type FormValues = z.infer<typeof schema>;

export function ExampleForm({ defaults, onDone }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // Re-sync when defaults change (replaces the manual useEffect + setX calls).
  useEffect(() => form.reset(defaults), [defaults]);

  const onSubmit = async (values: FormValues) => {
    try {
      await upsertSomething(mode, userId, values); // dataStore mutation, unchanged
      toast.success("Saved");
      onDone?.();
    } catch (err) {
      // surface server errors on a field or as a form-level error
      form.setError("root", { message: err instanceof Error ? err.message : "Save failed" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Native input: register via FormField + spread field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} placeholder="e.g. Work" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Non-native control (Switch/Select/ColorInput/CategoryPicker/day toggles):
            FormField's render already gives you a controlled value/onChange. */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <ColorInput value={field.value} onChange={field.onChange} ariaLabel="Color" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save"}
        </Button>
      </form>
    </Form>
  );
}
```

### Rules baked into the pattern

1. **One `useForm` per form.** No per-field `useState`.
2. **`zodResolver(schema)` is the only validation.** No inline `.trim()`/`required`/comparison checks scattered in the submit handler. Cross-field rules (`startTime !== endTime`, `end !== start`) use `.refine()`/`.superRefine()` so the message lands on the right field.
3. **`formState.isSubmitting` replaces `saving`.** Delete the `saving`/`loading` booleans. (A separate destructive action like `deleting` that runs *outside* the form submit may stay as local state — it is not a form submission.)
4. **`form.reset(defaults)` replaces the open-time re-sync `useEffect`** and the one-shot hydration flags (`prefsLoaded`).
5. **Non-native controls** (`Switch`, `Select`, time `Input`, `ColorInput`, `CategoryPicker`, day-toggle buttons) are wired through `FormField`'s `render` (or `Controller`) — they have no `ref` to `register`.
6. **Server/mutation errors** go to `form.setError("root", …)` (or a specific field) and render via `FormMessage`/a root error line, instead of only `toast.error`. Keep `toast` for success.
7. **`dataStore` mutations are unchanged.** This migration touches input collection + validation only; writes still flow through the existing async mutation functions (per [frontend-standards.md](./frontend-standards.md) §Data Access).

---

## 3. Zod schemas (one per form)

Proposed schemas. `HH:MM` and hex-color refinements can be shared helpers in `src/lib/formSchemas.ts`.

```ts
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex color");
const labelType = z.enum(["productive", "unproductive"]);
```

**P1 — ScheduleBlock**
```ts
const scheduleBlockSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  startTime: timeString,
  endTime: timeString,
  color: hexColor,
  days: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one day"),
  categoryId: z.string().optional(), // "" → null at submit
}).refine((v) => v.startTime !== v.endTime, {
  message: "End time must differ from start time",
  path: ["endTime"],
});
// end < start is intentionally allowed (overnight block) — only equality is rejected.
```

**P2 — QuickLog**
```ts
const quickLogSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  start: timeString,
  end: timeString,
  categoryId: z.string().min(1, "Pick a label"),
  notes: z.string().optional(), // "" → null at submit
}).refine((v) => toMin(v.end) !== toMin(v.start), {
  message: "End time must be after start",
  path: ["end"],
});
```

**P3 — AddLabel**
```ts
const addLabelSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  color: hexColor,
  type: labelType, // seeded from which "Add label" button was clicked
});
```

**P4 — Auth**
```ts
const authSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
// `mode` (signin/signup) stays outside the schema — it selects the submit branch.
```

**P5 — ActivityDraft (add-activity)**
```ts
const activityDraftSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  categoryId: z.string().optional(), // "" → null
  target: z.coerce.number().min(0, "Must be ≥ 0"),
});
```

**S1 / S3 — PlannerPreferences (shared by Settings + Onboarding step 3)**
```ts
const plannerPrefsSchema = z.object({
  peakStart: timeString,
  peakEnd: timeString,
  includeWeekends: z.boolean(),
  weeklyReviewDay: z.number().int().min(0).max(6),
});
```

**S2 — DeleteAccountConfirm**
```ts
const deleteAccountSchema = z.object({
  confirmText: z.literal("DELETE", {
    errorMap: () => ({ message: 'Type "DELETE" to confirm' }),
  }),
});
```

---

## 4. Gray areas (decide before implementing)

- **ActivityEditor per-row inline editing** ([ActivityEditor.tsx](../src/components/activities/ActivityEditor.tsx)): each row saves on blur / on toggle via optimistic `updateActivity`, not via a form submit. This is closer to an editable table than a form. **Recommendation:** leave the row editing as-is; migrate only the "Add activity" draft (P5). Revisit rows later only if we want field-level validation messages.
- **LabelsPage `LabelRow` inline edits** ([LabelsPage.tsx](../src/pages/LabelsPage.tsx)): same shape — `defaultValue` + `onBlur` save, native color input. Out of scope; only `AddLabelDialog` (P3) migrates.
- These row editors are explicitly **not** "manual form state we forgot" — they are an intentional inline-edit pattern. Calling that out here so a future pass doesn't try to force `useForm` onto a table row.

---

## 5. Explicitly out of scope

These use `useState`/effects but are **not forms** and must not be migrated to `react-hook-form`:

- **Filter / view / navigation state:** `weekStart`, `yearMonth`, `date`, week/month paging, view switching (WeekPage, MonthPage, CalendarPage, DashboardPage, ViewSwitcher).
- **Dialog & menu visibility / selection state:** `*Open` booleans, `*Target`/`logCtx`/`chooser`/`deleteTarget` selections, context menus (all host pages, DayTimeline).
- **Streaming / async-result state:** AIPlanPanel ([AIPlanPanel.tsx](../src/components/week/AIPlanPanel.tsx)) — `plan`, `loading`, `summary`, `accepted` Set, `acceptingAll`, generating/accepting refs. This is command-trigger + result state, not user-entered form fields.
- **Drag-and-drop state:** SchedulePage `orderedIds`, DayTimeline `dragDy`/`contextMenu` (`@dnd-kit`).
- **Combobox / popover UI state:** CategoryPicker `open`/`query` (migrate the *value* via `Controller`, not the popover internals).
- **Auth orchestration alongside the form:** `mode`, `googleLoading`, `migrateOpen`, `pendingUserId`, `migrating` in Auth.tsx — only `email`/`password` are form fields.
- **Pure UI/loading flags:** GuestBanner `dismissed`/`hasData`, OnboardingGate `status`, ProtectedRoute, `use-mobile`, vendored `ui/sidebar` & `ui/carousel`.
- **Data fetching:** owned by React Query / `dataStore` per [react-query-migration-plan.md](./react-query-migration-plan.md) — unaffected here.

---

## 6. Suggested sequencing (one component per step, TDD)

Smallest/most isolated first to validate the pattern, then fan out:

1. **P3 AddLabelDialog** — small, self-contained, already has a `nameError` to replace; proves the `ColorInput`-via-`Controller` wiring.
2. **P4 Auth** — two native fields, no non-native controls; proves submit/`isSubmitting` + root-error handling.
3. **P2 QuickLogDialog** then **P1 ScheduleBlockDialog** — the two big dialogs; share the time/hex/`CategoryPicker` patterns and `form.reset(defaults)` on open.
4. **P5 ActivityEditor add-draft**.
5. **S2 delete-account confirm**, then **S1 SettingsPage prefs**, then **S3 Onboarding step 3** (S1 and S3 share `plannerPrefsSchema`).

Each step: write a failing test (validation rejects bad input, submit calls the right `dataStore` mutation with parsed values), migrate the component, delete the obsoleted `useState`/`useEffect`/validation, run `bun run test` + `bun run lint`.

---

## 7. Done criteria

- No feature form holds field values in `useState`; all use `useForm` + `zodResolver`.
- No inline `.trim()`/required/cross-field checks in submit handlers — validation lives in Zod schemas.
- `saving`/`loading` submit booleans replaced by `formState.isSubmitting`.
- `conventions.md` "Forms" section enforces the rule for new code (see that file).
- Out-of-scope state (§5) untouched.
</content>
</invoke>
