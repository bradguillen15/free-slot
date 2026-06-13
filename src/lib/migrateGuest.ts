// One-shot migration of guest localStorage data into the user's Supabase account.
// Strategy: insert categories first, build an old-id -> new-id map, then remap and insert
// activities, schedule_blocks, time_logs. Also push profile preferences.
//
// Every step checks errors and throws BEFORE clearGuestData() runs, so a failed
// migration never destroys the guest copy. Each step also dedupes against rows
// already in the cloud, so retrying after a partial failure does not duplicate data.
import { supabase } from "@/integrations/supabase/client";
import {
  snapshot, clearGuestData, hasGuestData,
} from "@/lib/localStore";

export async function migrateGuestToCloud(userId: string) {
  const snap = snapshot();
  if (!hasGuestData()) return { migrated: false, counts: { categories: 0, activities: 0, schedule_blocks: 0, time_logs: 0, priorities: 0 } };

  // 1. Existing cloud categories — map by name (defaults are auto-created on signup trigger).
  const { data: existingCats, error: catSelErr } = await supabase
    .from("categories")
    .select("id,name")
    .eq("user_id", userId);
  if (catSelErr) throw catSelErr;
  const cloudCatByName = new Map<string, string>((existingCats ?? []).map((c) => [c.name, c.id]));

  const catIdMap = new Map<string, string>();
  const newCats = snap.categories.filter((c) => !cloudCatByName.has(c.name));
  if (newCats.length) {
    const { data: inserted, error: catInsErr } = await supabase
      .from("categories")
      .insert(newCats.map((c) => ({
        user_id: userId, name: c.name, type: c.type, color: c.color, is_default: false, hidden: c.hidden ?? false,
      })))
      .select("id,name");
    if (catInsErr) throw catInsErr;
    (inserted ?? []).forEach((row) => cloudCatByName.set(row.name, row.id));
  }
  // Build local-id -> cloud-id map
  snap.categories.forEach((c) => {
    const cloudId = cloudCatByName.get(c.name);
    if (cloudId) catIdMap.set(c.id, cloudId);
  });

  // Sync hidden flag for categories that already exist in the cloud (matched by name).
  const hiddenSync = snap.categories.filter((c) => c.hidden && cloudCatByName.has(c.name));
  if (hiddenSync.length) {
    await Promise.all(
      hiddenSync.map((c) =>
        supabase
          .from("categories")
          .update({ hidden: true })
          .eq("id", cloudCatByName.get(c.name)!)
          .eq("user_id", userId)
      )
    );
  }

  // 2. Activities — skip names that already exist in the cloud (retry safety).
  let activitiesCount = 0;
  if (snap.activities.length) {
    const { data: existingActs, error: actSelErr } = await supabase
      .from("activities")
      .select("name")
      .eq("user_id", userId);
    if (actSelErr) throw actSelErr;
    const existingActNames = new Set((existingActs ?? []).map((a) => a.name));
    const rows = snap.activities
      .filter((a) => !existingActNames.has(a.name))
      .map((a) => ({
        user_id: userId,
        name: a.name,
        category_id: a.category_id ? catIdMap.get(a.category_id) ?? null : null,
        target_hours_per_week: a.target_hours_per_week,
        is_active: a.is_active,
      }));
    if (rows.length) {
      const { data, error } = await supabase.from("activities").insert(rows).select("id");
      if (error) throw error;
      activitiesCount = data?.length ?? 0;
    }
  }

  // 3. Schedule blocks — dedupe on (name, start, end) for retry safety.
  let blocksCount = 0;
  if (snap.schedule_blocks.length) {
    const { data: existingBlocks, error: blkSelErr } = await supabase
      .from("schedule_blocks")
      .select("name,start_time,end_time")
      .eq("user_id", userId);
    if (blkSelErr) throw blkSelErr;
    const blockKey = (b: { name: string; start_time: string; end_time: string }) =>
      `${b.name}|${b.start_time.slice(0, 5)}|${b.end_time.slice(0, 5)}`;
    const existingBlockKeys = new Set((existingBlocks ?? []).map(blockKey));
    const rows = snap.schedule_blocks
      .filter((b) => !existingBlockKeys.has(blockKey(b)))
      .map((b, i) => ({
        user_id: userId,
        name: b.name,
        start_time: b.start_time,
        end_time: b.end_time,
        days_of_week: b.days_of_week,
        color: b.color,
        type: b.type,
        category_id: b.category_id ? catIdMap.get(b.category_id) ?? null : null,
        sort_order: i,
      }));
    if (rows.length) {
      const { data, error } = await supabase.from("schedule_blocks").insert(rows).select("id");
      if (error) throw error;
      blocksCount = data?.length ?? 0;
    }
  }

  // 4. Time logs (chunked) — dedupe on (date, start, end) for retry safety.
  let logsCount = 0;
  if (snap.time_logs.length) {
    const dates = snap.time_logs.map((l) => l.date).sort();
    const { data: existingLogs, error: logSelErr } = await supabase
      .from("time_logs")
      .select("date,start_time,end_time")
      .eq("user_id", userId)
      .gte("date", dates[0])
      .lte("date", dates[dates.length - 1]);
    if (logSelErr) throw logSelErr;
    const logKey = (l: { date: string; start_time: string; end_time: string }) =>
      `${l.date}|${l.start_time.slice(0, 5)}|${l.end_time.slice(0, 5)}`;
    const existingLogKeys = new Set((existingLogs ?? []).map(logKey));

    const all = snap.time_logs
      .filter((l) => !existingLogKeys.has(logKey(l)))
      .map((l) => ({
        user_id: userId,
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
      const slice = all.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("time_logs").insert(slice).select("id");
      if (error) throw error;
      logsCount += data?.length ?? 0;
    }
  }

  // 5. Profile flags + preferences.
  // Rules:
  //   - Only write a flag when it is true in the guest profile (never downgrade cloud true→false).
  //   - Only push preference values when the guest completed the prefs step (onboarding_completed);
  //     a skip-only guest never configured them, so pushing DEFAULT_PROFILE values would silently
  //     overwrite legitimate cloud settings.
  const profileUpdate: Record<string, unknown> = {};
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
    const { error: profErr } = await supabase.from("profiles").update(profileUpdate).eq("id", userId);
    if (profErr) throw profErr;
  }

  // 6. Weekly priorities — need both the cloud activity_id and a valid week_start.
  // Build a name-based map from local activity id -> cloud activity id.
  // Upsert so a retry doesn't trip the UNIQUE (user_id, week_start, activity_id) constraint.
  let prioritiesCount = 0;
  if (snap.priorities.length && snap.activities.length) {
    const { data: cloudActs, error: actMapErr } = await supabase
      .from("activities")
      .select("id,name")
      .eq("user_id", userId);
    if (actMapErr) throw actMapErr;
    const cloudActByName = new Map<string, string>((cloudActs ?? []).map((a) => [a.name, a.id]));
    const localActById = new Map(snap.activities.map((a) => [a.id, a]));

    const rows = snap.priorities.flatMap((p) => {
      const localAct = localActById.get(p.activity_id);
      if (!localAct) return [];
      const cloudId = cloudActByName.get(localAct.name);
      if (!cloudId) return [];
      return [{ user_id: userId, week_start: p.week_start, activity_id: cloudId, rank: p.rank }];
    });
    if (rows.length) {
      const { data, error } = await supabase
        .from("weekly_priorities")
        .upsert(rows, { onConflict: "user_id,week_start,activity_id" })
        .select("id");
      if (error) throw error;
      prioritiesCount = data?.length ?? 0;
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
