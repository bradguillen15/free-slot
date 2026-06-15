import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarNav } from "./CalendarNav";

describe("CalendarNav", () => {
  it("renders Today, previous, next in that order", () => {
    render(<CalendarNav onToday={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute("data-testid", "calendar-today");
    expect(buttons[1]).toHaveAttribute("data-testid", "calendar-prev");
    expect(buttons[2]).toHaveAttribute("data-testid", "calendar-next");
  });

  it("shows the Today label (default) and accessible names", () => {
    render(<CalendarNav onToday={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByTestId("calendar-today")).toHaveTextContent("Today");
    expect(screen.getByTestId("calendar-prev")).toHaveAccessibleName(/previous/i);
    expect(screen.getByTestId("calendar-next")).toHaveAccessibleName(/next/i);
  });

  it("fires the matching handlers", async () => {
    const onToday = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<CalendarNav onToday={onToday} onPrev={onPrev} onNext={onNext} />);

    await user.click(screen.getByTestId("calendar-today"));
    await user.click(screen.getByTestId("calendar-prev"));
    await user.click(screen.getByTestId("calendar-next"));

    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("uses a custom todayLabel when provided", () => {
    render(<CalendarNav onToday={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} todayLabel="Hoy" />);
    expect(screen.getByTestId("calendar-today")).toHaveTextContent("Hoy");
  });
});
