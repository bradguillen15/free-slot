import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InboxPanel } from "./InboxPanel";

const mockAdd = vi.fn();
const mockArchive = vi.fn();

vi.mock("@/lib/dataStore", () => ({
  useInboxItems: vi.fn(() => ({
    data: [
      { id: "1", user_id: "u", content: "Call accountant", created_at: "", archived_at: null },
      { id: "2", user_id: "u", content: "Write blog post", created_at: "", archived_at: null },
    ],
  })),
  useAddInboxItem: vi.fn(() => ({ mutate: mockAdd })),
  useArchiveInboxItem: vi.fn(() => ({ mutate: mockArchive })),
}));

describe("InboxPanel", () => {
  it("renders active items", () => {
    render(<InboxPanel />);
    expect(screen.getByText("Call accountant")).toBeTruthy();
    expect(screen.getByText("Write blog post")).toBeTruthy();
  });

  it("calls add mutation on Enter", () => {
    render(<InboxPanel />);
    const input = screen.getByLabelText("New inbox item");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockAdd).toHaveBeenCalledWith("New task");
  });

  it("calls archive mutation when archive button is clicked", () => {
    render(<InboxPanel />);
    fireEvent.click(screen.getByLabelText("Archive: Call accountant"));
    expect(mockArchive).toHaveBeenCalledWith("1");
  });

  it("shows empty state when no items", async () => {
    const { useInboxItems } = await import("@/lib/dataStore");
    vi.mocked(useInboxItems).mockReturnValueOnce({ data: [] } as ReturnType<typeof useInboxItems>);
    render(<InboxPanel />);
    expect(screen.getByText(/Nothing pending/)).toBeTruthy();
  });
});
