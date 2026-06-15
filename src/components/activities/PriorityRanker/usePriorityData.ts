import { useEffect, useMemo, useState } from "react";
import { useWeeklyPriorities } from "@/lib/dataStore";

export type Activity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

export type RankItem = Activity & { rank: number };

/**
 * Derives the week's priority ranking for active activities — from `useWeeklyPriorities`
 * (which routes to cloud or localStore based on auth). Returns `setItems` so the component
 * can apply optimistic drag reorders. PriorityRanker-specific.
 */
export function usePriorityData({ weekStart, activities }: {
  weekStart: string;
  activities: Activity[];
}) {
  const { data: priorities, isLoading } = useWeeklyPriorities(weekStart);
  const [items, setItems] = useState<RankItem[]>([]);

  const activeActivities = useMemo(() => activities.filter((a) => a.is_active), [activities]);

  useEffect(() => {
    const rankMap = new Map(priorities.map((p) => [p.activity_id, p.rank]));
    const ordered = [...activeActivities].sort((a, b) => {
      const ra = rankMap.get(a.id) ?? 999;
      const rb = rankMap.get(b.id) ?? 999;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    setItems(ordered.map((a, i) => ({ ...a, rank: i })));
  }, [priorities, activeActivities]);

  return { items, setItems, loading: isLoading };
}
