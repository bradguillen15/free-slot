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
  }> = {}
): ResourcesProvider {
  const stub = { id: "stub" } as never;
  return {
    categories: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides.categories,
    },
    activities: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides.activities,
    },
    scheduleBlocks: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      reorder: vi.fn().mockResolvedValue(undefined),
      ...overrides.scheduleBlocks,
    },
    timeLogs: {
      listInRange: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockResolvedValue(stub),
      update: vi.fn().mockResolvedValue(stub),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides.timeLogs,
    },
    profiles: {
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
      ...overrides.profiles,
    },
    weeklyPlans: {
      getForWeek: vi.fn().mockResolvedValue(null),
      ...overrides.weeklyPlans,
    },
  };
}
