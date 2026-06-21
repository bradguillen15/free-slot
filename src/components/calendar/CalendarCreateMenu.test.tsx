import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarCreateMenu } from "./CalendarCreateMenu";

describe("CalendarCreateMenu", () => {
  it("exposes a per-view fab test id", () => {
    render(<CalendarCreateMenu viewId="week" onLogTime={vi.fn()} />);
    expect(screen.getByTestId("week-fab")).toBeInTheDocument();
  });

  it("fires onLogTime when the FAB is clicked", async () => {
    const onLogTime = vi.fn();
    const user = userEvent.setup();
    render(<CalendarCreateMenu viewId="day" onLogTime={onLogTime} />);
    await user.click(screen.getByTestId("day-fab"));
    expect(onLogTime).toHaveBeenCalledTimes(1);
  });
});
