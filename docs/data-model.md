# Data Model — FreeSlot (plan-grow)

Canonical detail also lives in `docs/CLOUD.md`. Update this file when entities or relationships change.

## Core Entities

| Entity | Storage | Key fields | Purpose |
|---|---|---|---|
| Profile | `profiles` | `id` (= auth.uid), `buffer_minutes`, `peak_hours`, `include_weekends`, `weekly_review_day`, `onboarding_completed` | User preferences |
| Category | `categories` | `id`, `user_id`, `name`, `type`, `color`, `is_default` | Tags for activities and logs |
| Activity | `activities` | `id`, `user_id`, `name`, `category_id`, `target_hours_per_week`, `is_active` | Goals / time targets |
| ScheduleBlock | `schedule_blocks` | `id`, `user_id`, `name`, `start_time`, `end_time`, `days_of_week`, `type`, `color`, `category_id` | Recurring fixed time |
| TimeLog | `time_logs` | `id`, `user_id`, `date`, `start_time`, `end_time`, `category_id`, `type`, `notes` | Actual time spent |
| WeeklyPriority | `weekly_priorities` | `user_id`, `week_start`, `activity_id`, `rank` | Drag-ranked focus per week |
| WeeklyPlan | `weekly_plans` | `user_id`, `week_start`, `slots`, `raw_prompt`, `raw_response` | AI-generated plan (`UNIQUE(user_id, week_start)`) |
| WeeklyReview | `weekly_reviews` | `user_id`, `week_start`, `planned_vs_actual`, `insights` | Completed week summary |
| DailyNudge | `daily_nudges` | `user_id`, `date`, `content` | One AI nudge per day |

## Guest Mode Mirror

`src/lib/localStore.ts` mirrors the same shapes in `localStorage`. Time logs are bucketed by month (`freeslot.guest.time_logs.YYYY-MM`).

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
