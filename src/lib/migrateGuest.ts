// One-shot migration of guest localStorage data into the user's Supabase account.
// Strategy: insert categories first, build an old-id -> new-id map, then remap and insert
// activities, schedule_blocks, time_logs. Also push profile preferences.
import { supabase } from "@/integrations/supabase/client";
import {
  snapshot, clearGuestData, hasGuestData,
} from "@/lib/localStore";

export async function migrateGuestToCloud(userId: string) {
  const snap = snapshot();
  if (!hasGuestData()) return { migrated: false, counts: { categories: 0, activities: 0, schedule_blocks: 0, time_logs: 0 } };

  // 1. Existing cloud categories — map by name (defaults are auto-created on signup trigger).
  const { data: existingCats } = await supabase
    .from("categories")
    .select("id,name")
    .eq("user_id", userId);
  const cloudCatByName = new Map<string, string>((existingCats ?? []).map((c) => [c.name, c.id]));

  const catIdMap = new Map<string, string>();
  const newCats = snap.categories.filter((c) => !cloudCatByName.has(c.name));
  if (newCats.length) {
    const { data: inserted } = await supabase
      .from("categories")
      .insert(newCats.map((c) => ({
        user_id: userId, name: c.name, type: c.type, color: c.color, is_default: false,
      })))
      .select("id,name");
    (inserted ?? []).forEach((row) => cloudCatByName.set(row.name, row.id));
  }
  // Build local-id -> cloud-id map
  snap.categories.forEach((c) => {
    const cloudId = cloudCatByName.get(c.name);
    if (cloudId) catIdMap.set(c.id, cloudId);
  });

  // 2. Activities
  let activitiesCount = 0;
  if (snap.activities.length) {
    const rows = snap.activities.map((a) => ({
      user_id: userId,
      name: a.name,
      category_id: a.category_id ? catIdMap.get(a.category_id) ?? null : null,
      target_hours_per_week: a.target_hours_per_week,
      is_active: a.is_active,
    }));
    const { data, error } = await supabase.from("activities").insert(rows).select("id");
    if (error) throw error;
    activitiesCount = data?.length ?? 0;
  }

  // 3. Schedule blocks
  let blocksCount = 0;
  if (snap.schedule_blocks.length) {
    const rows = snap.schedule_blocks.map((b) => ({
      user_id: userId,
      name: b.name,
      start_time: b.start_time,
      end_time: b.end_time,
      days_of_week: b.days_of_week,
      color: b.color,
      type: b.type,
      category_id: b.category_id ? catIdMap.get(b.category_id) ?? null : null,
    }));
    const { data, error } = await supabase.from("schedule_blocks").insert(rows).select("id");
    if (error) throw error;
    blocksCount = data?.length ?? 0;
  }

  // 4. Time logs (chunked to be safe)
  let logsCount = 0;
  if (snap.time_logs.length) {
    const all = snap.time_logs.map((l) => ({
      user_id: userId,
      date: l.date,
      start_time: l.start_time,
      end_time: l.end_time,
      category_id: l.category_id ? catIdMap.get(l.category_id) ?? null : null,
      type: l.type,
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

  // 5. Profile preferences
  if (snap.profile.onboarding_completed) {
    await supabase.from("profiles").update({
      buffer_minutes: snap.profile.buffer_minutes,
      peak_hours: snap.profile.peak_hours,
      include_weekends: snap.profile.include_weekends,
      weekly_review_day: snap.profile.weekly_review_day,
      onboarding_completed: true,
    }).eq("id", userId);
  }

  // 6. Weekly priorities — need both the cloud activity_id and a valid week_start.
  // Build a name-based map from local activity id -> cloud activity id.
  let prioritiesCount = 0;
  if (snap.priorities.length && snap.activities.length) {
    const { data: cloudActs } = await supabase
      .from("activities")
      .select("id,name")
      .eq("user_id", userId);
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
      const { data, error } = await supabase.from("weekly_priorities").insert(rows).select("id");
      if (error) throw error;
      prioritiesCount = data?.length ?? 0;
    }
  }

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
