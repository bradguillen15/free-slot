// Confirmation links must return to /auth (not /app) so the post-confirmation
// session is handled by the Auth page, which runs the guest-data migration flow.
export function signUpRedirectTo() {
  return `${window.location.origin}/auth`;
}

// Password-recovery links land on /reset-password, which sets the new password
// using the recovery session Supabase establishes from the link.
export function resetPasswordRedirectTo() {
  return `${window.location.origin}/reset-password`;
}

export const RESEND_COOLDOWN_SECONDS = 30;
