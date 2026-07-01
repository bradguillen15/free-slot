import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Forbidden from "@/pages/Forbidden";

/** Requires an authenticated user. Shows the Forbidden page otherwise. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Forbidden />;
  return <>{children}</>;
}
