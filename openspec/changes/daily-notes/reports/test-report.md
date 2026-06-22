# Test Report — daily-notes

**Date:** 2026-06-19
**Branch:** feature/daily-notes

## Summary

| Check | Result |
|-------|--------|
| `pnpm test` | ✅ 330/330 tests pass (44 test files) |
| `pnpm typecheck` | ✅ 0 errors |
| `pnpm lint` | ✅ 0 errors (3 pre-existing warnings in coverage files) |
| Playwright E2E | ✅ 15/15 tests pass (`e2e/daily-notes.e2e.ts`) |

## New Test Files

- `src/components/notes/DailyNoteEditor.test.tsx` — 3 tests
  - Renders collapsed when `initialContent` is null
  - Expands on placeholder click
  - Calls `onChange` with Tiptap JSON after 300ms debounce

- `src/components/notes/InboxPanel.test.tsx` — 4 tests
  - Renders active items
  - Calls add mutation on Enter key
  - Calls archive mutation on archive button click
  - Shows empty state when no items

## Updated Tests

- `supabase/functions/_shared/planning.test.ts` — 25 tests (11 new)
  - `<user_notes>` block injected when notes provided
  - `<user_inbox>` block injected when inbox items provided
  - Blocks omitted when inputs are empty
  - Notes truncated to 500 chars
  - Inbox items truncated to 200 chars
  - Inbox capped at 20 items
  - Injection attempt passes through as plain text
  - Injection-defence directive present in system prompts
  - `buildReviewPrompts` injects notes block and defence directive

- `src/components/week/WeekGrid.test.tsx` — 3 tests (pre-existing, no regressions; `type` field fix applied)
- `src/lib/migrateGuest.test.ts` — 6 tests (pre-existing, no regressions)
- `src/pages/CalendarPage/index.test.tsx` — 1 test (pre-existing, no regressions)

## Notes

- Steps 1 (db push + type regeneration) and 15 (manual verification) require a live Supabase connection and dev server.
- The `daily_notes` and `inbox_items` tables are now present in `src/integrations/supabase/types.ts`, so the Supabase provider no longer needs `as any` casts for those tables.
