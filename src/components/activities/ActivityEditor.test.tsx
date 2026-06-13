import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({ upsertActivity: vi.fn(), deleteActivity: vi.fn() }));

import { upsertActivity } from "@/lib/dataStore";
import { ActivityEditor } from "./ActivityEditor";

const baseProps = {
  userId: null,
  categories: [],
  activities: [],
  onChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ActivityEditor add-activity form", () => {
  it("blocks an empty name and does not call upsertActivity", async () => {
    const user = userEvent.setup();
    render(<ActivityEditor {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /Add$/ }));

    expect(await screen.findByText("Name required")).toBeInTheDocument();
    expect(upsertActivity).not.toHaveBeenCalled();
  });

  it("submits the parsed draft and resets", async () => {
    const user = userEvent.setup();
    vi.mocked(upsertActivity).mockResolvedValue({ id: "a1" } as never);
    render(<ActivityEditor {...baseProps} />);

    await user.type(screen.getByPlaceholderText("Activity name"), "  Guitar  ");
    await user.click(screen.getByRole("button", { name: /Add$/ }));

    await waitFor(() =>
      expect(upsertActivity).toHaveBeenCalledWith("guest", null, {
        name: "Guitar",
        category_id: null,
        target_hours_per_week: 3,
        is_active: true,
      }),
    );
  });
});
