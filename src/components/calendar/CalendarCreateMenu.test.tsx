import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { CalendarCreateMenu } from "./CalendarCreateMenu";

describe("CalendarCreateMenu", () => {
  it("exposes a per-view fab test id", () => {
    render(<CalendarCreateMenu viewId="week" onLogTime={vi.fn()} onAddBlock={vi.fn()} />);
    expect(screen.getByTestId("week-fab")).toBeInTheDocument();
  });

  it("preserves the day-fab / day-log-time selectors for the Day view", async () => {
    const onLogTime = vi.fn();
    const user = userEvent.setup();
    render(<CalendarCreateMenu viewId="day" onLogTime={onLogTime} onAddBlock={vi.fn()} />);

    await user.click(screen.getByTestId("day-fab"));
    await user.click(screen.getByTestId("day-log-time"));
    expect(onLogTime).toHaveBeenCalledTimes(1);
  });

  it("fires onAddBlock from the Add block item", async () => {
    const onAddBlock = vi.fn();
    const user = userEvent.setup();
    render(<CalendarCreateMenu viewId="week" onLogTime={vi.fn()} onAddBlock={onAddBlock} />);

    await user.click(screen.getByTestId("week-fab"));
    await user.click(screen.getByTestId("week-add-block"));
    expect(onAddBlock).toHaveBeenCalledTimes(1);
  });
});
