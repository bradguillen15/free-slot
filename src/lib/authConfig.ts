// Password-recovery links land on /reset-password, which sets the new password
// using the recovery session Supabase establishes from the link.
export function resetPasswordRedirectTo() {
  return `${window.location.origin}/reset-password`;
}
