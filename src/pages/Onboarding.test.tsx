import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";

// ── Auth mock ──────────────────────────────────────────────────────────────
const authState = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, session: null, loading: authState.loading, signOut: vi.fn() }),
}));

// ── Supabase mock ──────────────────────────────────────────────────────────
vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});
import { resetSupabaseMock } from "@/test/supabaseMock";

// ── react-router-dom navigate mock ────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── i18n mock ─────────────────────────────────────────────────────────────
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "onboarding.steps.schedule": "Schedule",
        "onboarding.steps.activities": "Activities",
        "onboarding.steps.preferences": "Preferences",
        "onboarding.schedule.title": "Map your week",
        "onboarding.schedule.subtitle": "Add things that happen on repeat.",
        "onboarding.schedule.countLabel_zero": "No blocks yet",
        "onboarding.schedule.countLabel_one": `${opts?.count} block added`,
        "onboarding.schedule.countLabel_other": `${opts?.count} blocks added`,
        "onboarding.schedule.cta": "Set up on Schedule page",
        "onboarding.activities.title": "What do you want time for?",
        "onboarding.activities.subtitle": "Pick activities you keep meaning to do.",
        "onboarding.activities.countLabel_zero": "No activities yet",
        "onboarding.activities.countLabel_one": `${opts?.count} activity added`,
        "onboarding.activities.countLabel_other": `${opts?.count} activities added`,
        "onboarding.activities.cta": "Set up on Activities page",
        "onboarding.preferences.title": "A few preferences",
        "onboarding.preferences.subtitle": "Tune how FreeSlot finds gaps.",
        "onboarding.preferences.peak": "Peak focus hours",
        "onboarding.preferences.peakHint": "deep activities prefer this window",
        "onboarding.preferences.weekends": "Schedule on weekends",
        "onboarding.preferences.weekendsHint": "Include Sat and Sun",
        "onboarding.preferences.reviewDay": "Weekly review day",
        "onboarding.skip": "Skip for now",
        "onboarding.allSet": "You're all set",
        "common.back": "Back",
        "common.continue": "Continue",
        "common.finish": "Finish",
        "common.somethingWrong": "Something went wrong",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

// ── dataStore hooks mock ───────────────────────────────────────────────────
const mockBlocks = vi.hoisted(() => ({ data: [] as { id: string }[] }));
const mockActivities = vi.hoisted(() => ({ data: [] as { id: string; is_active: boolean }[] }));
const mockProfile = vi.hoisted(() => ({ data: null as null | { include_weekends: boolean; weekly_review_day: number } }));
const mockUpdateProfile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/dataStore", () => ({
  useScheduleBlocks: () => ({ data: mockBlocks.data }),
  useActivities: () => ({ data: mockActivities.data, refresh: vi.fn() }),
  useVisibleCategories: () => ({ data: [], all: [], refresh: vi.fn() }),
  useProfile: () => ({ data: mockProfile.data }),
  updateProfile: mockUpdateProfile,
}));

// The schedule/activity editors are heavy, separately-tested components. Onboarding's
// contract is only that it embeds them, so we stub them with lightweight markers.
vi.mock("@/components/schedule/ScheduleEditor", () => ({
  ScheduleEditor: () => <div data-testid="schedule-editor" />,
}));
vi.mock("@/components/activities/ActivityEditor", () => ({
  ActivityEditor: (props: { userId: string | null }) => (
    <div data-testid="activity-editor" data-user-id={String(props.userId)} />
  ),
}));

// ── localStore mock ────────────────────────────────────────────────────────
vi.mock("@/lib/localStore", () => ({
  ensureBootstrap: vi.fn(),
}));

import Onboarding from "./Onboarding";

function render() {
  return renderWithProviders(<Onboarding />, { route: "/onboarding" });
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  mockNavigate.mockReset();
  mockUpdateProfile.mockReset();
  authState.user = null;
  authState.loading = false;
  mockBlocks.data = [];
  mockActivities.data = [];
  mockProfile.data = null;
});

describe("Skip button", () => {
  it("is always visible on step 0", () => {
    render();
    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });

  it("sets onboarding_skipped and navigates for guest", async () => {
    render();
    fireEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith("guest", null, { onboarding_skipped: true });
      expect(mockNavigate).toHaveBeenCalledWith("/app", { replace: true });
    });
  });

  it("calls updateProfile for authenticated user", async () => {
    authState.user = { id: "u1" };
    render();
    fireEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith("cloud", "u1", { onboarding_skipped: true });
      expect(mockNavigate).toHaveBeenCalledWith("/app", { replace: true });
    });
  });
});

describe("Step 1 — embedded schedule editor", () => {
  it("renders the shared ScheduleEditor in-flow", () => {
    render();
    expect(screen.getByTestId("schedule-editor")).toBeInTheDocument();
  });

  it("Continue is always enabled regardless of block count", () => {
    render();
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).not.toBeDisabled();
  });
});

describe("Step 2 — embedded activity editor", () => {
  it("renders the shared ActivityEditor in-flow", async () => {
    render();
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByTestId("activity-editor")).toBeInTheDocument());
  });

  it("passes the guest userId (null) to the editor", async () => {
    render();
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() =>
      expect(screen.getByTestId("activity-editor")).toHaveAttribute("data-user-id", "null"),
    );
  });
});

describe("Step 3 — preferences pre-population", () => {
  it("shows preferences step with include weekends toggle", async () => {
    mockProfile.data = { include_weekends: false, weekly_review_day: 0 };
    render();
    // Navigate to step 3
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("A few preferences")).toBeInTheDocument());
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("renders preferences step when profile has no values", async () => {
    render();
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("A few preferences")).toBeInTheDocument());
    expect(screen.getByText("Schedule on weekends")).toBeInTheDocument();
  });
});

describe("finish() — profile only, no block/activity inserts", () => {
  it("calls updateProfile with preferences and onboarding_completed for guest", async () => {
    render();
    // Navigate to step 3
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Finish")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Finish"));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        "guest",
        null,
        expect.objectContaining({ onboarding_completed: true })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/app", { replace: true });
    });
  });

  it("calls updateProfile with cloud mode for authenticated user", async () => {
    authState.user = { id: "u1" };
    render();
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Finish")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Finish"));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        "cloud",
        "u1",
        expect.objectContaining({ onboarding_completed: true })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/app", { replace: true });
    });
  });
});
