import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import { STATUS_FILE } from "../global-setup";

// Reuse the guest fixture's `test` (English-locale init script) and seeding helpers.
export {
  test,
  expect,
  seedGuest,
  readGuestProfile,
  readGuestScheduleBlocks,
  readGuestActivities,
} from "../../fixtures/guest";

const DEFAULT_PASSWORD = "e2e-password-123";

/** A fresh, collision-proof email so each test owns an isolated (RLS-scoped) dataset. */
export function uniqueEmail(): string {
  return `e2e+${randomUUID()}@example.com`;
}

type SupabaseStatus = { apiUrl: string; serviceRoleKey: string; anonKey: string };

function readStatus(): SupabaseStatus {
  try {
    return JSON.parse(readFileSync(STATUS_FILE, "utf8")) as SupabaseStatus;
  } catch {
    throw new Error(
      "[cloud-e2e] Missing .supabase-status.json — global setup did not run. " +
        "Run via `pnpm test:e2e:cloud`.",
    );
  }
}

/**
 * Service-role Supabase client for in-test assertions/cleanup. Bypasses RLS, so
 * tests can read any user's rows directly from Postgres. Never used by the app
 * under test — only by the test process.
 */
export function serviceClient(): SupabaseClient {
  const { apiUrl, serviceRoleKey } = readStatus();
  return createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resolve a user's id from their email via the auto-created profile row. */
export async function userIdByEmail(email: string): Promise<string> {
  const { data, error } = await serviceClient()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  if (error) throw new Error(`[cloud-e2e] No profile for ${email}: ${error.message}`);
  return (data as { id: string }).id;
}

export type Credentials = { email: string; password: string };

async function waitForLeftAuth(page: Page): Promise<void> {
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 15_000 });
}

/**
 * Sign up a brand-new user through the real Auth form. Local Supabase auto-confirms
 * signups, so the user is logged in immediately. Returns the credentials and the
 * new user's id. With no guest data present, the gate lands them on `/onboarding`.
 */
export async function signUp(
  page: Page,
  opts: Partial<Credentials> & { expectMigrateDialog?: boolean } = {},
): Promise<Credentials & { userId: string }> {
  const email = opts.email ?? uniqueEmail();
  const password = opts.password ?? DEFAULT_PASSWORD;

  await page.goto("/auth?mode=signup");
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();

  if (opts.expectMigrateDialog) {
    // Signup succeeded once the migrate prompt appears; only then is the profile row
    // guaranteed to exist for userIdByEmail.
    await page.getByTestId("migrate-import").waitFor({ state: "visible" });
  } else {
    await waitForLeftAuth(page);
  }
  const userId = await userIdByEmail(email);
  return { email, password, userId };
}

/** Sign in an existing user through the real Auth form. */
export async function signIn(page: Page, creds: Credentials): Promise<void> {
  await page.goto("/auth");
  await page.getByTestId("auth-email").fill(creds.email);
  await page.getByTestId("auth-password").fill(creds.password);
  await page.getByTestId("auth-submit").click();
  await waitForLeftAuth(page);
}
