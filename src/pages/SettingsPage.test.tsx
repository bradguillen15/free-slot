import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import "@/i18n";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const authState = vi.hoisted(() => ({ user: { id: "u1" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, session: null, loading: false, signOut: vi.fn() }),
}));

const updateUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ error: null }) },
    auth: { updateUser: updateUserMock },
  },
}));

const profileData = vi.hoisted(() => ({
  data: { peak_hours: { start: "08:00", end: "11:00" }, include_weekends: false, weekly_review_day: 2 } as Record<string, unknown> | null,
}));
const refreshProfile = vi.hoisted(() => vi.fn());
const updateProfileMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dataStore", () => ({
  useProfile: () => ({ data: profileData.data, refresh: refreshProfile }),
  updateProfile: updateProfileMock,
  useDeleteAccountMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import SettingsPage from "./SettingsPage";

beforeEach(() => {
  vi.clearAllMocks();
  authState.user = { id: "u1" };
});

describe("SettingsPage planner preferences", () => {
  it("saves preferences parsed from the form back into the profile shape", async () => {
    const user = userEvent.setup();
    updateProfileMock.mockResolvedValue(undefined);
    renderWithProviders(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /Save preferences/ }));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith("cloud", "u1", {
        include_weekends: false,
        weekly_review_day: 2,
      }),
    );
  });
});

describe("SettingsPage change password", () => {
  it("updates the password when the confirmation matches", async () => {
    const user = userEvent.setup();
    updateUserMock.mockResolvedValue({ error: null });
    renderWithProviders(<SettingsPage />);

    await user.type(screen.getByTestId("settings-new-password"), "newsecret1");
    await user.type(screen.getByTestId("settings-confirm-password"), "newsecret1");
    await user.click(screen.getByTestId("settings-password-submit"));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ password: "newsecret1" }));
  });

  it("blocks the update and shows an error when confirmation differs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await user.type(screen.getByTestId("settings-new-password"), "newsecret1");
    await user.type(screen.getByTestId("settings-confirm-password"), "different1");
    await user.click(screen.getByTestId("settings-password-submit"));

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("hides the password card for guest users", () => {
    authState.user = null;
    renderWithProviders(<SettingsPage />);
    expect(screen.queryByTestId("settings-password-submit")).not.toBeInTheDocument();
  });
});

describe("SettingsPage delete-account gate", () => {
  it('enables "Delete forever" only after typing DELETE', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /Delete account/ }));

    const confirmBtn = await screen.findByRole("button", { name: /Delete forever/ });
    expect(confirmBtn).toBeDisabled();

    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    await waitFor(() => expect(confirmBtn).not.toBeDisabled());
  });
});
