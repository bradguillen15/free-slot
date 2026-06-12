import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarRange, Copy, GripVertical, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScheduleBlockDialog } from "@/components/day/ScheduleBlockDialog";
import type { ScheduleBlock } from "@/components/day/DayTimeline";
import {
  useVisibleCategories,
  pickerCategories,
  useScheduleBlocks,
  upsertScheduleBlock,
  deleteScheduleBlock,
  reorderScheduleBlocks,
} from "@/lib/dataStore";
import type { PickerCategory } from "@/components/CategoryPicker";
import { useAuth } from "@/contexts/AuthContext";
import { BLOCK_PRESETS, DAYS } from "@/lib/schedule";
import { findScheduleCollisions, groupScheduleCollisions } from "@/lib/scheduleCollisions";
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

type SortableScheduleRowProps = {
  block: ScheduleBlock;
  onUpdate: (block: ScheduleBlock, patch: Partial<ScheduleBlock>) => void;
  onToggleDay: (block: ScheduleBlock, day: number) => void;
  onEdit: (block: ScheduleBlock) => void;
  onDuplicate: (block: ScheduleBlock) => void;
  onDelete: (block: ScheduleBlock) => void;
  duplicateLabel: string;
  editLabel: string;
  deleteLabel: string;
  dragLabel: string;
};

function IconTooltipButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)} onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function SortableScheduleRow({
  block: b,
  onUpdate,
  onToggleDay,
  onEdit,
  onDuplicate,
  onDelete,
  duplicateLabel,
  editLabel,
  deleteLabel,
  dragLabel,
}: SortableScheduleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-xl border border-border bg-card/40 p-3"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0"
              aria-label={dragLabel}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{dragLabel}</TooltipContent>
        </Tooltip>
        <span
          className="h-8 w-2 rounded-full shrink-0 border border-border/50"
          style={{ backgroundColor: b.color }}
          aria-hidden
        />
        <Input
          key={`${b.id}-${b.name}`}
          defaultValue={b.name}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== b.name) onUpdate(b, { name });
          }}
          className="h-9 flex-1 min-w-[120px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          key={`${b.id}-start-${b.start_time}`}
          type="time"
          defaultValue={b.start_time.slice(0, 5)}
          onBlur={(e) => e.target.value !== b.start_time.slice(0, 5) && onUpdate(b, { start_time: e.target.value })}
          className="h-9 w-28 font-mono-num"
        />
        <span className="text-muted-foreground text-xs">→</span>
        <Input
          key={`${b.id}-end-${b.end_time}`}
          type="time"
          defaultValue={b.end_time.slice(0, 5)}
          onBlur={(e) => e.target.value !== b.end_time.slice(0, 5) && onUpdate(b, { end_time: e.target.value })}
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
              onClick={() => onToggleDay(b, idx)}
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
        <IconTooltipButton label={editLabel} onClick={() => onEdit(b)}>
          <Pencil className="h-3.5 w-3.5" />
        </IconTooltipButton>
        <IconTooltipButton label={duplicateLabel} onClick={() => onDuplicate(b)}>
          <Copy className="h-3.5 w-3.5" />
        </IconTooltipButton>
        <IconTooltipButton label={deleteLabel} onClick={() => onDelete(b)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </IconTooltipButton>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mode = user ? "cloud" : "guest";
  const { data: blocksRaw, refresh } = useScheduleBlocks();
  const { data: categoriesRaw, all: allCategoriesRaw, refresh: refreshCats } = useVisibleCategories();
  const blocks = blocksRaw as unknown as ScheduleBlock[];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogBlock, setDialogBlock] = useState<ScheduleBlock | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ScheduleBlock | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const dialogPickerCategories = useMemo(
    () => pickerCategories(
      categoriesRaw as PickerCategory[],
      allCategoriesRaw as PickerCategory[],
      dialogBlock?.category_id
    ),
    [categoriesRaw, allCategoriesRaw, dialogBlock?.category_id]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setOrderedIds(blocks.map((b) => b.id));
  }, [blocks]);

  const orderedBlocks = useMemo(() => {
    const byId = new Map(blocks.map((b) => [b.id, b]));
    return orderedIds.map((id) => byId.get(id)).filter((b): b is ScheduleBlock => !!b);
  }, [blocks, orderedIds]);

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
      const created = await upsertScheduleBlock(mode, user?.id ?? null, {
        name: `${block.name} (copy)`,
        start_time: block.start_time,
        end_time: block.end_time,
        days_of_week: [...block.days_of_week],
        color: block.color,
        type: block.type ?? "fixed",
        category_id: block.category_id ?? null,
      });
      const copyId = (created as { id: string }).id;
      const idx = orderedIds.indexOf(block.id);
      const nextIds =
        idx >= 0
          ? [...orderedIds.slice(0, idx + 1), copyId, ...orderedIds.slice(idx + 1)]
          : [...orderedIds, copyId];
      await reorderScheduleBlocks(mode, user?.id ?? null, nextIds);
      setOrderedIds(nextIds);
      refresh();
      toast.success(t("schedule.duplicated"));
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

  const overlapGroups = useMemo(() => {
    return groupScheduleCollisions(
      findScheduleCollisions(
        orderedBlocks.map((b) => ({
          id: b.id,
          name: b.name,
          start_time: b.start_time,
          end_time: b.end_time,
          days_of_week: b.days_of_week,
        }))
      )
    );
  }, [orderedBlocks]);

  const formatOverlapDays = (weekdays: number[]) =>
    weekdays
      .map((w) => DAYS.find((d) => d.idx === w)?.short)
      .filter(Boolean)
      .join(", ");

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = orderedIds.indexOf(String(active.id));
    const newIdx = orderedIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const nextIds = arrayMove(orderedIds, oldIdx, newIdx);
    setOrderedIds(nextIds);
    try {
      await reorderScheduleBlocks(mode, user?.id ?? null, nextIds);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
      setOrderedIds(blocks.map((b) => b.id));
    }
  };

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
        <Button onClick={() => { setDialogBlock(undefined); setDialogOpen(true); }} className="gap-1.5">
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
        {blocks.length > 1 && (
          <p className="text-xs text-muted-foreground">{t("schedule.dragHint")}</p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedBlocks.map((b) => (
                <SortableScheduleRow
                  key={b.id}
                  block={b}
                  onUpdate={update}
                  onToggleDay={toggleDay}
                  onEdit={(block) => { setDialogBlock(block); setDialogOpen(true); }}
                  onDuplicate={duplicate}
                  onDelete={setDeleteTarget}
                  duplicateLabel={t("schedule.duplicate")}
                  editLabel={t("schedule.edit")}
                  deleteLabel={t("schedule.delete")}
                  dragLabel={t("schedule.dragToReorder")}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {overlapGroups.length > 0 && (
          <Alert className="border-warning/40 bg-warning/10 text-warning [&>svg]:text-warning">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>{t("schedule.overlapTitle")}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                {overlapGroups.map((g) => (
                  <li key={`${g.blockA.id}-${g.blockB.id}`}>
                    {t("schedule.overlapLine", {
                      a: g.blockA.name,
                      b: g.blockB.name,
                      days: formatOverlapDays(g.weekdays),
                    })}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
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
                  {previewSegs(orderedBlocks, idx).map((s) => (
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
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogBlock(undefined);
        }}
        block={dialogBlock}
        onSaved={refresh}
        categories={dialogPickerCategories}
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
