import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { upsertScheduleBlock, deleteScheduleBlock } from "@/lib/dataStore";
import type { ScheduleBlock } from "./DayTimeline";

const COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#94a3b8",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

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
};

export function ScheduleBlockDialog({
  open, onOpenChange, block,
  defaultStartTime, defaultWeekday,
  onSaved, onDeleted,
}: Props) {
  const { user } = useAuth();
  const mode = user ? "cloud" : "guest";

  const [name, setName] = useState(block?.name ?? "");
  const [startTime, setStartTime] = useState(block?.start_time ?? defaultStartTime ?? "09:00");
  const [endTime, setEndTime] = useState(block?.end_time ?? "10:00");
  const [color, setColor] = useState(block?.color ?? COLORS[0]);
  const [days, setDays] = useState<number[]>(
    block?.days_of_week ?? (defaultWeekday != null ? [defaultWeekday] : WEEKDAYS)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Re-sync when the target block or defaults change (e.g. user clicks different block)
  useEffect(() => {
    if (open) {
      setName(block?.name ?? "");
      setStartTime(block?.start_time ?? defaultStartTime ?? "09:00");
      setEndTime(block?.end_time ?? "10:00");
      setColor(block?.color ?? COLORS[0]);
      setDays(block?.days_of_week ?? (defaultWeekday != null ? [defaultWeekday] : WEEKDAYS));
    }
  }, [open, block, defaultStartTime, defaultWeekday]);

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const setPreset = (preset: number[]) => setDays([...preset]);

  const isPreset = (preset: number[]) =>
    days.length === preset.length && preset.every((d) => days.includes(d));

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (days.length === 0) { toast.error("Select at least one day"); return; }
    // end < start is a valid overnight block; equal times would expand to nothing.
    if (startTime === endTime) { toast.error("End time must differ from start time"); return; }
    setSaving(true);
    try {
      await upsertScheduleBlock(mode, user?.id ?? null, {
        id: block?.id,
        name: name.trim(),
        start_time: startTime,
        end_time: endTime,
        days_of_week: days,
        color,
        type: "fixed",
      });
      toast.success(block ? "Block updated" : "Block created");
      onOpenChange(false);
      onSaved?.();
    } catch (err: unknown) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSaving(false);
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

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, College, Gym…"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-mono-num"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="font-mono-num"
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Recurrence day-picker */}
          <div className="space-y-2">
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
                  onClick={() => setPreset(preset as unknown as number[])}
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
                  onClick={() => toggleDay(idx)}
                  className={cn(
                    "h-8 w-10 rounded-md text-xs font-medium border transition-all",
                    days.includes(idx)
                      ? "text-primary-foreground border-transparent"
                      : "border-border text-foreground/60 hover:border-primary/40"
                  )}
                  style={days.includes(idx) ? { backgroundColor: color } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>

            {days.length === 0 && (
              <p className="text-xs text-destructive">Select at least one day</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {block && (
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
            <Button onClick={save} disabled={saving || days.length === 0}>
              {saving ? "Saving…" : block ? "Save changes" : "Add block"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
