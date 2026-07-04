export type SupportedLocale = "en" | "es";

/** Normalizes an i18next language tag (e.g. "es-MX", "es") to a supported AI-prompt locale, matching the prefix-match convention already used by LanguageSwitcher. Defaults to "en" for anything else. */
export function toSupportedLocale(language: string | undefined): SupportedLocale {
  return language?.startsWith("es") ? "es" : "en";
}
