import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@/i18n";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

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

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("@/lib/migrateGuest", () => ({ migrateGuestToCloud: vi.fn() }));

const testQueryClient = vi.hoisted(() => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/queryClient", async (orig) => {
  const actual = await orig<typeof import("@/lib/queryClient")>();
  return { ...actual, getQueryClient: () => testQueryClient };
});

import { supabase } from "@/integrations/supabase/client";
import { resetSupabaseMock } from "../test/supabaseMock";
import { migrateGuestToCloud } from "@/lib/migrateGuest";
import { queryKeys } from "@/lib/queryKeys";
import { seedGuestData } from "../test/factories";
import { toast } from "sonner";
import Auth from "./Auth";

const emptyCounts = { categories: 0, activities: 0, schedule_blocks: 0, time_logs: 0, priorities: 0 };

function renderAuth() {
  return render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Auth />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  authState.user = null;
  navigateSpy.mockReset();
  testQueryClient.invalidateQueries.mockReset().mockResolvedValue(undefined);
  vi.mocked(migrateGuestToCloud).mockReset();
  vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
    data: { provider: "google", url: "https://example.com/oauth" },
    error: null,
  });
});

describe("Auth — Google sign-in", () => {
  it("calls signInWithOAuth with google provider and /auth redirect", async () => {
    const user = userEvent.setup();
    renderAuth();

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
  });

  it("blocks submit and shows messages for invalid email / short password", async () => {
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("At least 6 characters")).toBeInTheDocument();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("submits valid credentials to signUp", async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    } as never);

    renderAuth();
    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "secret1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@b.com", password: "secret1" }),
      ),
    );
  });

  it("disables the Google button while OAuth is pending", async () => {
    let resolveOAuth!: (value: { data: { provider: string; url: string }; error: null }) => void;
    const pendingOAuth = new Promise<{ data: { provider: string; url: string }; error: null }>((resolve) => {
      resolveOAuth = resolve;
    });
    vi.mocked(supabase.auth.signInWithOAuth).mockReturnValue(
      pendingOAuth as unknown as ReturnType<typeof supabase.auth.signInWithOAuth>,
    );

    const user = userEvent.setup();
    renderAuth();

    const googleButton = screen.getByRole("button", { name: /continue with google/i });
    expect(googleButton).not.toBeDisabled();

    await user.click(googleButton);

    await waitFor(() => expect(googleButton).toBeDisabled());

    resolveOAuth({ data: { provider: "google", url: "https://example.com/oauth" }, error: null });
    await pendingOAuth;
  });
});

describe("Auth — migration cache refresh", () => {
  async function openMigrateDialog() {
    seedGuestData();
    authState.user = { id: "u1" };
    const user = userEvent.setup();
    renderAuth();
    // useEffect detects guest data + user → opens the migrate dialog
    return { user, importBtn: await screen.findByTestId("migrate-import") };
  }

  it("invalidates the query cache before navigating after a successful import", async () => {
    vi.mocked(migrateGuestToCloud).mockResolvedValue({ migrated: true, counts: emptyCounts });
    const { user, importBtn } = await openMigrateDialog();

    await user.click(importBtn);

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith("/app", { replace: true }));
    expect(testQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.root });
    // invalidation must happen before navigation
    expect(testQueryClient.invalidateQueries.mock.invocationCallOrder[0]).toBeLessThan(
      navigateSpy.mock.invocationCallOrder[0],
    );
  });

  it("does not invalidate or navigate when migration fails", async () => {
    vi.mocked(migrateGuestToCloud).mockRejectedValue(new Error("boom"));
    const { user, importBtn } = await openMigrateDialog();

    await user.click(importBtn);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(testQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it("keeps the Import action disabled until migration and cache refresh settle", async () => {
    let resolveMigrate!: (v: { migrated: boolean; counts: typeof emptyCounts }) => void;
    vi.mocked(migrateGuestToCloud).mockReturnValue(
      new Promise((resolve) => {
        resolveMigrate = resolve;
      }),
    );
    const { user, importBtn } = await openMigrateDialog();

    expect(importBtn).not.toBeDisabled();
    await user.click(importBtn);
    await waitFor(() => expect(importBtn).toBeDisabled());

    resolveMigrate({ migrated: true, counts: emptyCounts });
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith("/app", { replace: true }));
  });
});
