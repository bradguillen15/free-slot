import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import "@/i18n";
import { TourProvider, useTour } from "./TourProvider";
import { TOUR_STEPS } from "./tourSteps";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
let mockProfile: { tour_completed: boolean } | null = { tour_completed: false };

vi.mock("@/lib/dataStore", () => ({
  useProfile: () => ({ data: mockProfile, isLoading: false }),
  useUpdateProfileMutation: () => ({ mutateAsync: (...args: unknown[]) => mockUpdateProfile(...args) }),
}));

function Probe() {
  const { activeStep, stepIndex, start, next, skip, notifyAction } = useTour();
  const location = useLocation();
  return (
    <div>
      <div data-testid="probe-step">{activeStep?.id ?? "none"}</div>
      <div data-testid="probe-index">{stepIndex}</div>
      <div data-testid="probe-path">{location.pathname}</div>
      <button onClick={start}>probe-start</button>
      <button onClick={next}>probe-next</button>
      <button onClick={skip}>probe-skip</button>
      <button onClick={() => notifyAction("apply-schedule")}>probe-action-apply</button>
      <button onClick={() => notifyAction("welcome")}>probe-action-welcome</button>
    </div>
  );
}

function renderTour(initialPath = "/app") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TourProvider>
        <Routes>
          <Route path="/app" element={<Probe />} />
          <Route path="/app/schedule" element={<Probe />} />
        </Routes>
      </TourProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockUpdateProfile.mockClear();
  mockProfile = { tour_completed: false };
});

describe("TourProvider", () => {
  it("auto-starts on /app when tour_completed is false", async () => {
    renderTour();
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome"));
  });

  it("does not auto-start when tour_completed is true", () => {
    mockProfile = { tour_completed: true };
    renderTour();
    expect(screen.getByTestId("probe-step")).toHaveTextContent("none");
  });

  it("navigates to the next step's route when advancing", async () => {
    renderTour();
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome"));
    fireEvent.click(screen.getByText("probe-next"));
    await waitFor(() => {
      expect(screen.getByTestId("probe-step")).toHaveTextContent("apply-schedule");
      expect(screen.getByTestId("probe-path")).toHaveTextContent("/app/schedule");
    });
  });

  it("notifyAction advances only the matching action step", async () => {
    renderTour();
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome"));

    // welcome is a "next" step — its own action id does nothing.
    fireEvent.click(screen.getByText("probe-action-welcome"));
    expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome");
    // a different step's action id does nothing either.
    fireEvent.click(screen.getByText("probe-action-apply"));
    expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome");

    fireEvent.click(screen.getByText("probe-next"));
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("apply-schedule"));
    fireEvent.click(screen.getByText("probe-action-apply"));
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("edit-schedule"));
  });

  it("skip closes the tour and persists tour_completed", async () => {
    renderTour();
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome"));
    fireEvent.click(screen.getByText("probe-skip"));
    expect(screen.getByTestId("probe-step")).toHaveTextContent("none");
    expect(mockUpdateProfile).toHaveBeenCalledWith({ tour_completed: true });
  });

  it("advancing past the last step completes and persists", async () => {
    renderTour();
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome"));
    for (let i = 0; i < TOUR_STEPS.length; i++) {
      fireEvent.click(screen.getByText("probe-next"));
    }
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("none"));
    expect(mockUpdateProfile).toHaveBeenCalledWith({ tour_completed: true });
  });

  it("start restarts the tour even after completion", async () => {
    mockProfile = { tour_completed: true };
    renderTour();
    expect(screen.getByTestId("probe-step")).toHaveTextContent("none");
    fireEvent.click(screen.getByText("probe-start"));
    await waitFor(() => expect(screen.getByTestId("probe-step")).toHaveTextContent("welcome"));
  });
});
