import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Wand2, Trash2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { fmtDuration, toMin } from "@/lib/time";

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

type ActivityLite = { id: string; name: string; category_id: string | null };
type CategoryLite = { id: string; name: string; color: string; type: "productive" | "unproductive" };

function slotKey(s: AISlot) {
  return `${s.day}|${s.start}|${s.end}|${s.activity_id}`;
}

export function AIPlanPanel({
  weekStart,
  gaps,
  activities,
  categories,
  onPlanChange,
  onSlotAccepted,
}: {
  weekStart: string;
  gaps: { day: string; start: string; end: string; durationMin: number; isPeak: boolean }[];
  activities: ActivityLite[];
  categories: CategoryLite[];
  onPlanChange: (plan: WeeklyPlan | null) => void;
  onSlotAccepted: () => void;
}) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [acceptingAll, setAcceptingAll] = useState(false);

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
      setAccepted(new Set());
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
      const acts = actsRes.data ?? [];
      const priorities = prioRes.data ?? [];

      if (acts.length === 0) {
        toast({ title: "No active activities", description: "Add activities on the Activities page first.", variant: "destructive" });
        return;
      }
      if (gaps.length === 0) {
        toast({ title: "No free windows", description: "Your week has no detectable free time.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-weekly-plan", {
        body: { week_start: weekStart, gaps, activities: acts, priorities },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const newPlan = (data as any).plan as WeeklyPlan;
      setPlan(newPlan);
      onPlanChange(newPlan);
      setSummary((data as any).summary ?? "");
      setAccepted(new Set());
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
    setAccepted(new Set());
  };

  const acceptSlot = async (slot: AISlot) => {
    if (!user) return;
    const key = slotKey(slot);
    if (accepted.has(key)) return;

    const activity = activities.find((a) => a.id === slot.activity_id);
    const category = activity?.category_id ? categories.find((c) => c.id === activity.category_id) : undefined;
    const type: "productive" | "unproductive" = category?.type ?? "productive";

    const { error } = await supabase.from("time_logs").insert({
      user_id: user.id,
      date: slot.day,
      start_time: slot.start,
      end_time: slot.end,
      type,
      category_id: category?.id ?? null,
      notes: `Accepted from AI plan: ${slot.activity_name}`,
    });

    if (error) {
      toast({ title: "Couldn't accept slot", description: error.message, variant: "destructive" });
      return;
    }
    setAccepted((s) => new Set(s).add(key));
    onSlotAccepted();
  };

  const acceptAll = async () => {
    if (!user || !plan) return;
    setAcceptingAll(true);
    const pending = plan.slots.filter((s) => !accepted.has(slotKey(s)));
    if (pending.length === 0) { setAcceptingAll(false); return; }

    const rows = pending.map((slot) => {
      const activity = activities.find((a) => a.id === slot.activity_id);
      const category = activity?.category_id ? categories.find((c) => c.id === activity.category_id) : undefined;
      return {
        user_id: user.id,
        date: slot.day,
        start_time: slot.start,
        end_time: slot.end,
        type: (category?.type ?? "productive") as "productive" | "unproductive",
        category_id: category?.id ?? null,
        notes: `Accepted from AI plan: ${slot.activity_name}`,
      };
    });

    const { error } = await supabase.from("time_logs").insert(rows);
    setAcceptingAll(false);

    if (error) {
      toast({ title: "Couldn't accept plan", description: error.message, variant: "destructive" });
      return;
    }
    setAccepted((s) => {
      const next = new Set(s);
      pending.forEach((p) => next.add(slotKey(p)));
      return next;
    });
    toast({ title: "Plan accepted", description: `${pending.length} slot${pending.length === 1 ? "" : "s"} added to your week.` });
    onSlotAccepted();
  };

  const totalMin = plan?.slots.reduce((s, x) => s + (toMin(x.end) - toMin(x.start)), 0) ?? 0;
  const acceptedCount = plan?.slots.filter((s) => accepted.has(slotKey(s))).length ?? 0;
  const allAccepted = plan && acceptedCount === plan.slots.length;

  return (
    <TooltipProvider delayDuration={200}>
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
                  ? `${plan.slots.length} slots · ${fmtDuration(totalMin)} planned${acceptedCount ? ` · ${acceptedCount} accepted` : ""}`
                  : "Let Lovable AI fit your priorities into your free windows."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {plan && !allAccepted && (
              <Button variant="outline" size="sm" onClick={acceptAll} disabled={acceptingAll} className="gap-1.5">
                {acceptingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Accept all
              </Button>
            )}
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

        {plan && plan.slots.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5 max-h-64 overflow-y-auto">
            {plan.slots.map((s) => {
              const key = slotKey(s);
              const isAccepted = accepted.has(key);
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card/40 border border-border/40 text-sm"
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono-num w-12 shrink-0">
                    {new Date(s.day).toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div className="text-xs font-mono-num text-foreground/70 w-24 shrink-0">
                    {s.start}–{s.end}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1 truncate font-medium cursor-help">{s.activity_name}</div>
                    </TooltipTrigger>
                    {s.rationale && (
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {s.rationale}
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <Button
                    size="sm"
                    variant={isAccepted ? "ghost" : "secondary"}
                    onClick={() => acceptSlot(s)}
                    disabled={isAccepted}
                    className="h-7 gap-1 text-xs shrink-0"
                  >
                    <Check className="h-3 w-3" />
                    {isAccepted ? "Accepted" : "Accept"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
