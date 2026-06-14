# UX Plan — Schedule Block Editing & Label Management Page

**Status:** implemented (2026-06-13) — schedule block editing and the dedicated Labels page shipped in `93ceae9`; kept as the design record.
**Date:** 2026-06-12
**Origin:** user feedback — "I'd like to edit these schedule activities more easily — add a pencil that opens the modal. The copy button needs a tooltip. And a page to manage labels: the app should ship general defaults (meals, sleep, movies/series/anime…), users add their own on top, and can hide the ones they don't use."
**Previous round:** [ux-schedule-management-plan.md](./ux-schedule-management-plan.md) (implemented 2026-06-10–12; this plan builds on the `/app/schedule` page and CategoryPicker it introduced)

---

## 1. Problem statement (verified against the code)

| # | Pain | Root cause in code |
|---|---|---|
| P1 | No way to fully edit a schedule block from the Schedule page; in particular its **label** cannot be changed there at all | `SchedulePage` uses `ScheduleBlockDialog` only in create mode. The dialog already supports edit mode (`block?` prop, used by the Day timeline) and is the only UI exposing the label picker for blocks — the inline row has no label control. |
| P2 | Icon buttons on schedule rows are cryptic (the copy icon was mistaken for something else) | Drag / duplicate / delete buttons have `aria-label`s but no visible hover tooltips. |
| P3 | Color editing is inconsistent | The create modal offers a fixed 8-swatch palette (`COLORS` in `ScheduleBlockDialog`); the inline row offers a free `<input type="color">`. Same property, two different capabilities depending on where you edit. |
| P4 | Duplicating a block appends the copy at the end of the list and gives no feedback | `duplicate` in `SchedulePage` upserts without a position (so `sort_order` puts it last) and only toasts on failure. |
| P5 | Label management is buried and cloud-only; defaults can't be hidden | The Settings section does category CRUD but is rendered only for signed-in users (`{user && …}`) and hardcodes `"cloud"` mode. There is no `hidden` flag on categories — unwanted defaults can only be deleted. |
| P6 | Default label set is missing common "general life" labels | `DEFAULT_CATEGORIES` (11 entries) covers Meals, Social media, Gaming, Idle… but has no Sleep, Movies & series, or Anime. |

## 2. Decisions (2026-06-12, user-confirmed)

1. **Pencil button per schedule row** opening `ScheduleBlockDialog` in edit mode — the full-edit path, including label assignment.
2. **Inline editing stays** (name, times, day toggles) **but the inline color input is removed** — color is edited in the modal only.
3. **Modal color control gains free color choice** (palette for quick picks + custom color input), matching what the inline row allowed. Applies to create and edit.
4. **Copy button stays** and gets a visible tooltip; all row icon buttons get tooltips.
5. **Duplicate inserts the copy directly below the original** (not at the end) and shows a success toast.
6. **Labels are for cataloging/grouping activities on the dashboard.** The app ships general defaults — including Sleep — so users can track them out of the box; users add their own on top.
7. **Label management moves to a dedicated Labels page** and is removed from Settings. Must work for guests too.
8. **Defaults are hide-only; custom labels can be hidden or deleted.** Hiding removes a label from pickers without touching historical data.
9. **No third "neutral" label type** — sleep/meals are typed within the existing productive/unproductive binary.

Delegated calls (flagged for veto):
- **Sleep is typed `productive`** (it's recovery; typing it unproductive would distort the productive ratio).
- **Movies & series and Anime ship as two separate defaults** — low-cost since either can be hidden.

## 3. Requirements

### Part 1 — Schedule page: easier block editing

**1.1 Edit button (pencil) per row**
Each block row gets a pencil icon button (next to duplicate/delete) opening `ScheduleBlockDialog` pre-filled with the block. Saving refreshes the list. This closes P1: the modal is the only place a block's label can be assigned.

**1.2 Remove inline color from rows**
Drop the `<input type="color">` from `SortableScheduleRow`. Inline editing of name, times, and day toggles is unchanged.

**1.3 Free color choice in the modal**
Replace the fixed 8-swatch control with palette + custom color input (any color), in both create and edit mode.

**1.4 Tooltips on row icon buttons**
Drag handle, duplicate, pencil, and delete get visible hover tooltips (shadcn `Tooltip`, already vendored). Texts through i18n alongside the existing `schedule.duplicate` / `schedule.delete` keys.

**1.5 Duplicate placement + feedback**
- The copy is inserted **directly below the original**: create the copy, then persist the order via the existing `reorderScheduleBlocks` with the new id spliced in after the original (same mechanism as drag-and-drop, so guest and cloud both work).
- Success toast (e.g. "Block duplicated"), i18n'd — currently the action only toasts on failure.

**1.6 Unchanged:** preset chips under the title, drag-to-reorder.

### Part 2 — Labels page

**2.1 New page + navigation**
New "Labels" page (e.g. `/app/labels`) added to desktop sidebar and the mobile hamburger menu. **Mode-aware** (guest via localStore, signed-in via Supabase) through the existing `dataStore` category mutations — unlike the current Settings section.

**2.2 Replaces the Settings section**
The label management block in `SettingsPage` is removed; the Labels page is the single home. (Optionally a link card in Settings, mirroring the "Manage schedule" pattern.)

**2.3 Page contents**
Labels grouped by type (Productive / Unproductive), each showing color, name, and a "default" badge for seeded ones. Operations:
- **Create** (name, type, color) — same validation as the picker's on-the-fly creation.
- **Edit** name and color of any label.
- **Hide / show** any label. Hidden labels disappear from all pickers (`QuickLogDialog`, `ScheduleBlockDialog`) but historical logs and dashboard groupings keep them — no data loss.
- **Delete** — custom labels only. Defaults can't be deleted, only hidden (keeps "restore" trivial, avoids re-seed headaches).

**2.4 Schema change**
New `hidden: boolean` (default `false`) on categories — `localStore.LocalCategory` for guests plus a Supabase migration. `migrateGuest` must carry the flag.

**2.5 Expanded default set**
Add to `DEFAULT_CATEGORIES` (and the cloud signup seed): **Sleep** (productive), **Movies & series** (unproductive), **Anime** (unproductive). Meals, Social media, Gaming, Idle already exist.

**2.6 Top-up seeding for existing users**
New defaults must reach already-bootstrapped users: an idempotent guest top-up (insert-if-name-missing in localStore bootstrap) and a cloud migration following the `20260610121000_add_default_categories.sql` pattern. Keep names in sync between localStore and SQL for `migrateGuest` mapping. Update the `localStore` test asserting "11 default categories" (→ 14).

## 4. Out of scope

- No third "neutral" label type.
- No changes to preset chips, drag-to-reorder, or recurrence semantics.
- No per-log label changes beyond what pickers already allow.

## 5. Phasing

| Phase | Scope | Size |
|---|---|---|
| A | Part 1 (pencil, inline color removal, modal color, tooltips, duplicate placement + toast) | S |
| B | Part 2 (Labels page, hidden flag + migrations, expanded defaults + top-up seeding, Settings cleanup) | M |

Each phase is its own OpenSpec change (`opsx:new` → `opsx:ff` → apply → verify); planning steps require Opus high reasoning (CLAUDE.md §5).

Implementation notes:
- TDD per CLAUDE.md: SchedulePage component tests for pencil/duplicate-position/toast; dataStore adapter tests for `hidden`; localStore seeding tests for the top-up.
- Reuse, don't fork: `ScheduleBlockDialog` edit mode, `reorderScheduleBlocks`, `CategoryPicker`, vendored `Tooltip`.
- All new strings through i18n (en + es).
- Hidden-label filtering belongs in one place (e.g. a selector over `useCategories`) so pickers can't drift.
- Deployment (cloud): apply the `hidden` + default-categories migrations before deploying the frontend.

## 6. Open questions

None blocking — the two delegated calls in section 2 (Sleep typed productive; Movies & series vs Anime as separate defaults) are open for veto until Phase B planning starts.
