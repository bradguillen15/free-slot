import { useMemo, useState } from "react";
import { CalendarRange, Copy, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScheduleBlockDialog } from "@/components/day/ScheduleBlockDialog";
import type { ScheduleBlock } from "@/components/day/DayTimeline";
import { useCategories, useScheduleBlocks, upsertScheduleBlock, deleteScheduleBlock } from "@/lib/dataStore";
import type { PickerCategory } from "@/components/CategoryPicker";
import { useAuth } from "@/contexts/AuthContext";
import { BLOCK_PRESETS, DAYS } from "@/lib/schedule";
import { toMin } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Monday-first ordering of the canonical DAYS constant. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type PreviewSeg = { top: number; height: number; color: string; key: string };

/** Same overnight attribution as gaps.blocksOnDay, but keeping block identity for colors. */
function previewSegs(blocks: ScheduleBlock[], weekday: number): PreviewSeg[] {
  const prevWeekday = (weekday + 6) % 7;
  const out: PreviewSeg[] = [];
  for (const b of blocks) {
    const s = toMin(b.start_time);
    const e = toMin(b.end_time);
    if (s === e) continue;
    const wraps = e < s;
    const push = (a: number, c: number, suffix: string) =>
      out.push({ top: (a / 1440) * 100, height: ((c - a) / 1440) * 100, color: b.color, key: `${b.id}-${suffix}` });
    if (b.days_of_week?.includes(weekday)) push(s, wraps ? 1440 : e, "own");
    if (wraps && b.days_of_week?.includes(prevWeekday)) push(0, e, "wrap");
  }
  return out;
}

export default function SchedulePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mode = user ? "cloud" : "guest";
  const { data: blocksRaw, refresh } = useScheduleBlocks();
  const { data: categoriesRaw, refresh: refreshCats } = useCategories();
  const blocks = blocksRaw as unknown as ScheduleBlock[];
  const categories = categoriesRaw as unknown as PickerCategory[];

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleBlock | null>(null);

  const update = async (block: ScheduleBlock, patch: Partial<ScheduleBlock>) => {
    const next = { ...block, ...patch };
    if (next.start_time === next.end_time) {
      toast.error("End time must differ from start time");
      refresh(); // snap inputs back to stored values
      return;
    }
    if (!next.name.trim()) {
      toast.error("Name is required");
      refresh();
      return;
    }
    if (next.days_of_week.length === 0) {
      toast.error("Select at least one day");
      return;
    }
    try {
      await upsertScheduleBlock(mode, user?.id ?? null, {
        id: next.id,
        name: next.name.trim(),
        start_time: next.start_time,
        end_time: next.end_time,
        days_of_week: next.days_of_week,
        color: next.color,
        type: next.type ?? "fixed",
      });
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
      refresh();
    }
  };

  const toggleDay = (block: ScheduleBlock, day: number) => {
    const has = block.days_of_week.includes(day);
    if (has && block.days_of_week.length === 1) {
      toast.error("Select at least one day");
      return;
    }
    const days = has
      ? block.days_of_week.filter((d) => d !== day)
      : [...block.days_of_week, day].sort((a, b) => a - b);
    update(block, { days_of_week: days });
  };

  const duplicate = async (block: ScheduleBlock) => {
    try {
      await upsertScheduleBlock(mode, user?.id ?? null, {
        name: `${block.name} (copy)`,
        start_time: block.start_time,
        end_time: block.end_time,
        days_of_week: [...block.days_of_week],
        color: block.color,
        type: block.type ?? "fixed",
      });
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteScheduleBlock(mode, user?.id ?? null, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
    }
  };

  const addPreset = async (preset: typeof BLOCK_PRESETS[number]) => {
    try {
      await upsertScheduleBlock(mode, user?.id ?? null, {
        name: preset.name,
        start_time: preset.start,
        end_time: preset.end,
        days_of_week: [...preset.days],
        color: preset.color,
        type: preset.type,
      });
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
    }
  };

  const usedNames = useMemo(() => new Set(blocks.map((b) => b.name)), [blocks]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" />
            {t("schedule.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-xl">{t("schedule.subtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t("schedule.addBlock")}
        </Button>
      </header>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2">
        {BLOCK_PRESETS.filter((p) => !usedNames.has(p.name)).map((p) => (
          <button
            key={p.name}
            onClick={() => addPreset(p)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
          >
            + {p.name}
          </button>
        ))}
      </div>

      {/* Block rows */}
      <div className="space-y-2">
        {blocks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("schedule.empty")}
          </div>
        )}
        {blocks.map((b) => (
          <div
            key={b.id}
            className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-xl border border-border bg-card/40 p-3"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="color"
                value={b.color}
                onChange={(e) => update(b, { color: e.target.value })}
                className="h-8 w-9 rounded cursor-pointer bg-transparent border border-border shrink-0"
                aria-label={`Color for ${b.name}`}
              />
              <Input
                key={`${b.id}-${b.name}`}
                defaultValue={b.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== b.name) update(b, { name });
                }}
                className="h-9 flex-1 min-w-[120px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                key={`${b.id}-start-${b.start_time}`}
                type="time"
                defaultValue={b.start_time.slice(0, 5)}
                onBlur={(e) => e.target.value !== b.start_time.slice(0, 5) && update(b, { start_time: e.target.value })}
                className="h-9 w-28 font-mono-num"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <Input
                key={`${b.id}-end-${b.end_time}`}
                type="time"
                defaultValue={b.end_time.slice(0, 5)}
                onBlur={(e) => e.target.value !== b.end_time.slice(0, 5) && update(b, { end_time: e.target.value })}
                className="h-9 w-28 font-mono-num"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {DAY_ORDER.map((idx) => {
                const day = DAYS[idx];
                const active = b.days_of_week.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(b, idx)}
                    className={cn(
                      "h-8 w-9 rounded-md text-[10px] font-semibold border transition-colors",
                      active ? "text-primary-foreground border-transparent" : "border-border text-foreground/60 hover:border-primary/40"
                    )}
                    style={active ? { backgroundColor: b.color } : undefined}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicate(b)} aria-label={t("schedule.duplicate")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(b)} aria-label={t("schedule.delete")}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Mini week preview */}
      {blocks.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("schedule.preview")}</div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_ORDER.map((idx) => (
              <div key={idx}>
                <div className="text-center text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {DAYS[idx].short}
                </div>
                <div className="relative h-36 rounded-lg bg-muted/20 overflow-hidden">
                  {previewSegs(blocks, idx).map((s) => (
                    <div
                      key={s.key}
                      className="absolute left-0.5 right-0.5 rounded-sm"
                      style={{ top: `${s.top}%`, height: `${Math.max(s.height, 1.5)}%`, backgroundColor: `${s.color}99` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScheduleBlockDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={refresh}
        categories={categories}
        onCategoriesRefresh={refreshCats}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schedule.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("schedule.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("schedule.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("schedule.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
