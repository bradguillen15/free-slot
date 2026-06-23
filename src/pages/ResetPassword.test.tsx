import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@/i18n";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const authState = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  loading: false,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    session: authState.user ? { user: authState.user } : null,
    loading: authState.loading,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateSpy };
});

import { supabase } from "@/integrations/supabase/client";
import { resetSupabaseMock } from "../test/supabaseMock";
import { toast } from "sonner";
import ResetPassword from "./ResetPassword";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <ResetPassword />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // resetSupabaseMock() clears table queues but not auth.* spy history, so clear
  // all mocks to keep negative assertions (not.toHaveBeenCalled) isolated.
  vi.clearAllMocks();
  resetSupabaseMock();
  authState.user = { id: "u1" };
  authState.loading = false;
  navigateSpy.mockReset();
});

describe("ResetPassword", () => {
  it("updates the password and navigates to the app on success", async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user: null }, error: null } as never);
    renderPage();

    await user.type(screen.getByTestId("reset-new-password"), "newsecret1");
    await user.type(screen.getByTestId("reset-confirm-password"), "newsecret1");
    await user.click(screen.getByTestId("reset-submit"));

    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "newsecret1" }));
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith("/app", { replace: true }));
  });

  it("blocks the update when confirmation differs", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId("reset-new-password"), "newsecret1");
    await user.type(screen.getByTestId("reset-confirm-password"), "different1");
    await user.click(screen.getByTestId("reset-submit"));

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("shows an invalid-link state with no recovery session", () => {
    authState.user = null;
    renderPage();

    expect(screen.getByTestId("reset-request-new")).toBeInTheDocument();
    expect(screen.queryByTestId("reset-submit")).not.toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });
});
