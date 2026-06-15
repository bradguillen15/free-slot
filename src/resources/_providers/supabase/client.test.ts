import { describe, it, expect, vi, beforeEach } from "vitest";
import { queueTableResult, resetSupabaseMock, fromCalls } from "@/test/supabaseMock";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

// Import after mock so the supabase singleton is already replaced
const { createSupabaseProvider } = await import("./client");

const USER_ID = "user-abc";

describe("createSupabaseProvider", () => {
  let provider: ReturnType<typeof createSupabaseProvider>;

  beforeEach(() => {
    resetSupabaseMock();
    provider = createSupabaseProvider();
  });

  describe("categories.list", () => {
    it("queries the categories table filtered by user_id", async () => {
      queueTableResult("categories", { data: [{ id: "c1", name: "Work", color: "#fff", type: "productive", is_default: false, created_at: "2024-01-01" }] });
      const result = await provider.categories.list(USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c1");
      expect(result[0].hidden).toBe(false);
      const call = fromCalls.find((c) => c.table === "categories");
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "user_id")).toBe(true);
    });

    it("throws on error", async () => {
      queueTableResult("categories", { error: { message: "DB error" } });
      await expect(provider.categories.list(USER_ID)).rejects.toThrow("DB error");
    });
  });

  describe("activities.list", () => {
    it("queries activities table filtered by user_id ordered by created_at", async () => {
      queueTableResult("activities", { data: [{ id: "a1", name: "Reading", category_id: null, target_hours_per_week: 3, is_active: true, created_at: "2024-01-01" }] });
      const result = await provider.activities.list(USER_ID);
      expect(result[0].id).toBe("a1");
      const call = fromCalls.find((c) => c.table === "activities");
      expect(call?.methods.some(([m, args]) => m === "order" && args[0] === "created_at")).toBe(true);
    });
  });

  describe("scheduleBlocks.list", () => {
    it("returns blocks sorted by sort_order", async () => {
      queueTableResult("schedule_blocks", {
        data: [
          { id: "b2", sort_order: 1, created_at: "2024-01-01", name: "B", start_time: "10:00", end_time: "11:00", days_of_week: [], type: "fixed", color: "#000" },
          { id: "b1", sort_order: 0, created_at: "2024-01-01", name: "A", start_time: "09:00", end_time: "10:00", days_of_week: [], type: "fixed", color: "#000" },
        ],
      });
      const result = await provider.scheduleBlocks.list(USER_ID);
      expect(result.map((b) => b.id)).toEqual(["b1", "b2"]);
    });
  });

  describe("timeLogs.listInRange", () => {
    it("queries time_logs with gte/lte date filters", async () => {
      queueTableResult("time_logs", { data: [{ id: "l1", date: "2024-06-01", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" }] });
      const result = await provider.timeLogs.listInRange(USER_ID, "2024-06-01", "2024-06-07");
      expect(result[0].id).toBe("l1");
      const call = fromCalls.find((c) => c.table === "time_logs");
      expect(call?.methods.some(([m, args]) => m === "gte" && args[0] === "date")).toBe(true);
      expect(call?.methods.some(([m, args]) => m === "lte" && args[0] === "date")).toBe(true);
    });
  });

  describe("profiles.get", () => {
    it("returns null when no profile found", async () => {
      queueTableResult("profiles", { data: null });
      const result = await provider.profiles.get(USER_ID);
      expect(result).toBeNull();
    });

    it("returns profile when found", async () => {
      const profile = { peak_hours: null, include_weekends: false, weekly_review_day: 0, onboarding_completed: true };
      queueTableResult("profiles", { data: profile });
      const result = await provider.profiles.get(USER_ID);
      expect(result).toEqual(profile);
    });
  });

  describe("weeklyPlans.getForWeek", () => {
    it("queries weekly_plans filtered by user_id and week_start", async () => {
      const plan = { id: "w1", week_start: "2024-06-03", generated_at: "2024-06-03T10:00:00Z", slots: [] };
      queueTableResult("weekly_plans", { data: plan });
      const result = await provider.weeklyPlans.getForWeek(USER_ID, "2024-06-03");
      expect(result?.id).toBe("w1");
      const call = fromCalls.find((c) => c.table === "weekly_plans");
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "week_start")).toBe(true);
    });

    it("returns null when no plan found", async () => {
      queueTableResult("weekly_plans", { data: null });
      const result = await provider.weeklyPlans.getForWeek(USER_ID, "2024-06-03");
      expect(result).toBeNull();
    });
  });
});
