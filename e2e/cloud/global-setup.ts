import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Global setup for the cloud E2E lane.
 *
 * Brings up the local Supabase stack, resets it to a clean migrated schema, and
 * captures the local URL + service-role key so the auth fixture can make
 * RLS-bypassing assertions against Postgres. Writes them to
 * `e2e/cloud/.supabase-status.json` (gitignored).
 *
 * Skips entirely when `SKIP_CLOUD_E2E=1`. Fails fast with an actionable message
 * when Docker is not running — the pre-push hook gates on Docker before calling
 * this, so an interactive `pnpm test:e2e:cloud` is the only path that reaches the
 * hard error.
 */

export const STATUS_FILE = join(__dirname, ".supabase-status.json");

// The committed anon key in `.env.e2e-cloud`. Validated below so a CLI upgrade
// that changes the local demo keys surfaces a clear failure instead of opaque
// 401s inside the browser.
const EXPECTED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function dockerRunning(): boolean {
  try {
    sh("docker", ["info"]);
    return true;
  } catch {
    return false;
  }
}

function supabaseStatusJson(): Record<string, string> | null {
  try {
    const out = sh("supabase", ["status", "-o", "json"]);
    return JSON.parse(out);
  } catch {
    return null;
  }
}

export default async function globalSetup(): Promise<void> {
  if (process.env.SKIP_CLOUD_E2E === "1") {
    console.log("[cloud-e2e] SKIP_CLOUD_E2E=1 — skipping Supabase setup.");
    return;
  }

  if (!dockerRunning()) {
    throw new Error(
      "[cloud-e2e] Docker is not running. Start Docker Desktop, then re-run " +
        "`pnpm test:e2e:cloud`. (Set SKIP_CLOUD_E2E=1 to skip the cloud lane.)",
    );
  }

  // Start (idempotent — a no-op message if already up) and reset to a clean,
  // migrated schema. Seeding is disabled in supabase/config.toml.
  let status = supabaseStatusJson();
  if (!status) {
    console.log("[cloud-e2e] Starting Supabase…");
    sh("supabase", ["start"]);
  }
  console.log("[cloud-e2e] Resetting database (re-applying migrations)…");
  sh("supabase", ["db", "reset"]);

  status = supabaseStatusJson();
  if (!status) throw new Error("[cloud-e2e] `supabase status` returned no data after start.");

  const apiUrl = status.API_URL ?? status.api_url;
  const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.service_role_key;
  const anonKey = status.ANON_KEY ?? status.anon_key;
  if (!apiUrl || !serviceRoleKey) {
    throw new Error("[cloud-e2e] Could not read API_URL / SERVICE_ROLE_KEY from `supabase status`.");
  }

  if (anonKey && anonKey !== EXPECTED_ANON_KEY) {
    throw new Error(
      "[cloud-e2e] Local anon key from `supabase status` does not match the one " +
        "committed in .env.e2e-cloud. Update VITE_SUPABASE_PUBLISHABLE_KEY (and " +
        "EXPECTED_ANON_KEY in global-setup.ts) to:\n" +
        anonKey,
    );
  }

  writeFileSync(
    STATUS_FILE,
    JSON.stringify({ apiUrl, serviceRoleKey, anonKey: anonKey ?? EXPECTED_ANON_KEY }, null, 2),
  );
  console.log(`[cloud-e2e] Supabase ready at ${apiUrl}.`);
}
