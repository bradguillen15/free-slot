import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { segmentsForLogOnDay, visibleBlockSegments } from "@/lib/daySegments";
import { DayTimeline, type ScheduleBlock } from "./DayTimeline";

vi.mock("@/hooks/useTimeFormat", () => ({ useTimeFormat: () => "24h" }));

// Each log only needs start_time/end_time for clipping.
const log = (start_time: string, end_time: string) => ({ start_time, end_time });

const block = (id: string, name: string, start_time: string, end_time: string): ScheduleBlock => ({
  id,
  name,
  start_time,
  end_time,
  days_of_week: [1],
  color: "#3b82f6",
  type: "fixed",
});

describe("visibleBlockSegments (planned blocks clip against logged time)", () => {
  it("trims a planned block where a log covers part of it", () => {
    const block = { start_time: "09:00", end_time: "12:00" };
    expect(visibleBlockSegments(block, [log("09:00", "10:30")])).toEqual([
      { startMin: 630, endMin: 720 },
    ]);
  });

  it("removes a planned block fully covered by a log", () => {
    const block = { start_time: "13:00", end_time: "14:00" };
    expect(visibleBlockSegments(block, [log("12:30", "14:30")])).toEqual([]);
  });

  it("splits a planned block when a log covers its middle", () => {
    const block = { start_time: "09:00", end_time: "17:00" };
    expect(visibleBlockSegments(block, [log("12:00", "13:00")])).toEqual([
      { startMin: 540, endMin: 720 },
      { startMin: 780, endMin: 1020 },
    ]);
  });

  it("leaves an overnight block intact when there are no logs", () => {
    const block = { start_time: "23:00", end_time: "08:00" };
    expect(visibleBlockSegments(block, [])).toEqual([
      { startMin: 1380, endMin: 1440 },
      { startMin: 0, endMin: 480 },
    ]);
  });

  it("clips an overnight block by an overnight log", () => {
    const block = { start_time: "23:00", end_time: "08:00" };
    expect(visibleBlockSegments(block, [log("23:00", "01:00")])).toEqual([
      { startMin: 60, endMin: 480 },
    ]);
  });

});

describe("segmentsForLogOnDay", () => {
  it("splits an overnight log between its start day and next day", () => {
    const sleep = { date: "2026-06-15", start_time: "23:00", end_time: "08:00" };
    expect(segmentsForLogOnDay(sleep, "2026-06-15")).toEqual([{ startMin: 1380, endMin: 1440 }]);
    expect(segmentsForLogOnDay(sleep, "2026-06-16")).toEqual([{ startMin: 0, endMin: 480 }]);
    expect(segmentsForLogOnDay(sleep, "2026-06-17")).toEqual([]);
  });
});

describe("DayTimeline collision rendering", () => {
  it("keeps overlapping schedule blocks full width as background guides", () => {
    const { container } = render(
      <DayTimeline
        blocks={[
          block("work", "Work", "09:00", "17:00"),
          block("lunch", "Lunch", "12:00", "13:00"),
        ]}
        logs={[]}
        categories={[]}
        onSlotClick={() => {}}
        currentMinute={null}
        date="2026-06-15"
      />
    );

    const bars = Array.from(container.querySelectorAll<HTMLElement>("[data-timeline-block]"));
    expect(bars).toHaveLength(2);
    expect(bars.map((bar) => bar.style.left)).toEqual(["calc(0% + 3px)", "calc(0% + 3px)"]);
    expect(bars.map((bar) => bar.style.width)).toEqual(["calc(100% - 6px)", "calc(100% - 6px)"]);
  });
});
