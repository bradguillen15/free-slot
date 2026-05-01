import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Cloud, X, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasGuestData } from "@/lib/localStore";

const DISMISS_KEY = "freeslot.guestBanner.dismissed";

export function GuestBanner() {
  const { user, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    setDismissed(typeof window !== "undefined" && !!localStorage.getItem(DISMISS_KEY));
    const refresh = () => setHasData(hasGuestData());
    refresh();
    window.addEventListener("freeslot:guest-change", refresh);
    return () => window.removeEventListener("freeslot:guest-change", refresh);
  }, []);

  if (loading || user || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
    >
      <div className="px-4 md:px-6 py-2.5 flex items-center gap-3 max-w-[1400px] mx-auto">
        <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Cloud className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-medium">You're using FreeSlot as a guest.</span>
          <span className="text-muted-foreground hidden sm:inline">
            {" "}{hasData ? "Create a free account to keep your data, sync across devices, and unlock AI plans + dashboards." : "Create an account to sync across devices and unlock AI plans + dashboards."}
          </span>
        </div>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity shrink-0"
        >
          <Sparkles className="h-3 w-3" />
          Create account
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
