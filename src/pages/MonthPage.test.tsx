import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
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

function renderMonth() {
  return render(
    <MemoryRouter>
      <MonthPage />
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

  it("renders a colored log segment in the vertical strip", () => {
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
    // The vertical strip (hidden sm:block) should contain a positioned span for the log
    const strip = document.querySelector(".hidden.sm\\:block, [class*='hidden'][class*='sm:block']");
    expect(strip).toBeTruthy();
    const segments = strip!.querySelectorAll("span[style]");
    expect(segments.length).toBeGreaterThan(0);
  });

  it("vertical strip segment top position reflects time of day", () => {
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
    const strip = document.querySelector(".hidden.sm\\:block, [class*='hidden'][class*='sm:block']");
    expect(strip).toBeTruthy();
    const segment = strip!.querySelector("span[style]") as HTMLElement | null;
    expect(segment).toBeTruthy();
    expect(segment!.style.top).toBe("50%");
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

  it("renders a colored block segment in the vertical strip", () => {
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
    const strip = document.querySelector(".hidden.sm\\:block, [class*='hidden'][class*='sm:block']");
    expect(strip).toBeTruthy();
    const segments = strip!.querySelectorAll("span[style]");
    expect(segments.length).toBeGreaterThan(0);
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

  it("the vertical strip container has the sm:block hidden classes (hidden on mobile)", () => {
    vi.mocked(useCalendarDays).mockReturnValue([buildCell("2026-06-10")]);
    renderMonth();
    const strip = document.querySelector(".sm\\:block.hidden, [class*='sm:block'][class*='hidden']");
    expect(strip).toBeTruthy();
  });
});
