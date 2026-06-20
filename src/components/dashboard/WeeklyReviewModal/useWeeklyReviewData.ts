import { useMemo } from "react";
import { toast } from "sonner";
import { addDaysISO } from "@/lib/time";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTimeLogsInRange,
  useVisibleCategories,
  useWeeklyPlan,
  useWeeklyReview,
  useGenerateWeeklyReviewMutation,
  useDailyNotesForWeek,
} from "@/lib/dataStore";
import { aggregateWeeklyReview } from "@/lib/weeklyReview";
import { tiptapToText } from "@/lib/tiptapText";

export function useWeeklyReviewData({ open, weekStart }: {
  open: boolean;
  weekStart: string;
}) {
  const { user } = useAuth();
  const weekEnd = addDaysISO(weekStart, 6);

  const { data: logs } = useTimeLogsInRange(weekStart, weekEnd);
  const { data: categories } = useVisibleCategories();
  const { data: plan } = useWeeklyPlan(weekStart);
  const { data: savedReview, isLoading: reviewLoading } = useWeeklyReview(weekStart);
  const { data: rawDailyNotes } = useDailyNotesForWeek(weekStart, weekEnd);
  const generateMutation = useGenerateWeeklyReviewMutation();

  const dailyNotes = useMemo(
    () =>
      (rawDailyNotes ?? [])
        .map((n) => ({ date: n.date, text: tiptapToText(n.content as object) }))
        .filter((n) => n.text.length > 0),
    [rawDailyNotes]
  );

  const agg = useMemo(() => {
    if (!open || !user) return null;
    return aggregateWeeklyReview({ logs, categories, plan: plan ?? null, saved: savedReview ?? null });
  }, [open, user, logs, categories, plan, savedReview]);

  const generate = async () => {
    if (!agg) return;
    try {
      await generateMutation.mutateAsync({
        week_start: weekStart,
        planned: agg.planned,
        actual: agg.actual,
        productive_ratio: agg.ratio,
        total_tracked: agg.total,
        daily_notes: dailyNotes.length ? dailyNotes : undefined,
      });
      toast.success("Weekly review saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not generate review");
    }
  };

  return {
    loading: reviewLoading || generateMutation.isPending,
    insights: agg?.insights ?? null,
    ratio: agg?.ratio ?? 0,
    total: agg?.total ?? 0,
    existing: agg?.existing ?? false,
    merged: (agg?.merged ?? []).slice(0, 8),
    generate,
  };
}
