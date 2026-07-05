import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, useProfile } from "@/lib/dataStore";
import { TOUR_STEPS, type TourStep } from "./tourSteps";
import { TourBubble } from "./TourBubble";

type TourContextValue = {
  activeStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  skip: () => void;
  notifyAction: (stepId: string) => void;
};

const noop = () => {};
const TourContext = createContext<TourContextValue>({
  activeStep: null,
  stepIndex: -1,
  totalSteps: TOUR_STEPS.length,
  start: noop,
  next: noop,
  skip: noop,
  notifyAction: noop,
});

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const mode = user ? "cloud" : "guest";
  const userId = user?.id ?? null;
  const { data: profile, isLoading } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const [stepIndex, setStepIndex] = useState(-1);
  const autoStartedRef = useRef(false);

  const activeStep = stepIndex >= 0 && stepIndex < TOUR_STEPS.length ? TOUR_STEPS[stepIndex] : null;

  const markCompleted = useCallback(() => {
    // Fire-and-forget: a failed write only means the tour may auto-start again.
    updateProfile(mode, userId, { tour_completed: true }).catch(() => {});
  }, [mode, userId]);

  const start = useCallback(() => setStepIndex(0), []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i < 0) return i;
      if (i >= TOUR_STEPS.length - 1) {
        markCompleted();
        return -1;
      }
      return i + 1;
    });
  }, [markCompleted]);

  const skip = useCallback(() => {
    setStepIndex(-1);
    markCompleted();
  }, [markCompleted]);

  const notifyAction = useCallback(
    (stepId: string) => {
      const step = stepIndex >= 0 ? TOUR_STEPS[stepIndex] : null;
      if (step && step.id === stepId && step.advanceOn === "action") next();
    },
    [stepIndex, next]
  );

  useEffect(() => {
    if (autoStartedRef.current || isLoading || !profile) return;
    if (!profile.tour_completed && location.pathname.startsWith("/app")) {
      autoStartedRef.current = true;
      setStepIndex(0);
    }
  }, [isLoading, profile, location.pathname]);

  // The tour drives navigation itself — bubbles anchor to page content, never
  // to nav links (mobile nav lives inside a closed sheet).
  useEffect(() => {
    if (activeStep && location.pathname !== activeStep.route) {
      navigate(activeStep.route);
    }
  }, [activeStep, location.pathname, navigate]);

  return (
    <TourContext.Provider
      value={{ activeStep, stepIndex, totalSteps: TOUR_STEPS.length, start, next, skip, notifyAction }}
    >
      {children}
      {activeStep && location.pathname === activeStep.route && (
        <TourBubble
          step={activeStep}
          stepIndex={stepIndex}
          totalSteps={TOUR_STEPS.length}
          isLast={stepIndex === TOUR_STEPS.length - 1}
          onNext={next}
          onSkip={skip}
        />
      )}
    </TourContext.Provider>
  );
}
