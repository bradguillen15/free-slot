import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY_SEED } from "./localStore";

const MIGRATIONS_DIR = resolve(__dirname, "../../supabase/migrations");

const SIGNUP_INSERT =
  /INSERT INTO public\.categories \(user_id, name, type, color, is_default, hidden\) VALUES\s*\(\s*NEW\.id,[\s\S]*?;/;

/**
 * Resolve the latest migration that (re)defines handle_new_user() with a category
 * seed INSERT. Hardcoding a filename silently tests stale SQL once a newer migration
 * redefines the trigger (R-TEST-4) — so always pick the most recent one.
 */
function latestSignupMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse();
  for (const f of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, f), "utf8");
    if (/handle_new_user/.test(sql) && SIGNUP_INSERT.test(sql)) return sql;
  }
  throw new Error("No migration defines handle_new_user() with a category seed INSERT");
}

/** Parse (name, type, color) tuples from the handle_new_user() signup INSERT. */
function parseCloudSignupDefaults(sql: string) {
  const block = sql.match(SIGNUP_INSERT)?.[0];
  if (!block) throw new Error("Could not find signup category INSERT in migration");
  const rows: { name: string; type: string; color: string }[] = [];
  const re = /\(\s*NEW\.id,\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*true,\s*false\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    rows.push({ name: m[1], type: m[2], color: m[3] });
  }
  return rows;
}

describe("DEFAULT_CATEGORY_SEED sync", () => {
  it("matches handle_new_user() defaults in the latest migration", () => {
    const cloud = parseCloudSignupDefaults(latestSignupMigration());
    expect(cloud).toHaveLength(DEFAULT_CATEGORY_SEED.length);
    for (const seed of DEFAULT_CATEGORY_SEED) {
      const row = cloud.find((c) => c.name === seed.name);
      expect(row, `missing cloud default for "${seed.name}"`).toBeDefined();
      expect(row!.type).toBe(seed.type);
      expect(row!.color.toLowerCase()).toBe(seed.color.toLowerCase());
    }
  });
});
