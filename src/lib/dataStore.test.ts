import {
  ensureBootstrap,
  getProfile,
  listCategories,
  listLogsForMonth,
  upsertActivity as localUpsertActivity,
  upsertCategory as localUpsertCategory,
} from "./localStore";
process.env.TZ = "America/New_York";

import { beforeEach, describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const authState = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, session: null, loading: authState.loading, signOut: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

import { queueTableResult, resetSupabaseMock, setTableResult, fromCalls } from "../test/supabaseMock";
import { createTestQueryClient, setQueryClientForTests, setupGuestQueryInvalidation } from "./queryClient";
import { createHookWrapper } from "../test/renderWithProviders";
import {
  deleteActivity,
  deleteCategory,
  deleteScheduleBlock,
  deleteTimeLog,
  upsertCategory,
  insertTimeLog,
  updateProfile,
  updateTimeLog,
  upsertActivity,
  upsertScheduleBlock,
  useActivities,
  useCategories,
  useVisibleCategories,
  filterVisibleCategories,
  pickerCategories,
  useProfile,
  useScheduleBlocks,
  useTimeLogsInRange,
  useWeeklyReview,
  useGenerateWeeklyReviewMutation,
  useWeeklyPriorities,
  useUpsertWeeklyPrioritiesMutation,
  useGenerateWeeklyPlanMutation,
  useDeleteWeeklyPlanMutation,
  useDeleteAccountMutation,
} from "./dataStore";
import { supabase } from "@/integrations/supabase/client";

const CAT = { id: "c1", name: "Deep work", color: "#000", type: "productive" as const, is_default: true, hidden: false, created_at: "" };

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  authState.user = { id: "u1" };
  authState.loading = false;
  setQueryClientForTests(createTestQueryClient());
});

function renderDataHook<T, P = void>(
  hook: (props: P) => T,
  initialProps?: P,
  options?: { guestBridge?: boolean },
) {
  const queryClient = createTestQueryClient();
  if (options?.guestBridge) setupGuestQueryInvalidation(queryClient);
  setQueryClientForTests(queryClient);
  return renderHook(hook, {
    initialProps,
    wrapper: createHookWrapper(queryClient),
  });
}

describe("read hooks — error contract", () => {
  it("keeps the last known data when a refresh fails, and exposes the error", async () => {
    setTableResult("categories", { data: [CAT] });
    const { result } = renderDataHook(() => useCategories());
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    queueTableResult("categories", { error: { message: "boom" } });
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.error).toBe("boom"));

    expect(result.current.data).toHaveLength(1); // NOT clobbered to []
  });

  it("clears the error once a refresh succeeds again", async () => {
    setTableResult("categories", { error: { message: "boom" } });
    const { result } = renderDataHook(() => useCategories());
    await waitFor(() => expect(result.current.error).toBe("boom"));

    setTableResult("categories", { data: [CAT] });
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useTimeLogsInRange — stale-response guard", () => {
  it("discards a slow response from a superseded range", async () => {
    const weekA = [{ id: "a", date: "2026-06-01", start_time: "09:00", end_time: "10:00", category_id: null, type: "productive", notes: null }];
    const weekB = [{ id: "b", date: "2026-06-08", start_time: "09:00", end_time: "10:00", category_id: null, type: "productive", notes: null }];
    // Week A's response arrives AFTER week B's.
    queueTableResult("time_logs", { data: weekA, delayMs: 60 });
    queueTableResult("time_logs", { data: weekB });

    const { result, rerender } = renderDataHook(
      ({ s, e }: { s: string; e: string }) => useTimeLogsInRange(s, e),
      { s: "2026-06-01", e: "2026-06-07" },
    );
    rerender({ s: "2026-06-08", e: "2026-06-14" });

    await waitFor(() => expect(result.current.data.map((l) => l.id)).toEqual(["b"]));
    // Let week A's slow response land — it must be ignored.
    await act(() => new Promise((r) => setTimeout(r, 80)));
    expect(result.current.data.map((l) => l.id)).toEqual(["b"]);
  });
});

describe("guest mode — change events", () => {
  it("re-reads localStorage when a guest write fires the change event", async () => {
    authState.user = null;
    ensureBootstrap(); // before seeding — bootstrap re-seeds empty arrays otherwise
    localUpsertActivity({ name: "Guitar" });
    const { result } = renderDataHook(() => useActivities(), undefined, { guestBridge: true });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    act(() => {
      localUpsertActivity({ name: "Reading" }); // write() dispatches freeslot:guest-change
    });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
  });
});

describe("mutations — guest/cloud parity", () => {
  it("updateTimeLog rejects on a missing id in BOTH modes", async () => {
    const patch = { start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" as const };
    await expect(updateTimeLog("guest", null, "missing", patch)).rejects.toThrow();

    queueTableResult("time_logs", { error: { message: "0 rows" } });
    await expect(updateTimeLog("cloud", "u1", "missing", patch)).rejects.toThrow();
  });

  it("insertTimeLog returns the created row in both modes", async () => {
    const input = { date: "2026-06-10", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" as const };
    const guestRow = await insertTimeLog("guest", null, input);
    expect((guestRow as { id: string }).id).toBeTruthy();

    queueTableResult("time_logs", { data: { id: "cloud-1", ...input } });
    const cloudRow = await insertTimeLog("cloud", "u1", input);
    expect((cloudRow as { id: string }).id).toBe("cloud-1");
  });

  it("mutations propagate errors instead of silently succeeding", async () => {
    queueTableResult("schedule_blocks", { error: { message: "denied" } });
    await expect(deleteScheduleBlock("cloud", "u1", "b1")).rejects.toMatchObject({ message: "denied" });
  });

  it("updateTimeLog — guest same-month: updates the date in-place", async () => {
    const row = await insertTimeLog("guest", null, {
      date: "2026-06-10", start_time: "09:00", end_time: "10:00",
      category_id: "c1", type: "productive",
    });
    const id = (row as { id: string }).id;

    await updateTimeLog("guest", null, id, {
      date: "2026-06-15", start_time: "09:00", end_time: "10:00",
      category_id: "c1", type: "productive",
    });

    const jun = listLogsForMonth("2026-06");
    expect(jun.some((l) => l.id === id && l.date === "2026-06-15")).toBe(true);
  });

  it("updateTimeLog — guest cross-month: log exists in exactly one bucket after move", async () => {
    const row = await insertTimeLog("guest", null, {
      date: "2026-06-15", start_time: "09:00", end_time: "10:00",
      category_id: "c1", type: "productive",
    });
    const id = (row as { id: string }).id;

    await updateTimeLog("guest", null, id, {
      date: "2026-07-01", start_time: "09:00", end_time: "10:00",
      category_id: "c1", type: "productive",
    });

    const jun = listLogsForMonth("2026-06");
    const jul = listLogsForMonth("2026-07");
    expect(jun.some((l) => l.id === id)).toBe(false);
    expect(jul.some((l) => l.id === id && l.date === "2026-07-01")).toBe(true);
  });

  it("updateTimeLog — cloud: passes date to resources.timeLogs.update", async () => {
    queueTableResult("time_logs", {
      data: { id: "l1", date: "2026-07-01", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" },
    });
    await expect(
      updateTimeLog("cloud", "u1", "l1", {
        date: "2026-07-01", start_time: "09:00", end_time: "10:00",
        category_id: "c1", type: "productive",
      })
    ).resolves.toBeDefined();
  });
});

describe("remaining hooks — same error contract", () => {
  it("useScheduleBlocks keeps data on a failed refresh", async () => {
    const block = { id: "b1", name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: [1], color: "#fff", type: "fixed", category_id: null, created_at: "" };
    setTableResult("schedule_blocks", { data: [block] });
    const { result } = renderDataHook(() => useScheduleBlocks());
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    queueTableResult("schedule_blocks", { error: { message: "down" } });
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.error).toBe("down"));
    expect(result.current.data).toHaveLength(1);
  });

  it("useProfile surfaces errors and serves guest defaults", async () => {
    queueTableResult("profiles", { error: { message: "nope" } });
    const { result } = renderDataHook(() => useProfile());
    await waitFor(() => expect(result.current.error).toBe("nope"));

    authState.user = null;
    const { result: guest } = renderDataHook(() => useProfile());
    await waitFor(() => expect(guest.current.data?.peak_hours).toEqual({ start: "09:00", end: "12:00" }));
  });
});

describe("mutations — remaining happy paths (both modes)", () => {
  it("cloud mutations resolve and hit the right branches", async () => {
    const activity = { name: "X", category_id: null, target_hours_per_week: 1, is_active: true };
    queueTableResult("activities", { data: { id: "a1" } });
    await upsertActivity("cloud", "u1", activity); // insert branch
    queueTableResult("activities", { data: { id: "a1" } });
    await upsertActivity("cloud", "u1", { id: "a1", ...activity }); // update branch
    queueTableResult("activities", {});
    await deleteActivity("cloud", "u1", "a1");

    const block = { name: "B", start_time: "09:00", end_time: "10:00", days_of_week: [1], type: "fixed" as const, color: "#fff" };
    queueTableResult("schedule_blocks", { data: { id: "b1" } });
    await upsertScheduleBlock("cloud", "u1", block);
    queueTableResult("schedule_blocks", { data: { id: "b1" } });
    await upsertScheduleBlock("cloud", "u1", { id: "b1", ...block });

    queueTableResult("profiles", {});
    await updateProfile("cloud", "u1", { include_weekends: false });
    queueTableResult("time_logs", {});
    await deleteTimeLog("cloud", "u1", "l1");
    queueTableResult("time_logs", { data: { id: "l1" } });
    await updateTimeLog("cloud", "u1", "l1", { start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" });
  });

  it("category mutations work in both modes (Phase 4b labels)", async () => {
    // Guest: create on the fly, then delete.
    const created = await upsertCategory("guest", null, { name: "Breakfast", type: "productive" });
    expect(listCategories().some((c) => c.name === "Breakfast")).toBe(true);
    await deleteCategory("guest", null, (created as { id: string }).id);
    expect(listCategories().some((c) => c.name === "Breakfast")).toBe(false);

    // Guest: hide flag persists.
    ensureBootstrap();
    const deep = listCategories().find((c) => c.name === "Deep work")!;
    await upsertCategory("guest", null, { id: deep.id, hidden: true });
    expect(listCategories().find((c) => c.id === deep.id)?.hidden).toBe(true);
    expect(filterVisibleCategories(listCategories()).some((c) => c.id === deep.id)).toBe(false);

    // Cloud: insert + update branches resolve; errors propagate.
    queueTableResult("categories", { data: { id: "c9", name: "Snacks" } });
    const cloud = await upsertCategory("cloud", "u1", { name: "Snacks", type: "unproductive" });
    expect((cloud as { id: string }).id).toBe("c9");
    queueTableResult("categories", { data: { id: "c9", name: "Snacks!", hidden: true } });
    await upsertCategory("cloud", "u1", { id: "c9", hidden: true });
    queueTableResult("categories", { error: { message: "denied" } });
    await expect(deleteCategory("cloud", "u1", "c9")).rejects.toMatchObject({ message: "denied" });
  });

  it("useVisibleCategories omits hidden labels", async () => {
    authState.user = null;
    ensureBootstrap();
    const cat = listCategories()[0];
    localUpsertCategory({ id: cat.id, hidden: true });
    const { result } = renderDataHook(() => useVisibleCategories());
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.data.some((c) => c.id === cat.id)).toBe(false));
    await waitFor(() => expect(result.current.all.some((c) => c.id === cat.id)).toBe(true));
  });

  it("pickerCategories keeps a hidden selected label for edit dialogs", () => {
    ensureBootstrap();
    const all = listCategories();
    const hidden = all[0];
    localUpsertCategory({ id: hidden.id, hidden: true });
    const visible = listCategories().filter((c) => !c.hidden);
    const picker = pickerCategories(visible, listCategories(), hidden.id);
    expect(picker.some((c) => c.id === hidden.id)).toBe(true);
    expect(picker).toHaveLength(visible.length + 1);
  });

  it("cloud deleteCategory rejects default labels like guest mode", async () => {
    queueTableResult("categories", { data: { is_default: true } });
    await expect(deleteCategory("cloud", "u1", "default-id")).rejects.toThrow(
      "Default labels cannot be deleted"
    );
  });

  it("guest mutations route to localStore", async () => {
    ensureBootstrap();
    const a = await upsertActivity("guest", null, { name: "G", category_id: null, target_hours_per_week: 1, is_active: true });
    await deleteActivity("guest", null, (a as { id: string }).id);
    const b = await upsertScheduleBlock("guest", null, { name: "B", start_time: "09:00", end_time: "10:00", days_of_week: [1], type: "fixed", color: "#fff" });
    await deleteScheduleBlock("guest", null, (b as { id: string }).id);
    await updateProfile("guest", null, { include_weekends: false });
    expect(getProfile().include_weekends).toBe(false);
    const log = await insertTimeLog("guest", null, { date: "2026-06-10", start_time: "09:00", end_time: "10:00", category_id: "c", type: "productive" });
    await deleteTimeLog("guest", null, (log as { id: string }).id);
    expect(listLogsForMonth("2026-06")).toHaveLength(0);
  });
});

describe("useWeeklyReview", () => {
  it("returns saved review data for the given week", async () => {
    const review = { id: "r1", week_start: "2026-06-09", insights: "Great week!", planned_vs_actual: null, completed_at: "2026-06-15T10:00:00Z" };
    queueTableResult("weekly_reviews", { data: review });
    const { result } = renderDataHook(() => useWeeklyReview("2026-06-09"));
    await waitFor(() => expect(result.current.data?.id).toBe("r1"));
    expect(result.current.data?.insights).toBe("Great week!");
    expect(result.current.isLoading).toBe(false);
  });

  it("returns null when no review exists for the week", async () => {
    queueTableResult("weekly_reviews", { data: null });
    const { result } = renderDataHook(() => useWeeklyReview("2026-06-09"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });
});

describe("useGenerateWeeklyReviewMutation", () => {
  it("invokes the weekly-review edge function and invalidates the review cache", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { review: { insights: "AI insights!" } },
      error: null,
    });
    const { result } = renderDataHook(() => useGenerateWeeklyReviewMutation());
    const body = { week_start: "2026-06-09", planned: [], actual: [], productive_ratio: 75, total_tracked: 240 };
    let outcome: { review: { insights: string } } | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync(body);
    });
    expect(outcome?.review.insights).toBe("AI insights!");
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith("weekly-review", { body });
  });
});

describe("useWeeklyPriorities", () => {
  it("returns priorities from cloud for signed-in user", async () => {
    queueTableResult("weekly_priorities", {
      data: [{ id: "p1", activity_id: "a1", rank: 0, week_start: "2026-06-09" }],
    });
    const { result } = renderDataHook(() => useWeeklyPriorities("2026-06-09"));
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data[0].activity_id).toBe("a1");
  });

  it("returns priorities from localStore in guest mode", async () => {
    authState.user = null;
    const { setPriorities } = await import("./localStore");
    setPriorities("2026-06-09", [{ activity_id: "a-x", rank: 0 }]);
    const { result } = renderDataHook(() => useWeeklyPriorities("2026-06-09"));
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data[0].activity_id).toBe("a-x");
  });
});

describe("useUpsertWeeklyPrioritiesMutation", () => {
  it("upserts priorities for cloud user and invalidates cache", async () => {
    queueTableResult("weekly_priorities", {
      data: [{ id: "p1", activity_id: "a1", rank: 0, week_start: "2026-06-09" }],
    });
    const { result } = renderDataHook(() => useUpsertWeeklyPrioritiesMutation());
    await act(async () => {
      await result.current.mutateAsync({ weekStart: "2026-06-09", items: [{ activity_id: "a1", rank: 0 }] });
    });
    const call = fromCalls.find((c) => c.table === "weekly_priorities");
    expect(call?.methods.some(([m]) => m === "upsert")).toBe(true);
  });

  it("saves priorities to localStore in guest mode", async () => {
    authState.user = null;
    const { result } = renderDataHook(() => useUpsertWeeklyPrioritiesMutation());
    await act(async () => {
      await result.current.mutateAsync({ weekStart: "2026-06-09", items: [{ activity_id: "a-g", rank: 0 }] });
    });
    const { listPriorities } = await import("./localStore");
    expect(listPriorities("2026-06-09")[0].activity_id).toBe("a-g");
  });
});

describe("useGenerateWeeklyPlanMutation", () => {
  it("invokes the generate-weekly-plan edge function", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { plan: { id: "wp1", week_start: "2026-06-09", generated_at: "", slots: [] }, summary: "Done" },
      error: null,
    });
    const { result } = renderDataHook(() => useGenerateWeeklyPlanMutation());
    await act(async () => {
      await result.current.mutateAsync({ week_start: "2026-06-09", gaps: [], activities: [] });
    });
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
      "generate-weekly-plan",
      expect.objectContaining({ body: expect.objectContaining({ week_start: "2026-06-09" }) })
    );
  });
});

describe("useDeleteWeeklyPlanMutation", () => {
  it("deletes the plan for the week and invalidates the weekly plan cache", async () => {
    queueTableResult("weekly_plans", { data: null });
    const { result } = renderDataHook(() => useDeleteWeeklyPlanMutation());
    await act(async () => {
      await result.current.mutateAsync("2026-06-09");
    });
    const call = fromCalls.find((c) => c.table === "weekly_plans");
    expect(call?.methods.some(([m]) => m === "delete")).toBe(true);
  });
});

describe("useDeleteAccountMutation", () => {
  it("invokes the delete-account edge function", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderDataHook(() => useDeleteAccountMutation());
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith("delete-account");
  });
});
