import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { upsertScheduleBlock, deleteScheduleBlock, upsertCategory } from "@/lib/dataStore";
import { ColorInput } from "@/components/ColorInput";
import { CategoryPicker, type PickerCategory } from "@/components/CategoryPicker";
import { nextCreateColor } from "@/lib/categoryColors";
import { hexColor, timeString } from "@/lib/formSchemas";
import type { ScheduleBlock } from "./DayTimeline";

const COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#94a3b8",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const scheduleBlockSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  startTime: timeString,
  endTime: timeString,
  color: hexColor,
  days: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one day"),
  categoryId: z.string().optional(),
}).refine((v) => v.startTime !== v.endTime, {
  // end < start is a valid overnight block; equal times would expand to nothing.
  message: "End time must differ from start time",
  path: ["endTime"],
});

type ScheduleBlockValues = z.infer<typeof scheduleBlockSchema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Undefined = create mode; defined = edit mode. */
  block?: ScheduleBlock;
  /** Pre-fill start time when creating from timeline context-menu. */
  defaultStartTime?: string;
  /** Pre-select this weekday when creating from context-menu. */
  defaultWeekday?: number;
  onSaved?: () => void;
  onDeleted?: () => void;
  /** Optional label assignment; omit to hide the picker. */
  categories?: PickerCategory[];
  onCategoriesRefresh?: () => void | Promise<void>;
};

export function ScheduleBlockDialog({
  open, onOpenChange, block,
  defaultStartTime, defaultWeekday,
  onSaved, onDeleted,
  categories, onCategoriesRefresh,
}: Props) {
  const { user } = useAuth();
  const mode = user ? "cloud" : "guest";

  const buildDefaults = (): ScheduleBlockValues => ({
    name: block?.name ?? "",
    startTime: block?.start_time ?? defaultStartTime ?? "09:00",
    endTime: block?.end_time ?? "10:00",
    color: block?.color ?? COLORS[0],
    days: block?.days_of_week ?? (defaultWeekday != null ? [defaultWeekday] : WEEKDAYS),
    categoryId: block?.category_id ?? "",
  });

  const form = useForm<ScheduleBlockValues>({
    resolver: zodResolver(scheduleBlockSchema),
    defaultValues: buildDefaults(),
  });
  const [deleting, setDeleting] = useState(false);

  // Re-sync when the target block or defaults change (e.g. user clicks different block)
  useEffect(() => {
    if (open) form.reset(buildDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable from useForm; including it would loop on reset
  }, [open, block, defaultStartTime, defaultWeekday]);

  const days = form.watch("days");
  const color = form.watch("color");

  const isPreset = (preset: number[]) =>
    days.length === preset.length && preset.every((d) => days.includes(d));

  const save = async (values: ScheduleBlockValues) => {
    try {
      await upsertScheduleBlock(mode, user?.id ?? null, {
        id: block?.id,
        name: values.name,
        start_time: values.startTime,
        end_time: values.endTime,
        days_of_week: values.days,
        color: values.color,
        type: "fixed",
        category_id: values.categoryId || null,
      });
      toast.success(block ? "Block updated" : "Block created");
      onOpenChange(false);
      onSaved?.();
    } catch (err: unknown) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const remove = async () => {
    if (!block) return;
    setDeleting(true);
    try {
      await deleteScheduleBlock(mode, user?.id ?? null, block.id);
      toast.success("Block deleted");
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {block ? "Edit schedule block" : "Add schedule block"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(save)} className="space-y-5" noValidate>
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                  <FormControl>
                    <Input placeholder="e.g. Work, College, Gym…" data-testid="schedule-dialog-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time range */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start</Label>
                    <FormControl>
                      <Input type="time" className="font-mono-num" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">End</Label>
                    <FormControl>
                      <Input type="time" className="font-mono-num" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Color ${c}`}
                        onClick={() => field.onChange(c)}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition-transform",
                          field.value === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <FormControl>
                    <ColorInput
                      value={field.value}
                      onChange={field.onChange}
                      ariaLabel="Custom color"
                      placeholder="#6366f1"
                      className="pt-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional label */}
            {categories && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Label (optional)</Label>
                    <FormControl>
                      <CategoryPicker
                        categories={categories}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        allowNone
                        onCreate={async (catName, type) => {
                          try {
                            const created = await upsertCategory(mode, user?.id ?? null, {
                              name: catName,
                              type,
                              color: nextCreateColor(categories.length),
                            });
                            await onCategoriesRefresh?.();
                            return created as PickerCategory;
                          } catch (err: unknown) {
                            toast.error(err instanceof Error ? err.message : "Could not create label");
                            return null;
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Recurrence day-picker */}
            <FormField
              control={form.control}
              name="days"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Repeats on</Label>

                  {/* Preset chips */}
                  <div className="flex gap-2">
                    {([
                      { label: "Every day", preset: ALL_DAYS },
                      { label: "Weekdays", preset: WEEKDAYS },
                      { label: "Weekends", preset: WEEKEND },
                    ] as const).map(({ label, preset }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => field.onChange([...preset])}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                          isPreset(preset as unknown as number[])
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground/70 hover:border-primary/50"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Individual day toggles */}
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          field.onChange(
                            field.value.includes(idx)
                              ? field.value.filter((x) => x !== idx)
                              : [...field.value, idx].sort((a, b) => a - b)
                          )
                        }
                        className={cn(
                          "h-8 w-10 rounded-md text-xs font-medium border transition-all",
                          field.value.includes(idx)
                            ? "text-primary-foreground border-transparent"
                            : "border-border text-foreground/60 hover:border-primary/40"
                        )}
                        style={field.value.includes(idx) ? { backgroundColor: color } : undefined}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {field.value.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one day</p>
                  )}
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {block && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={remove}
                    disabled={deleting || form.formState.isSubmitting}
                    size="sm"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting || days.length === 0} data-testid="schedule-dialog-submit">
                  {form.formState.isSubmitting ? "Saving…" : block ? "Save changes" : "Add block"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
