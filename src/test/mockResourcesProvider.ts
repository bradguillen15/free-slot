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
  return {
    categories: {
      list: vi.fn().mockResolvedValue([]),
      ...overrides.categories,
    },
    activities: {
      list: vi.fn().mockResolvedValue([]),
      ...overrides.activities,
    },
    scheduleBlocks: {
      list: vi.fn().mockResolvedValue([]),
      ...overrides.scheduleBlocks,
    },
    timeLogs: {
      listInRange: vi.fn().mockResolvedValue([]),
      ...overrides.timeLogs,
    },
    profiles: {
      get: vi.fn().mockResolvedValue(null),
      ...overrides.profiles,
    },
    weeklyPlans: {
      getForWeek: vi.fn().mockResolvedValue(null),
      ...overrides.weeklyPlans,
    },
  };
}
