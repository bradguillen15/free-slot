import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirmDayMutation } from "@/lib/dataStore";
import { useTour } from "@/components/tour/TourProvider";
import { nowHHMM, todayISO } from "@/lib/time";
import { buildConfirmDayRows, blockInstancesForDate, type ConfirmDayBlock, type ConfirmDayCategory, type ConfirmDayLog } from "@/lib/confirmDay";
import { toastError } from "@/lib/toastError";

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
  const { notifyAction } = useTour();

  // The parent re-renders every minute (useNowMinute), keeping this fresh for today.
  const preview = useMemo(
    () => buildConfirmDayRows(date, blocks, logs, categories, date === todayISO() ? nowHHMM() : undefined, t),
    [date, blocks, logs, categories, t]
  );

  const activeBlockCount = useMemo(
    () => blockInstancesForDate(blocks, date).length,
    [blocks, date]
  );

  if (activeBlockCount === 0) {
    return (
      <Button variant="ghost" size="sm" disabled data-testid="confirm-day-nothing" data-tour="confirm-day" className="text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        {t("day.nothingToConfirm")}
      </Button>
    );
  }

  if (preview.rows.length === 0) {
    const allNotElapsed = preview.skipped.length > 0 && preview.skipped.every((s) => s.reason === "not-elapsed");
    if (allNotElapsed) {
      return (
        <Button variant="ghost" size="sm" disabled data-testid="confirm-day-not-elapsed" data-tour="confirm-day" className="text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {t("day.nothingElapsedYet")}
        </Button>
      );
    }
    const allNoCategory = preview.skipped.length > 0 && preview.skipped.every((s) => s.reason === "no-category");
    if (allNoCategory) {
      return (
        <Button variant="ghost" size="sm" disabled data-testid="confirm-day-no-category" data-tour="confirm-day" className="text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {t("day.confirmSkippedNoCategory", { count: preview.skipped.length })}
        </Button>
      );
    }
    return (
      <Button variant="ghost" size="sm" disabled data-testid="confirm-day-already-logged" data-tour="confirm-day" className="text-muted-foreground">
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
      notifyAction("confirm-day");
    } catch (e: unknown) {
      toastError(e, t);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConfirm}
      disabled={confirmMutation.isPending}
      data-testid="confirm-day-button"
      data-tour="confirm-day"
      className="gap-1.5"
    >
      <CheckCircle2 className="h-4 w-4" />
      {t("day.confirmDay")}
    </Button>
  );
}
