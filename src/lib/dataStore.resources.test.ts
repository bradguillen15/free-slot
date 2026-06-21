/**
 * Verifies that the six read hooks route through the resources layer (cloud) /
 * localStore (guest) rather than the deleted dataFetchers.ts.
 */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { waitFor } from "@testing-library/react";

const authState = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, session: null, loading: authState.loading, signOut: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

import { createMockResourcesProvider } from "@/test/mockResourcesProvider";
import { setResourcesProvider } from "@/resources/index";
import { createTestQueryClient, setQueryClientForTests } from "./queryClient";
import { createHookWrapper } from "../test/renderWithProviders";
import { renderHook } from "@testing-library/react";
import {
  useCategories,
  useActivities,
  useScheduleBlocks,
  useTimeLogsInRange,
  useProfile,
  reorderCategories,
} from "./dataStore";
import {
  ensureBootstrap,
  listCategories,
  upsertCategory as localUpsertCategory,
} from "./localStore";
import { resetSupabaseMock } from "@/test/supabaseMock";

function renderDataHook<T, P = void>(hook: (props: P) => T, initialProps?: P) {
  const queryClient = createTestQueryClient();
  setQueryClientForTests(queryClient);
  return renderHook(hook, { initialProps, wrapper: createHookWrapper(queryClient) });
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  authState.user = { id: "u1" };
  authState.loading = false;
  setQueryClientForTests(createTestQueryClient());
});

describe("cloud mode — reads route through resources provider", () => {
  it("useCategories calls resources.categories.list", async () => {
    const cat = { id: "c1", name: "Work", color: "#000", type: "productive" as const, is_default: false, hidden: false, created_at: "" };
    const mock = createMockResourcesProvider({
      categories: { list: vi.fn().mockResolvedValue([cat]) },
    });
    setResourcesProvider(mock);

    const { result } = renderDataHook(() => useCategories());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(mock.categories.list).toHaveBeenCalledWith("u1");
  });

  it("useActivities calls resources.activities.list", async () => {
    const act = { id: "a1", name: "Reading", category_id: null, target_hours_per_week: 2, is_active: true, created_at: "" };
    const mock = createMockResourcesProvider({
      activities: { list: vi.fn().mockResolvedValue([act]) },
    });
    setResourcesProvider(mock);

    const { result } = renderDataHook(() => useActivities());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(mock.activities.list).toHaveBeenCalledWith("u1");
  });

  it("useScheduleBlocks calls resources.scheduleBlocks.list", async () => {
    const block = { id: "b1", name: "Deep work", start_time: "09:00", end_time: "11:00", days_of_week: [1], type: "fixed" as const, color: "#fff", category_id: null, created_at: "" };
    const mock = createMockResourcesProvider({
      scheduleBlocks: { list: vi.fn().mockResolvedValue([block]) },
    });
    setResourcesProvider(mock);

    const { result } = renderDataHook(() => useScheduleBlocks());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(mock.scheduleBlocks.list).toHaveBeenCalledWith("u1");
  });

  it("useTimeLogsInRange calls resources.timeLogs.listInRange", async () => {
    const log = { id: "l1", date: "2024-06-01", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" as const };
    const mock = createMockResourcesProvider({
      timeLogs: { listInRange: vi.fn().mockResolvedValue([log]) },
    });
    setResourcesProvider(mock);

    const { result } = renderDataHook(
      ({ s, e }: { s: string; e: string }) => useTimeLogsInRange(s, e),
      { s: "2024-06-01", e: "2024-06-07" },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(mock.timeLogs.listInRange).toHaveBeenCalledWith("u1", "2024-06-01", "2024-06-07");
  });

  it("reorderCategories calls resources.categories.reorder", async () => {
    const mock = createMockResourcesProvider();
    setResourcesProvider(mock);

    await reorderCategories("cloud", "u1", ["c2", "c1"]);
    expect(mock.categories.reorder).toHaveBeenCalledWith("u1", ["c2", "c1"]);
  });

  it("useProfile calls resources.profiles.get", async () => {
    const profile = { peak_hours: null, include_weekends: false, weekly_review_day: 0, onboarding_completed: true };
    const mock = createMockResourcesProvider({
      profiles: { get: vi.fn().mockResolvedValue(profile) },
    });
    setResourcesProvider(mock);

    const { result } = renderDataHook(() => useProfile());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(mock.profiles.get).toHaveBeenCalledWith("u1");
  });
});

describe("guest mode — reads bypass resources and use localStore", () => {
  beforeEach(() => {
    authState.user = null;
    ensureBootstrap();
  });

  it("useCategories returns localStore categories without calling provider", async () => {
    localUpsertCategory({ name: "Local cat", color: "#f00", type: "productive" });
    const mock = createMockResourcesProvider();
    setResourcesProvider(mock);

    const { result } = renderDataHook(() => useCategories());
    await waitFor(() => expect(result.current.data.length).toBeGreaterThan(0));
    expect(mock.categories.list).not.toHaveBeenCalled();
  });

  it("reorderCategories reorders localStore without calling provider", async () => {
    const a = localUpsertCategory({ name: "Z-A", color: "#f00", type: "productive" });
    const b = localUpsertCategory({ name: "Z-B", color: "#0f0", type: "productive" });
    const mock = createMockResourcesProvider();
    setResourcesProvider(mock);

    await reorderCategories("guest", null, [b.id, a.id]);
    const names = listCategories().map((c) => c.name);
    expect(names.indexOf("Z-B")).toBeLessThan(names.indexOf("Z-A"));
    expect(mock.categories.reorder).not.toHaveBeenCalled();
  });
});
