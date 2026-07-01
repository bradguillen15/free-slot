import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeInput } from "./time-input";

const mockIsMobile = vi.hoisted(() => ({ value: false }));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile.value,
}));

const field = (testid = "time") => screen.getByTestId(testid) as HTMLInputElement;

describe("TimeInput", () => {
  beforeEach(() => {
    mockIsMobile.value = false;
  });
  it("shows the 24-hour value in the field", () => {
    render(<TimeInput value="14:30" onChange={vi.fn()} format="24h" data-testid="time" />);
    expect(field()).toHaveValue("14:30");
  });

  it("shows the 12-hour value in the field", () => {
    render(<TimeInput value="14:30" onChange={vi.fn()} format="12h" data-testid="time" />);
    expect(field()).toHaveValue("2:30 PM");
  });

  it("shows zero minutes in the 12-hour field", () => {
    render(<TimeInput value="09:00" onChange={vi.fn()} format="12h" data-testid="time" />);
    expect(field()).toHaveValue("9:00 AM");
  });

  it("updates value when an hour wheel row is clicked in 24h mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="24h" data-testid="time" />);

    await user.click(field());
    await user.click(screen.getByRole("button", { name: "Hour 10" }));

    expect(onChange).toHaveBeenCalledWith("10:00");
  });

  it("updates value when the hour wheel is scrolled in 24h mode", () => {
    vi.useFakeTimers();
    try {
      const onChange = vi.fn();
      render(<TimeInput value="09:00" onChange={onChange} format="24h" data-testid="time" />);

      fireEvent.click(field());
      fireEvent.scroll(screen.getByLabelText("Hour wheel"), {
        target: { scrollTop: 10 * 40 },
      });
      act(() => {
        vi.advanceTimersByTime(120);
      });

      expect(onChange).toHaveBeenCalledWith("10:00");
    } finally {
      vi.useRealTimers();
    }
  });

  it("wraps the hour wheel after the last hour", () => {
    vi.useFakeTimers();
    try {
      const onChange = vi.fn();
      render(<TimeInput value="23:00" onChange={onChange} format="24h" data-testid="time" />);

      fireEvent.click(field());
      fireEvent.scroll(screen.getByLabelText("Hour wheel"), {
        target: { scrollTop: (4 * 24 + 24) * 40 },
      });
      act(() => {
        vi.advanceTimersByTime(120);
      });

      expect(onChange).toHaveBeenCalledWith("00:00");
    } finally {
      vi.useRealTimers();
    }
  });

  it("commits a typed 24h value on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="24h" data-testid="time" />);

    await user.clear(field());
    await user.type(field(), "11:45");

    expect(onChange).not.toHaveBeenCalled();

    await user.tab();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("11:45");
  });

  it("commits a typed 12h value with a meridiem", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="12h" data-testid="time" />);

    await user.clear(field());
    await user.type(field(), "2:30 PM");

    expect(onChange).not.toHaveBeenCalled();

    await user.tab();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("14:30");
  });

  it("reverts invalid typed input without calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="24h" data-testid="time" />);

    await user.clear(field());
    await user.type(field(), "99:99");
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
    expect(field()).toHaveValue("09:00");
  });

  it("updates value when AM/PM toggles in 12h mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="12h" data-testid="time" />);

    await user.click(field());
    await user.click(screen.getByRole("button", { name: "PM" }));

    expect(onChange).toHaveBeenCalledWith("21:00");
  });

  it("marks the selected hour wheel row", async () => {
    const user = userEvent.setup();
    render(<TimeInput value="09:00" onChange={vi.fn()} format="24h" data-testid="time" />);

    await user.click(field());

    expect(screen.getByRole("button", { name: "Hour 09" })).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("opens an in-place partial picker on mobile", async () => {
    mockIsMobile.value = true;
    const user = userEvent.setup();
    render(<TimeInput value="09:00" onChange={vi.fn()} format="24h" data-testid="time" />);

    await user.click(field());

    expect(screen.getByTestId("time-picker-mobile")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
  });

  it("keeps AM/PM interactive in the mobile picker", async () => {
    mockIsMobile.value = true;
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="12h" data-testid="time" />);

    await user.click(field());
    await user.click(screen.getByRole("button", { name: "PM" }));

    expect(onChange).toHaveBeenCalledWith("21:00");
  });
});
