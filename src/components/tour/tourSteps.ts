export type TourStep = {
  id: string;
  route: string;
  anchorId: string;
  titleKey: string;
  bodyKey: string;
  /** "action" steps also auto-advance when notifyAction(id) fires; Next always works. */
  advanceOn: "next" | "action";
};

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome", route: "/app", anchorId: "day-view", titleKey: "tour.welcome.title", bodyKey: "tour.welcome.body", advanceOn: "next" },
  { id: "apply-schedule", route: "/app/schedule", anchorId: "apply-suggested", titleKey: "tour.applySchedule.title", bodyKey: "tour.applySchedule.body", advanceOn: "action" },
  { id: "edit-schedule", route: "/app/schedule", anchorId: "schedule-blocks", titleKey: "tour.editSchedule.title", bodyKey: "tour.editSchedule.body", advanceOn: "next" },
  { id: "confirm-day", route: "/app", anchorId: "confirm-day", titleKey: "tour.confirmDay.title", bodyKey: "tour.confirmDay.body", advanceOn: "action" },
  { id: "wrap-up", route: "/app", anchorId: "day-view", titleKey: "tour.wrapUp.title", bodyKey: "tour.wrapUp.body", advanceOn: "next" },
];
