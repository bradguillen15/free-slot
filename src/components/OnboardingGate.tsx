import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/lib/dataStore";

/**
 * Routes onboarding flow for both signed-in users and guests.
 *  - Signed-in: reads profile via useProfile (resources layer).
 *  - Guests: reads localStorage profile via useProfile.
 * Passes through when either flag is true; redirects to /onboarding only when both are false.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const location = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (loading || profileLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const done = !!(profile?.onboarding_completed || profile?.onboarding_skipped);
  const isSetupRoute = location.pathname.startsWith("/app/schedule") || location.pathname.startsWith("/app/activities");
  if (!done && !location.pathname.startsWith("/onboarding") && !isSetupRoute) {
    return <Navigate to="/onboarding" replace />;
  }
  if (done && location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
