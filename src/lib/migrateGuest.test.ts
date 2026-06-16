process.env.TZ = "America/New_York";

import { beforeEach, describe, it, expect, vi } from "vitest";
import { seedGuestData } from "../test/factories";
import { migrateGuestToCloud } from "./migrateGuest";
import { hasGuestData, DEFAULT_CATEGORY_SEED, type LocalCategory } from "./localStore";

const {
  mockCategories,
  mockActivities,
  mockScheduleBlocks,
  mockTimeLogs,
  mockProfiles,
  mockWeeklyPriorities,
} = vi.hoisted(() => ({
  mockCategories: { list: vi.fn(), insertMany: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  mockActivities: { list: vi.fn(), insertMany: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  mockScheduleBlocks: { list: vi.fn(), insertMany: vi.fn(), upsert: vi.fn(), delete: vi.fn(), reorder: vi.fn() },
  mockTimeLogs: { listInRange: vi.fn(), insertMany: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  mockProfiles: { get: vi.fn(), update: vi.fn() },
  mockWeeklyPriorities: { listForWeek: vi.fn(), upsertMany: vi.fn() },
}));

vi.mock("@/resources", () => ({
  resources: {
    categories: mockCategories,
    activities: mockActivities,
    scheduleBlocks: mockScheduleBlocks,
    timeLogs: mockTimeLogs,
    profiles: mockProfiles,
    weeklyPriorities: mockWeeklyPriorities,
  },
}));

const DEFAULT_NAMES = DEFAULT_CATEGORY_SEED.map((c) => c.name);
const cloudDefaultCats: LocalCategory[] = DEFAULT_NAMES.map((name, i) => ({
  id: `cloud-cat-${i}`,
  name,
  type: "productive" as const,
  color: "#fff",
  is_default: true,
  hidden: false,
  created_at: "",
}));
const cloudCustomCat: LocalCategory = {
  id: "cloud-cat-custom",
  name: "Music practice",
  type: "productive" as const,
  color: "#aa00ff",
  is_default: false,
  hidden: false,
  created_at: "",
};

function setupHappyPath() {
  mockCategories.list.mockResolvedValue(cloudDefaultCats);
  mockCategories.insertMany.mockResolvedValue([cloudCustomCat]);
  mockCategories.upsert.mockResolvedValue(cloudCustomCat);

  mockActivities.list.mockResolvedValue([]);
  mockActivities.insertMany.mockResolvedValue([
    { id: "ca1", name: "Guitar", category_id: "cloud-cat-custom", target_hours_per_week: 4, is_active: true, created_at: "" },
    { id: "ca2", name: "Reading", category_id: null, target_hours_per_week: 2, is_active: true, created_at: "" },
  ]);

  mockScheduleBlocks.list.mockResolvedValue([]);
  mockScheduleBlocks.insertMany.mockResolvedValue([
    { id: "cb1", name: "Sleep", start_time: "23:00", end_time: "07:00", days_of_week: [0, 1, 2, 3, 4, 5, 6], color: "#000", type: "fixed", category_id: null, created_at: "" },
  ]);

  mockTimeLogs.listInRange.mockResolvedValue([]);
  mockTimeLogs.insertMany.mockResolvedValue([
    { id: "cl1", date: "2026-06-09", start_time: "09:00", end_time: "10:00", category_id: "cloud-cat-custom", type: "productive", title: null, notes: null, created_at: "" },
    { id: "cl2", date: "2026-06-10", start_time: "20:00", end_time: "21:30", category_id: null, type: "productive", title: null, notes: null, created_at: "" },
  ]);

  mockProfiles.update.mockResolvedValue(undefined);
  mockWeeklyPriorities.upsertMany.mockResolvedValue([
    { id: "p1", activity_id: "ca1", rank: 0, week_start: "2026-06-08" },
    { id: "p2", activity_id: "ca2", rank: 1, week_start: "2026-06-08" },
  ]);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("migrateGuestToCloud — happy path", () => {
  it("migrates everything via resources, reports counts, and clears guest data", async () => {
    seedGuestData();
    setupHappyPath();

    const result = await migrateGuestToCloud("u1");

    expect(result.migrated).toBe(true);
    expect(result.counts).toEqual({
      categories: 1,
      activities: 2,
      schedule_blocks: 1,
      time_logs: 2,
      priorities: 2,
    });
    expect(hasGuestData()).toBe(false);

    expect(mockCategories.list).toHaveBeenCalledWith("u1");
    expect(mockCategories.insertMany).toHaveBeenCalledWith(
      "u1",
      expect.arrayContaining([expect.objectContaining({ name: "Music practice" })])
    );
    expect(mockActivities.list).toHaveBeenCalledWith("u1");
    expect(mockActivities.insertMany).toHaveBeenCalledWith(
      "u1",
      expect.arrayContaining([expect.objectContaining({ name: "Guitar" })])
    );
    expect(mockScheduleBlocks.list).toHaveBeenCalledWith("u1");
    expect(mockScheduleBlocks.insertMany).toHaveBeenCalled();
    expect(mockTimeLogs.listInRange).toHaveBeenCalledWith("u1", expect.any(String), expect.any(String));
    expect(mockTimeLogs.insertMany).toHaveBeenCalled();
    expect(mockProfiles.update).toHaveBeenCalledWith("u1", expect.objectContaining({ onboarding_completed: true }));
    expect(mockWeeklyPriorities.upsertMany).toHaveBeenCalled();
  });

  it("remaps log category ids from local to cloud", async () => {
    seedGuestData();
    setupHappyPath();
    await migrateGuestToCloud("u1");

    const allCalls = mockTimeLogs.insertMany.mock.calls as Array<[string, Array<{ category_id: string | null }>]>;
    const rows = allCalls.flatMap(([, items]) => items);
    expect(rows.some((r) => r.category_id === "cloud-cat-custom")).toBe(true);
  });
});

describe("migrateGuestToCloud — failures preserve guest data", () => {
  it("throws on categories.list failure and leaves localStorage untouched", async () => {
    seedGuestData();
    mockCategories.list.mockRejectedValue(new Error("network"));

    await expect(migrateGuestToCloud("u1")).rejects.toMatchObject({ message: "network" });
    expect(hasGuestData()).toBe(true);
  });

  it("throws on categories.insertMany failure and leaves localStorage untouched", async () => {
    seedGuestData();
    mockCategories.list.mockResolvedValue(cloudDefaultCats);
    mockCategories.insertMany.mockRejectedValue(new Error("rls"));

    await expect(migrateGuestToCloud("u1")).rejects.toMatchObject({ message: "rls" });
    expect(hasGuestData()).toBe(true);
  });

  it("throws on timeLogs.insertMany failure and leaves localStorage untouched", async () => {
    seedGuestData();
    mockCategories.list.mockResolvedValue(cloudDefaultCats);
    mockCategories.insertMany.mockResolvedValue([cloudCustomCat]);
    mockActivities.list.mockResolvedValue([]);
    mockActivities.insertMany.mockResolvedValue([
      { id: "ca1", name: "Guitar", category_id: "cloud-cat-custom", target_hours_per_week: 4, is_active: true, created_at: "" },
      { id: "ca2", name: "Reading", category_id: null, target_hours_per_week: 2, is_active: true, created_at: "" },
    ]);
    mockScheduleBlocks.list.mockResolvedValue([]);
    mockScheduleBlocks.insertMany.mockResolvedValue([
      { id: "cb1", name: "Sleep", start_time: "23:00", end_time: "07:00", days_of_week: [], color: "#000", type: "fixed" as const, category_id: null, created_at: "" },
    ]);
    mockTimeLogs.listInRange.mockResolvedValue([]);
    mockTimeLogs.insertMany.mockRejectedValue(new Error("chunk failed"));

    await expect(migrateGuestToCloud("u1")).rejects.toMatchObject({ message: "chunk failed" });
    expect(hasGuestData()).toBe(true);
  });
});

describe("migrateGuestToCloud — nothing to migrate", () => {
  it("returns migrated:false without calling resources", async () => {
    const result = await migrateGuestToCloud("u1");
    expect(result.migrated).toBe(false);
    expect(mockCategories.list).not.toHaveBeenCalled();
  });
});
