import { execFileSync } from "node:child_process";

/**
 * Global teardown for the cloud E2E lane.
 *
 * Stops the local Supabase stack when the Playwright run finishes (pass, fail,
 * or interrupt). Skips when `SKIP_CLOUD_E2E=1`.
 */

export default async function globalTeardown(): Promise<void> {
  if (process.env.SKIP_CLOUD_E2E === "1") {
    console.log("[cloud-e2e] SKIP_CLOUD_E2E=1 — skipping Supabase teardown.");
    return;
  }

  console.log("[cloud-e2e] Stopping local Supabase…");
  try {
    execFileSync("supabase", ["stop"], { stdio: "inherit" });
    console.log("[cloud-e2e] Local Supabase stopped.");
  } catch {
    console.warn("[cloud-e2e] Supabase stop failed (stack may already be stopped).");
  }
}
