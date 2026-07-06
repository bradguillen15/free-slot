import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";

const upsertScheduleBlockMock = vi.hoisted(() => vi.fn());
const deleteScheduleBlockMock = vi.hoisted(() => vi.fn());
const upsertCategoryMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({
  useUpsertScheduleBlockMutation: () => ({ mutateAsync: upsertScheduleBlockMock }),
  useDeleteScheduleBlockMutation: () => ({ mutateAsync: deleteScheduleBlockMock }),
  useUpsertCategoryMutation: () => ({ mutateAsync: upsertCategoryMock }),
  useProfile: () => ({ data: { time_format: "24h" } }),
}));

import { ScheduleBlockDialog } from "./ScheduleBlockDialog";
import type { PickerCategory } from "@/components/CategoryPicker";

const cat: PickerCategory = { id: "c1", name: "Deep work", color: "#00f", type: "productive" };

const baseProps = { open: true, onOpenChange: vi.fn(), categories: [cat] };

async function selectLabel(user: UserEvent) {
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByText("Deep work"));
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ScheduleBlockDialog validation", () => {
  it("rejects an empty name on submit", async () => {
    const user = userEvent.setup();
    render(<ScheduleBlockDialog {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(upsertScheduleBlockMock).not.toHaveBeenCalled();
  });

  it("rejects submit when no label is selected", async () => {
    const user = userEvent.setup();
    render(<ScheduleBlockDialog {...baseProps} />);
    await user.type(screen.getByPlaceholderText(/e\.g\. Work/), "Focus");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Pick a label")).toBeInTheDocument();
    expect(upsertScheduleBlockMock).not.toHaveBeenCalled();
  });

  it("rejects equal start and end times on submit", async () => {
    const user = userEvent.setup();
    render(<ScheduleBlockDialog {...baseProps} defaultStartTime="09:00" />);
    await user.type(screen.getByPlaceholderText(/e\.g\. Work/), "Focus");
    await selectLabel(user);
    await user.clear(screen.getByTestId("schedule-block-end"));
    await user.type(screen.getByTestId("schedule-block-end"), "09:00");

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("End time must differ from start time")).toBeInTheDocument();
    expect(upsertScheduleBlockMock).not.toHaveBeenCalled();
  });

  it("accepts an overnight block (end before start)", async () => {
    const user = userEvent.setup();
    upsertScheduleBlockMock.mockResolvedValue({ id: "b1" });
    render(<ScheduleBlockDialog {...baseProps} />);
    await user.type(screen.getByPlaceholderText(/e\.g\. Work/), "Sleep");
    await selectLabel(user);
    await user.clear(screen.getByTestId("schedule-block-start"));
    await user.type(screen.getByTestId("schedule-block-start"), "22:00");
    await user.clear(screen.getByTestId("schedule-block-end"));
    await user.type(screen.getByTestId("schedule-block-end"), "06:00");

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(upsertScheduleBlockMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Sleep",
          start_time: "22:00",
          end_time: "06:00",
          category_id: "c1",
        }),
      )
    );
  });

  it("rejects submit when no day is selected", async () => {
    const user = userEvent.setup();
    render(<ScheduleBlockDialog {...baseProps} />);
    await user.type(screen.getByPlaceholderText(/e\.g\. Work/), "Focus");
    await selectLabel(user);
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
      await user.click(screen.getByRole("button", { name: day }));
    }
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Select at least one day")).toBeInTheDocument();
    expect(upsertScheduleBlockMock).not.toHaveBeenCalled();
  });
});
