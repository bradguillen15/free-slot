// Guest-mode behavior of the Schedule management page (Phase 1 of the UX plan).
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/i18n";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

import { ensureBootstrap, listScheduleBlocks, reorderScheduleBlocks, upsertScheduleBlock } from "@/lib/localStore";
import SchedulePage from "./SchedulePage";

function renderPage() {
  return render(
    <TooltipProvider>
      <SchedulePage />
    </TooltipProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  ensureBootstrap();
});

describe("SchedulePage — guest mode", () => {
  it("lists existing blocks with their day toggles", async () => {
    upsertScheduleBlock({ name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: [1, 2, 3, 4, 5] });
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Work")).toBeInTheDocument());
  });

  it("duplicates a block in one click directly below the original", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    const first = upsertScheduleBlock({ name: "Gym", start_time: "18:00", end_time: "19:00", days_of_week: [1, 3, 5] });
    upsertScheduleBlock({ name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: [1, 2, 3, 4, 5] });
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeInTheDocument());

    await user.click(screen.getAllByLabelText(/Duplicate|Duplicar/)[0]);

    await waitFor(() => {
      const names = listScheduleBlocks().map((b) => b.name);
      expect(names).toContain("Gym (copy)");
      const idx = names.indexOf("Gym (copy)");
      expect(names[idx - 1]).toBe("Gym");
      expect(first.id).not.toBe(listScheduleBlocks().find((b) => b.name === "Gym (copy)")?.id);
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(expect.stringMatching(/Block duplicated|Bloque duplicado/));
  });

  it("opens the edit dialog from the pencil button", async () => {
    const user = userEvent.setup();
    upsertScheduleBlock({ name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: [1, 2, 3, 4, 5] });
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Work")).toBeInTheDocument());

    await user.click(screen.getByLabelText(/Edit|Editar/));

    expect(await screen.findByText(/Edit schedule block|Editar bloque del horario/i)).toBeInTheDocument();
  });

  it("does not render inline color inputs on rows", async () => {
    upsertScheduleBlock({ name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: [1, 2, 3, 4, 5] });
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Work")).toBeInTheDocument());
    expect(container.querySelector('input[type="color"]')).toBeNull();
  });

  it("offers presets and adds one on click", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "+ Sleep" }));
    await waitFor(() => {
      expect(listScheduleBlocks().some((b) => b.name === "Sleep")).toBe(true);
    });
  });

  it("shows drag hint when multiple blocks exist", async () => {
    upsertScheduleBlock({ name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: [1, 2, 3, 4, 5] });
    upsertScheduleBlock({ name: "Gym", start_time: "18:00", end_time: "19:00", days_of_week: [1, 3, 5] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Drag blocks to reorder|Arrastra los bloques/)).toBeInTheDocument());
  });

  it("persists block order via reorderScheduleBlocks", () => {
    const a = upsertScheduleBlock({ name: "First", start_time: "08:00", end_time: "09:00", days_of_week: [1] });
    const b = upsertScheduleBlock({ name: "Second", start_time: "09:00", end_time: "10:00", days_of_week: [1] });
    reorderScheduleBlocks([b.id, a.id]);
    expect(listScheduleBlocks().map((x) => x.name)).toEqual(["Second", "First"]);
  });

  it("guards the last remaining day from being toggled off", async () => {
    const user = userEvent.setup();
    upsertScheduleBlock({ name: "Solo", start_time: "08:00", end_time: "09:00", days_of_week: [3] });
    const { toast } = await import("sonner");
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Solo")).toBeInTheDocument());

    // The active "Wed" chip is the only selected day — clicking it must be refused.
    const wedChips = screen.getAllByRole("button", { name: "Wed" });
    await user.click(wedChips[0]);
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Select at least one day");
    expect(listScheduleBlocks().find((b) => b.name === "Solo")?.days_of_week).toEqual([3]);
  });
});
