import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, BarChart3, Target, Settings, LogOut, Sparkles, CalendarRange, LogIn, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { GuestBanner } from "@/components/GuestBanner";

const nav = [
  { to: "/app", label: "Day", icon: Calendar, requiresAuth: false },
  { to: "/app/week", label: "Week", icon: CalendarRange, requiresAuth: false },
  { to: "/app/dashboard", label: "Dashboard", icon: BarChart3, requiresAuth: true },
  { to: "/app/activities", label: "Activities", icon: Target, requiresAuth: false },
  { to: "/app/settings", label: "Settings", icon: Settings, requiresAuth: true },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isGuest = !user;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-6 py-7">
          <Link to="/app" className="flex items-center gap-2 group">
            <div className="relative h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, requiresAuth }) => {
            const active = to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(to);
            const locked = isGuest && requiresAuth;
            const target = locked ? "/auth" : to;
            return (
              <Link key={to} to={target} className="block">
                <motion.div
                  whileHover={{ x: 2 }}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    locked && "opacity-70"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{label}</span>
                  {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </motion.div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          {user ? (
            <>
              <div className="px-3 py-2 mb-1 text-xs text-muted-foreground truncate">{user.email}</div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm gradient-primary text-primary-foreground font-medium hover:opacity-90 shadow-glow transition-opacity"
            >
              <LogIn className="h-4 w-4" />
              Sign in / Create account
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">
        <GuestBanner />
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5">
          {nav.map(({ to, label, icon: Icon, requiresAuth }) => {
            const active = to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(to);
            const locked = isGuest && requiresAuth;
            const target = locked ? "/auth" : to;
            return (
              <li key={to}>
                <Link
                  to={target}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="mobileNavIndicator"
                      className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {locked && (
                      <Lock className="absolute -right-1.5 -top-1 h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </span>
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
