import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";

import { AddLabelDialog } from "./AddLabelDialog";

const baseProps = {
  open: true,
  defaultColor: "#3b82f6",
  onOpenChange: vi.fn(),
  onSave: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddLabelDialog", () => {
  it("blocks submit and shows a message when the name is empty", async () => {
    const user = userEvent.setup();
    render(<AddLabelDialog {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Add label" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it("submits trimmed values and closes on success", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    const onOpenChange = vi.fn();
    render(<AddLabelDialog {...baseProps} onSave={onSave} onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText("Label name"), "  Deep work  ");
    await user.click(screen.getByRole("button", { name: "Add label" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ name: "Deep work", color: "#3b82f6", type: "productive" }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("stays open when onSave reports failure", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(false);
    const onOpenChange = vi.fn();
    render(<AddLabelDialog {...baseProps} onSave={onSave} onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText("Label name"), "Reading");
    await user.click(screen.getByRole("button", { name: "Add label" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
