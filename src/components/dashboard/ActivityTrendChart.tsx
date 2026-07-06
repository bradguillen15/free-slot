import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import { fmtDuration } from "@/lib/time";
import type { CategoryMeta, TrendRow } from "@/pages/DashboardPage/useDashboardStats";

export const DEFAULT_VISIBLE_CAP = 6;
export const PLANNED_SUFFIX = "_planned";

export function isCategoryVisible(
  index: number,
  cap: number,
  hiddenIds: Set<string>,
  shownExtraIds: Set<string>,
  categoryId: string,
): boolean {
  return index < cap ? !hiddenIds.has(categoryId) : shownExtraIds.has(categoryId);
}

function isIsolatedPoint(data: TrendRow[], index: number, dataKey: string): boolean {
  const value = data[index]?.[dataKey];
  if (value === undefined || value === null) return false;
  const prev = data[index - 1]?.[dataKey];
  const next = data[index + 1]?.[dataKey];
  return (prev === undefined || prev === null) && (next === undefined || next === null);
}

type DotRenderProps = { cx?: number; cy?: number; index?: number; key?: string };

function renderIsolatedDot(dataKey: string, data: TrendRow[], color: string) {
  return ({ cx, cy, index, key }: DotRenderProps) => {
    if (cx === undefined || cy === undefined || index === undefined || !isIsolatedPoint(data, index, dataKey)) {
      return <Fragment key={key} />;
    }
    return (
      <circle
        key={key}
        data-testid={`isolated-dot-${dataKey}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
      />
    );
  };
}

function mergeSeries(trendData: TrendRow[], plannedData: TrendRow[]): TrendRow[] {
  const plannedByDate = new Map(plannedData.map((row) => [row.date, row]));
  return trendData.map((row) => {
    const planned = plannedByDate.get(row.date);
    if (!planned) return row;
    const merged: TrendRow = { ...row };
    for (const [key, value] of Object.entries(planned)) {
      if (key === "date") continue;
      merged[`${key}${PLANNED_SUFFIX}`] = value;
    }
    return merged;
  });
}

type Props = {
  trendData: TrendRow[];
  plannedData: TrendRow[];
  categories: CategoryMeta[];
};

export function ActivityTrendChart({ trendData, plannedData, categories }: Props) {
  const { t } = useTranslation();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [shownExtraIds, setShownExtraIds] = useState<Set<string>>(new Set());
  const [showPlanned, setShowPlanned] = useState(false);

  const chartData = useMemo(() => mergeSeries(trendData, plannedData), [trendData, plannedData]);

  const toggleCategory = (categoryId: string, index: number) => {
    if (index < DEFAULT_VISIBLE_CAP) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
        return next;
      });
    } else {
      setShownExtraIds((prev) => {
        const next = new Set(prev);
        if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
        return next;
      });
    }
  };

  const visibleCategories = categories.filter((c, i) =>
    isCategoryVisible(i, DEFAULT_VISIBLE_CAP, hiddenIds, shownExtraIds, c.id)
  );

  return (
    <div data-testid="activity-trend-chart">
      <div className="flex items-center justify-end gap-2 mb-2">
        <span className="text-xs text-muted-foreground">{t("dashboard.trend.showPlanned")}</span>
        <Switch
          checked={showPlanned}
          onCheckedChange={setShowPlanned}
          aria-label={t("dashboard.trend.showPlanned")}
          data-testid="trend-show-planned"
        />
      </div>
      <div className="h-96">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => fmtDuration(v)}
            />
            {visibleCategories.map((c) => (
              <Line
                key={c.id}
                dataKey={c.id}
                name={c.name}
                stroke={c.color}
                dot={renderIsolatedDot(c.id, chartData, c.color)}
                isAnimationActive={false}
                strokeWidth={2}
              />
            ))}
            {showPlanned &&
              visibleCategories.map((c) => (
                <Line
                  key={`${c.id}${PLANNED_SUFFIX}`}
                  dataKey={`${c.id}${PLANNED_SUFFIX}`}
                  name={`${c.name} (${t("dashboard.trend.planned")})`}
                  stroke={c.color}
                  strokeDasharray="4 4"
                  dot={false}
                  strokeWidth={2}
                  legendType="none"
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-2 justify-center mt-2" data-testid="trend-legend">
        {categories.map((c, i) => {
          const visible = isCategoryVisible(i, DEFAULT_VISIBLE_CAP, hiddenIds, shownExtraIds, c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggleCategory(c.id, i)}
                aria-pressed={visible}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border"
                style={{ opacity: visible ? 1 : 0.4, borderColor: c.color }}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color }} />
                {c.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
