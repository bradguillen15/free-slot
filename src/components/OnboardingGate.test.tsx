import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/lib/queryClient";

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
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app" element={<OnboardingGate><div>APP</div></OnboardingGate>} />
          <Route path="/onboarding" element={<OnboardingGate><div>ONBOARDING</div></OnboardingGate>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
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

  it("lets a skipped guest through to /app", async () => {
    ensureBootstrap();
    updateProfile({ onboarding_skipped: true });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("APP")).toBeInTheDocument());
  });

  it("redirects an onboarded guest away from /onboarding", async () => {
    ensureBootstrap();
    updateProfile({ onboarding_completed: true });
    renderAt("/onboarding");
    await waitFor(() => expect(screen.queryByText("ONBOARDING")).not.toBeInTheDocument());
  });

  it("redirects a skipped guest away from /onboarding", async () => {
    ensureBootstrap();
    updateProfile({ onboarding_skipped: true });
    renderAt("/onboarding");
    await waitFor(() => expect(screen.queryByText("ONBOARDING")).not.toBeInTheDocument());
  });
});

describe("OnboardingGate — signed in", () => {
  it("lets an onboarded user through", async () => {
    authState.user = { id: "u1" };
    queueTableResult("profiles", { data: { onboarding_completed: true, onboarding_skipped: false } });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("APP")).toBeInTheDocument());
  });

  it("lets a user who skipped through", async () => {
    authState.user = { id: "u1" };
    queueTableResult("profiles", { data: { onboarding_completed: false, onboarding_skipped: true } });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("APP")).toBeInTheDocument());
  });

  it("sends a user with neither flag set to onboarding", async () => {
    authState.user = { id: "u1" };
    queueTableResult("profiles", { data: { onboarding_completed: false, onboarding_skipped: false } });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("ONBOARDING")).toBeInTheDocument());
  });

  it("sends a user without a completed profile to onboarding", async () => {
    authState.user = { id: "u1" };
    queueTableResult("profiles", { data: { onboarding_completed: false } });
    renderAt("/app");
    await waitFor(() => expect(screen.getByText("ONBOARDING")).toBeInTheDocument());
  });
});
