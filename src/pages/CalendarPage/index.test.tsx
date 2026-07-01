import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import "@/i18n";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const authState = vi.hoisted(() => ({ user: null as { id: string } | null }));

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, session: null, loading: false, signOut: vi.fn() }),
}));

import { resetSupabaseMock, setTableResult } from "@/test/supabaseMock";
import { upsertScheduleBlock, ensureBootstrap } from "@/lib/localStore";
import { isoToWeekday, todayISO } from "@/lib/time";
import CalendarPage from ".";

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  authState.user = null;
  ensureBootstrap();
  Element.prototype.scrollTo = vi.fn();
});

describe("CalendarPage — day timeline sizing", () => {
  it("uses flex sizing instead of calc(100vh) on the timeline root", () => {
    renderWithProviders(<CalendarPage />);

    const timeline = document.getElementById("day-timeline-root");
    expect(timeline).toBeTruthy();
    expect(timeline!.className).not.toMatch(/calc\(100vh/);
    expect(timeline!.className).toMatch(/\blg:flex-1\b/);
  });
});

describe("CalendarPage — Summary/Notes tabs", () => {
  it("renders Summary and Notes tabs in the right panel", () => {
    const { getByText } = renderWithProviders(<CalendarPage />);
    expect(getByText("Summary")).toBeTruthy();
    expect(getByText("Notes")).toBeTruthy();
  });

  it("Summary tab is active by default", () => {
    renderWithProviders(<CalendarPage />);
    const activeTabs = document.querySelectorAll('[role="tab"][data-state="active"]');
    const texts = Array.from(activeTabs).map((t) => t.textContent);
    expect(texts).toContain("Summary");
  });
});

describe("CalendarPage — schedule block click", () => {
  async function clickWorkBlockAndAssertPrefill() {
    const { findByTestId, findByTitle } = renderWithProviders(<CalendarPage />);

    fireEvent.click(await findByTitle(/Work · Planned/));

    await waitFor(async () => {
      expect(await findByTestId("quicklog-title")).toHaveValue("Work");
      expect(await findByTestId("quicklog-start")).toHaveValue("09:00");
      expect(await findByTestId("quicklog-end")).toHaveValue("17:00");
    });
  }

  it("opens Quick Log prefilled when a schedule block is clicked (guest)", async () => {
    const today = todayISO();
    upsertScheduleBlock({
      name: "Work",
      start_time: "09:00",
      end_time: "17:00",
      days_of_week: [isoToWeekday(today)],
      color: "#3b82f6",
      type: "fixed",
    });

    await clickWorkBlockAndAssertPrefill();
  });

  it("opens Quick Log prefilled when a schedule block is clicked (signed in)", async () => {
    const today = todayISO();
    authState.user = { id: "u1" };
    setTableResult("categories", {
      data: [{ id: "c1", name: "Deep work", type: "productive", hidden: false, sort_order: 0 }],
    });
    setTableResult("schedule_blocks", {
      data: [{
        id: "b1",
        name: "Work",
        start_time: "09:00",
        end_time: "17:00",
        days_of_week: [isoToWeekday(today)],
        color: "#3b82f6",
        type: "fixed",
        sort_order: 0,
        created_at: "2026-01-01",
      }],
    });
    setTableResult("time_logs", { data: [] });
    setTableResult("daily_notes", { data: null });

    await clickWorkBlockAndAssertPrefill();
  });
});
