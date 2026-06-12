import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DaySummary } from "./DaySummary";
import type { TimeLog } from "./DayTimeline";
import type { Category } from "./QuickLogDialog";

const cat: Category = { id: "c1", name: "Deep work", color: "#00f", type: "productive" };

function log(overrides: Partial<TimeLog>): TimeLog {
  return {
    id: "l1", category_id: "c1", type: "productive",
    start_time: "09:00", end_time: "10:00", notes: null,
    ...overrides,
  };
}

describe("DaySummary", () => {
  it("aggregates per category", () => {
    render(
      <DaySummary
        logs={[log({ id: "a" }), log({ id: "b", start_time: "11:00", end_time: "12:30" })]}
        categories={[cat]}
      />
    );
    // 1h + 1h30m productive = 2h 30m total
    expect(screen.getAllByText("2h 30m").length).toBeGreaterThan(0);
    expect(screen.getByText("Deep work")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("counts an overnight log with the wrapped duration (23:00→01:00 = 2h)", () => {
    render(
      <DaySummary
        logs={[log({ start_time: "23:00", end_time: "01:00" })]}
        categories={[cat]}
      />
    );
    expect(screen.getAllByText("2h").length).toBeGreaterThan(0);
  });
});
