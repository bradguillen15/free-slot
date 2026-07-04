import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirmDayMutation } from "@/lib/dataStore";
import { isoToWeekday } from "@/lib/time";
import { buildConfirmDayRows, type ConfirmDayBlock, type ConfirmDayCategory, type ConfirmDayLog } from "@/lib/confirmDay";

export function ConfirmDayButton({
  date,
  blocks,
  logs,
  categories,
}: {
  date: string;
  blocks: ConfirmDayBlock[];
  logs: ConfirmDayLog[];
  categories: ConfirmDayCategory[];
}) {
  const { t } = useTranslation();
  const confirmMutation = useConfirmDayMutation();

  const preview = useMemo(
    () => buildConfirmDayRows(date, blocks, logs, categories),
    [date, blocks, logs, categories]
  );

  const activeBlockCount = useMemo(
    () => blocks.filter((b) => b.days_of_week.includes(isoToWeekday(date))).length,
    [blocks, date]
  );

  if (activeBlockCount === 0) {
    return (
      <Button variant="ghost" size="sm" disabled data-testid="confirm-day-nothing" className="text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        {t("day.nothingToConfirm")}
      </Button>
    );
  }

  if (preview.rows.length === 0) {
    return (
      <Button variant="ghost" size="sm" disabled data-testid="confirm-day-already-logged" className="text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        {t("day.alreadyLogged")}
      </Button>
    );
  }

  const handleConfirm = async () => {
    try {
      const result = await confirmMutation.mutateAsync(date);
      const noCategoryCount = result.skipped.filter((s) => s.reason === "no-category").length;
      toast.success(t("day.confirmedCount", { count: result.rows.length }), {
        description: noCategoryCount > 0 ? t("day.confirmSkippedNoCategory", { count: noCategoryCount }) : undefined,
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.somethingWrong"));
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConfirm}
      disabled={confirmMutation.isPending}
      data-testid="confirm-day-button"
      className="gap-1.5"
    >
      <CheckCircle2 className="h-4 w-4" />
      {t("day.confirmDay")}
    </Button>
  );
}
