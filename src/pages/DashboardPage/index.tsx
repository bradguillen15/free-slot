import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, BarChart3, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ActivityTrendChart } from "@/components/dashboard/ActivityTrendChart";
import { fmtDuration, todayISO } from "@/lib/time";
import { StatCard } from "@/components/StatCard";
import { resolvePeriod, type PeriodKind } from "@/lib/dashboardPeriod";
import { getDashboardPeriod, setDashboardPeriod } from "@/lib/localStore";
import { useDashboardStats } from "./useDashboardStats";

function resolveStoredKind(kind: PeriodKind | "custom"): PeriodKind {
  return kind === "custom" ? "week" : kind;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const stored = getDashboardPeriod();
  const [kind, setKind] = useState<PeriodKind>(resolveStoredKind(stored.kind));
  const [anchorISO, setAnchorISO] = useState<string>(stored.anchorISO ?? todayISO());

  const persist = (next: { kind: PeriodKind; anchorISO?: string }) => {
    setDashboardPeriod(next);
  };

  const handleKindChange = (nextKind: PeriodKind) => {
    setKind(nextKind);
    persist({ kind: nextKind, anchorISO });
  };

  const handleAnchorChange = (nextAnchor: string) => {
    setAnchorISO(nextAnchor);
    persist({ kind, anchorISO: nextAnchor });
  };

  const period = resolvePeriod(kind, anchorISO);
  const { trendData, plannedData, categories, isEmpty, totals, daysLogged } = useDashboardStats(period);

  return (
    <div data-testid="page-dashboard" className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{t("dashboard.title")}</div>
        </motion.div>
        <PeriodSelector
          kind={kind}
          anchorISO={anchorISO}
          onKindChange={handleKindChange}
          onAnchorChange={handleAnchorChange}
        />
      </div>

      {isEmpty ? (
        <div data-testid="dashboard-empty">
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title={t("dashboard.empty.title")}
            description={t("dashboard.empty.descriptionGuest")}
            ctaLabel={t("dashboard.empty.cta")}
            ctaTo="/app"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <StatCard icon={<Activity className="h-4 w-4" />} label={t("dashboard.kpi.totalTracked")} value={fmtDuration(totals.total)} tone="muted" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <StatCard icon={<CalendarDays className="h-4 w-4" />} label={t("dashboard.kpi.daysLogged")} value={String(daysLogged)} tone="muted" />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <ActivityTrendChart trendData={trendData} plannedData={plannedData} categories={categories} />
          </motion.div>
        </>
      )}
    </div>
  );
}
