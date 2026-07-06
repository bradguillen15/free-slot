import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import "@/i18n";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const authState = vi.hoisted(() => ({ user: null as { id: string } | null }));

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, session: null, loading: false, signOut: vi.fn() }),
}));

import { resetSupabaseMock } from "@/test/supabaseMock";
import { ensureBootstrap, upsertScheduleBlock, upsertCategory } from "@/lib/localStore";
import { isoToWeekday, todayISO } from "@/lib/time";
import WeekPage from "./WeekPage";

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  authState.user = null;
  ensureBootstrap();
});

describe("WeekPage — Inbox removed", () => {
  it("does not render an Inbox toggle or panel", () => {
    renderWithProviders(<WeekPage />);
    expect(screen.queryByRole("button", { name: /inbox/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/inbox/i)).not.toBeInTheDocument();
  });
});

describe("WeekPage — Confirm Day", () => {
  it("shows a Confirm Day action when today falls within the displayed week", async () => {
    const cat = upsertCategory({ name: "Work", type: "productive", color: "#3b82f6", hidden: false });
    upsertScheduleBlock({
      name: "Work", start_time: "09:00", end_time: "10:00",
      days_of_week: [isoToWeekday(todayISO())], category_id: cat.id,
    });
    renderWithProviders(<WeekPage />);
    // Any Confirm Day state (button/not-elapsed/already-logged/etc.) shares this marker —
    // avoids coupling the test to the wall-clock time the suite happens to run at.
    await waitFor(() => {
      expect(document.querySelector('[data-tour="confirm-day"]')).toBeInTheDocument();
    });
  });
});

describe("WeekPage — layout", () => {
  it("renders free-time stats and week navigation for a guest", async () => {
    renderWithProviders(<WeekPage />);
    await waitFor(() => {
      expect(screen.getByTestId("page-week")).toBeInTheDocument();
      expect(screen.getByText(/total free time|tiempo libre total/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /previous week|semana anterior/i })).toBeInTheDocument();
  });

  it("shows the guest AI upsell banner", () => {
    renderWithProviders(<WeekPage />);
    expect(screen.getByText(/create account|crear cuenta/i)).toBeInTheDocument();
  });

  it("navigates to the next week when next is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WeekPage />, { route: "/app/week?week=2026-06-08" });
    const title = await screen.findByRole("heading", { level: 1 });
    const before = title.textContent;
    await user.click(screen.getByRole("button", { name: /next week|semana siguiente/i }));
    await waitFor(() => expect(title.textContent).not.toBe(before));
  });
});
