import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { ACTIVITY_PRESETS } from "@/lib/schedule";
import { upsertActivity, deleteActivity } from "@/lib/dataStore";
import { Surface } from "@/components/Surface";

const activityDraftSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  categoryId: z.string().optional(),
  target: z.coerce.number().min(0, "Must be ≥ 0"),
});
type ActivityDraftValues = z.infer<typeof activityDraftSchema>;

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
  userId: string | null;
  categories: Category[];
  activities: Activity[];
  onChange: () => void;
}) {
  const mode = userId ? "cloud" : "guest";
  const [local, setLocal] = useState<Activity[]>(activities);

  const form = useForm<ActivityDraftValues>({
    resolver: zodResolver(activityDraftSchema),
    defaultValues: { name: "", categoryId: "", target: 3 },
  });

  useEffect(() => setLocal(activities), [activities]);

  const productiveCats = categories.filter((c) => c.type === "productive");

  const addActivity = async (values: ActivityDraftValues) => {
    try {
      await upsertActivity(mode, userId, {
        name: values.name,
        category_id: values.categoryId || null,
        target_hours_per_week: values.target,
        is_active: true,
      });
      toast.success("Activity added");
      form.reset({ name: "", categoryId: "", target: 3 });
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not add activity");
    }
  };

  const updateActivity = async (a: Activity, patch: Partial<Activity>) => {
    const prevLocal = local; // pre-update snapshot for the revert in catch
    setLocal((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...patch } : x)));
    try {
      await upsertActivity(mode, userId, {
        id: a.id,
        name: patch.name ?? a.name,
        category_id: patch.category_id !== undefined ? patch.category_id : a.category_id,
        target_hours_per_week: patch.target_hours_per_week ?? a.target_hours_per_week,
        is_active: patch.is_active ?? a.is_active,
      });
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update activity");
      setLocal(prevLocal); // revert to the state before this specific edit
    }
  };

  const removeActivity = async (id: string) => {
    try {
      await deleteActivity(mode, userId, id);
      toast.success("Removed");
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not remove activity");
    }
  };

  const catOf = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <Surface elevation="glass" padding="lg" className="space-y-5">
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
              data-testid={`activity-row-${a.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-background/40"
            >
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat?.color ?? "hsl(var(--muted-foreground))" }}
              />
              <Input
                value={a.name}
                data-testid={`activity-name-${a.id}`}
                onChange={(e) => setLocal((p) => p.map((x) => x.id === a.id ? { ...x, name: e.target.value } : x))}
                onBlur={(e) => e.target.value !== a.name && updateActivity(a, { name: e.target.value })}
                className="h-8 flex-1 bg-transparent border-transparent hover:border-border focus:border-border px-2"
              />
              <Select
                value={a.category_id ?? "none"}
                onValueChange={(v) => updateActivity(a, { category_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs" data-testid={`activity-category-${a.id}`}>
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
                    if (!Number.isFinite(v) || v < 0) {
                      setLocal((p) => p.map((x) => x.id === a.id ? { ...x, target_hours_per_week: a.target_hours_per_week } : x));
                      return;
                    }
                    if (v !== a.target_hours_per_week) updateActivity(a, { target_hours_per_week: v });
                  }}
                  className="h-8 w-16 text-center"
                />
                <span className="text-xs text-muted-foreground">h/wk</span>
              </div>
              <Switch
                checked={a.is_active}
                data-testid={`activity-active-${a.id}`}
                onCheckedChange={(v) => updateActivity(a, { is_active: v })}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`activity-delete-${a.id}`} onClick={() => removeActivity(a.id)}>
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
              type="button"
              onClick={() => form.setValue("name", p, { shouldValidate: true })}
              className="text-xs px-2.5 py-1 rounded-md border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(addActivity)} className="flex gap-2 flex-wrap" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[180px]">
                  <FormControl>
                    <Input placeholder="Activity name" data-testid="activity-name-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {productiveCats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className="w-20"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="gap-1.5" data-testid="activity-add">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </Form>
      </div>
    </Surface>
  );
}
