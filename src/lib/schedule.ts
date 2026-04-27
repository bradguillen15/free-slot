export const DAYS = [
  { idx: 0, short: "Sun", label: "Sunday" },
  { idx: 1, short: "Mon", label: "Monday" },
  { idx: 2, short: "Tue", label: "Tuesday" },
  { idx: 3, short: "Wed", label: "Wednesday" },
  { idx: 4, short: "Thu", label: "Thursday" },
  { idx: 5, short: "Fri", label: "Friday" },
  { idx: 6, short: "Sat", label: "Saturday" },
];

export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKEND = [0, 6];

export const BLOCK_PRESETS = [
  { name: "Sleep",   start: "23:00", end: "07:00", days: [0,1,2,3,4,5,6], color: "#6366f1", type: "fixed" as const },
  { name: "Work",    start: "09:00", end: "17:00", days: WEEKDAYS,        color: "#3b82f6", type: "fixed" as const },
  { name: "Gym",     start: "18:00", end: "19:00", days: [1,3,5],         color: "#10b981", type: "fixed" as const },
  { name: "Commute", start: "08:30", end: "09:00", days: WEEKDAYS,        color: "#94a3b8", type: "fixed" as const },
  { name: "Lunch",   start: "12:30", end: "13:00", days: WEEKDAYS,        color: "#f59e0b", type: "fixed" as const },
  { name: "Dinner",  start: "19:30", end: "20:30", days: [0,1,2,3,4,5,6], color: "#f59e0b", type: "fixed" as const },
];

export const ACTIVITY_PRESETS = [
  "Reading", "Meditation", "Side project", "Exercise", "Study", "Writing", "Learning",
];
