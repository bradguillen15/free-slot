import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Target, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ACTIVITY_PRESETS } from "@/lib/schedule";

type Category = { id: string; name: string; color: string; type: "productive" | "unproductive" };
type Activity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

export function ActivityEditor({
  userId,
  categories,
  activities,
  onChange,
}: {
  userId: string;
  categories: Category[];
  activities: Activity[];
  onChange: () => void;
}) {
  const [draft, setDraft] = useState({ name: "", category_id: "", target: 3 });
  const [local, setLocal] = useState<Activity[]>(activities);

  useEffect(() => setLocal(activities), [activities]);

  const productiveCats = categories.filter((c) => c.type === "productive");

  const addActivity = async () => {
    if (!draft.name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("activities").insert({
      user_id: userId,
      name: draft.name.trim(),
      category_id: draft.category_id || null,
      target_hours_per_week: draft.target,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Activity added");
    setDraft({ name: "", category_id: "", target: 3 });
    onChange();
  };

  const updateActivity = async (a: Activity, patch: Partial<Activity>) => {
    setLocal((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("activities").update(patch).eq("id", a.id);
    if (error) toast.error(error.message);
    else onChange();
  };

  const removeActivity = async (id: string) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    onChange();
  };

  const catOf = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Goal stack</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {local.filter((a) => a.is_active).length} active
        </span>
      </div>

      <div className="space-y-2">
        {local.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No activities yet. Add one below.
          </p>
        )}
        {local.map((a) => {
          const cat = catOf(a.category_id);
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-background/40"
            >
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat?.color ?? "hsl(var(--muted-foreground))" }}
              />
              <Input
                value={a.name}
                onChange={(e) => setLocal((p) => p.map((x) => x.id === a.id ? { ...x, name: e.target.value } : x))}
                onBlur={(e) => e.target.value !== a.name && updateActivity(a, { name: e.target.value })}
                className="h-8 flex-1 bg-transparent border-transparent hover:border-border focus:border-border px-2"
              />
              <Select
                value={a.category_id ?? "none"}
                onValueChange={(v) => updateActivity(a, { category_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {productiveCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={a.target_hours_per_week}
                  onChange={(e) => setLocal((p) => p.map((x) => x.id === a.id ? { ...x, target_hours_per_week: Number(e.target.value) } : x))}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== a.target_hours_per_week) updateActivity(a, { target_hours_per_week: v });
                  }}
                  className="h-8 w-16 text-center"
                />
                <span className="text-xs text-muted-foreground">h/wk</span>
              </div>
              <Switch
                checked={a.is_active}
                onCheckedChange={(v) => updateActivity(a, { is_active: v })}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeActivity(a.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border/60 space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Add activity</Label>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_PRESETS.filter((p) => !local.some((a) => a.name.toLowerCase() === p.toLowerCase())).map((p) => (
            <button
              key={p}
              onClick={() => setDraft((d) => ({ ...d, name: p }))}
              className="text-xs px-2.5 py-1 rounded-md border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Activity name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="flex-1 min-w-[180px]"
          />
          <Select value={draft.category_id || "none"} onValueChange={(v) => setDraft({ ...draft, category_id: v === "none" ? "" : v })}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {productiveCats.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={draft.target}
            onChange={(e) => setDraft({ ...draft, target: Number(e.target.value) })}
            className="w-20"
          />
          <Button onClick={addActivity} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
