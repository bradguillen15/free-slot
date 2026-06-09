import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { ActivityEditor } from "@/components/activities/ActivityEditor";
import { PriorityRanker } from "@/components/activities/PriorityRanker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Category = { id: string; name: string; color: string; type: "productive" | "unproductive" };
type Activity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cats }, { data: acts }] = await Promise.all([
        supabase.from("categories").select("id,name,color,type").eq("user_id", user.id).order("name"),
        supabase.from("activities").select("id,name,category_id,target_hours_per_week,is_active").eq("user_id", user.id).order("created_at"),
      ]);
      setCategories((cats as Category[]) ?? []);
      setActivities((acts as Activity[]) ?? []);
      setLoading(false);
    })();
  }, [user, tick]);

  const reload = () => setTick((t) => t + 1);

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

        {loading ? (
          <div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
        ) : (
          <>
            <ActivityEditor
              userId={user!.id}
              categories={categories}
              activities={activities}
              onChange={reload}
            />
            <PriorityRanker
              userId={user!.id}
              categories={categories}
              activities={activities}
            />
          </>
        )}
    </div>
  );
}
