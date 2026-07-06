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
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { addDaysISO, durationMinutes, fmtDuration, toMin } from "@/lib/time";
import { useDeleteTimeLogMutation, useInsertTimeLogMutation, useUpdateTimeLogMutation, useUpsertCategoryMutation } from "@/lib/dataStore";
import { CategoryPicker, type PickerCategory } from "@/components/CategoryPicker";
import { nextCreateColor } from "@/lib/categoryColors";
import { timeString } from "@/lib/formSchemas";
import { toastError, errorMessage } from "@/lib/toastError";

const makeQuickLogSchema = (t: TFunction) => z.object({
  title: z.string().trim().min(1, t("validation.titleRequired")),
  start: timeString(t),
  end: timeString(t),
  categoryId: z.string().min(1, t("validation.pickLabel")),
  notes: z.string().optional(),
}).refine((v) => toMin(v.end) !== toMin(v.start), {
  message: t("validation.endDiffer"),
  path: ["end"],
});

type QuickLogValues = z.infer<ReturnType<typeof makeQuickLogSchema>>;

export type Category = PickerCategory;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  categories: Category[];
  defaultStart?: string;
  defaultEnd?: string;
  defaultCategoryId?: string;
  defaultTitle?: string;
  defaultNotes?: string;
  editId?: string;
  /** Actual stored date of the log being edited — needed to preserve overnight log dates. */
  editDate?: string;
  onSaved?: () => void;
  onDeleted?: () => void;
  /** Called after a label is created on the fly so the parent refreshes its category list. */
  onCategoriesRefresh?: () => void | Promise<void>;
  onOptimisticInsert?: (log: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    category_id: string;
    type: "productive" | "unproductive" | "essential";
    title: string | null;
    notes: string | null;
  }) => void;
};

export function QuickLogDialog({
  open, onOpenChange, date, categories,
  defaultStart = "09:00", defaultEnd = "10:00",
  defaultCategoryId, defaultTitle, defaultNotes, editId, editDate,
  onSaved, onDeleted, onOptimisticInsert, onCategoriesRefresh,
}: Props) {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const [deleting, setDeleting] = useState(false);
  const insertTimeLogMutation = useInsertTimeLogMutation();
  const updateTimeLogMutation = useUpdateTimeLogMutation();
  const deleteTimeLogMutation = useDeleteTimeLogMutation();
  const upsertCategoryMutation = useUpsertCategoryMutation();

  const quickLogSchema = useMemo(() => makeQuickLogSchema(t), [t]);

  const form = useForm<QuickLogValues>({
    resolver: zodResolver(quickLogSchema),
    defaultValues: {
      title: defaultTitle ?? "",
      start: defaultStart,
      end: defaultEnd,
      categoryId: defaultCategoryId ?? "",
      notes: defaultNotes ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: defaultTitle ?? "",
        start: defaultStart,
        end: defaultEnd,
        categoryId: defaultCategoryId ?? "",
        notes: defaultNotes ?? "",
      });
    }
  }, [open, defaultStart, defaultEnd, defaultCategoryId, defaultTitle, defaultNotes, categories, form]);

  const start = form.watch("start");
  const end = form.watch("end");
  const duration = durationMinutes(start, end);
  const isOvernight = end !== "" && start !== "" && toMin(end) < toMin(start);

  const save = async (values: QuickLogValues) => {
    const selected = categories.find((c) => c.id === values.categoryId);
    const dur = durationMinutes(values.start, values.end);
    const overnight = toMin(values.end) < toMin(values.start);
    // Overnight logs start the previous day relative to the viewed page.
    // On edit we preserve the original stored date to avoid double-shifting.
    const logDate = overnight
      ? editId ? (editDate ?? addDaysISO(date, -1)) : addDaysISO(date, -1)
      : date;
    onOpenChange(false);

    try {
      if (editId) {
        await updateTimeLogMutation.mutateAsync({
          id: editId,
          input: {
            date: logDate,
            start_time: values.start,
            end_time: values.end,
            category_id: values.categoryId,
            type: selected?.type ?? "productive",
            title: values.title,
            notes: values.notes || null,
          },
        });
        toast.success(t("quickLog.updated", { duration: fmtDuration(dur) }));
      } else {
        const optimisticId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
        onOptimisticInsert?.({
          id: optimisticId,
          date: logDate,
          start_time: values.start,
          end_time: values.end,
          category_id: values.categoryId,
          type: (selected?.type ?? "productive") as "productive" | "unproductive" | "essential",
          title: values.title,
          notes: values.notes || null,
        });
        await insertTimeLogMutation.mutateAsync({
          date: logDate,
          start_time: values.start,
          end_time: values.end,
          category_id: values.categoryId,
          type: selected?.type ?? "productive",
          title: values.title,
          notes: values.notes || null,
        });
        toast.success(t("quickLog.logged", { duration: fmtDuration(dur) }));
      }
      onSaved?.();
    } catch (err: unknown) {
      toast.error(t("quickLog.saveFailed", { error: errorMessage(err) }));
      onSaved?.();
    }
  };

  const remove = async () => {
    if (!editId) return;
    setDeleting(true);
    try {
      await deleteTimeLogMutation.mutateAsync(editId);
      toast.success(t("quickLog.logDeleted"));
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      toast.error(t("quickLog.deleteFailed", { error: errorMessage(err) }));
    } finally {
      setDeleting(false);
    }
  };

  const createLabel = async (name: string, type: "productive" | "unproductive" | "essential"): Promise<PickerCategory | null> => {
    try {
      const created = await upsertCategoryMutation.mutateAsync({
        name,
        type,
        color: nextCreateColor(categories.length),
      });
      await onCategoriesRefresh?.();
      return created;
    } catch (err: unknown) {
      toastError(err, t, "quickLog.couldNotCreateLabel");
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{editId ? t("quickLog.editTitle") : t("quickLog.createTitle")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(save)} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("fields.title")}<RequiredMark />
                  </Label>
                  <FormControl>
                    <Input
                      placeholder={t("quickLog.titlePlaceholder")}
                      autoFocus
                      data-testid="quicklog-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start"
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
                        data-testid="quicklog-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end"
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
                        data-testid="quicklog-end"
                      />
                    </FormControl>
                    {isOvernight && (
                      <p className="text-[10px] text-muted-foreground">{t("quickLog.nextDayHint")}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground font-mono-num">
              {t("quickLog.duration")} · <span className="text-foreground">{fmtDuration(duration)}</span>
            </div>

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
                      onCreate={createLabel}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("fields.notes")}</Label>
                  <FormControl>
                    <Textarea rows={2} placeholder={t("quickLog.notesPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="justify-between">
              <div className="shrink-0">
                {editId && (
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
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("actions.cancel")}</Button>
                <Button type="submit" disabled={form.formState.isSubmitting || deleting} data-testid="quicklog-submit" className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                  {form.formState.isSubmitting ? t("actions.saving") : t("actions.save")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

