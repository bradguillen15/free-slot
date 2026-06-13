import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({ upsertScheduleBlock: vi.fn(), deleteScheduleBlock: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

import { upsertScheduleBlock } from "@/lib/dataStore";
import { ScheduleBlockDialog } from "./ScheduleBlockDialog";

const baseProps = { open: true, onOpenChange: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScheduleBlockDialog validation", () => {
  it("rejects an empty name", async () => {
    const user = userEvent.setup();
    render(<ScheduleBlockDialog {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Add block" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(upsertScheduleBlock).not.toHaveBeenCalled();
  });

  it("rejects equal start and end times", async () => {
    const user = userEvent.setup();
    render(<ScheduleBlockDialog {...baseProps} defaultStartTime="09:00" />);
    await user.type(screen.getByPlaceholderText(/e\.g\. Work/), "Focus");
    // Default end is 10:00; make it equal to start.
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[1], { target: { value: "09:00" } });

    await user.click(screen.getByRole("button", { name: "Add block" }));
    expect(await screen.findByText("End time must differ from start time")).toBeInTheDocument();
    expect(upsertScheduleBlock).not.toHaveBeenCalled();
  });

  it("accepts an overnight block (end before start)", async () => {
    const user = userEvent.setup();
    vi.mocked(upsertScheduleBlock).mockResolvedValue({ id: "b1" } as never);
    render(<ScheduleBlockDialog {...baseProps} />);
    await user.type(screen.getByPlaceholderText(/e\.g\. Work/), "Sleep");
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "22:00" } });
    fireEvent.change(timeInputs[1], { target: { value: "06:00" } });

    await user.click(screen.getByRole("button", { name: "Add block" }));
    await waitFor(() =>
      expect(upsertScheduleBlock).toHaveBeenCalledWith(
        "guest",
        null,
        expect.objectContaining({ name: "Sleep", start_time: "22:00", end_time: "06:00" })
      )
    );
  });

  it("disables Save when no day is selected", async () => {
    const user = userEvent.setup();
    render(<ScheduleBlockDialog {...baseProps} />);
    // Defaults to weekdays — deselect all five.
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
      await user.click(screen.getByRole("button", { name: day }));
    }
    expect(screen.getByText("Select at least one day")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add block" })).toBeDisabled();
  });
});
