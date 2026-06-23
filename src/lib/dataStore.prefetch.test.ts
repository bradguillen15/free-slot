/**
 * `prefetchCloudData` warms the cloud query cache after a guest→cloud migration so
 * the first authenticated render reads migrated data instead of mounting cold and
 * flashing empty. Asserts it fetches the core lists via the resources provider and
 * leaves them cached under the cloud query keys the read hooks use.
 */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockResourcesProvider } from "@/test/mockResourcesProvider";
import { setResourcesProvider } from "@/resources/index";
import { createTestQueryClient, setQueryClientForTests, getQueryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";
import { prefetchCloudData } from "./dataStore";

beforeEach(() => {
  setQueryClientForTests(createTestQueryClient());
});

describe("prefetchCloudData", () => {
  it("fetches the core lists for the user and caches them under cloud keys", async () => {
    const category = { id: "c1", name: "Work", color: "#000", type: "productive" as const, is_default: false, hidden: false, created_at: "" };
    const activity = { id: "a1", name: "Reading", category_id: null, target_hours_per_week: 2, is_active: true, created_at: "" };
    const block = { id: "b1", name: "Deep work", start_time: "09:00", end_time: "11:00", days_of_week: [1], type: "fixed" as const, color: "#fff", category_id: null, created_at: "" };
    const profile = { peak_hours: null, include_weekends: false, weekly_review_day: 0, onboarding_completed: true };

    const mock = createMockResourcesProvider({
      categories: { list: vi.fn().mockResolvedValue([category]) },
      activities: { list: vi.fn().mockResolvedValue([activity]) },
      scheduleBlocks: { list: vi.fn().mockResolvedValue([block]) },
      profiles: { get: vi.fn().mockResolvedValue(profile) },
    });
    setResourcesProvider(mock);

    await prefetchCloudData("u1");

    expect(mock.categories.list).toHaveBeenCalledWith("u1");
    expect(mock.activities.list).toHaveBeenCalledWith("u1");
    expect(mock.scheduleBlocks.list).toHaveBeenCalledWith("u1");
    expect(mock.profiles.get).toHaveBeenCalledWith("u1");

    const qc = getQueryClient();
    expect(qc.getQueryData(queryKeys.categories("cloud", "u1"))).toEqual([category]);
    expect(qc.getQueryData(queryKeys.activities("cloud", "u1"))).toEqual([activity]);
    expect(qc.getQueryData(queryKeys.scheduleBlocks("cloud", "u1"))).toEqual([block]);
    expect(qc.getQueryData(queryKeys.profile("cloud", "u1"))).toEqual(profile);
  });
});
