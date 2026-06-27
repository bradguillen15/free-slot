import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeInput } from "./time-input";

describe("TimeInput", () => {
  it("shows 24-hour label on the trigger", () => {
    render(<TimeInput value="14:30" onChange={vi.fn()} format="24h" />);
    expect(screen.getByRole("button", { name: "14:30" })).toBeInTheDocument();
  });

  it("shows 12-hour label on the trigger", () => {
    render(<TimeInput value="14:30" onChange={vi.fn()} format="12h" />);
    expect(screen.getByRole("button", { name: "2:30 PM" })).toBeInTheDocument();
  });

  it("updates value when a new hour is picked in 24h mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="24h" data-testid="time" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Hour 10" }));

    expect(onChange).toHaveBeenCalledWith("10:00");
  });

  it("accepts HH:MM via the hidden test input", () => {
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="24h" data-testid="time" />);

    fireEvent.change(screen.getByTestId("time"), { target: { value: "11:45" } });

    expect(onChange).toHaveBeenCalledWith("11:45");
  });

  it("updates value when AM/PM toggles in 12h mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeInput value="09:00" onChange={onChange} format="12h" />);

    await user.click(screen.getByRole("button", { name: "9 AM" }));
    await user.click(screen.getByRole("button", { name: "PM" }));

    expect(onChange).toHaveBeenCalledWith("21:00");
  });
});
