import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY_SEED } from "./localStore";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260612130000_category_hidden_and_label_defaults.sql"
);

/** Parse (name, type, color) tuples from handle_new_user() in the migration SQL. */
function parseCloudSignupDefaults(sql: string) {
  const block = sql.match(
    /INSERT INTO public\.categories \(user_id, name, type, color, is_default, hidden\) VALUES([\s\S]*?);/
  )?.[1];
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
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    const cloud = parseCloudSignupDefaults(sql);
    expect(cloud).toHaveLength(DEFAULT_CATEGORY_SEED.length);
    for (const seed of DEFAULT_CATEGORY_SEED) {
      const row = cloud.find((c) => c.name === seed.name);
      expect(row, `missing cloud default for "${seed.name}"`).toBeDefined();
      expect(row!.type).toBe(seed.type);
      expect(row!.color.toLowerCase()).toBe(seed.color.toLowerCase());
    }
  });
});
