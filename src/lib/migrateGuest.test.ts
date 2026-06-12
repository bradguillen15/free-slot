process.env.TZ = "America/New_York";

import { beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

import { callsFor, fromCalls, queueTableResult, resetSupabaseMock } from "../test/supabaseMock";
import { seedGuestData } from "../test/factories";
import { migrateGuestToCloud } from "./migrateGuest";
import { hasGuestData } from "./localStore";

// The default category names the signup trigger creates in the cloud
// (must mirror DEFAULT_CATEGORIES in src/lib/localStore.ts).
const DEFAULT_NAMES = [
  "Deep work", "Reading", "Exercise", "Study", "Creative work",
  "Side project", "Social media", "Gaming", "Idle", "Meals", "Chores & errands",
];
const cloudDefaults = DEFAULT_NAMES.map((name, i) => ({ id: `cloud-cat-${i}`, name }));

/** Queue the full happy-path response sequence. Individual tests override pieces by queueing BEFORE calling this. */
function queueHappyPath() {
  // 1. categories: select existing → defaults; insert custom → cloud id
  queueTableResult("categories", { data: cloudDefaults });
  queueTableResult("categories", { data: [{ id: "cloud-cat-custom", name: "Music practice" }] });
  // 2. activities: select existing names → none; insert → 2 rows
  queueTableResult("activities", { data: [] });
  queueTableResult("activities", { data: [{ id: "ca1" }, { id: "ca2" }] });
  // 3. schedule_blocks: select existing → none; insert → 1 row
  queueTableResult("schedule_blocks", { data: [] });
  queueTableResult("schedule_blocks", { data: [{ id: "cb1" }] });
  // 4. time_logs: select existing in range → none; insert chunk → 2 rows
  queueTableResult("time_logs", { data: [] });
  queueTableResult("time_logs", { data: [{ id: "cl1" }, { id: "cl2" }] });
  // 5. profiles update → ok (default {} is fine, queued for clarity)
  queueTableResult("profiles", {});
  // 6. priorities: activities name-map select; upsert → 2 rows
  queueTableResult("activities", { data: [{ id: "ca1", name: "Guitar" }, { id: "ca2", name: "Reading" }] });
  queueTableResult("weekly_priorities", { data: [{ id: "p1" }, { id: "p2" }] });
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
});

describe("migrateGuestToCloud — happy path", () => {
  it("migrates everything, reports counts, and clears guest data", async () => {
    seedGuestData();
    queueHappyPath();

    const result = await migrateGuestToCloud("u1");

    expect(result.migrated).toBe(true);
    expect(result.counts).toEqual({
      categories: 1, activities: 2, schedule_blocks: 1, time_logs: 2, priorities: 2,
    });
    expect(hasGuestData()).toBe(false);
  });

  it("remaps log category ids from local to cloud", async () => {
    seedGuestData();
    queueHappyPath();
    await migrateGuestToCloud("u1");

    const logInsert = callsFor("time_logs")
      .flatMap((c) => c.methods)
      .find(([m]) => m === "insert");
    const rows = logInsert![1][0] as Array<{ category_id: string | null }>;
    expect(rows.some((r) => r.category_id === "cloud-cat-custom")).toBe(true);
  });
});

describe("migrateGuestToCloud — failures preserve guest data", () => {
  it("throws on category SELECT failure and leaves localStorage untouched", async () => {
    seedGuestData();
    queueTableResult("categories", { error: { message: "network" } });

    await expect(migrateGuestToCloud("u1")).rejects.toMatchObject({ message: "network" });
    expect(hasGuestData()).toBe(true);
  });

  it("throws on category INSERT failure and leaves localStorage untouched", async () => {
    seedGuestData();
    queueTableResult("categories", { data: cloudDefaults });
    queueTableResult("categories", { error: { message: "rls" } });

    await expect(migrateGuestToCloud("u1")).rejects.toMatchObject({ message: "rls" });
    expect(hasGuestData()).toBe(true);
  });

  it("throws on a time_logs chunk failure and leaves localStorage untouched", async () => {
    seedGuestData();
    queueTableResult("categories", { data: cloudDefaults });
    queueTableResult("categories", { data: [{ id: "cloud-cat-custom", name: "Music practice" }] });
    queueTableResult("activities", { data: [] });
    queueTableResult("activities", { data: [{ id: "ca1" }, { id: "ca2" }] });
    queueTableResult("schedule_blocks", { data: [] });
    queueTableResult("schedule_blocks", { data: [{ id: "cb1" }] });
    queueTableResult("time_logs", { data: [] });
    queueTableResult("time_logs", { error: { message: "chunk failed" } });

    await expect(migrateGuestToCloud("u1")).rejects.toMatchObject({ message: "chunk failed" });
    expect(hasGuestData()).toBe(true);
  });
});

describe("migrateGuestToCloud — retry idempotency", () => {
  it("skips activities, blocks, and logs that already exist in the cloud", async () => {
    seedGuestData();
    queueTableResult("categories", { data: [...cloudDefaults, { id: "cloud-cat-custom", name: "Music practice" }] });
    // Guitar + the Sleep block + the 09:00 log already landed on a previous attempt.
    queueTableResult("activities", { data: [{ name: "Guitar" }] });
    queueTableResult("activities", { data: [{ id: "ca2" }] }); // insert: only Reading
    queueTableResult("schedule_blocks", { data: [{ name: "Sleep", start_time: "23:00:00", end_time: "07:00:00" }] });
    queueTableResult("time_logs", { data: [{ date: "2026-06-09", start_time: "09:00:00", end_time: "10:00:00" }] });
    queueTableResult("time_logs", { data: [{ id: "cl2" }] }); // insert: only the second log
    queueTableResult("profiles", {});
    queueTableResult("activities", { data: [{ id: "ca1", name: "Guitar" }, { id: "ca2", name: "Reading" }] });
    queueTableResult("weekly_priorities", { data: [{ id: "p1" }, { id: "p2" }] });

    const result = await migrateGuestToCloud("u1");

    const activityInsert = callsFor("activities").flatMap((c) => c.methods).find(([m]) => m === "insert");
    const activityRows = activityInsert![1][0] as Array<{ name: string }>;
    expect(activityRows.map((r) => r.name)).toEqual(["Reading"]);

    // The fully-duplicated Sleep block is never re-inserted.
    const blockInsert = callsFor("schedule_blocks").flatMap((c) => c.methods).find(([m]) => m === "insert");
    expect(blockInsert).toBeUndefined();

    const logInsert = callsFor("time_logs").flatMap((c) => c.methods).find(([m]) => m === "insert");
    const logRows = logInsert![1][0] as Array<{ date: string }>;
    expect(logRows.map((r) => r.date)).toEqual(["2026-06-10"]);

    // Priorities go through upsert, not insert — safe against the UNIQUE constraint.
    const prioMethods = callsFor("weekly_priorities").flatMap((c) => c.methods).map(([m]) => m);
    expect(prioMethods).toContain("upsert");
    expect(prioMethods).not.toContain("insert");

    expect(result.counts.activities).toBe(1);
    expect(result.counts.time_logs).toBe(1);
    expect(hasGuestData()).toBe(false);
  });
});

describe("migrateGuestToCloud — nothing to migrate", () => {
  it("returns migrated:false without touching supabase", async () => {
    const result = await migrateGuestToCloud("u1");
    expect(result.migrated).toBe(false);
    expect(fromCalls).toHaveLength(0);
  });
});
