import { describe, it, expect, vi, beforeEach } from "vitest";
import { queueTableResult, resetSupabaseMock, fromCalls } from "@/test/supabaseMock";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

// Import after mock so the supabase singleton is already replaced
const { createSupabaseProvider } = await import("./client");
const { supabase } = await import("@/integrations/supabase/client");

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

    it("returns categories sorted by sort_order", async () => {
      queueTableResult("categories", {
        data: [
          { id: "c2", sort_order: 1, created_at: "2024-01-01", name: "B", color: "#000", type: "productive", is_default: false, hidden: false },
          { id: "c1", sort_order: 0, created_at: "2024-01-01", name: "A", color: "#000", type: "productive", is_default: false, hidden: false },
        ],
      });
      const result = await provider.categories.list(USER_ID);
      expect(result.map((c) => c.id)).toEqual(["c1", "c2"]);
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
      const profile = { peak_hours: null, include_weekends: false, weekly_review_day: 0, onboarding_completed: true, onboarding_skipped: true, time_format: "24h" };
      queueTableResult("profiles", { data: profile });
      const result = await provider.profiles.get(USER_ID);
      expect(result).toEqual(profile);
      const call = fromCalls.find((c) => c.table === "profiles");
      const selectArgs = call?.methods.find(([m]) => m === "select")?.[1][0] as string | undefined;
      expect(selectArgs).toContain("onboarding_skipped");
      expect(selectArgs).toContain("time_format");
    });

    it("writes time_format in profiles.update payload", async () => {
      queueTableResult("profiles", { data: null });
      await provider.profiles.update(USER_ID, { time_format: "12h" });
      const call = fromCalls.find((c) => c.table === "profiles");
      const updateArgs = call?.methods.find(([m]) => m === "update")?.[1][0] as Record<string, unknown>;
      expect(updateArgs).toMatchObject({ time_format: "12h" });
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

  describe("weeklyReviews.getForWeek", () => {
    it("queries weekly_reviews filtered by user_id and week_start", async () => {
      const review = { id: "r1", week_start: "2024-06-03", insights: "Great week!", completed_at: "2024-06-09T10:00:00Z" };
      queueTableResult("weekly_reviews", { data: review });
      const result = await provider.weeklyReviews.getForWeek(USER_ID, "2024-06-03");
      expect(result?.id).toBe("r1");
      expect(result?.insights).toBe("Great week!");
      const call = fromCalls.find((c) => c.table === "weekly_reviews");
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "week_start")).toBe(true);
    });

    it("returns null when no review found", async () => {
      queueTableResult("weekly_reviews", { data: null });
      const result = await provider.weeklyReviews.getForWeek(USER_ID, "2024-06-03");
      expect(result).toBeNull();
    });
  });

  describe("functions.generateWeeklyReview", () => {
    it("invokes the weekly-review edge function and returns the result", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { review: { insights: "Productive week!" } },
        error: null,
      });
      const body = { week_start: "2024-06-03", planned: [], actual: [], productive_ratio: 80, total_tracked: 300 };
      const result = await provider.functions.generateWeeklyReview(body);
      expect(result.review.insights).toBe("Productive week!");
      expect(supabase.functions.invoke).toHaveBeenCalledWith("weekly-review", { body });
    });

    it("throws when the edge function returns an error", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: null, error: new Error("Function failed") });
      await expect(
        provider.functions.generateWeeklyReview({ week_start: "2024-06-03", planned: [], actual: [], productive_ratio: 0, total_tracked: 0 })
      ).rejects.toThrow();
    });
  });

  describe("weeklyPriorities.listForWeek", () => {
    it("queries weekly_priorities filtered by user_id and week_start ordered by rank", async () => {
      queueTableResult("weekly_priorities", {
        data: [
          { id: "p1", activity_id: "a1", rank: 0, week_start: "2024-06-03" },
          { id: "p2", activity_id: "a2", rank: 1, week_start: "2024-06-03" },
        ],
      });
      const result = await provider.weeklyPriorities.listForWeek(USER_ID, "2024-06-03");
      expect(result).toHaveLength(2);
      expect(result[0].activity_id).toBe("a1");
      const call = fromCalls.find((c) => c.table === "weekly_priorities");
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "week_start")).toBe(true);
      expect(call?.methods.some(([m]) => m === "order")).toBe(true);
    });

    it("returns empty array when no priorities found", async () => {
      queueTableResult("weekly_priorities", { data: [] });
      const result = await provider.weeklyPriorities.listForWeek(USER_ID, "2024-06-03");
      expect(result).toEqual([]);
    });
  });

  describe("weeklyPriorities.upsertMany", () => {
    it("upserts priority rows and returns the saved list", async () => {
      queueTableResult("weekly_priorities", {
        data: [{ id: "p1", activity_id: "a1", rank: 0, week_start: "2024-06-03" }],
      });
      const result = await provider.weeklyPriorities.upsertMany(USER_ID, "2024-06-03", [{ activity_id: "a1", rank: 0 }]);
      expect(result[0].activity_id).toBe("a1");
      const call = fromCalls.find((c) => c.table === "weekly_priorities");
      expect(call?.methods.some(([m]) => m === "upsert")).toBe(true);
    });
  });

  describe("weeklyPlans.delete", () => {
    it("deletes the plan for the given user and week", async () => {
      queueTableResult("weekly_plans", { data: null });
      await provider.weeklyPlans.delete(USER_ID, "2024-06-03");
      const call = fromCalls.find((c) => c.table === "weekly_plans");
      expect(call?.methods.some(([m]) => m === "delete")).toBe(true);
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "week_start")).toBe(true);
    });
  });

  describe("functions.generateWeeklyPlan", () => {
    it("invokes the generate-weekly-plan edge function", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { plan: { id: "wp1", week_start: "2024-06-03", generated_at: "", slots: [] }, summary: "Done" },
        error: null,
      });
      const body = { week_start: "2024-06-03", gaps: [], activities: [] };
      const result = await provider.functions.generateWeeklyPlan(body);
      expect(result).toBeDefined();
      expect(supabase.functions.invoke).toHaveBeenCalledWith("generate-weekly-plan", { body });
    });
  });

  describe("functions.deleteAccount", () => {
    it("invokes the delete-account edge function", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: null, error: null });
      await provider.functions.deleteAccount(USER_ID);
      expect(supabase.functions.invoke).toHaveBeenCalledWith("delete-account");
    });

    it("throws when edge function returns error", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: null, error: new Error("forbidden") });
      await expect(provider.functions.deleteAccount(USER_ID)).rejects.toThrow();
    });
  });
});
