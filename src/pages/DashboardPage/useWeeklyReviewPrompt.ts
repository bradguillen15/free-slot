import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { addDaysISO } from "@/lib/time";
import { celebrateIfPersonalBest, getBestRatio } from "@/lib/celebrate";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useWeeklyReview } from "@/lib/dataStore";

export function useWeeklyReviewPrompt({
  weekStart, isCurrentWeek, ratio, total, openReview,
}: {
  weekStart: string;
  isCurrentWeek: boolean;
  ratio: number;
  total: number;
  openReview: (week: string) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [autoPromptedFor, setAutoPromptedFor] = useState<string | null>(null);

  const lastWeek = addDaysISO(weekStart, -7);
  const { data: profile } = useProfile();
  const { data: lastWeekReview, isLoading: reviewLoading } = useWeeklyReview(lastWeek);

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
    if (reviewLoading) return;
    if (autoPromptedFor === lastWeek) return;
    const dismissedKey = `freeslot.review.dismissed.${lastWeek}`;
    if (typeof window !== "undefined" && localStorage.getItem(dismissedKey)) return;
    if (lastWeekReview !== null) return;
    const reviewDay = profile?.weekly_review_day ?? 0;
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
  }, [user, isCurrentWeek, lastWeek, reviewLoading, autoPromptedFor, profile, lastWeekReview, t, openReview]);
}
