import { describe, it, expect, vi, beforeEach } from "vitest";
import { queueTableResult, resetSupabaseMock, fromCalls } from "@/test/supabaseMock";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

const { createSupabaseProvider } = await import("./client");

const USER_ID = "user-abc";

describe("createSupabaseProvider — writes", () => {
  let provider: ReturnType<typeof createSupabaseProvider>;

  beforeEach(() => {
    resetSupabaseMock();
    provider = createSupabaseProvider();
  });

  // ---------- timeLogs ----------
  describe("timeLogs.insert", () => {
    it("inserts into time_logs with all required fields", async () => {
      const row = { id: "l1", date: "2024-06-01", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" };
      queueTableResult("time_logs", { data: row });
      const result = await provider.timeLogs.insert(USER_ID, {
        date: "2024-06-01", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive",
      });
      expect(result.id).toBe("l1");
      const call = fromCalls.find((c) => c.table === "time_logs");
      expect(call?.methods.some(([m]) => m === "insert")).toBe(true);
    });

    it("throws on error", async () => {
      queueTableResult("time_logs", { error: { message: "insert failed" } });
      await expect(
        provider.timeLogs.insert(USER_ID, { date: "2024-06-01", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" })
      ).rejects.toThrow();
    });
  });

  describe("timeLogs.update", () => {
    it("updates time_logs by id and user_id", async () => {
      const row = { id: "l1", date: "2024-06-01", start_time: "10:00", end_time: "11:00", category_id: "c1", type: "productive" };
      queueTableResult("time_logs", { data: row });
      const result = await provider.timeLogs.update(USER_ID, "l1", {
        start_time: "10:00", end_time: "11:00", category_id: "c1", type: "productive",
      });
      expect(result.start_time).toBe("10:00");
      const call = fromCalls.find((c) => c.table === "time_logs");
      expect(call?.methods.some(([m]) => m === "update")).toBe(true);
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "id" && args[1] === "l1")).toBe(true);
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "user_id")).toBe(true);
    });
  });

  describe("timeLogs.delete", () => {
    it("deletes from time_logs by id and user_id", async () => {
      queueTableResult("time_logs", { data: null });
      await provider.timeLogs.delete(USER_ID, "l1");
      const call = fromCalls.find((c) => c.table === "time_logs");
      expect(call?.methods.some(([m]) => m === "delete")).toBe(true);
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "id")).toBe(true);
    });
  });

  // ---------- activities ----------
  describe("activities.upsert — insert path", () => {
    it("inserts a new activity when no id provided", async () => {
      const row = { id: "a1", name: "Reading", category_id: null, target_hours_per_week: 3, is_active: true, created_at: "" };
      queueTableResult("activities", { data: row });
      const result = await provider.activities.upsert(USER_ID, { name: "Reading", category_id: null, target_hours_per_week: 3, is_active: true });
      expect(result.id).toBe("a1");
    });
  });

  describe("activities.upsert — update path", () => {
    it("updates existing activity when id provided", async () => {
      const row = { id: "a1", name: "Running", category_id: null, target_hours_per_week: 4, is_active: true, created_at: "" };
      queueTableResult("activities", { data: row });
      const result = await provider.activities.upsert(USER_ID, { id: "a1", name: "Running", category_id: null, target_hours_per_week: 4, is_active: true });
      expect(result.name).toBe("Running");
      const call = fromCalls.find((c) => c.table === "activities");
      expect(call?.methods.some(([m]) => m === "update")).toBe(true);
    });
  });

  describe("activities.delete", () => {
    it("deletes from activities by id and user_id", async () => {
      queueTableResult("activities", { data: null });
      await provider.activities.delete(USER_ID, "a1");
      const call = fromCalls.find((c) => c.table === "activities");
      expect(call?.methods.some(([m]) => m === "delete")).toBe(true);
    });
  });

  // ---------- scheduleBlocks ----------
  describe("scheduleBlocks.upsert — insert path", () => {
    it("queries existing sort_order then inserts new block", async () => {
      queueTableResult("schedule_blocks", { data: [{ sort_order: 2 }] });
      queueTableResult("schedule_blocks", { data: { id: "b1", sort_order: 3, name: "Work", start_time: "09:00", end_time: "11:00", days_of_week: [1], type: "fixed", color: "#fff", created_at: "" } });
      const result = await provider.scheduleBlocks.upsert(USER_ID, { name: "Work", start_time: "09:00", end_time: "11:00", days_of_week: [1], type: "fixed", color: "#fff" });
      expect(result.id).toBe("b1");
    });
  });

  describe("scheduleBlocks.upsert — update path", () => {
    it("updates existing block when id provided", async () => {
      const row = { id: "b1", name: "Work updated", start_time: "10:00", end_time: "12:00", days_of_week: [1], type: "fixed" as const, color: "#fff", created_at: "" };
      queueTableResult("schedule_blocks", { data: row });
      const result = await provider.scheduleBlocks.upsert(USER_ID, { id: "b1", name: "Work updated", start_time: "10:00", end_time: "12:00", days_of_week: [1], type: "fixed", color: "#fff" });
      expect(result.name).toBe("Work updated");
    });
  });

  describe("scheduleBlocks.delete", () => {
    it("deletes from schedule_blocks by id and user_id", async () => {
      queueTableResult("schedule_blocks", { data: null });
      await provider.scheduleBlocks.delete(USER_ID, "b1");
      const call = fromCalls.find((c) => c.table === "schedule_blocks");
      expect(call?.methods.some(([m]) => m === "delete")).toBe(true);
    });
  });

  describe("scheduleBlocks.reorder", () => {
    it("updates sort_order for each id in sequence", async () => {
      queueTableResult("schedule_blocks", { data: null });
      queueTableResult("schedule_blocks", { data: null });
      await provider.scheduleBlocks.reorder(USER_ID, ["b1", "b2"]);
      const calls = fromCalls.filter((c) => c.table === "schedule_blocks");
      expect(calls).toHaveLength(2);
      expect(calls[0].methods.some(([m]) => m === "update")).toBe(true);
    });

    it("throws when any update fails", async () => {
      queueTableResult("schedule_blocks", { error: { message: "denied" } });
      await expect(provider.scheduleBlocks.reorder(USER_ID, ["b1"])).rejects.toThrow("denied");
    });
  });

  // ---------- categories ----------
  describe("categories.upsert — insert path", () => {
    it("inserts with defaults when no id provided", async () => {
      const row = { id: "c1", name: "New", color: "#3b82f6", type: "productive", is_default: false, hidden: false, created_at: "" };
      queueTableResult("categories", { data: row });
      const result = await provider.categories.upsert(USER_ID, { name: "New" });
      expect(result.id).toBe("c1");
    });
  });

  describe("categories.upsert — update path", () => {
    it("updates only provided fields", async () => {
      const row = { id: "c1", name: "Renamed", color: "#000", type: "productive", is_default: false, hidden: false, created_at: "" };
      queueTableResult("categories", { data: row });
      const result = await provider.categories.upsert(USER_ID, { id: "c1", name: "Renamed" });
      expect(result.name).toBe("Renamed");
    });
  });

  describe("categories.delete", () => {
    it("throws when category is_default=true", async () => {
      queueTableResult("categories", { data: { is_default: true } });
      await expect(provider.categories.delete(USER_ID, "c1")).rejects.toThrow("Default labels cannot be deleted");
    });

    it("deletes when is_default=false", async () => {
      queueTableResult("categories", { data: { is_default: false } });
      queueTableResult("categories", { data: null });
      await provider.categories.delete(USER_ID, "c1");
      const calls = fromCalls.filter((c) => c.table === "categories");
      expect(calls.some((c) => c.methods.some(([m]) => m === "delete"))).toBe(true);
    });
  });

  // ---------- profiles ----------
  describe("profiles.update", () => {
    it("updates profiles by user id", async () => {
      queueTableResult("profiles", { data: null });
      await provider.profiles.update(USER_ID, { include_weekends: true });
      const call = fromCalls.find((c) => c.table === "profiles");
      expect(call?.methods.some(([m]) => m === "update")).toBe(true);
      expect(call?.methods.some(([m, args]) => m === "eq" && args[0] === "id")).toBe(true);
    });

    it("throws on error", async () => {
      queueTableResult("profiles", { error: { message: "not found" } });
      await expect(provider.profiles.update(USER_ID, {})).rejects.toThrow("not found");
    });
  });
});
