import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { fmtDuration, toMin } from "@/lib/time";
import { insertTimeLog } from "@/lib/dataStore";

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
  onSaved?: () => void;
  onOptimisticInsert?: (log: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    category_id: string;
    type: "productive" | "unproductive";
    notes: string | null;
  }) => void;
};

export function QuickLogDialog({
  open, onOpenChange, date, categories,
  defaultStart = "09:00", defaultEnd = "10:00",
  defaultCategoryId, onSaved, onOptimisticInsert,
}: Props) {
  const { user } = useAuth();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [categoryId, setCategoryId] = useState<string | undefined>(defaultCategoryId);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStart(defaultStart);
      setEnd(defaultEnd);
      setCategoryId(defaultCategoryId ?? categories[0]?.id);
      setNotes("");
    }
  }, [open, defaultStart, defaultEnd, defaultCategoryId, categories]);

  const duration = useMemo(() => Math.max(0, toMin(end) - toMin(start)), [start, end]);
  const selected = categories.find((c) => c.id === categoryId);

  const save = async () => {
    if (!categoryId) return;
    if (toMin(end) <= toMin(start)) {
      toast.error("End time must be after start");
      return;
    }
    setSaving(true);

    const optimisticId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `tmp-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      date,
      start_time: start,
      end_time: end,
      category_id: categoryId,
      type: (selected?.type ?? "productive") as "productive" | "unproductive",
      notes: notes || null,
    };
    onOptimisticInsert?.(optimistic);
    onOpenChange(false);
    toast.success(`Logged ${fmtDuration(duration)}`);

    try {
      await insertTimeLog(user ? "cloud" : "guest", user?.id ?? null, {
        date,
        start_time: start,
        end_time: end,
        category_id: categoryId,
        type: selected?.type ?? "productive",
        notes: notes || null,
      });
      onSaved?.();
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message ?? "unknown"}`);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const productive = categories.filter((c) => c.type === "productive");
  const unproductive = categories.filter((c) => c.type === "unproductive");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Log time</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
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

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Productive</Label>
            <div className="flex flex-wrap gap-1.5">
              {productive.map((c) => (
                <CategoryChip key={c.id} c={c} active={c.id === categoryId} onClick={() => setCategoryId(c.id)} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unproductive</Label>
            <div className="flex flex-wrap gap-1.5">
              {unproductive.map((c) => (
                <CategoryChip key={c.id} c={c} active={c.id === categoryId} onClick={() => setCategoryId(c.id)} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What were you doing?" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !categoryId}>{saving ? "Saving…" : "Save log"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryChip({ c, active, onClick }: { c: Category; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
        active
          ? "border-transparent text-primary-foreground shadow-soft"
          : "border-border text-foreground/80 hover:border-primary/40 hover:text-foreground"
      )}
      style={active ? { backgroundColor: c.color } : undefined}
    >
      <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ backgroundColor: c.color }} />
      {c.name}
    </button>
  );
}
