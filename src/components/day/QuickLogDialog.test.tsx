import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({ insertTimeLog: vi.fn(), updateTimeLog: vi.fn(), deleteTimeLog: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

import { toast } from "sonner";
import { insertTimeLog, deleteTimeLog } from "@/lib/dataStore";
import { QuickLogDialog, type Category } from "./QuickLogDialog";

const cat: Category = { id: "c1", name: "Deep work", color: "#00f", type: "productive" };

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  date: "2026-06-10",
  categories: [cat],
  defaultTitle: "Test session", // title is required; tests target the later validations
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("QuickLogDialog", () => {
  it("rejects a zero-length entry (start === end) with no insert", async () => {
    const user = userEvent.setup();
    render(<QuickLogDialog {...baseProps} defaultStart="09:00" defaultEnd="09:00" />);

    await user.click(screen.getByRole("button", { name: "Save log" }));

    expect(await screen.findByText("End time must be after start")).toBeInTheDocument();
    expect(insertTimeLog).not.toHaveBeenCalled();
  });

  it("accepts an overnight entry (end < start) and logs the wrapped duration", async () => {
    const user = userEvent.setup();
    vi.mocked(insertTimeLog).mockResolvedValue({ id: "row" });

    render(<QuickLogDialog {...baseProps} defaultStart="23:00" defaultEnd="06:00" />);
    await user.click(screen.getByRole("button", { name: "Save log" }));

    await waitFor(() => expect(insertTimeLog).toHaveBeenCalled());
    expect(vi.mocked(insertTimeLog).mock.calls[0][2]).toMatchObject({
      start_time: "23:00",
      end_time: "06:00",
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Logged 7h"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("saves an overnight insert with the previous day's date so it starts on the right night", async () => {
    const user = userEvent.setup();
    vi.mocked(insertTimeLog).mockResolvedValue({ id: "row" });

    // date prop is "2026-06-10"; overnight sleep starts the night of June 9.
    render(<QuickLogDialog {...baseProps} defaultStart="23:00" defaultEnd="07:00" />);
    await user.click(screen.getByRole("button", { name: "Save log" }));

    await waitFor(() => expect(insertTimeLog).toHaveBeenCalled());
    expect(vi.mocked(insertTimeLog).mock.calls[0][2]).toMatchObject({
      date: "2026-06-09",
      start_time: "23:00",
      end_time: "07:00",
    });
  });

  it("preserves the original editDate on an overnight edit to avoid double-shifting", async () => {
    const { updateTimeLog } = await import("@/lib/dataStore");
    vi.mocked(updateTimeLog).mockResolvedValue({ id: "row" });
    const user = userEvent.setup();

    render(
      <QuickLogDialog
        {...baseProps}
        editId="log-1"
        editDate="2026-06-09"
        defaultStart="23:00"
        defaultEnd="07:00"
      />
    );
    await user.click(screen.getByRole("button", { name: "Save log" }));

    await waitFor(() => expect(updateTimeLog).toHaveBeenCalled());
    expect(vi.mocked(updateTimeLog).mock.calls[0][3]).toMatchObject({
      date: "2026-06-09",
      start_time: "23:00",
      end_time: "07:00",
    });
  });

  it("disables Save when there is no category to pick", () => {
    render(<QuickLogDialog {...baseProps} categories={[]} />);
    expect(screen.getByRole("button", { name: "Save log" })).toBeDisabled();
  });

  it("fires the optimistic insert immediately but the success toast only after the insert resolves", async () => {
    const user = userEvent.setup();
    let resolveInsert!: (v: unknown) => void;
    vi.mocked(insertTimeLog).mockReturnValue(new Promise((r) => { resolveInsert = r; }));
    const onOptimisticInsert = vi.fn();

    render(<QuickLogDialog {...baseProps} onOptimisticInsert={onOptimisticInsert} />);
    await user.click(screen.getByRole("button", { name: "Save log" }));

    expect(onOptimisticInsert).toHaveBeenCalledOnce();
    expect(toast.success).not.toHaveBeenCalled(); // insert still in flight

    resolveInsert({ id: "row" });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Logged 1h"));
  });

  it("shows Delete when editing and calls deleteTimeLog with onDeleted", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteTimeLog).mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <QuickLogDialog
        {...baseProps}
        editId="log-42"
        onDeleted={onDeleted}
        onOpenChange={onOpenChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteTimeLog).toHaveBeenCalledWith("guest", null, "log-42")
    );
    expect(toast.success).toHaveBeenCalledWith("Log deleted");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDeleted).toHaveBeenCalled();
  });

  it("hides Delete when creating a new log", () => {
    render(<QuickLogDialog {...baseProps} />);
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it('shows a "next day" hint near the end time when the range wraps past midnight', () => {
    render(<QuickLogDialog {...baseProps} defaultStart="23:00" defaultEnd="06:00" />);
    expect(screen.getByText(/next day/i)).toBeInTheDocument();
  });
});
