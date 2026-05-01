import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, CalendarRange, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app",        label: "Day",   icon: Calendar },
  { to: "/app/week",   label: "Week",  icon: CalendarRange },
  { to: "/app/month",  label: "Month", icon: CalendarDays },
];

export function ViewSwitcher({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const activeIdx = items.findIndex((i) =>
    i.to === "/app" ? pathname === "/app" : pathname.startsWith(i.to)
  );

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-full border border-border bg-surface/60 backdrop-blur-md p-1 shadow-soft",
        className
      )}
      role="tablist"
      aria-label="Calendar view"
    >
      {items.map((it, idx) => {
        const isActive = idx === activeIdx;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative z-10 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="viewSwitcherPill"
                className="absolute inset-0 -z-10 rounded-full gradient-primary shadow-glow"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className="h-3.5 w-3.5" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
