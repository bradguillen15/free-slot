// Maps a Supabase auth failure (or any thrown value) to a stable i18n key, so the
// Auth screen can show a human message instead of a raw GoTrue string like
// "over_request_rate_limit". Detection is defensive: it reads status/code/message
// when present and falls back to a generic key for anything unrecognized.
export type AuthErrorKey =
  | "auth.errors.rateLimited"
  | "auth.errors.emailExists"
  | "auth.errors.invalidCredentials"
  | "auth.errors.signupFailed"
  | "auth.errors.generic";

type MaybeAuthError = { status?: unknown; code?: unknown; message?: unknown };

export function mapAuthError(error: unknown): AuthErrorKey {
  const e = (error ?? {}) as MaybeAuthError;
  const status = typeof e.status === "number" ? e.status : undefined;
  const code = typeof e.code === "string" ? e.code.toLowerCase() : "";
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  const haystack = `${code} ${message}`;

  // HTTP 429, or any of GoTrue's rate-limit phrasings. This is the one a user hits
  // when create/delete-testing from a single IP (see [auth.rate_limit] in config.toml).
  if (status === 429 || /rate limit|too many|over_request_rate|over_email_send_rate/.test(haystack)) {
    return "auth.errors.rateLimited";
  }
  // Signing up with an email that already has an account (confirmations disabled).
  if (/already registered|already been registered|user_already_exists|email_exists/.test(haystack)) {
    return "auth.errors.emailExists";
  }
  // Wrong email/password on sign-in.
  if (/invalid login credentials|invalid_credentials/.test(haystack)) {
    return "auth.errors.invalidCredentials";
  }
  // Signup trigger / enum failure surfaced by GoTrue as a 500 on user creation.
  if (/database error saving new user|unexpected_failure/.test(haystack)) {
    return "auth.errors.signupFailed";
  }
  return "auth.errors.generic";
}
