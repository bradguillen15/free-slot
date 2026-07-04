import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@/i18n";
import { ConfirmDayButton } from "./ConfirmDayButton";

const mockMutateAsync = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({
  useConfirmDayMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

const category = { id: "c1", type: "productive" as const };
const monday = "2026-07-06";
const block = (overrides: Record<string, unknown> = {}) => ({
  id: "b1", name: "Work", start_time: "09:00", end_time: "17:00",
  days_of_week: [1, 2, 3, 4, 5], category_id: "c1", ...overrides,
});

describe("ConfirmDayButton", () => {
  it("shows a disabled 'nothing to confirm' state when there are no active blocks", () => {
    render(<ConfirmDayButton date={monday} blocks={[]} logs={[]} categories={[category]} />);
    expect(screen.getByTestId("confirm-day-nothing")).toBeDisabled();
  });

  it("shows a disabled 'already logged' state when every block is already covered", () => {
    render(
      <ConfirmDayButton
        date={monday}
        blocks={[block()]}
        logs={[{ date: monday, start_time: "09:00", end_time: "17:00" }]}
        categories={[category]}
      />
    );
    expect(screen.getByTestId("confirm-day-already-logged")).toBeDisabled();
  });

  it("shows the actionable confirm button when there are eligible blocks", () => {
    render(<ConfirmDayButton date={monday} blocks={[block()]} logs={[]} categories={[category]} />);
    expect(screen.getByTestId("confirm-day-button")).not.toBeDisabled();
  });

  it("calls the mutation with the date when clicked", async () => {
    mockMutateAsync.mockResolvedValueOnce({ rows: [{}], skipped: [] });
    render(<ConfirmDayButton date={monday} blocks={[block()]} logs={[]} categories={[category]} />);
    fireEvent.click(screen.getByTestId("confirm-day-button"));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(monday));
  });
});
