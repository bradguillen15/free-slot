import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, CalendarRange, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app",        labelKey: "nav.day",   icon: Calendar },
  { to: "/app/week",   labelKey: "nav.week",  icon: CalendarRange },
  { to: "/app/month",  labelKey: "nav.month", icon: CalendarDays },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function viewHref(base: string, search: string): string {
  const params = new URLSearchParams(search);
  const date = params.get("date");
  const week = params.get("week");
  const q = new URLSearchParams();
  if (base === "/app" && date && ISO.test(date)) q.set("date", date);
  if (base === "/app/week") {
    if (week && ISO.test(week)) q.set("week", week);
    else if (date && ISO.test(date)) q.set("date", date);
  }
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export function ViewSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const activeIdx = items.findIndex((i) =>
    i.to === "/app" ? pathname === "/app" : pathname.startsWith(i.to)
  );
  const hrefByBase = useMemo(
    () => ({
      "/app": viewHref("/app", search),
      "/app/week": viewHref("/app/week", search),
      "/app/month": "/app/month",
    }),
    [search]
  );

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-full border border-border bg-surface/60 backdrop-blur-md p-1 shadow-soft",
        className
      )}
      role="tablist"
      aria-label={t("calendar.viewLabel")}
    >
      {items.map((it, idx) => {
        const isActive = idx === activeIdx;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={hrefByBase[it.to as keyof typeof hrefByBase]}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors duration-150",
              isActive
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{t(it.labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );
}
