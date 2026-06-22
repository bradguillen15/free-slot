import { z } from "zod";
import type { TFunction } from "i18next";

/**
 * Shared zod building blocks for react-hook-form forms.
 * Per-form schemas are colocated with their component; reusable primitives and
 * cross-used schemas live here. See docs/rhf-migration-plan.md and docs/conventions.md.
 *
 * Primitives are `t`-aware factories so validation messages stay translated.
 * Build them inside a `useMemo(() => ..., [t])` alongside the owning schema.
 */

/** 24-hour `HH:MM` time, matching the value emitted by `<input type="time">`. */
export const timeString = (t: TFunction) => z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, t("validation.useHHMM"));

/** 6-digit hex color (`#rrggbb`), matching `<input type="color">`. */
export const hexColor = (t: TFunction) => z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, t("validation.useHexColor"));

export const labelType = z.enum(["productive", "unproductive", "essential"]);

/** Planner preferences — shared by SettingsPage and Onboarding step 3. */
export const plannerPrefsSchema = z.object({
  includeWeekends: z.boolean(),
  weeklyReviewDay: z.number().int().min(0).max(6),
});

export type PlannerPrefsValues = z.infer<typeof plannerPrefsSchema>;
