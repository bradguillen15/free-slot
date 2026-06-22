import { describe, expect, it } from "vitest";
import en from "@/i18n/locales/en";
import es from "@/i18n/locales/es";
import { DEFAULT_CATEGORY_SEED } from "./localStore";
import { defaultLabelKey } from "./categoryLabels";

/** Resolve a dot-path like "labels.defaults.deepWork" against a locale object. */
function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
}

describe("default label translations", () => {
  it("maps every seeded default name to an i18n key", () => {
    for (const seed of DEFAULT_CATEGORY_SEED) {
      expect(defaultLabelKey(seed.name), `no translation key for "${seed.name}"`).not.toBeNull();
    }
  });

  it("English values mirror the canonical names exactly (display is a no-op in English)", () => {
    for (const seed of DEFAULT_CATEGORY_SEED) {
      const key = defaultLabelKey(seed.name)!;
      expect(get(en, key), `en.${key}`).toBe(seed.name);
    }
  });

  it("provides a non-empty Spanish value for every default", () => {
    for (const seed of DEFAULT_CATEGORY_SEED) {
      const key = defaultLabelKey(seed.name)!;
      const value = get(es, key);
      expect(typeof value, `es.${key}`).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
