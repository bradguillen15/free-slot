import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listPriorities } from "@/lib/localStore";

export type Activity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

export type RankItem = Activity & { rank: number };

/**
 * Loads the week's priority ranking for the active activities — from `weekly_priorities`
 * (cloud) or localStore (guest) — and returns the initialised ranked list. Returns `setItems`
 * so the component can apply optimistic drag reorders. PriorityRanker-specific.
 */
export function usePriorityData({ userId, weekStart, activities }: {
  userId: string | null;
  weekStart: string;
  activities: Activity[];
}) {
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const active = activities.filter((a) => a.is_active);
      let prios: { activity_id: string; rank: number }[] | null;
      if (userId) {
        const { data, error } = await supabase
          .from("weekly_priorities")
          .select("activity_id, rank")
          .eq("user_id", userId)
          .eq("week_start", weekStart);
        if (error) console.error("weekly_priorities fetch failed:", error.message);
        prios = data;
      } else {
        prios = listPriorities(weekStart);
      }
      if (cancelled) return;
      const rankMap = new Map(prios?.map((p) => [p.activity_id, p.rank]) ?? []);
      const ordered = [...active].sort((a, b) => {
        const ra = rankMap.get(a.id) ?? 999;
        const rb = rankMap.get(b.id) ?? 999;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      });
      setItems(ordered.map((a, i) => ({ ...a, rank: i })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, weekStart, activities]);

  return { items, setItems, loading };
}
