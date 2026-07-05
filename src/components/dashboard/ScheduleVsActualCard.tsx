import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronDown } from "lucide-react";
import { Surface } from "@/components/Surface";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDuration } from "@/lib/time";
import { useCategoryName } from "@/lib/categoryLabels";
import { cn } from "@/lib/utils";
import type { ScheduleVsActualResult, ScheduleVsActualRow } from "@/lib/scheduleVsActual";

export type CardCategory = { id: string; name: string; color: string };

type ViewMode = "compare" | "actual" | "schedule";

function DeltaChip({ deltaMin }: { deltaMin: number }) {
  const { t } = useTranslation();
  if (deltaMin === 0) {
    return <span className="font-mono-num text-xs text-muted-foreground">±0</span>;
  }
  const positive = deltaMin > 0;
  return (
    <span
      className={cn(
        "font-mono-num text-xs px-1.5 py-0.5 rounded-md",
        positive ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning"
      )}
      aria-label={t(positive ? "scheduleVsActual.overBy" : "scheduleVsActual.underBy", {
        duration: fmtDuration(Math.abs(deltaMin)),
      })}
    >
      {positive ? "+" : "−"}
      {fmtDuration(Math.abs(deltaMin))}
    </span>
  );
}

function RowBars({
  row,
  maxMin,
  color,
  view,
}: {
  row: ScheduleVsActualRow;
  maxMin: number;
  color: string;
  view: ViewMode;
}) {
  const pct = (v: number) => (maxMin > 0 ? Math.max((v / maxMin) * 100, v > 0 ? 1.5 : 0) : 0);
  return (
    <div className="flex-1 min-w-0 space-y-1">
      {view !== "actual" && (
        <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct(row.scheduledMin)}%`, backgroundColor: `${color}66` }} />
        </div>
      )}
      {view !== "schedule" && (
        <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct(row.loggedMin)}%`, backgroundColor: color }} />
        </div>
      )}
    </div>
  );
}

export function ScheduleVsActualCard({
  data,
  categories,
  hasScheduleBlocks,
}: {
  data: ScheduleVsActualResult;
  categories: CardCategory[];
  hasScheduleBlocks: boolean;
}) {
  const { t } = useTranslation();
  const categoryName = useCategoryName();
  const [view, setView] = useState<ViewMode>("compare");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const nameOf = (id: string) => {
    const c = catById.get(id);
    return c ? categoryName(c.name) : t("scheduleVsActual.unknownLabel");
  };
  const colorOf = (id: string) => catById.get(id)?.color ?? "hsl(var(--muted-foreground))";

  const maxMin = data.rows.reduce((m, r) => Math.max(m, r.scheduledMin, r.loggedMin), 0);

  return (
    <Surface padding="md" data-testid="schedule-vs-actual-card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("scheduleVsActual.title")}
          </div>
          {data.totals.adherencePct !== null && (
            <span
              data-testid="adherence-kpi"
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {t("scheduleVsActual.adherence", { pct: data.totals.adherencePct })}
            </span>
          )}
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="compare" className="text-xs px-2.5" data-testid="sva-view-compare">
              {t("scheduleVsActual.viewCompare")}
            </TabsTrigger>
            <TabsTrigger value="actual" className="text-xs px-2.5" data-testid="sva-view-actual">
              {t("scheduleVsActual.viewActual")}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs px-2.5" data-testid="sva-view-schedule">
              {t("scheduleVsActual.viewSchedule")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!hasScheduleBlocks ? (
        <div className="text-center py-8 space-y-3" data-testid="sva-empty">
          <CalendarClock className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("scheduleVsActual.emptyNoSchedule")}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/schedule">{t("scheduleVsActual.emptyCta")}</Link>
          </Button>
        </div>
      ) : data.rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          {t("scheduleVsActual.emptyNoData")}
        </div>
      ) : (
        <ul className="space-y-1">
          {data.rows.map((row) => {
            const expanded = expandedId === row.categoryId;
            const expandable = row.scheduledMin > 0;
            return (
              <li key={row.categoryId} className="rounded-lg hover:bg-muted/20 transition-colors">
                <button
                  type="button"
                  onClick={() => expandable && setExpandedId(expanded ? null : row.categoryId)}
                  disabled={!expandable}
                  data-testid={`sva-row-${row.categoryId}`}
                  className="w-full flex items-center gap-3 px-2 py-2 text-left disabled:cursor-default"
                >
                  <span className="flex items-center gap-2 w-32 shrink-0 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: colorOf(row.categoryId) }} />
                    <span className="text-sm truncate">{nameOf(row.categoryId)}</span>
                  </span>
                  <RowBars row={row} maxMin={maxMin} color={colorOf(row.categoryId)} view={view} />
                  <span className="flex items-center gap-2 shrink-0">
                    {view !== "actual" && (
                      <span className="font-mono-num text-xs text-muted-foreground w-14 text-right">
                        {fmtDuration(row.scheduledMin)}
                      </span>
                    )}
                    {view !== "schedule" && (
                      <span className="font-mono-num text-xs w-14 text-right">{fmtDuration(row.loggedMin)}</span>
                    )}
                    {view === "compare" && <DeltaChip deltaMin={row.loggedMin - row.scheduledMin} />}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        expanded && "rotate-180",
                        !expandable && "opacity-0"
                      )}
                    />
                  </span>
                </button>
                {expanded && (
                  <div className="px-2 pb-3 pl-10" data-testid={`sva-displacement-${row.categoryId}`}>
                    <div className="text-xs text-muted-foreground mb-1.5">
                      {t("scheduleVsActual.displacementTitle", { name: nameOf(row.categoryId) })}
                    </div>
                    <ul className="space-y-1 text-xs">
                      <li className="flex justify-between gap-2">
                        <span>{t("scheduleVsActual.kept")}</span>
                        <span className="font-mono-num">{fmtDuration(row.displacement.keptMin)}</span>
                      </li>
                      {row.displacement.byCategory.map((d) => (
                        <li key={d.categoryId} className="flex justify-between gap-2 text-muted-foreground">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: colorOf(d.categoryId) }} />
                            <span className="truncate">{nameOf(d.categoryId)}</span>
                          </span>
                          <span className="font-mono-num">{fmtDuration(d.min)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between gap-2 text-muted-foreground">
                        <span>{t("scheduleVsActual.unlogged")}</span>
                        <span className="font-mono-num">{fmtDuration(row.displacement.unloggedMin)}</span>
                      </li>
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Surface>
  );
}
