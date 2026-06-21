import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Wand2, Trash2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { addDaysISO, fmtDuration, toMin } from "@/lib/time";
import {
  useWeeklyPlan,
  useWeeklyPriorities,
  useGenerateWeeklyPlanMutation,
  useDeleteWeeklyPlanMutation,
  insertTimeLog,
  invalidateTimeLogs,
  useDailyNotesForWeek,
  useInboxItems,
} from "@/lib/dataStore";
import { resources } from "@/resources";
import { tiptapToText } from "@/lib/tiptapText";

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

export type ActivityLite = { id: string; name: string; category_id: string | null };
type CategoryLite = { id: string; name: string; color: string; type: "productive" | "unproductive" | "essential" };

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
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);
  const { data: planData } = useWeeklyPlan(weekStart);
  const { data: priorities } = useWeeklyPriorities(weekStart);
  const { data: rawDailyNotes } = useDailyNotesForWeek(weekStart, weekEnd);
  const { data: rawInboxItems } = useInboxItems();
  const generateMutation = useGenerateWeeklyPlanMutation();
  const deleteMutation = useDeleteWeeklyPlanMutation();

  const dailyNotes = useMemo(
    () =>
      (rawDailyNotes ?? [])
        .map((n) => ({ date: n.date, text: tiptapToText(n.content as object) }))
        .filter((n) => n.text.length > 0),
    [rawDailyNotes]
  );

  const inboxItems = useMemo(
    () => (rawInboxItems ?? []).map((i) => i.content),
    [rawInboxItems]
  );

  const [summary, setSummary] = useState<string>("");
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [acceptingAll, setAcceptingAll] = useState(false);
  const generatingRef = useRef(false);
  const acceptingKeysRef = useRef<Set<string>>(new Set());

  const plan = planData ?? null;

  useEffect(() => {
    onPlanChange(plan as WeeklyPlan | null);
  }, [plan, onPlanChange]);

  useEffect(() => {
    setSummary("");
    setAccepted(new Set());
  }, [weekStart]);

  const generate = async () => {
    if (!user) return;
    if (generatingRef.current || generateMutation.isPending) return;
    generatingRef.current = true;
    try {
      if (activities.length === 0) {
        toast.error("No active activities", { description: "Add activities on the Activities page first." });
        return;
      }
      if (gaps.length === 0) {
        toast.error("No free windows this week", { description: "Your week is fully booked. Try removing a block or pick another week." });
        return;
      }

      const data = await generateMutation.mutateAsync({
        week_start: weekStart,
        gaps,
        activities: activities.map((a) => ({
          id: a.id,
          name: a.name,
          category_id: a.category_id,
          target_hours_per_week: 0,
          is_active: true,
        })),
        priorities,
        daily_notes: dailyNotes.length ? dailyNotes : undefined,
        inbox_items: inboxItems.length ? inboxItems : undefined,
      });

      if ((data as unknown as Record<string, unknown>)?.error) {
        throw new Error(String((data as unknown as Record<string, unknown>).error));
      }

      const result = data as unknown as { plan: WeeklyPlan; summary?: string };
      setSummary(result.summary ?? "");
      setAccepted(new Set());
      const slotCount = result.plan?.slots?.length ?? 0;
      toast(slotCount ? "Plan ready" : "Empty plan", {
        description: slotCount
          ? `${slotCount} slots generated.`
          : "AI couldn't fit anything — try setting priorities or adding more free time.",
      });
    } catch (e: unknown) {
      toast.error("Couldn't generate plan", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      generatingRef.current = false;
    }
  };

  const clearPlan = async () => {
    if (!plan) return;
    try {
      await deleteMutation.mutateAsync(weekStart);
      setSummary("");
      setAccepted(new Set());
    } catch (e: unknown) {
      toast.error("Couldn't clear plan", { description: e instanceof Error ? e.message : "Try again." });
    }
  };

  const acceptSlot = async (slot: AISlot) => {
    if (!user) return;
    const key = slotKey(slot);
    if (accepted.has(key) || acceptingKeysRef.current.has(key)) return;
    acceptingKeysRef.current.add(key);

    const activity = activities.find((a) => a.id === slot.activity_id);
    const category = activity?.category_id ? categories.find((c) => c.id === activity.category_id) : undefined;
    const type: "productive" | "unproductive" | "essential" = category?.type ?? "productive";

    try {
      await insertTimeLog("cloud", user.id, {
        date: slot.day,
        start_time: slot.start,
        end_time: slot.end,
        type,
        category_id: category?.id ?? null,
        title: slot.activity_name,
        notes: "Accepted from AI plan",
      });
      setAccepted((s) => new Set(s).add(key));
      onSlotAccepted();
    } catch (e: unknown) {
      toast.error("Couldn't accept slot", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      acceptingKeysRef.current.delete(key);
    }
  };

  const acceptAll = async () => {
    if (!user || !plan) return;
    setAcceptingAll(true);
    const pending = (plan as WeeklyPlan).slots.filter((s) => !accepted.has(slotKey(s)));
    if (pending.length === 0) { setAcceptingAll(false); return; }

    const rows = pending.map((slot) => {
      const activity = activities.find((a) => a.id === slot.activity_id);
      const category = activity?.category_id ? categories.find((c) => c.id === activity.category_id) : undefined;
      return {
        user_id: user.id,
        date: slot.day,
        start_time: slot.start,
        end_time: slot.end,
        type: (category?.type ?? "productive") as "productive" | "unproductive" | "essential",
        category_id: category?.id ?? null,
        title: slot.activity_name,
        notes: "Accepted from AI plan",
      };
    });

    try {
      await resources.timeLogs.insertMany(user.id, rows);
      invalidateTimeLogs("cloud", user.id);
      setAccepted((s) => {
        const next = new Set(s);
        pending.forEach((p) => next.add(slotKey(p)));
        return next;
      });
      toast.success("Plan accepted", { description: `${pending.length} slot${pending.length === 1 ? "" : "s"} added to your week.` });
      onSlotAccepted();
    } catch (e: unknown) {
      toast.error("Couldn't accept plan", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setAcceptingAll(false);
    }
  };

  const typedPlan = plan as WeeklyPlan | null;
  const totalMin = typedPlan?.slots.reduce((s, x) => s + (toMin(x.end) - toMin(x.start)), 0) ?? 0;
  const acceptedCount = typedPlan?.slots.filter((s) => accepted.has(slotKey(s))).length ?? 0;
  const allAccepted = typedPlan && acceptedCount === typedPlan.slots.length;
  const loading = generateMutation.isPending;

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
                {typedPlan
                  ? `${typedPlan.slots.length} slots · ${fmtDuration(totalMin)} planned${acceptedCount ? ` · ${acceptedCount} accepted` : ""}`
                  : "Let AI fit your priorities into your free windows."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {typedPlan && !allAccepted && (
              <Button variant="outline" size="sm" onClick={acceptAll} disabled={acceptingAll} className="gap-1.5">
                {acceptingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Accept all
              </Button>
            )}
            {typedPlan && (
              <Button variant="ghost" size="sm" onClick={clearPlan} className="gap-1.5 text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <Button onClick={generate} disabled={loading} size="sm" className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {typedPlan ? "Regenerate" : "Generate plan"}
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

        {typedPlan && typedPlan.slots.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5 max-h-64 overflow-y-auto">
            {typedPlan.slots.map((s) => {
              const key = slotKey(s);
              const isAccepted = accepted.has(key);
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card/40 border border-border/40 text-sm"
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono-num w-12 shrink-0">
                    {/* Parse as LOCAL date — new Date("YYYY-MM-DD") is UTC midnight and
                        shows the previous weekday in timezones west of UTC. */}
                    {(() => {
                      const [y, m, d] = s.day.split("-").map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
                    })()}
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
