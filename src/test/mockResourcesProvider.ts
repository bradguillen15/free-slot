import { vi } from "vitest";
import type { ResourcesProvider } from "@/resources/_providers/types";

/** Returns a mock ResourcesProvider with all methods as vi.fn() returning empty arrays/null. */
export function createMockResourcesProvider(
  overrides: Partial<{
    categories: Partial<ResourcesProvider["categories"]>;
    activities: Partial<ResourcesProvider["activities"]>;
    scheduleBlocks: Partial<ResourcesProvider["scheduleBlocks"]>;
    timeLogs: Partial<ResourcesProvider["timeLogs"]>;
    profiles: Partial<ResourcesProvider["profiles"]>;
    weeklyPlans: Partial<ResourcesProvider["weeklyPlans"]>;
    weeklyPriorities: Partial<ResourcesProvider["weeklyPriorities"]>;
    dailyNotes: Partial<ResourcesProvider["dailyNotes"]>;
    functions: Partial<ResourcesProvider["functions"]>;
  }> = {}
): ResourcesProvider {
  const stub = { id: "stub" } as never;
  return {
    categories: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      reorder: vi.fn().mockResolvedValue(undefined),
      insertMany: vi.fn().mockResolvedValue([]),
      ...overrides.categories,
    },
    activities: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      insertMany: vi.fn().mockResolvedValue([]),
      ...overrides.activities,
    },
    scheduleBlocks: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      reorder: vi.fn().mockResolvedValue(undefined),
      insertMany: vi.fn().mockResolvedValue([]),
      ...overrides.scheduleBlocks,
    },
    timeLogs: {
      listInRange: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockResolvedValue(stub),
      update: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      insertMany: vi.fn().mockResolvedValue([]),
      ...overrides.timeLogs,
    },
    profiles: {
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
      ...overrides.profiles,
    },
    weeklyPlans: {
      getForWeek: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides.weeklyPlans,
    },
    weeklyPriorities: {
      listForWeek: vi.fn().mockResolvedValue([]),
      upsertMany: vi.fn().mockResolvedValue([]),
      ...overrides.weeklyPriorities,
    },
    dailyNotes: {
      get: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
      listForWeek: vi.fn().mockResolvedValue([]),
      listDates: vi.fn().mockResolvedValue([]),
      insertMany: vi.fn().mockResolvedValue(undefined),
      ...overrides.dailyNotes,
    },
    functions: {
      generateWeeklyPlan: vi.fn().mockResolvedValue({ slots: [] }),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
      ...overrides.functions,
    },
  };
}
