import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addDaysISO, todayISO } from "@/lib/time";
import { type PeriodKind } from "@/lib/dashboardPeriod";

const NAV_DELTA_DAYS: Record<PeriodKind, number> = {
  day: 1,
  week: 7,
  month: 30,
};

type Props = Readonly<{
  kind: PeriodKind;
  anchorISO: string;
  onKindChange: (kind: PeriodKind) => void;
  onAnchorChange: (anchorISO: string) => void;
}>;

export function PeriodSelector({ kind, anchorISO, onKindChange, onAnchorChange }: Props) {
  const { t } = useTranslation();

  const navigate = (direction: 1 | -1) => {
    if (kind === "month") {
      const [y, m, d] = anchorISO.split("-").map(Number);
      const dt = new Date(y, m - 1 + direction, d);
      onAnchorChange(todayISO(dt));
      return;
    }
    onAnchorChange(addDaysISO(anchorISO, direction * NAV_DELTA_DAYS[kind]));
  };

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="period-selector">
      <ToggleGroup type="single" value={kind} onValueChange={(v) => v && onKindChange(v as PeriodKind)}>
        <ToggleGroupItem value="day" aria-label={t("dashboard.period.day")}>{t("dashboard.period.day")}</ToggleGroupItem>
        <ToggleGroupItem value="week" aria-label={t("dashboard.period.week")}>{t("dashboard.period.week")}</ToggleGroupItem>
        <ToggleGroupItem value="month" aria-label={t("dashboard.period.month")}>{t("dashboard.period.month")}</ToggleGroupItem>
      </ToggleGroup>

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
    </div>
  );
}
