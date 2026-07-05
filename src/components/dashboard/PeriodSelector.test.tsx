import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PeriodSelector } from "./PeriodSelector";
import { resolvePeriod, MAX_CUSTOM_RANGE_DAYS } from "@/lib/dashboardPeriod";

describe("PeriodSelector", () => {
  it("renders Day/Week/Month/Custom options and calls onKindChange on selection", () => {
    const onKindChange = vi.fn();
    render(
      <PeriodSelector
        kind="week"
        anchorISO="2026-06-15"
        onKindChange={onKindChange}
        onAnchorChange={vi.fn()}
        onCustomChange={vi.fn()}
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
        onCustomChange={vi.fn()}
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
        onCustomChange={vi.fn()}
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
        onCustomChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /today/i }));
    expect(onAnchorChange).toHaveBeenCalled();
  });

  it("shows custom date range inputs when kind is custom", () => {
    render(
      <PeriodSelector
        kind="custom"
        anchorISO="2026-06-15"
        custom={{ start: "2026-06-01", end: "2026-06-10" }}
        onKindChange={vi.fn()}
        onAnchorChange={vi.fn()}
        onCustomChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/start/i)).toHaveValue("2026-06-01");
    expect(screen.getByLabelText(/end/i)).toHaveValue("2026-06-10");
  });

  it("clamps and reports an oversized custom range", () => {
    const onCustomChange = vi.fn();
    render(
      <PeriodSelector
        kind="custom"
        anchorISO="2026-06-15"
        custom={{ start: "2026-01-01", end: "2026-06-10" }}
        onKindChange={vi.fn()}
        onAnchorChange={vi.fn()}
        onCustomChange={onCustomChange}
      />
    );
    fireEvent.change(screen.getByLabelText(/end/i), { target: { value: "2026-12-31" } });
    const resolved = resolvePeriod("custom", "2026-06-15", onCustomChange.mock.calls[0][0]);
    const span = (new Date(resolved.end).getTime() - new Date(resolved.start).getTime()) / 86400000 + 1;
    expect(span).toBeLessThanOrEqual(MAX_CUSTOM_RANGE_DAYS);
    expect(screen.getByText(/adjusted/i)).toBeInTheDocument();
  });
});
