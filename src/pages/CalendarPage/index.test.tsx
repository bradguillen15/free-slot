import { beforeEach, describe, it, expect, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders";
import "@/i18n";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

import { ensureBootstrap } from "@/lib/localStore";
import CalendarPage from ".";

beforeEach(() => {
  localStorage.clear();
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
