import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WeekGrid, type DayCellData } from "./WeekGrid";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

function makeDay(iso: string, isToday: boolean, label: string): DayCellData {
  return {
    iso,
    weekday: 1,
    label,
    short: "Mon",
    isToday,
    blocks: [],
    logs: [],
    gaps: [],
    totalFree: 0,
  };
}

// grid body is 748px wide (48px rail + 700px columns)
const MOCK_GRID_RECT = {
  left: 0, top: 0, right: 748, bottom: 768,
  width: 748, height: 768, x: 0, y: 0,
  toJSON: () => ({}),
} as DOMRect;

const noop = () => {};

describe("WeekGrid — log drag", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(MOCK_GRID_RECT);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fires onLogReschedule with snapped time and detected day after drag", () => {
    const spy = vi.fn();
    // startMin=540 (09:00), endMin=600 (10:00), has category_id → draggable
    const log = { id: "l1", seg: { startMin: 540, endMin: 600 }, name: "Focus", color: "#f00", category_id: "c1", type: "productive" as const };
    const day = makeDay("2026-06-15", false, "Monday");
    day.logs = [log];

    render(
      <MemoryRouter>
        <WeekGrid days={[day]} onGapClick={noop} onSlotClick={noop} onLogReschedule={spy} />
      </MemoryRouter>
    );

    const logEl = screen.getByLabelText("Log: Focus");
    // 64px down at 32px/hr → 120 min delta → snapped 120 → newStart=660 newEnd=720
    fireEvent.pointerDown(logEl, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(logEl, { clientX: 200, clientY: 264, pointerId: 1 });
    fireEvent.pointerUp(logEl, { clientX: 200, clientY: 264, pointerId: 1 });

    expect(spy).toHaveBeenCalledWith("l1", "2026-06-15", 660, 720);
  });

  it("does not fire onLogReschedule when log has no category_id", () => {
    const spy = vi.fn();
    const log = { id: "l2", seg: { startMin: 540, endMin: 600 }, name: "Uncategorized", color: "#aaa", category_id: null, type: "productive" as const };
    const day = makeDay("2026-06-15", false, "Monday");
    day.logs = [log];

    render(
      <MemoryRouter>
        <WeekGrid days={[day]} onGapClick={noop} onSlotClick={noop} onLogReschedule={spy} />
      </MemoryRouter>
    );

    const logEl = screen.getByLabelText("Log: Uncategorized");
    fireEvent.pointerDown(logEl, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(logEl, { clientX: 200, clientY: 264, pointerId: 1 });
    fireEvent.pointerUp(logEl, { clientX: 200, clientY: 264, pointerId: 1 });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("WeekGrid — today highlight", () => {
  it("applies month-view border classes to today's header only", () => {
    const days = [
      makeDay("2026-06-09", false, "Tuesday"),
      makeDay("2026-06-10", true, "Wednesday"),
      makeDay("2026-06-11", false, "Thursday"),
    ];

    render(
      <MemoryRouter>
        <WeekGrid days={days} onGapClick={noop} onSlotClick={noop} />
      </MemoryRouter>
    );

    const todayLink = screen.getByLabelText("Open day view for Wednesday");
    expect(todayLink.className).toMatch(/border-primary/);
    expect(todayLink.className).toMatch(/ring-primary\/40/);

    const otherLinks = [
      screen.getByLabelText("Open day view for Tuesday"),
      screen.getByLabelText("Open day view for Thursday"),
    ];
    for (const link of otherLinks) {
      expect(link.className).not.toMatch(/border-primary/);
      expect(link.className).not.toMatch(/ring-primary\/40/);
    }
  });
});
