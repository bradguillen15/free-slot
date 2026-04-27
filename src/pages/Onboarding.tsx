import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Plus, X, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DAYS, BLOCK_PRESETS, ACTIVITY_PRESETS } from "@/lib/schedule";
import { cn } from "@/lib/utils";

type Block = {
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  color: string;
  type: "fixed" | "waste_expected";
};

type Activity = {
  name: string;
  target_hours_per_week: number;
  category_id?: string | null;
};

type Category = { id: string; name: string; type: "productive" | "unproductive"; color: string };

const STEPS = ["Schedule", "Activities", "Preferences"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Step 1
  const [blocks, setBlocks] = useState<Block[]>([]);
  // Step 2
  const [activities, setActivities] = useState<Activity[]>([]);
  // Step 3
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [peakStart, setPeakStart] = useState("09:00");
  const [peakEnd, setPeakEnd] = useState("12:00");
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [reviewDay, setReviewDay] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("categories").select("id,name,type,color").eq("user_id", user.id);
      if (data) setCategories(data as Category[]);
    })();
  }, [user]);

  const productiveCats = categories.filter((c) => c.type === "productive");

  const addPreset = (p: typeof BLOCK_PRESETS[number]) => {
    if (blocks.some((b) => b.name === p.name)) return;
    setBlocks([...blocks, { ...p }]);
  };

  const addCustomBlock = () =>
    setBlocks([...blocks, { name: "New block", start_time: "08:00", end_time: "09:00", days_of_week: [1,2,3,4,5], color: "#3b82f6", type: "fixed" }]);

  const updateBlock = (i: number, patch: Partial<Block>) =>
    setBlocks(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  const removeBlock = (i: number) => setBlocks(blocks.filter((_, idx) => idx !== i));

  const addActivityPreset = (name: string) => {
    if (activities.some((a) => a.name === name)) return;
    setActivities([...activities, { name, target_hours_per_week: 3, category_id: productiveCats[0]?.id }]);
  };

  const addCustomActivity = () =>
    setActivities([...activities, { name: "New activity", target_hours_per_week: 2, category_id: productiveCats[0]?.id }]);

  const updateActivity = (i: number, patch: Partial<Activity>) =>
    setActivities(activities.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const removeActivity = (i: number) => setActivities(activities.filter((_, idx) => idx !== i));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (blocks.length) {
        const { error: bErr } = await supabase.from("schedule_blocks").insert(
          blocks.map((b) => ({ ...b, user_id: user.id }))
        );
        if (bErr) throw bErr;
      }
      if (activities.length) {
        const { error: aErr } = await supabase.from("activities").insert(
          activities.map((a) => ({ ...a, user_id: user.id, is_active: true }))
        );
        if (aErr) throw aErr;
      }
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          buffer_minutes: bufferMinutes,
          peak_hours: { start: peakStart, end: peakEnd },
          include_weekends: includeWeekends,
          weekly_review_day: reviewDay,
          onboarding_completed: true,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;
      toast.success("You're all set");
      navigate("/app", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const canNext = step === 0 ? true : step === 1 ? true : true;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-50" style={{ backgroundImage: "var(--gradient-glow)" }} />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                    i < step && "bg-primary text-primary-foreground border-primary",
                    i === step && "border-primary text-primary bg-primary/10",
                    i > step && "border-border text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn("text-sm font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px bg-border mt-3 -mb-3" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {step === 0 && (
              <section className="space-y-5">
                <header>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">Map your week</h2>
                  <p className="text-muted-foreground text-sm mt-1">Add the things that already happen on repeat — work, sleep, meals, gym. We'll find the gaps in between.</p>
                </header>

                <div className="flex flex-wrap gap-2">
                  {BLOCK_PRESETS.map((p) => {
                    const added = blocks.some((b) => b.name === p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => addPreset(p)}
                        disabled={added}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          added
                            ? "bg-primary/10 border-primary/40 text-primary cursor-default"
                            : "bg-surface border-border hover:border-primary/40 hover:text-foreground text-muted-foreground"
                        )}
                      >
                        {added ? "✓ " : "+ "}{p.name}
                      </button>
                    );
                  })}
                  <button
                    onClick={addCustomBlock}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    <Plus className="h-3 w-3 inline -mt-0.5 mr-1" />Custom
                  </button>
                </div>

                <div className="space-y-2">
                  {blocks.length === 0 && (
                    <div className="glass border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                      Pick a few presets above to get started.
                    </div>
                  )}
                  {blocks.map((b, i) => (
                    <motion.div
                      key={i}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="h-8 w-1 rounded-full" style={{ backgroundColor: b.color }} />
                      <Input
                        value={b.name}
                        onChange={(e) => updateBlock(i, { name: e.target.value })}
                        className="bg-input border-border w-full sm:w-40"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={b.start_time}
                          onChange={(e) => updateBlock(i, { start_time: e.target.value })}
                          className="bg-input border-border w-28 font-mono"
                        />
                        <span className="text-muted-foreground text-xs">→</span>
                        <Input
                          type="time"
                          value={b.end_time}
                          onChange={(e) => updateBlock(i, { end_time: e.target.value })}
                          className="bg-input border-border w-28 font-mono"
                        />
                      </div>
                      <div className="flex flex-1 gap-1 flex-wrap">
                        {DAYS.map((d) => {
                          const active = b.days_of_week.includes(d.idx);
                          return (
                            <button
                              key={d.idx}
                              onClick={() => updateBlock(i, {
                                days_of_week: active ? b.days_of_week.filter((x) => x !== d.idx) : [...b.days_of_week, d.idx].sort(),
                              })}
                              className={cn(
                                "h-7 w-8 rounded-md text-[10px] font-semibold transition-colors",
                                active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground border border-border"
                              )}
                            >
                              {d.short.slice(0,1)}
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={() => removeBlock(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-5">
                <header>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">What do you want time for?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Pick activities you keep meaning to do. Set a weekly hour target. The plan will fit them into your gaps.</p>
                </header>

                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_PRESETS.map((name) => {
                    const added = activities.some((a) => a.name === name);
                    return (
                      <button
                        key={name}
                        onClick={() => addActivityPreset(name)}
                        disabled={added}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          added
                            ? "bg-primary/10 border-primary/40 text-primary cursor-default"
                            : "bg-surface border-border hover:border-primary/40 hover:text-foreground text-muted-foreground"
                        )}
                      >
                        {added ? "✓ " : "+ "}{name}
                      </button>
                    );
                  })}
                  <button
                    onClick={addCustomActivity}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    <Plus className="h-3 w-3 inline -mt-0.5 mr-1" />Custom
                  </button>
                </div>

                <div className="space-y-2">
                  {activities.length === 0 && (
                    <div className="glass border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                      Add at least one activity to keep going.
                    </div>
                  )}
                  {activities.map((a, i) => (
                    <motion.div
                      key={i}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <Input
                        value={a.name}
                        onChange={(e) => updateActivity(i, { name: e.target.value })}
                        className="bg-input border-border flex-1"
                      />
                      <select
                        value={a.category_id ?? ""}
                        onChange={(e) => updateActivity(i, { category_id: e.target.value || null })}
                        className="bg-input border border-border rounded-md px-3 py-2 text-sm h-10"
                      >
                        {productiveCats.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={a.target_hours_per_week}
                          onChange={(e) => updateActivity(i, { target_hours_per_week: Number(e.target.value) })}
                          className="bg-input border-border w-20 font-mono text-right"
                        />
                        <span className="text-xs text-muted-foreground">hrs/wk</span>
                      </div>
                      <button onClick={() => removeActivity(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-6">
                <header>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">A few preferences</h2>
                  <p className="text-muted-foreground text-sm mt-1">Tune how FreeSlot finds gaps and when it asks you to reflect.</p>
                </header>

                <div className="glass rounded-xl border border-border p-5 space-y-5">
                  <div>
                    <Label className="mb-2 block">Buffer between commitments</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={bufferMinutes}
                        onChange={(e) => setBufferMinutes(Number(e.target.value))}
                        className="bg-input border-border w-24 font-mono text-right"
                      />
                      <span className="text-sm text-muted-foreground">minutes — protects time for transitions</span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Peak focus hours</Label>
                    <div className="flex items-center gap-2">
                      <Input type="time" value={peakStart} onChange={(e) => setPeakStart(e.target.value)} className="bg-input border-border w-32 font-mono" />
                      <span className="text-muted-foreground text-xs">→</span>
                      <Input type="time" value={peakEnd} onChange={(e) => setPeakEnd(e.target.value)} className="bg-input border-border w-32 font-mono" />
                      <span className="text-sm text-muted-foreground ml-2">deep activities prefer this window</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="block">Schedule on weekends</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Include Saturday and Sunday when planning</p>
                    </div>
                    <Switch checked={includeWeekends} onCheckedChange={setIncludeWeekends} />
                  </div>

                  <div>
                    <Label className="mb-2 block">Weekly review day</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map((d) => (
                        <button
                          key={d.idx}
                          onClick={() => setReviewDay(d.idx)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                            reviewDay === d.idx
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-surface border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {d.short}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow"
            >
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={finish}
              disabled={saving}
              className="gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Finish <Check className="h-4 w-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
