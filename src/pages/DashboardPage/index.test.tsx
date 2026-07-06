import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, setQueryClientForTests } from "@/lib/queryClient";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
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

import { ensureBootstrap, insertLog, setDashboardPeriod, upsertCategory, getDashboardPeriod } from "@/lib/localStore";
import { addDaysISO, todayISO } from "@/lib/time";
import { weekStartISO } from "@/lib/week";
import { resetSupabaseMock, setTableResult } from "../../test/supabaseMock";
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
  it("renders KPIs and the period selector from seeded localStorage logs", async () => {
    seedGuestDashboardLogs();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Total tracked|Tiempo registrado/i)).toBeInTheDocument();
      expect(screen.getByText(/Days logged|Días registrados/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("radio", { name: /week/i })).toBeInTheDocument();
    expect(screen.getByText("Music practice")).toBeInTheDocument();
  });

  it("falls back to Week when a previously persisted period is the removed Custom kind", async () => {
    setDashboardPeriod({ kind: "custom", anchorISO: "2026-06-15" });
    seedGuestDashboardLogs();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /week/i })).toHaveAttribute("aria-checked", "true");
    });
  });

  it("does not gate the dashboard on having an account", async () => {
    seedGuestDashboardLogs();
    renderPage();

    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-empty")).not.toBeInTheDocument();
    });
  });
});

describe("DashboardPage — empty state", () => {
  it("shows the empty state with nothing logged or scheduled", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-empty")).toBeInTheDocument();
    });
  });

  it("clears the empty state once time is logged for the selected period", async () => {
    const first = renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-empty")).toBeInTheDocument();
    });
    first.unmount();

    insertLog({
      date: todayISO(),
      start_time: "09:00",
      end_time: "10:00",
      type: "productive",
      category_id: null,
    });

    // Re-render to pick up the newly inserted guest log (simulates navigating back to the dashboard).
    renderPage();
    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-empty")).not.toBeInTheDocument();
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
    setTableResult("schedule_blocks", { data: [] });
  });

  it("renders KPIs and the trend chart for a signed-in user", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Total tracked|Tiempo registrado/i)).toBeInTheDocument();
      expect(screen.getByText("Deep work")).toBeInTheDocument();
    });
  });
});

describe("DashboardPage — period selector", () => {
  beforeEach(() => {
    seedGuestDashboardLogs();
  });

  it("persists period kind and anchor when the user changes period", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("radio", { name: /day/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("radio", { name: /day/i }));
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));

    const stored = getDashboardPeriod();
    expect(stored.kind).toBe("day");
    expect(stored.anchorISO).toBeTruthy();
  });
});
