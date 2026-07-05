// Guest dashboard — local-data analytics (see docs/guest-dashboard-plan.md).
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, setQueryClientForTests } from "@/lib/queryClient";
import { MemoryRouter } from "react-router-dom";
import "@/i18n";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/lib/celebrate", () => ({
  celebrateIfPersonalBest: vi.fn(() => false),
  getBestRatio: vi.fn(() => 0),
}));

vi.mock("@/components/dashboard/WeeklyReviewModal", () => ({
  WeeklyReviewModal: () => null,
}));

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => children,
  };
});

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    session: authState.user ? { user: authState.user } : null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

import { ensureBootstrap, insertLog, upsertCategory, upsertScheduleBlock, getDashboardExcludedLabels, listCategories } from "@/lib/localStore";
import { addDaysISO } from "@/lib/time";
import { weekStartISO } from "@/lib/week";
import { resetSupabaseMock, setTableResult } from "../../test/supabaseMock";
import i18n from "@/i18n";
import DashboardPage from ".";

function seedGuestDashboardLogs() {
  ensureBootstrap();
  const weekStart = weekStartISO();
  const custom = upsertCategory({
    name: "Music practice",
    type: "productive",
    color: "#aa00ff",
    hidden: false,
  });
  insertLog({
    date: addDaysISO(weekStart, 1),
    start_time: "09:00",
    end_time: "10:00",
    type: "productive",
    category_id: custom.id,
  });
  insertLog({
    date: addDaysISO(weekStart, 2),
    start_time: "20:00",
    end_time: "21:30",
    type: "productive",
    category_id: null,
  });
}

function renderPage() {
  const queryClient = createTestQueryClient();
  setQueryClientForTests(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  localStorage.clear();
  ensureBootstrap();
  authState.user = null;
  resetSupabaseMock();
  await i18n.changeLanguage("en");
});

describe("DashboardPage — guest mode", () => {
  it("renders KPIs from seeded localStorage logs", async () => {
    seedGuestDashboardLogs();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Total tracked|Tiempo registrado/i)).toBeInTheDocument();
      expect(screen.getByText(/Days logged|Días registrados/i)).toBeInTheDocument();
      expect(screen.getAllByText("2h 30m").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText(/AI slots|Slots de IA/i)).not.toBeInTheDocument();
  });

  it("shows the AI upsell card and hides Review week", async () => {
    seedGuestDashboardLogs();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Sign in/i })).toHaveAttribute("href", "/auth");
    });
    expect(screen.queryByRole("button", { name: /Review week/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/AI plan vs logged/i)).not.toBeInTheDocument();
  });

  it("still shows hidden categories in the category breakdown", async () => {
    ensureBootstrap();
    const weekStart = weekStartISO();
    const hidden = upsertCategory({
      name: "Hidden label",
      type: "productive",
      color: "#111111",
      hidden: true,
    });
    insertLog({
      date: addDaysISO(weekStart, 1),
      start_time: "14:00",
      end_time: "15:00",
      type: "productive",
      category_id: hidden.id,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Hidden label")).toBeInTheDocument();
    });
  });
});

describe("DashboardPage — schedule vs actual card", () => {
  it("shows an empty state pointing to the schedule when no blocks exist", async () => {
    seedGuestDashboardLogs();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("sva-empty")).toBeInTheDocument();
    });
  });

  it("renders a per-label comparison row with adherence when schedule and logs exist", async () => {
    ensureBootstrap();
    const weekStart = weekStartISO();
    const cat = upsertCategory({ name: "Focus", type: "productive", color: "#3b82f6", hidden: false });
    // Scheduled every day 09:00-11:00; Tuesday logged 09:00-10:00 as Focus.
    upsertScheduleBlock({
      name: "Focus block", start_time: "09:00", end_time: "11:00",
      days_of_week: [0, 1, 2, 3, 4, 5, 6], category_id: cat.id,
    });
    insertLog({
      date: addDaysISO(weekStart, 1), start_time: "09:00", end_time: "10:00",
      type: "productive", category_id: cat.id,
    });
    renderPage();

    const row = await screen.findByTestId(`sva-row-${cat.id}`);
    expect(row).toHaveTextContent("Focus");
    expect(row).toHaveTextContent("14h"); // scheduled 2h x 7
    expect(row).toHaveTextContent("1h"); // logged
    // 1h kept of 14h scheduled ≈ 7%
    expect(screen.getByTestId("adherence-kpi")).toHaveTextContent("7%");
  });

  it("expands a row into the displacement breakdown", async () => {
    ensureBootstrap();
    const weekStart = weekStartISO();
    const focus = upsertCategory({ name: "Focus", type: "productive", color: "#3b82f6", hidden: false });
    const gaming = upsertCategory({ name: "Play", type: "unproductive", color: "#f97316", hidden: false });
    upsertScheduleBlock({
      name: "Focus block", start_time: "09:00", end_time: "11:00",
      days_of_week: [1], category_id: focus.id,
    });
    insertLog({
      date: addDaysISO(weekStart, 0), start_time: "09:00", end_time: "10:00",
      type: "unproductive", category_id: gaming.id,
    });
    renderPage();

    const row = await screen.findByTestId(`sva-row-${focus.id}`);
    row.click();
    const breakdown = await screen.findByTestId(`sva-displacement-${focus.id}`);
    expect(breakdown).toHaveTextContent("Play");
    expect(breakdown).toHaveTextContent(/Nothing logged/i);
  });

  it("excluding a label via the filter persists and removes it from the card", async () => {
    ensureBootstrap();
    const weekStart = weekStartISO();
    const sleep = listCategories().find((c) => c.name === "Sleep")!;
    upsertScheduleBlock({
      name: "Sleep", start_time: "23:00", end_time: "07:00",
      days_of_week: [0, 1, 2, 3, 4, 5, 6], category_id: sleep.id,
    });
    insertLog({
      date: addDaysISO(weekStart, 1), start_time: "23:00", end_time: "07:00",
      type: "essential", category_id: sleep.id,
    });
    renderPage();

    await screen.findByTestId(`sva-row-${sleep.id}`);

    // Cycle the chip: neutral -> included -> excluded.
    const chip = screen.getByTestId(`label-filter-${sleep.id}`);
    chip.click();
    await waitFor(() => expect(chip).toHaveAttribute("data-state", "included"));
    chip.click();
    await waitFor(() => expect(chip).toHaveAttribute("data-state", "excluded"));

    await waitFor(() => {
      expect(screen.queryByTestId(`sva-row-${sleep.id}`)).not.toBeInTheDocument();
    });
    expect(getDashboardExcludedLabels()).toEqual([sleep.id]);
  });
});

describe("DashboardPage — signed-in mode", () => {
  beforeEach(() => {
    authState.user = { id: "user-1" };
    const weekStart = weekStartISO();
    setTableResult("time_logs", {
      data: [
        {
          id: "log-1",
          date: addDaysISO(weekStart, 1),
          start_time: "09:00",
          end_time: "10:00",
          type: "productive",
          category_id: "cat-1",
        },
      ],
    });
    setTableResult("categories", {
      data: [
        { id: "cat-1", name: "Deep work", color: "#3b82f6", type: "productive", is_default: false, hidden: false },
      ],
    });
    setTableResult("weekly_plans", {
      data: {
        slots: [
          {
            day: addDaysISO(weekStart, 1),
            start: "09:00",
            end: "10:00",
            activity_id: "act-1",
            activity_name: "Deep work",
          },
        ],
      },
    });
  });

  it("shows Review week and the AI plan vs logged card", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Review week|Revisar semana/i })).toBeInTheDocument();
      expect(screen.getByText(/AI plan vs logged|Plan IA vs registrado/i)).toBeInTheDocument();
      expect(screen.getByText(/AI slots|Slots de IA/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/AI weekly plans|Planes semanales con IA/i)).not.toBeInTheDocument();
  });
});
