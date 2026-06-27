// One-shot migration of guest localStorage data into the user's Supabase account.
// Strategy: insert categories first, build an old-id -> new-id map, then remap and insert
// activities, schedule_blocks, time_logs. Also push profile preferences.
//
// Every step checks errors and throws BEFORE clearGuestData() runs, so a failed
// migration never destroys the guest copy. Each step also dedupes against rows
// already in the cloud, so retrying after a partial failure does not duplicate data.
import { resources } from "@/resources";
import {
  listAllGuestDailyNotes,
  getGuestInboxItems,
  snapshot, clearGuestData, hasGuestData,
} from "@/lib/localStore";

export async function migrateGuestToCloud(userId: string) {
  const snap = snapshot();
  if (!hasGuestData()) return { migrated: false, counts: { categories: 0, activities: 0, schedule_blocks: 0, time_logs: 0, priorities: 0 } };

  // 1. Existing cloud categories — map by name (defaults are auto-created on signup trigger).
  const existingCats = await resources.categories.list(userId);
  const cloudCatByName = new Map(existingCats.map((c) => [c.name, c.id]));

  const catIdMap = new Map<string, string>();
  const newCats = snap.categories.filter((c) => !cloudCatByName.has(c.name));
  if (newCats.length) {
    const inserted = await resources.categories.insertMany(
      userId,
      newCats.map((c) => ({
        name: c.name,
        type: c.type,
        color: c.color,
        is_default: false,
        hidden: c.hidden ?? false,
      }))
    );
    inserted.forEach((row) => cloudCatByName.set(row.name, row.id));
  }
  snap.categories.forEach((c) => {
    const cloudId = cloudCatByName.get(c.name);
    if (cloudId) catIdMap.set(c.id, cloudId);
  });

  // Sync hidden flag for categories that already exist in the cloud (matched by name).
  const hiddenSync = snap.categories.filter((c) => c.hidden && cloudCatByName.has(c.name));
  if (hiddenSync.length) {
    await Promise.all(
      hiddenSync.map((c) =>
        resources.categories.upsert(userId, { id: cloudCatByName.get(c.name)!, hidden: true })
      )
    );
  }

  // 2. Activities — skip names that already exist in the cloud (retry safety).
  let activitiesCount = 0;
  const existingActs = await resources.activities.list(userId);
  const existingActNames = new Set(existingActs.map((a) => a.name));

  let allCloudActs = [...existingActs];
  if (snap.activities.length) {
    const rows = snap.activities
      .filter((a) => !existingActNames.has(a.name))
      .map((a) => ({
        name: a.name,
        category_id: a.category_id ? catIdMap.get(a.category_id) ?? null : null,
        target_hours_per_week: a.target_hours_per_week,
        is_active: a.is_active,
      }));
    if (rows.length) {
      const inserted = await resources.activities.insertMany(userId, rows);
      activitiesCount = inserted.length;
      allCloudActs = [...allCloudActs, ...inserted];
    }
  }

  // 3. Schedule blocks — dedupe on (name, start, end) for retry safety.
  let blocksCount = 0;
  if (snap.schedule_blocks.length) {
    const existingBlocks = await resources.scheduleBlocks.list(userId);
    const blockKey = (b: { name: string; start_time: string; end_time: string }) =>
      `${b.name}|${b.start_time.slice(0, 5)}|${b.end_time.slice(0, 5)}`;
    const existingBlockKeys = new Set(existingBlocks.map(blockKey));
    const rows = snap.schedule_blocks
      .filter((b) => !existingBlockKeys.has(blockKey(b)))
      .map((b) => ({
        name: b.name,
        start_time: b.start_time,
        end_time: b.end_time,
        days_of_week: b.days_of_week,
        color: b.color,
        type: b.type,
        category_id: b.category_id ? catIdMap.get(b.category_id) ?? null : null,
      }));
    if (rows.length) {
      const inserted = await resources.scheduleBlocks.insertMany(userId, rows);
      blocksCount = inserted.length;
    }
  }

  // 4. Time logs (chunked) — dedupe on (date, start, end) for retry safety.
  let logsCount = 0;
  if (snap.time_logs.length) {
    const dates = snap.time_logs.map((l) => l.date).sort();
    const existingLogs = await resources.timeLogs.listInRange(userId, dates[0], dates[dates.length - 1]);
    const logKey = (l: { date: string; start_time: string; end_time: string }) =>
      `${l.date}|${l.start_time.slice(0, 5)}|${l.end_time.slice(0, 5)}`;
    const existingLogKeys = new Set(existingLogs.map(logKey));

    const all = snap.time_logs
      .filter((l) => !existingLogKeys.has(logKey(l)))
      .map((l) => ({
        date: l.date,
        start_time: l.start_time,
        end_time: l.end_time,
        category_id: l.category_id ? catIdMap.get(l.category_id) ?? null : null,
        type: l.type,
        title: l.title ?? null,
        notes: l.notes,
      }));
    const CHUNK = 200;
    for (let i = 0; i < all.length; i += CHUNK) {
      const inserted = await resources.timeLogs.insertMany(userId, all.slice(i, i + CHUNK));
      logsCount += inserted.length;
    }
  }

  // 5. Profile flags + preferences.
  // Rules:
  //   - Only write a flag when it is true in the guest profile (never downgrade cloud true→false).
  //   - Only push preference values when the guest completed the prefs step (onboarding_completed);
  //     a skip-only guest never configured them, so pushing DEFAULT_PROFILE values would silently
  //     overwrite legitimate cloud settings.
  const profileUpdate: {
    onboarding_completed?: boolean;
    peak_hours?: typeof snap.profile.peak_hours;
    include_weekends?: boolean;
    weekly_review_day?: number;
    time_format?: typeof snap.profile.time_format;
    onboarding_skipped?: boolean;
  } = {
    time_format: snap.profile.time_format,
  };
  if (snap.profile.onboarding_completed) {
    profileUpdate.onboarding_completed = true;
    profileUpdate.peak_hours = snap.profile.peak_hours;
    profileUpdate.include_weekends = snap.profile.include_weekends;
    profileUpdate.weekly_review_day = snap.profile.weekly_review_day;
  }
  if (snap.profile.onboarding_skipped) {
    profileUpdate.onboarding_skipped = true;
  }
  if (Object.keys(profileUpdate).length > 0) {
    await resources.profiles.update(userId, profileUpdate);
  }

  // 6. Weekly priorities — need both the cloud activity_id and a valid week_start.
  // Build a name-based map from local activity id -> cloud activity id using the full cloud list
  // (existing + newly inserted) so we don't need a second round-trip.
  let prioritiesCount = 0;
  if (snap.priorities.length && snap.activities.length) {
    const cloudActByName = new Map(allCloudActs.map((a) => [a.name, a.id]));
    const localActById = new Map(snap.activities.map((a) => [a.id, a]));

    // Group by week_start for upsertMany (one call per week)
    const byWeek = new Map<string, { activity_id: string; rank: number }[]>();
    for (const p of snap.priorities) {
      const localAct = localActById.get(p.activity_id);
      if (!localAct) continue;
      const cloudId = cloudActByName.get(localAct.name);
      if (!cloudId) continue;
      const items = byWeek.get(p.week_start) ?? [];
      items.push({ activity_id: cloudId, rank: p.rank });
      byWeek.set(p.week_start, items);
    }
    for (const [weekStart, items] of byWeek) {
      const upserted = await resources.weeklyPriorities.upsertMany(userId, weekStart, items);
      prioritiesCount += upserted.length;
    }
  }

  // 7. Daily notes — dedupe by date for retry safety (one note per day).
  const guestNotes = listAllGuestDailyNotes();
  if (guestNotes.length) {
    const existingNoteDates = new Set(await resources.dailyNotes.listDates(userId));
    const rows = guestNotes.filter((n) => !existingNoteDates.has(n.date));
    if (rows.length) {
      await resources.dailyNotes.insertMany(userId, rows);
    }
  }

  // 8. Inbox items — dedupe on (content, created_at) for retry safety. The cloud
  // list only returns active items, so a retry after a guest item was archived
  // cloud-side could re-insert it; acceptable for this one-shot migration.
  const guestInbox = getGuestInboxItems();
  if (guestInbox.length) {
    const inboxKey = (i: { content: string; created_at: string }) => `${i.content}|${i.created_at}`;
    const existingInboxKeys = new Set((await resources.inboxItems.list(userId)).map(inboxKey));
    const rows = guestInbox
      .filter((i) => !existingInboxKeys.has(inboxKey(i)))
      .map((i) => ({
        user_id: userId,
        content: i.content,
        created_at: i.created_at,
        archived_at: i.archived_at,
      }));
    if (rows.length) {
      await resources.inboxItems.insertMany(userId, rows);
    }
  }

  // Every step above succeeded — only now is it safe to destroy the guest copy.
  clearGuestData();

  return {
    migrated: true,
    counts: {
      categories: newCats.length,
      activities: activitiesCount,
      schedule_blocks: blocksCount,
      time_logs: logsCount,
      priorities: prioritiesCount,
    },
  };
}
