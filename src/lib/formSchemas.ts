import { z } from "zod";

/**
 * Shared zod building blocks for react-hook-form forms.
 * Per-form schemas are colocated with their component; reusable primitives and
 * cross-used schemas live here. See docs/rhf-migration-plan.md and docs/conventions.md.
 */

/** 24-hour `HH:MM` time, matching the value emitted by `<input type="time">`. */
export const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

/** 6-digit hex color (`#rrggbb`), matching `<input type="color">`. */
export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color");

export const labelType = z.enum(["productive", "unproductive"]);

/**
 * Planner preferences — shared by SettingsPage ("Planner preferences") and
 * Onboarding step 3. `peakStart`/`peakEnd` map to `peak_hours.{start,end}`.
 */
export const plannerPrefsSchema = z.object({
  peakStart: timeString,
  peakEnd: timeString,
  includeWeekends: z.boolean(),
  weeklyReviewDay: z.number().int().min(0).max(6),
});

export type PlannerPrefsValues = z.infer<typeof plannerPrefsSchema>;
