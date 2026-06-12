import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

const noop = () => {};

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
