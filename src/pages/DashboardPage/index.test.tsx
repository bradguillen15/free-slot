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

import { ensureBootstrap, insertLog, upsertCategory } from "@/lib/localStore";
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
