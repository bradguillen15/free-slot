## Context

Daily notes already exist via `DailyNoteEditor` (Tiptap, stored as JSON), surfaced in the Day view's right panel. The panel currently has a timeline at top and the note editor below it. This change adds a recurring notes concept (carry-forward) and inline log notes, requiring both new storage keys and UI restructuring.

## Goals / Non-Goals

**Goals:**
- Give notes a tab-level home in the Day view so they're reachable without scrolling
- Add recurring note carry-forward with per-session collapsed state
- Add optional Tiptap note field to individual time-log entries

**Non-Goals:**
- Cross-day note search or note history browser
- Syncing recurring notes to the cloud (guest localStorage only for recurring notes in v1)
- Markdown export or external sharing

## Decisions

**Tab vs collapsible section**: Use a tab (or segmented control) in the Day view panel rather than a collapsible, so the notes area gets full panel height. The existing `Tabs` component from shadcn/ui fits without a new dependency.

**Recurring note storage**: Store recurring notes in `localStorage` under `freeslot.guest.recurring_notes.<YYYY-MM-DD>`. On opening a date, read backwards to find the most recent entry (up to 30 days back) and pre-populate. This keeps the carry-forward purely client-side.

**Collapsed state storage**: Store a single boolean at `freeslot.ui.recurring_note_collapsed` — one global preference (not per-date).

**Log inline note**: Add `note_json?: object` to `LocalTimeLog` type and to the Supabase `time_logs` table (nullable `jsonb` column). The quick-log dialog gets a small toggle-to-expand Tiptap field. To keep the dialog small, the note field is collapsed by default.

**Tiptap instance reuse**: Each context (daily note, recurring note, log note) gets its own `useEditor` instance — sharing a single editor would require complex content-swapping and risks stale state.

## Risks / Trade-offs

- [Risk] Tiptap bundle is ~60 kB gzip; three instances in the Day view add weight → Mitigation: lazy-load the Notes tab content so Tiptap is not loaded until the tab is first opened.
- [Risk] Recurring note carry-forward could pre-populate stale content the user doesn't want → Mitigation: make it visually distinct (different background or label "Carried from <date>") and easy to clear.
- [Risk] Supabase migration for `note_json` column on `time_logs` → Mitigation: nullable column with no default, zero-downtime.

## Migration Plan

1. Add `note_json jsonb` column to `time_logs` in Supabase (nullable, no RLS change needed).
2. Add `note_json?: object` to `LocalTimeLog` and cloud mapper.
3. UI changes are additive — no existing data is touched.

## Open Questions

- Should the recurring note also sync to Supabase for authenticated users, or stay guest-only in v1? (Decision: guest-only in v1, add cloud sync in a follow-up.)
