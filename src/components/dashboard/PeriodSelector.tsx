import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDaysISO, todayISO } from "@/lib/time";
import { resolvePeriod, MAX_CUSTOM_RANGE_DAYS, type PeriodKind, type CustomRange } from "@/lib/dashboardPeriod";

const NAV_DELTA_DAYS: Record<Exclude<PeriodKind, "custom">, number> = {
  day: 1,
  week: 7,
  month: 30,
};

type Props = {
  kind: PeriodKind;
  anchorISO: string;
  custom?: CustomRange;
  onKindChange: (kind: PeriodKind) => void;
  onAnchorChange: (anchorISO: string) => void;
  onCustomChange: (custom: CustomRange) => void;
};

export function PeriodSelector({ kind, anchorISO, custom, onKindChange, onAnchorChange, onCustomChange }: Props) {
  const { t } = useTranslation();

  const navigate = (direction: 1 | -1) => {
    if (kind === "custom") return;
    if (kind === "month") {
      const [y, m, d] = anchorISO.split("-").map(Number);
      const dt = new Date(y, m - 1 + direction, d);
      onAnchorChange(todayISO(dt));
      return;
    }
    onAnchorChange(addDaysISO(anchorISO, direction * NAV_DELTA_DAYS[kind]));
  };

  const isRangeAdjusted =
    kind === "custom" && custom
      ? resolvePeriod("custom", anchorISO, custom).end !== custom.end
      : false;

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="period-selector">
      <ToggleGroup type="single" value={kind} onValueChange={(v) => v && onKindChange(v as PeriodKind)}>
        <ToggleGroupItem value="day" aria-label={t("dashboard.period.day")}>{t("dashboard.period.day")}</ToggleGroupItem>
        <ToggleGroupItem value="week" aria-label={t("dashboard.period.week")}>{t("dashboard.period.week")}</ToggleGroupItem>
        <ToggleGroupItem value="month" aria-label={t("dashboard.period.month")}>{t("dashboard.period.month")}</ToggleGroupItem>
        <ToggleGroupItem value="custom" aria-label={t("dashboard.period.custom")}>{t("dashboard.period.custom")}</ToggleGroupItem>
      </ToggleGroup>

      {kind !== "custom" && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t("dashboard.period.previous")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAnchorChange(todayISO())}>
            {t("dashboard.period.today")}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)} aria-label={t("dashboard.period.next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {kind === "custom" && (
        <div className="flex items-center gap-2">
          <Label htmlFor="period-range-start" className="text-xs">{t("dashboard.period.rangeStart")}</Label>
          <Input
            id="period-range-start"
            type="date"
            value={custom?.start ?? anchorISO}
            onChange={(e) => onCustomChange({ start: e.target.value, end: custom?.end ?? anchorISO })}
            className="w-40"
          />
          <Label htmlFor="period-range-end" className="text-xs">{t("dashboard.period.rangeEnd")}</Label>
          <Input
            id="period-range-end"
            type="date"
            value={custom?.end ?? anchorISO}
            onChange={(e) => onCustomChange({ start: custom?.start ?? anchorISO, end: e.target.value })}
            className="w-40"
          />
          {isRangeAdjusted && (
            <span className="text-xs text-muted-foreground">
              {t("dashboard.period.rangeAdjusted", { days: MAX_CUSTOM_RANGE_DAYS })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
