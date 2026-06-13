import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addDaysISO } from "@/lib/time";
import { celebrateIfPersonalBest, getBestRatio } from "@/lib/celebrate";

/**
 * DashboardPage-specific side effects:
 *  - celebrate a personal-best productive ratio for the current week
 *  - on the user's configured review day, prompt to review last week (once, dismissible)
 * `openReview` opens the review modal for a given week.
 */
export function useWeeklyReviewPrompt({
  weekStart, isCurrentWeek, ratio, total, user, openReview,
}: {
  weekStart: string;
  isCurrentWeek: boolean;
  ratio: number;
  total: number;
  user: { id: string } | null | undefined;
  openReview: (week: string) => void;
}) {
  const { t } = useTranslation();
  const [autoPromptedFor, setAutoPromptedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!isCurrentWeek) return;
    if (total < 60) return;
    const prevBest = getBestRatio();
    if (celebrateIfPersonalBest(ratio, total)) {
      toast.success(t("dashboard.personalBest", { ratio }), {
        description: t("dashboard.personalBestDesc", { prev: prevBest }),
        icon: "🎉",
      });
    }
  }, [ratio, total, isCurrentWeek, t]);

  useEffect(() => {
    if (!user || !isCurrentWeek) return;
    const lastWeek = addDaysISO(weekStart, -7);
    if (autoPromptedFor === lastWeek) return;
    const dismissedKey = `freeslot.review.dismissed.${lastWeek}`;
    if (typeof window !== "undefined" && localStorage.getItem(dismissedKey)) return;
    let cancelled = false;
    (async () => {
      const [profileRes, reviewRes] = await Promise.all([
        supabase.from("profiles").select("weekly_review_day").eq("id", user.id).maybeSingle(),
        supabase.from("weekly_reviews").select("id").eq("user_id", user.id).eq("week_start", lastWeek).maybeSingle(),
      ]);
      if (cancelled) return;
      if (reviewRes.data) return;
      const reviewDay = (profileRes.data?.weekly_review_day ?? 0) as number;
      const today = new Date().getDay();
      if (today !== reviewDay) return;
      setAutoPromptedFor(lastWeek);
      toast(t("dashboard.reviewPrompt.title"), {
        description: t("dashboard.reviewPrompt.description"),
        icon: "📝",
        duration: 8000,
        action: {
          label: t("dashboard.reviewPrompt.open"),
          onClick: () => openReview(lastWeek),
        },
        onDismiss: () => localStorage.setItem(dismissedKey, "1"),
      });
    })();
    return () => { cancelled = true; };
  }, [user, isCurrentWeek, weekStart, autoPromptedFor, t]); // eslint-disable-line react-hooks/exhaustive-deps
}
