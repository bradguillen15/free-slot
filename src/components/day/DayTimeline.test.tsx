import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { segmentsForLogOnDay, visibleBlockSegments } from "@/lib/daySegments";
import { DayTimeline, type ScheduleBlock } from "./DayTimeline";
import "@/i18n";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockIsMobile = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mockIsMobile.value }));

const timeFormat = vi.hoisted(() => ({ value: "24h" as "24h" | "12h" }));
vi.mock("@/hooks/useTimeFormat", () => ({ useTimeFormat: () => timeFormat.value }));

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
  it("renders 12-hour labels on the hour rail", () => {
    timeFormat.value = "12h";
    const { container } = render(
      <DayTimeline
        blocks={[]}
        logs={[]}
        categories={[]}
        onSlotClick={() => {}}
        currentMinute={null}
        date="2026-06-15"
      />
    );

    expect(container).toHaveTextContent("9 AM");
    timeFormat.value = "24h";
  });

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

describe("DayTimeline — log drag", () => {
  const onLogReschedule = vi.fn();
  const log = {
    id: "l1",
    category_id: "c1",
    type: "productive" as const,
    start_time: "09:00",
    end_time: "10:00",
    date: "2026-06-15",
    title: "Focus",
    notes: null,
  };

  beforeEach(() => {
    onLogReschedule.mockReset();
    mockIsMobile.value = false;
  });

  afterEach(() => {
    mockIsMobile.value = false;
  });

  it("fires onLogReschedule when dragging the log bar on desktop", () => {
    render(
      <DayTimeline
        blocks={[]}
        logs={[log]}
        categories={[{ id: "c1", name: "Deep work", color: "#3b82f6", type: "productive" }]}
        onSlotClick={() => {}}
        currentMinute={null}
        date="2026-06-15"
        onLogReschedule={onLogReschedule}
      />,
    );

    const logEl = document.querySelector("[data-timeline-log]") as HTMLElement;
    fireEvent.pointerDown(logEl, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(logEl, { clientX: 200, clientY: 280, pointerId: 1 });
    fireEvent.pointerUp(logEl, { clientX: 200, clientY: 280, pointerId: 1 });

    expect(onLogReschedule).toHaveBeenCalledWith("l1", "2026-06-15", 630, 690);
  });

  it("does not reschedule when dragging the log bar on mobile", () => {
    mockIsMobile.value = true;
    render(
      <DayTimeline
        blocks={[]}
        logs={[log]}
        categories={[{ id: "c1", name: "Deep work", color: "#3b82f6", type: "productive" }]}
        onSlotClick={() => {}}
        currentMinute={null}
        date="2026-06-15"
        onLogReschedule={onLogReschedule}
      />,
    );

    const logEl = document.querySelector("[data-timeline-log]") as HTMLElement;
    fireEvent.pointerDown(logEl, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(logEl, { clientX: 200, clientY: 280, pointerId: 1 });
    fireEvent.pointerUp(logEl, { clientX: 200, clientY: 280, pointerId: 1 });

    expect(onLogReschedule).not.toHaveBeenCalled();
  });

  it("reschedules from the grip handle on mobile", () => {
    mockIsMobile.value = true;
    render(
      <DayTimeline
        blocks={[]}
        logs={[log]}
        categories={[{ id: "c1", name: "Deep work", color: "#3b82f6", type: "productive" }]}
        onSlotClick={() => {}}
        currentMinute={null}
        date="2026-06-15"
        onLogReschedule={onLogReschedule}
      />,
    );

    const grip = screen.getByRole("button", { name: "Drag to reschedule" });
    fireEvent.pointerDown(grip, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 200, clientY: 280, pointerId: 1 });
    fireEvent.pointerUp(grip, { clientX: 200, clientY: 280, pointerId: 1 });

    expect(onLogReschedule).toHaveBeenCalledWith("l1", "2026-06-15", 630, 690);
  });

  it("calls onBlockClick when a schedule block is clicked", () => {
    const onBlockClick = vi.fn();
    render(
      <DayTimeline
        blocks={[block("work", "Work", "09:00", "17:00")]}
        logs={[]}
        categories={[]}
        onSlotClick={() => {}}
        currentMinute={null}
        date="2026-06-15"
        onBlockClick={onBlockClick}
      />,
    );

    fireEvent.click(screen.getByTitle(/Work · Planned/));
    expect(onBlockClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "work", name: "Work" }),
    );
  });
});
