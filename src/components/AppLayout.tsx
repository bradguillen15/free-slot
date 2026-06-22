import { Link, useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Calendar, BarChart3, Target, Settings, LogOut, CalendarRange, CalendarDays, Clock, LogIn, Lock, Menu, Tag, StickyNote } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { CALENDAR_PAGE_SHELL, CALENDAR_PAGE_SHELL_FILL, isCalendarRoute } from "@/components/calendar/calendarLayout";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { GuestBanner } from "@/components/GuestBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";


const navItems = [
  { to: "/app", labelKey: "nav.day", icon: Calendar, requiresAuth: false },
  { to: "/app/week", labelKey: "nav.week", icon: CalendarRange, requiresAuth: false },
  { to: "/app/month", labelKey: "nav.month", icon: CalendarDays, requiresAuth: false },
  { to: "/app/schedule", labelKey: "nav.schedule", icon: Clock, requiresAuth: false },
  { to: "/app/notes", labelKey: "nav.notes", icon: StickyNote, requiresAuth: false },
  { to: "/app/labels", labelKey: "nav.labels", icon: Tag, requiresAuth: false },
  { to: "/app/dashboard", labelKey: "nav.dashboard", icon: BarChart3, requiresAuth: false },
  { to: "/app/activities", labelKey: "nav.activities", icon: Target, requiresAuth: false },
  { to: "/app/settings", labelKey: "nav.settings", icon: Settings, requiresAuth: true },
];


/** Single shell; child routes fade in on navigation (no exit fade — avoids double-blink). */
export function AppLayoutOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const isCalendar = isCalendarRoute(location.pathname);
  const isDayRoute = location.pathname === "/app";
  // The Labels board fills the viewport (like the Day view) so the page itself
  // never scrolls — its columns scroll internally instead.
  const isLabelsRoute = location.pathname.startsWith("/app/labels");
  const fillViewport = isDayRoute || isLabelsRoute;

  const animatedOutlet = (
    <AnimatePresence initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={fillViewport ? CALENDAR_PAGE_SHELL_FILL : undefined}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <AppLayout fillViewport={fillViewport}>
      {isCalendar ? (
        <div className={cn(CALENDAR_PAGE_SHELL, isDayRoute && CALENDAR_PAGE_SHELL_FILL)}>
          <div className="pt-5 pb-3">
            <ViewSwitcher />
          </div>
          {animatedOutlet}
        </div>
      ) : (
        animatedOutlet
      )}
    </AppLayout>
  );
}

export function AppLayout({
  children,
  fillViewport = false,
}: {
  children: React.ReactNode;
  fillViewport?: boolean;
}) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { t } = useTranslation();
  const isGuest = !user;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-6 py-7">
          <Link to="/app" className="flex items-center gap-2 group">
            <BrandLogo size={32} className="rounded-lg shadow-glow" />
            <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
          </Link>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1">
          {navItems.map(({ to, labelKey, icon: Icon, requiresAuth }) => {
            const active = to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(to);
            const locked = isGuest && requiresAuth;
            const target = locked ? "/auth" : to;
            return (
              <Link
                key={to}
                to={target}
                className="block"
                aria-current={active ? "page" : undefined}
                data-testid={`nav-link-${labelKey.split(".")[1]}`}
              >
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
                  <span className="flex-1">{t(labelKey)}</span>
                  {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </motion.div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-1"><LanguageSwitcher /></div>
          {user ? (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t("common.signOut")}
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm gradient-primary text-primary-foreground font-medium hover:opacity-90 shadow-glow transition-opacity"
            >
              <LogIn className="h-4 w-4" />
              {t("nav.signInCreate")}
            </Link>
          )}
        </div>
      </aside>

      <main className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Mobile header: logo + hamburger (top-right), replaces the old bottom bar */}
        <header className="md:hidden shrink-0 z-40 flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-background/95 backdrop-blur-md">
          <Link to="/app" className="flex items-center gap-2">
            <BrandLogo size={28} className="rounded-lg shadow-glow" />
            <span className="font-display text-base font-semibold tracking-tight">FreeSlot</span>
          </Link>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("nav.menu")}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground hover:bg-muted/60 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-sidebar border-sidebar-border p-0 flex flex-col">
              <div className="px-5 py-5 border-b border-sidebar-border">
                <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
              </div>
              <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                {navItems.map(({ to, labelKey, icon: Icon, requiresAuth }) => {
                  const active = to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(to);
                  const locked = isGuest && requiresAuth;
                  const target = locked ? "/auth" : to;
                  return (
                    <Link
                      key={to}
                      to={target}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      data-testid={`nav-link-mobile-${labelKey.split(".")[1]}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                        locked && "opacity-70"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{t(labelKey)}</span>
                      {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-sidebar-border space-y-2">
                <div className="px-1"><LanguageSwitcher /></div>
                {user ? (
                  <>
                    <div className="px-3 py-1 text-xs text-muted-foreground truncate">{user.email}</div>
                    <button
                      onClick={() => { setMenuOpen(false); signOut(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("common.signOut")}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm gradient-primary text-primary-foreground font-medium hover:opacity-90 shadow-glow transition-opacity"
                  >
                    <LogIn className="h-4 w-4" />
                    {t("nav.signInCreate")}
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="shrink-0">
          <GuestBanner />
        </div>
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto",
            fillViewport && "lg:overflow-hidden lg:flex lg:flex-col"
          )}
          data-testid="app-scroll-region"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
