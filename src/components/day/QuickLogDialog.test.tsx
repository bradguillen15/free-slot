import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({ insertTimeLog: vi.fn(), updateTimeLog: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

import { toast } from "sonner";
import { insertTimeLog } from "@/lib/dataStore";
import { QuickLogDialog, type Category } from "./QuickLogDialog";

const cat: Category = { id: "c1", name: "Deep work", color: "#00f", type: "productive" };

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  date: "2026-06-10",
  categories: [cat],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("QuickLogDialog", () => {
  it("rejects end <= start with an error toast and no insert", async () => {
    const user = userEvent.setup();
    render(<QuickLogDialog {...baseProps} defaultStart="10:00" defaultEnd="09:00" />);

    await user.click(screen.getByRole("button", { name: "Save log" }));

    expect(toast.error).toHaveBeenCalledWith("End time must be after start");
    expect(insertTimeLog).not.toHaveBeenCalled();
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
});
