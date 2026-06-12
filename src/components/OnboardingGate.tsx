import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ensureBootstrap, getProfile } from "@/lib/localStore";

/**
 * Routes onboarding flow for both signed-in users and guests.
 *  - Signed-in: reads `profiles.onboarding_completed`.
 *  - Guests: reads localStorage profile.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "done" | "needs">("loading");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Guest mode — bootstrap defaults & read local profile
      ensureBootstrap();
      const p = getProfile();
      setStatus(p.onboarding_completed ? "done" : "needs");
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setStatus(data?.onboarding_completed ? "done" : "needs");
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  if (loading || status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (status === "needs" && !location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
  }
  if (status === "done" && location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
