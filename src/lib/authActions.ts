import { supabase } from "@/integrations/supabase/client";

/** Set a new password for the currently-authenticated (or recovery) session. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Thrown when the supplied current password fails re-authentication. */
export class IncorrectCurrentPasswordError extends Error {
  constructor() {
    super("Incorrect current password");
    this.name = "IncorrectCurrentPasswordError";
  }
}

/**
 * Change the password after confirming the user knows the current one.
 * Supabase has no native reauth check, so we verify by re-signing in with the
 * current password before applying the update.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data, error: getUserError } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (getUserError || !email) throw getUserError ?? new Error("No authenticated user");

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (reauthError) throw new IncorrectCurrentPasswordError();

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
