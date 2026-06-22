import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

/**
 * Display-time translation for the seeded default labels.
 *
 * Default category names are stored as their canonical English strings and act
 * as stable identifiers (guest→cloud migration, default top-up, cloud seed
 * parity). We therefore never translate the stored name — only the name shown
 * to the user. This map points each canonical name at its i18n key under
 * `labels.defaults.*`; the English values mirror the canonical names exactly,
 * so translation is a no-op in English and only changes other locales.
 */
const DEFAULT_LABEL_KEYS: Record<string, string> = {
  "Deep work": "labels.defaults.deepWork",
  "Reading": "labels.defaults.reading",
  "Exercise": "labels.defaults.exercise",
  "Study": "labels.defaults.study",
  "Creative work": "labels.defaults.creativeWork",
  "Side project": "labels.defaults.sideProject",
  "Sleep": "labels.defaults.sleep",
  "Meals": "labels.defaults.meals",
  "Chores & errands": "labels.defaults.choresErrands",
  "Social media": "labels.defaults.socialMedia",
  "Gaming": "labels.defaults.gaming",
  "Movies & series": "labels.defaults.moviesSeries",
  "Anime": "labels.defaults.anime",
  "Idle": "labels.defaults.idle",
};

/** i18n key for a canonical default-label name, or null for custom labels. */
export function defaultLabelKey(name: string): string | null {
  return DEFAULT_LABEL_KEYS[name] ?? null;
}

/** Translate a category name for display; custom names pass through unchanged. */
export function translateCategoryName(name: string, t: TFunction): string {
  const key = DEFAULT_LABEL_KEYS[name];
  // `defaultValue` keeps the canonical name when i18n is uninitialized (tests)
  // or the key is missing, so display never falls back to a raw key string.
  return key ? t(key, { defaultValue: name }) : name;
}

/** Hook returning a `(name) => displayName` translator bound to the active locale. */
export function useCategoryName(): (name: string) => string {
  const { t } = useTranslation();
  return (name: string) => translateCategoryName(name, t);
}
