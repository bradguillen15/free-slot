// Regression for the "guest rankings are display-only" bug: guest priorities
// persist to localStore and order the list on (re)mount.
import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../../../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

import { setPriorities } from "@/lib/localStore";
import { weekStartISO } from "@/lib/week";
import { PriorityRanker } from ".";

const activities = [
  { id: "a-guitar", name: "Guitar", category_id: null, target_hours_per_week: 4, is_active: true },
  { id: "a-reading", name: "Reading", category_id: null, target_hours_per_week: 2, is_active: true },
  { id: "a-off", name: "Inactive thing", category_id: null, target_hours_per_week: 1, is_active: false },
];

beforeEach(() => {
  localStorage.clear();
});

describe("PriorityRanker — guest mode", () => {
  it("orders active activities by the ranking stored in localStore", async () => {
    // Alphabetical would be Guitar first; the stored ranking says Reading first.
    setPriorities(weekStartISO(), [
      { activity_id: "a-reading", rank: 0 },
      { activity_id: "a-guitar", rank: 1 },
    ]);

    renderWithProviders(<PriorityRanker activities={activities} categories={[]} />);

    await waitFor(() => {
      const names = screen.getAllByText(/^(Guitar|Reading)$/).map((el) => el.textContent);
      expect(names).toEqual(["Reading", "Guitar"]);
    });
    expect(screen.queryByText("Inactive thing")).not.toBeInTheDocument();
  });

  it("falls back to alphabetical order with no stored ranking", async () => {
    renderWithProviders(<PriorityRanker activities={activities} categories={[]} />);
    await waitFor(() => expect(screen.getByText("Guitar")).toBeInTheDocument());
    const names = screen.getAllByText(/^(Guitar|Reading)$/).map((el) => el.textContent);
    expect(names).toEqual(["Guitar", "Reading"]);
  });
});
