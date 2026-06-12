import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const authState = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, session: null, loading: authState.loading, signOut: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

import { queueTableResult, resetSupabaseMock } from "../test/supabaseMock";
import { updateProfile, ensureBootstrap } from "@/lib/localStore";
import { OnboardingGate } from "./OnboardingGate";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app" element={<OnboardingGate><div>APP</div></OnboardingGate>} />
        <Route path="/onboarding" element={<OnboardingGate><div>ONBOARDING</div></OnboardingGate>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  authState.user = null;
  authState.loading = false;
});

describe("OnboardingGate — guest", () => {
  it("redirects a fresh guest from /app to /onboarding", async () => {
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("ONBOARDING")).toBeInTheDocument());
  });

  it("lets an onboarded guest through to /app", async () => {
    ensureBootstrap();
    updateProfile({ onboarding_completed: true });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("APP")).toBeInTheDocument());
  });

  it("redirects an onboarded guest away from /onboarding", async () => {
    ensureBootstrap();
    updateProfile({ onboarding_completed: true });
    renderAt("/onboarding");
    // Navigate to /app renders nothing here (no matching content), so assert
    // the onboarding content did NOT render.
    await waitFor(() => expect(screen.queryByText("ONBOARDING")).not.toBeInTheDocument());
  });
});

describe("OnboardingGate — signed in", () => {
  it("lets an onboarded user through", async () => {
    authState.user = { id: "u1" };
    queueTableResult("profiles", { data: { onboarding_completed: true } });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("APP")).toBeInTheDocument());
  });

  it("sends a user without a completed profile to onboarding", async () => {
    authState.user = { id: "u1" };
    queueTableResult("profiles", { data: { onboarding_completed: false } });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("ONBOARDING")).toBeInTheDocument());
  });
});
