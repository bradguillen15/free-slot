import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AIPlanPanel } from "./AIPlanPanel";

const mockMutateAsync = vi.fn().mockResolvedValue({ plan: { id: "p1", week_start: "2026-06-08", generated_at: "", slots: [] }, summary: "" });

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/dataStore", () => ({
  useWeeklyPlan: () => ({ data: null }),
  useWeeklyPriorities: () => ({ data: [] }),
  useGenerateWeeklyPlanMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDeleteWeeklyPlanMutation: () => ({ mutateAsync: vi.fn() }),
  insertTimeLog: vi.fn(),
  invalidateTimeLogs: vi.fn(),
  useDailyNotesForWeek: () => ({ data: [] }),
  useInboxItems: () => ({ data: [] }),
}));

vi.mock("@/resources", () => ({
  resources: { timeLogs: { insertMany: vi.fn() } },
}));

const gaps = [{ day: "2026-06-08", start: "09:00", end: "12:00", durationMin: 180, isPeak: true }];
const categories: never[] = [];

function renderPanel(activities: { id: string; name: string; category_id: string | null; target_hours_per_week: number; is_active: boolean }[]) {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <AIPlanPanel
          weekStart="2026-06-08"
          gaps={gaps}
          activities={activities}
          categories={categories}
          onPlanChange={() => {}}
          onSlotAccepted={() => {}}
        />
      </MemoryRouter>
    </TooltipProvider>
  );
}

describe("AIPlanPanel generate()", () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
  });

  it("sends each activity's real target_hours_per_week, not a hardcoded 0", async () => {
    renderPanel([
      { id: "a1", name: "Exercise", category_id: null, target_hours_per_week: 3, is_active: true },
      { id: "a2", name: "Reading", category_id: null, target_hours_per_week: 5, is_active: true },
    ]);
    fireEvent.click(screen.getByText("Generate plan"));
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          activities: [
            expect.objectContaining({ id: "a1", target_hours_per_week: 3 }),
            expect.objectContaining({ id: "a2", target_hours_per_week: 5 }),
          ],
          locale: "en",
        })
      )
    );
  });

  it("blocks generation when every active activity has a zero target", async () => {
    renderPanel([
      { id: "a1", name: "Exercise", category_id: null, target_hours_per_week: 0, is_active: true },
      { id: "a2", name: "Reading", category_id: null, target_hours_per_week: 0, is_active: true },
    ]);
    fireEvent.click(screen.getByText("Generate plan"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No weekly targets set", expect.anything()));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("allows generation when at least one activity has a positive target", async () => {
    renderPanel([
      { id: "a1", name: "Exercise", category_id: null, target_hours_per_week: 0, is_active: true },
      { id: "a2", name: "Reading", category_id: null, target_hours_per_week: 2, is_active: true },
    ]);
    fireEvent.click(screen.getByText("Generate plan"));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
  });
});
