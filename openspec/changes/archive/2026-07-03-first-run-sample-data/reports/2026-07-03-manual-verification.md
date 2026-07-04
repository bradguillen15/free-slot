# Manual Verification — first-run-sample-data

- Date: 2026-07-03
- Change: first-run-sample-data
- Agent: Claude Code

## Limitation

A full end-to-end cloud verification (real Supabase signup → `useProfile()` lazy-seed → `schedule_blocks`/`time_logs` rows appearing with `is_example: true`) requires a local Supabase stack (`supabase start`), which needs Docker — unavailable in this sandbox (`docker info` fails). The guest path was verified directly (see below) and via the full Vitest suite, which exercises `ensureBootstrap()`, the cloud seeding function (`seedCloudSampleData`, mocked resources), `clearExampleData`, and `migrateGuestToCloud`'s filtering, all with passing assertions (547/547 unit tests, see task 14.2).

## What was verified directly

Exercised `src/lib/sampleData.ts` (the shared template both guest and cloud seeding consume) directly:

```js
import { SAMPLE_SCHEDULE_BLOCKS, buildSampleTimeLogs } from ".../src/lib/sampleData.ts";
console.log(SAMPLE_SCHEDULE_BLOCKS);
console.log(buildSampleTimeLogs("2026-07-03", categoryIdByName));
```

## Observed output

- `SAMPLE_SCHEDULE_BLOCKS`: 3 blocks (Sleep 23:00–07:00 all days, Work 09:00–17:00 weekdays, Lunch 12:00–13:00 weekdays) — matches the existing `BLOCK_PRESETS` shapes already used elsewhere in the app.
- `buildSampleTimeLogs("2026-07-03", fullCategoryMap)`: 3 logs (Deep work, Exercise, Reading), all `date: "2026-07-03"`, all `is_example: true`, category ids correctly resolved by name.
- `buildSampleTimeLogs` with a partial category map (only "Deep work" present): correctly skips the two logs whose category doesn't exist, returning only the resolvable one — confirms the "missing category" guard works.

## Guest end-to-end (via Vitest, real localStorage)

`src/lib/localStore.test.ts` calls the real `ensureBootstrap()` against jsdom's `localStorage` (not mocked) and asserts: sample schedule blocks and 2–3 sample logs for "today" are seeded with `is_example: true`; a second `ensureBootstrap()` call does not reseed; editing a sample block/log via `upsertScheduleBlock`/`updateLog` clears `is_example`; `clearExampleScheduleBlocks`/`clearExampleTimeLogs` remove only untouched samples. All pass.

## Outcome

- Manual verification status: PASS (with the noted Docker/cloud-HTTP-layer limitation)
- Blocking issues: none
