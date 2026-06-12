// Test data factories. Keep all fixture construction here so shapes stay in one place.
import {
  ensureBootstrap,
  insertLog,
  listCategories,
  setPriorities,
  updateProfile,
  upsertActivity,
  upsertScheduleBlock,
  type LocalActivity,
  type LocalCategory,
  type LocalScheduleBlock,
} from "@/lib/localStore";

export type GuestSeed = {
  categories: LocalCategory[];
  activities: LocalActivity[];
  blocks: LocalScheduleBlock[];
};

/**
 * Seed a representative guest dataset into localStorage:
 * 9 default categories + 1 custom, 2 activities, 1 overnight block,
 * 2 logs (one referencing the custom category), 1 priority week, completed profile.
 */
export function seedGuestData(): GuestSeed {
  ensureBootstrap();
  const custom: LocalCategory = {
    id: "local-cat-custom",
    name: "Music practice",
    type: "productive",
    color: "#aa00ff",
    is_default: false,
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(
    "freeslot.guest.categories",
    JSON.stringify([...listCategories(), custom])
  );

  const guitar = upsertActivity({ name: "Guitar", category_id: custom.id, target_hours_per_week: 4 });
  const reading = upsertActivity({ name: "Reading", target_hours_per_week: 2 });

  const sleep = upsertScheduleBlock({
    name: "Sleep", start_time: "23:00", end_time: "07:00", days_of_week: [0, 1, 2, 3, 4, 5, 6],
  });

  insertLog({ date: "2026-06-09", start_time: "09:00", end_time: "10:00", type: "productive", category_id: custom.id });
  insertLog({ date: "2026-06-10", start_time: "20:00", end_time: "21:30", type: "productive", category_id: null });

  setPriorities("2026-06-08", [
    { activity_id: guitar.id, rank: 0 },
    { activity_id: reading.id, rank: 1 },
  ]);

  updateProfile({ onboarding_completed: true, buffer_minutes: 10 });

  return {
    categories: [...listCategories()],
    activities: [guitar, reading],
    blocks: [sleep],
  };
}
