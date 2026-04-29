import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Wand2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { fmtDuration, fromMin, toMin } from "@/lib/time";

export type AISlot = {
  activity_id: string;
  activity_name: string;
  day: string;
  start: string;
  end: string;
  rationale?: string;
};

export type WeeklyPlan = {
  id: string;
  week_start: string;
  generated_at: string;
  slots: AISlot[];
};

export function AIPlanPanel({
  weekStart,
  gaps,
  onPlanChange,
}: {
  weekStart: string;
  gaps: { day: string; start: string; end: string; durationMin: number; isPeak: boolean }[];
  onPlanChange: (plan: WeeklyPlan | null) => void;
}) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("weekly_plans")
        .select("id,week_start,generated_at,slots")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (!active) return;
      const p = (data as any) ?? null;
      setPlan(p);
      onPlanChange(p);
      setSummary("");
    })();
    return () => { active = false; };
  }, [user, weekStart]);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [actsRes, prioRes] = await Promise.all([
        supabase.from("activities").select("id,name,target_hours_per_week,category_id").eq("user_id", user.id).eq("is_active", true),
        supabase.from("weekly_priorities").select("activity_id,rank").eq("user_id", user.id).eq("week_start", weekStart).order("rank"),
      ]);
      const activities = actsRes.data ?? [];
      const priorities = prioRes.data ?? [];

      if (activities.length === 0) {
        toast({ title: "No active activities", description: "Add activities on the Activities page first.", variant: "destructive" });
        return;
      }
      if (gaps.length === 0) {
        toast({ title: "No free windows", description: "Your week has no detectable free time.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-weekly-plan", {
        body: { week_start: weekStart, gaps, activities, priorities },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const newPlan = (data as any).plan as WeeklyPlan;
      setPlan(newPlan);
      onPlanChange(newPlan);
      setSummary((data as any).summary ?? "");
      toast({ title: "Plan ready", description: `${newPlan.slots.length} slots generated.` });
    } catch (e: any) {
      toast({ title: "Couldn't generate plan", description: e.message ?? "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clearPlan = async () => {
    if (!user || !plan) return;
    await supabase.from("weekly_plans").delete().eq("id", plan.id);
    setPlan(null);
    onPlanChange(null);
    setSummary("");
  };

  const totalMin = plan?.slots.reduce((s, x) => s + (toMin(x.end) - toMin(x.start)), 0) ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 mb-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-base font-semibold tracking-tight">AI weekly plan</div>
            <div className="text-xs text-muted-foreground">
              {plan
                ? `${plan.slots.length} slots · ${fmtDuration(totalMin)} planned · generated ${new Date(plan.generated_at).toLocaleString()}`
                : "Let Lovable AI fit your priorities into your free windows."}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan && (
            <Button variant="ghost" size="sm" onClick={clearPlan} className="gap-1.5 text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <Button onClick={generate} disabled={loading} size="sm" className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {plan ? "Regenerate" : "Generate plan"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-foreground/80 mt-3 pt-3 border-t border-border/40"
          >
            {summary}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
