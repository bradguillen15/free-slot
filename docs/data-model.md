# Data Model — FreeSlot (plan-grow)

Canonical detail also lives in `docs/CLOUD.md`. Update this file when entities or relationships change.

## Core Entities

| Entity | Storage | Key fields | Purpose |
|---|---|---|---|
| Profile | `profiles` | `id` (= auth.uid), `email`, `peak_hours`, `include_weekends`, `weekly_review_day`, `onboarding_completed`, `onboarding_skipped` | User preferences. Either `onboarding_completed` or `onboarding_skipped` being `true` passes the `OnboardingGate`. |
| Category | `categories` | `id`, `user_id`, `name`, `type`, `color`, `is_default`, `hidden`, `sort_order` | Tags for activities and logs |
| Activity | `activities` | `id`, `user_id`, `name`, `category_id`, `target_hours_per_week`, `is_active` | Goals / time targets |
| ScheduleBlock | `schedule_blocks` | `id`, `user_id`, `name`, `start_time`, `end_time`, `days_of_week`, `type`, `color`, `category_id`, `sort_order` | Recurring fixed time |
| TimeLog | `time_logs` | `id`, `user_id`, `title`, `date`, `start_time`, `end_time`, `category_id`, `type`, `notes`, `note_json` | Actual time spent |
| WeeklyPriority | `weekly_priorities` | `user_id`, `week_start`, `activity_id`, `rank` | Drag-ranked focus per week |
| WeeklyPlan | `weekly_plans` | `user_id`, `week_start`, `generated_at`, `slots` | AI-generated plan (`UNIQUE(user_id, week_start)`) |
| WeeklyReview | `weekly_reviews` | `user_id`, `week_start`, `completed_at`, `insights` | Completed week AI insights |
| DailyNote | `daily_notes` | `user_id`, `date`, `content`, `updated_at` | Per-day rich notes |
| InboxItem | `inbox_items` | `id`, `user_id`, `content`, `created_at`, `archived_at` | Week-view capture inbox |

## Guest Mode Mirror

`src/lib/localStore.ts` mirrors the same shapes in `localStorage`. Time logs are bucketed by month (`freeslot.guest.time_logs.YYYY-MM`).

## Denormalization Note

`time_logs.type` stores a copy of the category's `type` at logging time. Changing a category from productive→unproductive does **not** rewrite past logs. All aggregations (DashboardPage, DaySummary, MonthPage) use the stored `time_logs.type` — keep this convention for new views.

## Relationships

- User → many Categories, Activities, ScheduleBlocks, TimeLogs
- Activity → one Category (optional)
- ScheduleBlock → optional Category
- TimeLog → one Category
- WeeklyPriority → Activity for a given `week_start`
- WeeklyPlan / WeeklyReview → scoped by `user_id` + `week_start`

## Signup Migration

`src/lib/migrateGuest.ts` snapshots guest localStorage and inserts into the new user's tables on account creation.

## RLS

All tables: user can only access rows where `auth.uid() = user_id` (profiles: `auth.uid() = id`).
