import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { RequiredMark } from "@/components/ui/required-mark";
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

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const makeScheduleBlockSchema = (t: TFunction) => z.object({
  name: z.string().trim().min(1, t("validation.nameRequired")),
  startTime: timeString(t),
  endTime: timeString(t),
  color: hexColor(t),
  days: z.array(z.number().int().min(0).max(6)).min(1, t("validation.selectDay")),
  categoryId: z.string().min(1, t("validation.pickLabel")),
}).refine((v) => v.startTime !== v.endTime, {
  // end < start is a valid overnight block; equal times would expand to nothing.
  message: t("validation.endDiffer"),
  path: ["endTime"],
});

type ScheduleBlockValues = z.infer<ReturnType<typeof makeScheduleBlockSchema>>;

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
  /** Label options for the picker. Required so the mandatory categoryId field is always satisfiable. */
  categories: PickerCategory[];
  onCategoriesRefresh?: () => void | Promise<void>;
};

export function ScheduleBlockDialog({
  open, onOpenChange, block,
  defaultStartTime, defaultWeekday,
  onSaved, onDeleted,
  categories, onCategoriesRefresh,
}: Props) {
  const { t } = useTranslation();
  const dayLabels = t("scheduleBlock.dayLabels", { returnObjects: true }) as string[];
  const { user } = useAuth();
  const timeFormat = useTimeFormat();
  const mode = user ? "cloud" : "guest";

  const scheduleBlockSchema = useMemo(() => makeScheduleBlockSchema(t), [t]);

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
        category_id: values.categoryId,
      });
      toast.success(block ? t("scheduleBlock.updated") : t("scheduleBlock.created"));
      onOpenChange(false);
      onSaved?.();
    } catch (err: unknown) {
      toast.error(t("scheduleBlock.saveFailed", { error: err instanceof Error ? err.message : "unknown" }));
    }
  };

  const remove = async () => {
    if (!block) return;
    setDeleting(true);
    try {
      await deleteScheduleBlock(mode, user?.id ?? null, block.id);
      toast.success(t("scheduleBlock.deleted"));
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      toast.error(t("scheduleBlock.deleteFailed", { error: err instanceof Error ? err.message : "unknown" }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {block ? t("scheduleBlock.editTitle") : t("scheduleBlock.createTitle")}
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
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("fields.name")}<RequiredMark />
                  </Label>
                  <FormControl>
                    <Input placeholder={t("scheduleBlock.namePlaceholder")} data-testid="schedule-dialog-name" {...field} />
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
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("fields.start")}<RequiredMark />
                    </Label>
                    <FormControl>
                      <TimeInput
                        value={field.value}
                        onChange={field.onChange}
                        format={timeFormat}
                        aria-label={t("fields.start")}
                        data-testid="schedule-block-start"
                      />
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
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("fields.end")}<RequiredMark />
                    </Label>
                    <FormControl>
                      <TimeInput
                        value={field.value}
                        onChange={field.onChange}
                        format={timeFormat}
                        aria-label={t("fields.end")}
                        data-testid="schedule-block-end"
                      />
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
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("fields.color")}<RequiredMark />
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={t("scheduleBlock.colorAria", { color: c })}
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
                      ariaLabel={t("scheduleBlock.customColor")}
                      placeholder="#6366f1"
                      className="pt-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Label */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("fields.label")}<RequiredMark />
                  </Label>
                  <FormControl>
                    <CategoryPicker
                      categories={categories}
                      value={field.value}
                      onChange={(id) => field.onChange(id || "")}
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
                          toast.error(err instanceof Error ? err.message : t("scheduleBlock.couldNotCreateLabel"));
                          return null;
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurrence day-picker */}
            <FormField
              control={form.control}
              name="days"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("scheduleBlock.repeatsOn")}<RequiredMark />
                  </Label>

                  {/* Preset chips */}
                  <div className="flex gap-2">
                    {([
                      { label: t("scheduleBlock.everyDay"), preset: ALL_DAYS },
                      { label: t("scheduleBlock.weekdays"), preset: WEEKDAYS },
                      { label: t("scheduleBlock.weekends"), preset: WEEKEND },
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
                    {dayLabels.map((label, idx) => (
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

                  <FormMessage />
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
                    {deleting ? t("actions.deleting") : t("actions.delete")}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("actions.cancel")}</Button>
                <Button type="submit" disabled={form.formState.isSubmitting || deleting} data-testid="schedule-dialog-submit" className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                  {form.formState.isSubmitting ? t("actions.saving") : block ? t("actions.save") : t("actions.add")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
