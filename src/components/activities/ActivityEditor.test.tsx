import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const upsertActivityMock = vi.hoisted(() => vi.fn());
const deleteActivityMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({
  useUpsertActivityMutation: () => ({ mutateAsync: upsertActivityMock }),
  useDeleteActivityMutation: () => ({ mutateAsync: deleteActivityMock }),
}));

import { ActivityEditor } from "./ActivityEditor";

const baseProps = {
  categories: [],
  activities: [],
  onChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ActivityEditor add-activity form", () => {
  it("blocks an empty name and does not call the upsert mutation", async () => {
    const user = userEvent.setup();
    render(<ActivityEditor {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /Add$/ }));

    expect(await screen.findByText("Name required")).toBeInTheDocument();
    expect(upsertActivityMock).not.toHaveBeenCalled();
  });

  it("submits the parsed draft and resets", async () => {
    const user = userEvent.setup();
    upsertActivityMock.mockResolvedValue({ id: "a1" });
    render(<ActivityEditor {...baseProps} />);

    await user.type(screen.getByPlaceholderText("Activity name"), "  Guitar  ");
    await user.click(screen.getByRole("button", { name: /Add$/ }));

    await waitFor(() =>
      expect(upsertActivityMock).toHaveBeenCalledWith({
        name: "Guitar",
        category_id: null,
        target_hours_per_week: 3,
        is_active: true,
      }),
    );
  });
});
