import { supabase } from "@/integrations/supabase/client";

/** Set a new password for the currently-authenticated (or recovery) session. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
