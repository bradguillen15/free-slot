import { Target } from "lucide-react";
import { ActivityEditor } from "@/components/activities/ActivityEditor";
import { PriorityRanker } from "@/components/activities/PriorityRanker";
import { useAuth } from "@/contexts/AuthContext";
import { useActivities, useCategories } from "@/lib/dataStore";
import type { Category } from "@/components/day/QuickLogDialog";

type Activity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

export default function ActivitiesPage() {
  const { user } = useAuth();
  const { data: categoriesRaw, refresh: refreshCats } = useCategories();
  const { data: activitiesRaw, refresh: refreshActs } = useActivities();

  const categories = (categoriesRaw ?? []) as unknown as Category[];
  const activities = (activitiesRaw ?? []) as unknown as Activity[];

  const reload = () => { refreshCats(); refreshActs(); };

  const totalHours = activities.filter((a) => a.is_active).reduce((s, a) => s + Number(a.target_hours_per_week), 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Activities
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define what matters, then rank weekly. Targets feed the AI planner.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-lg bg-card/60 border border-border">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="font-display text-xl font-semibold">{activities.filter((a) => a.is_active).length}</div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-card/60 border border-border">
            <div className="text-xs text-muted-foreground">Target h/wk</div>
            <div className="font-display text-xl font-semibold">{totalHours.toFixed(1)}</div>
          </div>
        </div>
      </header>

      <ActivityEditor
        userId={user?.id ?? null}
        categories={categories}
        activities={activities}
        onChange={reload}
      />
      <PriorityRanker
        userId={user?.id ?? null}
        categories={categories}
        activities={activities}
      />
    </div>
  );
}
