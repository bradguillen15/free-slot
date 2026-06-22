import { describe, it, expect } from "vitest";
import { aggregateWeeklyReview } from "./weeklyReview";
import type { WeeklyPlan } from "@/resources/types/weeklyPlan";
import type { WeeklyReview } from "@/resources/types/weeklyReview";

const cat = (id: string, name: string) => ({ id, name, color: "#000", type: "productive" as const, is_default: false, hidden: false, created_at: "" });

const log = (cat_id: string, start: string, end: string, type: "productive" | "unproductive" = "productive") => ({
  id: "l1",
  date: "2026-06-09",
  start_time: start,
  end_time: end,
  category_id: cat_id,
  type,
  title: null,
  notes: null,
  created_at: "",
});

const plan = (slots: { activity_name: string; start: string; end: string }[]): WeeklyPlan => ({
  id: "p1",
  week_start: "2026-06-09",
  generated_at: "",
  slots: slots.map((s) => ({ ...s, activity_id: "a1", day: "2026-06-09" })),
});

const review = (insights: string): WeeklyReview => ({
  id: "r1",
  week_start: "2026-06-09",
  insights,
  completed_at: "",
});

describe("aggregateWeeklyReview", () => {
  it("computes planned minutes from plan slots", () => {
    const result = aggregateWeeklyReview({
      logs: [],
      categories: [cat("c1", "Deep work")],
      plan: plan([{ activity_name: "Deep work", start: "09:00", end: "11:00" }]),
      saved: null,
    });
    expect(result.planned).toEqual([{ name: "Deep work", minutes: 120 }]);
  });

  it("computes actual minutes from logs + categories", () => {
    const result = aggregateWeeklyReview({
      logs: [log("c1", "09:00", "10:00")],
      categories: [cat("c1", "Deep work")],
      plan: null,
      saved: null,
    });
    expect(result.actual).toEqual([{ name: "Deep work", minutes: 60 }]);
  });

  it("computes productive ratio", () => {
    const result = aggregateWeeklyReview({
      logs: [log("c1", "09:00", "10:00"), log("c2", "10:00", "11:00", "unproductive")],
      categories: [cat("c1", "Deep work"), { ...cat("c2", "Gaming"), type: "unproductive" }],
      plan: null,
      saved: null,
    });
    expect(result.ratio).toBe(50);
    expect(result.total).toBe(120);
  });

  it("returns saved insights from existing review", () => {
    const result = aggregateWeeklyReview({
      logs: [],
      categories: [],
      plan: null,
      saved: review("Great week!"),
    });
    expect(result.insights).toBe("Great week!");
    expect(result.existing).toBe(true);
  });

  it("merges planned and actual by activity name, sorted by combined volume", () => {
    const result = aggregateWeeklyReview({
      logs: [log("c1", "09:00", "10:00")],
      categories: [cat("c1", "Deep work")],
      plan: plan([{ activity_name: "Deep work", start: "09:00", end: "11:00" }]),
      saved: null,
    });
    expect(result.merged[0]).toMatchObject({ name: "Deep work", planned: 120, actual: 60 });
  });
});
