import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PeriodSelector } from "./PeriodSelector";

describe("PeriodSelector", () => {
  it("renders Day/Week/Month options and calls onKindChange on selection", () => {
    const onKindChange = vi.fn();
    render(
      <PeriodSelector
        kind="week"
        anchorISO="2026-06-15"
        onKindChange={onKindChange}
        onAnchorChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("radio", { name: /month/i }));
    expect(onKindChange).toHaveBeenCalledWith("month");
  });

  it("navigates to the previous period on prev click", () => {
    const onAnchorChange = vi.fn();
    render(
      <PeriodSelector
        kind="week"
        anchorISO="2026-06-15"
        onKindChange={vi.fn()}
        onAnchorChange={onAnchorChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(onAnchorChange).toHaveBeenCalledWith("2026-06-08");
  });

  it("navigates to the next period on next click", () => {
    const onAnchorChange = vi.fn();
    render(
      <PeriodSelector
        kind="week"
        anchorISO="2026-06-15"
        onKindChange={vi.fn()}
        onAnchorChange={onAnchorChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect(onAnchorChange).toHaveBeenCalledWith("2026-06-22");
  });

  it("jumps to today on the current-period action", () => {
    const onAnchorChange = vi.fn();
    render(
      <PeriodSelector
        kind="day"
        anchorISO="2026-01-01"
        onKindChange={vi.fn()}
        onAnchorChange={onAnchorChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /today/i }));
    expect(onAnchorChange).toHaveBeenCalled();
  });

  it("does not render a Custom option", () => {
    render(
      <PeriodSelector
        kind="week"
        anchorISO="2026-06-15"
        onKindChange={vi.fn()}
        onAnchorChange={vi.fn()}
      />
    );
    expect(screen.queryByRole("radio", { name: /custom/i })).not.toBeInTheDocument();
  });
});
