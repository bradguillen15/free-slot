# Conventions

Cross-cutting coding conventions for FreeSlot that apply on top of the area-specific
standards. For the full picture see [frontend-standards.md](./frontend-standards.md),
[backend-standards.md](./backend-standards.md), and [base-standards.md](./base-standards.md).

---

## Forms

**All forms use `react-hook-form` + `zod` (via `@hookform/resolvers/zod`). Manual
controlled-input `useState` for form fields is forbidden.**

These libraries and the shadcn `Form` primitives ([src/components/ui/form.tsx](../src/components/ui/form.tsx))
are already in the project — there is no setup cost. See
[rhf-migration-plan.md](./rhf-migration-plan.md) for the inventory of existing forms
being migrated and the per-form Zod schemas.

### Required

1. **One `useForm` per form**, typed with `z.infer<typeof schema>`:
   ```tsx
   const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });
   ```
2. **Validation lives in the Zod schema** — never inline in the submit handler. This includes:
   - required / non-empty: `z.string().trim().min(1, "…")`
   - cross-field rules (`start !== end`, etc.): `.refine()` / `.superRefine()` with a `path`
   - coercion for numeric inputs: `z.coerce.number()`
3. **Submit state comes from `formState.isSubmitting`** — do not add a separate
   `saving`/`loading`/`submitting` boolean for the form submission.
4. **Re-syncing defaults** (e.g. when a dialog opens or React Query data arrives) uses
   `form.reset(defaults)` — not a manual `useEffect` that calls `setX` per field, and not
   one-shot hydration flags like `prefsLoaded`.
5. **Field wiring goes through `FormField` / `FormControl`** from `@/components/ui/form`
   so labels, errors, and a11y ids are consistent. Non-native controls
   (`Switch`, `Select`, time inputs, `ColorInput`, `CategoryPicker`, toggle groups) are
   wired via `FormField`'s `render` prop or `Controller` — they cannot be `register`-ed.
6. **Validation messages render via `FormMessage`.** Server/mutation errors go to
   `form.setError("root", …)` (or a specific field), not only a `toast`. `toast` is for
   success and out-of-band failures.
7. **Submission calls a `dataStore` mutation** (per [frontend-standards.md](./frontend-standards.md)
   §Data Access) — the form collects and validates; it does not call `supabase` directly.

### Forbidden

- ❌ `const [name, setName] = useState("")` + `<Input value={name} onChange={…} />` for a form field.
- ❌ Inline `if (!name.trim()) { toast.error(…); return; }` or `required`/comparison checks in `onSubmit`.
- ❌ A bespoke `saving`/`loading` boolean wrapping a form submit.
- ❌ A `useEffect` that copies props/data into per-field state to "reset" a form.
- ❌ Hand-rolled `nameError`/`fieldError` strings — use `formState.errors` + `FormMessage`.

### Not a form (leave as `useState`)

`react-hook-form` is for **user-entered field input**. The following stay as local state and
must **not** be forced into `useForm` (see [rhf-migration-plan.md](./rhf-migration-plan.md) §5):

- Filter / view / navigation state (`weekStart`, `date`, view switching).
- Dialog/menu open + selection state (`*Open` booleans, `*Target` selections, context menus).
- Streaming / async-result state (e.g. the AI plan panel's generate→result flow).
- Drag-and-drop state (`@dnd-kit` order arrays, drag offsets).
- Combobox/popover internal `open`/`query` state (wire the field *value* via `Controller`).
- Inline editable-table rows that save on blur/toggle (an intentional pattern, not a form).
- Data fetching — that is React Query / `dataStore` (see [react-query-migration-plan.md](./react-query-migration-plan.md)).

### Pattern reference

The canonical `useForm` + `zodResolver` + `Form`/`FormField` skeleton lives in
[rhf-migration-plan.md](./rhf-migration-plan.md) §2. New forms should follow it verbatim.
</content>
