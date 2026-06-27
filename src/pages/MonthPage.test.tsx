import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { DayCellData } from "@/lib/calendarDays";

vi.mock("@/lib/calendarDays", () => ({
  useCalendarDays: vi.fn(() => [] as DayCellData[]),
}));
vi.mock("@/lib/dataStore", () => ({
  useVisibleCategories: () => ({ data: [], all: [], refresh: vi.fn() }),
  useTimeLogsInRange: () => ({ data: [], refresh: vi.fn() }),
  pickerCategories: () => [],
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));
import { useCalendarDays } from "@/lib/calendarDays";
import MonthPage from "./MonthPage";

const TODAY = "2026-06-15";

vi.mock("@/lib/time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/time")>();
  return { ...actual, todayISO: () => TODAY };
});

function buildCell(iso: string, overrides: Partial<DayCellData> = {}): DayCellData {
  return {
    iso,
    weekday: 1,
    label: "Monday",
    short: "Mon",
    isToday: iso === TODAY,
    blocks: [],
    logs: [],
    gaps: [],
    totalFree: 0,
    ...overrides,
  };
}

/** Colored block/log segments carry an inline background-color; the cell's gradient-intensity
 * overlay also has an inline style (opacity) but no background-color, so filter on that. */
function coloredSegments(cell: HTMLElement): HTMLElement[] {
  return Array.from(cell.querySelectorAll<HTMLElement>("span[style]")).filter(
    (s) => s.style.backgroundColor !== ""
  );
}

function renderMonth() {
  return render(
    <MemoryRouter initialEntries={["/app/month"]}>
      <Routes>
        <Route path="/app/month" element={<MonthPage />} />
        <Route path="/app" element={<div data-testid="day-view">Day view</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MonthPage", () => {
  it("highlights today's cell with the primary ring", () => {
    vi.mocked(useCalendarDays).mockReturnValue([buildCell(TODAY, { isToday: true })]);
    renderMonth();
    const todayCell = screen.getByLabelText(`Open day view for ${TODAY}`);
    expect(todayCell.closest("[class*='ring']") || todayCell.closest("[class]")).toBeTruthy();
  });

  it("renders a colored log segment in the day strip", () => {
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        logs: [{
          id: "l1",
          seg: { startMin: 540, endMin: 600 },
          name: "Deep work",
          color: "#3b82f6",
          type: "productive",
          category_id: "c1",
        }],
      }),
    ]);
    renderMonth();
    // The day cell's strip should contain a positioned span for the log.
    const cell = screen.getByLabelText("Open day view for 2026-06-10");
    expect(coloredSegments(cell).length).toBeGreaterThan(0);
  });

  it("day strip segment top position reflects time of day", () => {
    // A log from 12:00–13:00 is 720 min into the day — should be ~50% top
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        logs: [{
          id: "l1",
          seg: { startMin: 720, endMin: 780 },
          name: "Lunch",
          color: "#f59e0b",
          type: "productive",
          category_id: "c1",
        }],
      }),
    ]);
    renderMonth();
    const cell = screen.getByLabelText("Open day view for 2026-06-10");
    const segment = coloredSegments(cell)[0];
    expect(segment).toBeTruthy();
    expect(segment.style.top).toBe("50%");
  });

  it("counts a logged session toward total tracked time", () => {
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        logs: [{
          id: "l1",
          seg: { startMin: 540, endMin: 600 },
          name: "Social media",
          color: "#ef4444",
          type: "unproductive",
          category_id: "c1",
        }],
      }),
    ]);
    renderMonth();
    expect(screen.getByText("Total logged").parentElement).toHaveTextContent("1h");
  });

  it("renders a colored block segment in the day strip", () => {
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        blocks: [{
          id: "b1",
          seg: { startMin: 480, endMin: 540 },
          name: "Morning routine",
          color: "#10b981",
        }],
      }),
    ]);
    renderMonth();
    const cell = screen.getByLabelText("Open day view for 2026-06-10");
    expect(coloredSegments(cell).length).toBeGreaterThan(0);
    expect(coloredSegments(cell)[0].className).toContain("pointer-events-auto");
  });

  it("shows a logged-time tooltip on hover", async () => {
    const user = userEvent.setup();
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        logs: [{
          id: "l1",
          seg: { startMin: 600, endMin: 660 },
          name: "Team meeting",
          color: "#8b5cf6",
          type: "productive",
          category_id: "c1",
        }],
      }),
    ]);
    renderMonth();
    const cell = screen.getByLabelText("Open day view for 2026-06-10");
    await user.hover(coloredSegments(cell)[0]);
    const tooltip = await screen.findByTestId("month-segment-tooltip");
    expect(tooltip).toHaveTextContent("Logged");
    expect(tooltip).toHaveTextContent("Team meeting");
    expect(tooltip).toHaveTextContent("10:00");
    expect(tooltip.className).toMatch(/surface-elevated/);
  });

  it("shows a planned schedule tooltip on hover", async () => {
    const user = userEvent.setup();
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        blocks: [{
          id: "b1",
          seg: { startMin: 540, endMin: 720 },
          name: "Work",
          color: "#3b82f6",
        }],
      }),
    ]);
    renderMonth();
    const cell = screen.getByLabelText("Open day view for 2026-06-10");
    await user.hover(coloredSegments(cell)[0]);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Planned");
    expect(tooltip).toHaveTextContent("Work");
    expect(tooltip).toHaveTextContent("9:00");
  });

  it("opens the day view when clicking the day cell", async () => {
    const user = userEvent.setup();
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        logs: [{
          id: "l1",
          seg: { startMin: 540, endMin: 600 },
          name: "Deep work",
          color: "#3b82f6",
          type: "productive",
          category_id: "c1",
        }],
      }),
    ]);
    renderMonth();
    await user.click(screen.getByLabelText("Open day view for 2026-06-10"));
    expect(await screen.findByTestId("day-view")).toBeInTheDocument();
  });

  it("does not navigate when tapping a segment", async () => {
    const user = userEvent.setup();
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        logs: [{
          id: "l1",
          seg: { startMin: 540, endMin: 600 },
          name: "Deep work",
          color: "#3b82f6",
          type: "productive",
          category_id: "c1",
        }],
      }),
    ]);
    renderMonth();
    const segment = coloredSegments(screen.getByLabelText("Open day view for 2026-06-10"))[0];
    await user.pointer([{ keys: "[TouchA>]", target: segment }, { keys: "[/TouchA]" }]);
    expect(screen.queryByTestId("day-view")).not.toBeInTheDocument();
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Deep work");
  });

  it("does not render quarter-log buttons (DAY_QUARTERS removed)", () => {
    vi.mocked(useCalendarDays).mockReturnValue([buildCell("2026-06-10")]);
    renderMonth();
    // No "12–6a" quarter-label buttons
    expect(screen.queryByText("12–6a")).not.toBeInTheDocument();
    expect(screen.queryByText("6a–12p")).not.toBeInTheDocument();
  });

  it("whole-cell tap links to day view (no standalone quick-log button for a quarter)", () => {
    vi.mocked(useCalendarDays).mockReturnValue([buildCell("2026-06-10")]);
    renderMonth();
    const link = screen.getByLabelText("Open day view for 2026-06-10");
    expect(link).toHaveAttribute("href", "/app?date=2026-06-10");
  });

  it("renders the day strip inline, not hidden on mobile", () => {
    vi.mocked(useCalendarDays).mockReturnValue([
      buildCell("2026-06-10", {
        logs: [{
          id: "l1",
          seg: { startMin: 540, endMin: 600 },
          name: "Deep work",
          color: "#3b82f6",
          type: "productive",
          category_id: "c1",
        }],
      }),
    ]);
    renderMonth();
    const cell = screen.getByLabelText("Open day view for 2026-06-10");
    const segment = coloredSegments(cell)[0];
    expect(segment).toBeTruthy();
    // The strip is no longer gated behind `hidden sm:block` — no ancestor up to the
    // cell hides it on mobile (the visual refactor made segments always visible).
    let el: HTMLElement | null = segment;
    while (el && el !== cell) {
      expect(el.classList.contains("hidden")).toBe(false);
      el = el.parentElement;
    }
  });
});
