import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { durationMinutes, fmtDuration, toMin } from "@/lib/time";
import { deleteTimeLog, insertTimeLog, updateTimeLog, upsertCategory } from "@/lib/dataStore";
import { CategoryPicker, nextCreateColor, type PickerCategory } from "@/components/CategoryPicker";

export type Category = {
  id: string;
  name: string;
  color: string;
  type: "productive" | "unproductive";
};

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
    type: "productive" | "unproductive";
    title: string | null;
    notes: string | null;
  }) => void;
};

export function QuickLogDialog({
  open, onOpenChange, date, categories,
  defaultStart = "09:00", defaultEnd = "10:00",
  defaultCategoryId, defaultTitle, defaultNotes, editId,
  onSaved, onDeleted, onOptimisticInsert, onCategoriesRefresh,
}: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [categoryId, setCategoryId] = useState<string | undefined>(defaultCategoryId);
  const [notes, setNotes] = useState(defaultNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle ?? "");
      setStart(defaultStart);
      setEnd(defaultEnd);
      setCategoryId(defaultCategoryId ?? categories[0]?.id);
      setNotes(defaultNotes ?? "");
    }
  }, [open, defaultStart, defaultEnd, defaultCategoryId, defaultTitle, defaultNotes, categories]);

  const duration = useMemo(() => durationMinutes(start, end), [start, end]);
  const selected = categories.find((c) => c.id === categoryId);

  const save = async () => {
    if (!categoryId) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (toMin(end) === toMin(start)) {
      toast.error("End time must be after start");
      return;
    }
    setSaving(true);
    onOpenChange(false);

    try {
      if (editId) {
        await updateTimeLog(user ? "cloud" : "guest", user?.id ?? null, editId, {
          start_time: start,
          end_time: end,
          category_id: categoryId,
          type: selected?.type ?? "productive",
          title: title.trim(),
          notes: notes || null,
        });
        toast.success(`Updated ${fmtDuration(duration)}`);
      } else {
        const optimisticId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
        onOptimisticInsert?.({
          id: optimisticId,
          date,
          start_time: start,
          end_time: end,
          category_id: categoryId,
          type: (selected?.type ?? "productive") as "productive" | "unproductive",
          title: title.trim(),
          notes: notes || null,
        });
        await insertTimeLog(user ? "cloud" : "guest", user?.id ?? null, {
          date,
          start_time: start,
          end_time: end,
          category_id: categoryId,
          type: selected?.type ?? "productive",
          title: title.trim(),
          notes: notes || null,
        });
        toast.success(`Logged ${fmtDuration(duration)}`);
      }
      onSaved?.();
    } catch (err: unknown) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "unknown"}`);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editId) return;
    setDeleting(true);
    try {
      await deleteTimeLog(user ? "cloud" : "guest", user?.id ?? null, editId);
      toast.success("Log deleted");
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setDeleting(false);
    }
  };

  const createLabel = async (name: string, type: "productive" | "unproductive"): Promise<PickerCategory | null> => {
    try {
      const created = await upsertCategory(user ? "cloud" : "guest", user?.id ?? null, {
        name,
        type,
        color: nextCreateColor(categories.length),
      });
      await onCategoriesRefresh?.();
      return created as PickerCategory;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not create label");
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{editId ? "Edit log" : "Log time"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you do? e.g. Breakfast, Standup, Guitar practice"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">End</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="font-mono-num" />
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground font-mono-num">
            Duration · <span className="text-foreground">{fmtDuration(duration)}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Label</Label>
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={(id) => setCategoryId(id || undefined)}
              onCreate={createLabel}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What were you doing?" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {editId && (
              <Button
                variant="destructive"
                onClick={remove}
                disabled={deleting || saving}
                size="sm"
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || deleting || !categoryId}>
              {saving ? "Saving…" : "Save log"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

