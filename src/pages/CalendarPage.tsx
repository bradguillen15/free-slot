import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, fmtDayHeading, fromMin, isoToWeekday, todayISO, toMin } from "@/lib/time";
import { DayTimeline, type ScheduleBlock, type TimeLog } from "@/components/day/DayTimeline";
import { DaySummary } from "@/components/day/DaySummary";
import { QuickLogDialog, type Category } from "@/components/day/QuickLogDialog";
import { ScheduleBlockDialog } from "@/components/day/ScheduleBlockDialog";
import { BlockActionChooser } from "@/components/day/BlockActionChooser";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotebookPen, CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useVisibleCategories, pickerCategories, useScheduleBlocks, useTimeLogsInRange, updateTimeLog } from "@/lib/dataStore";

export default function CalendarPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = searchParams.get("date") || todayISO();
  const [date, setDate] = useState<string>(initialDate);

  // Quick-log dialog state
  const [logOpen, setLogOpen] = useState(false);
  const [logDefaults, setLogDefaults] = useState<{
    start: string; end: string; editId?: string;
    defaultCategoryId?: string; defaultTitle?: string; defaultNotes?: string;
  }>({ start: "09:00", end: "10:00" });

  // Schedule-block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogTarget, setBlockDialogTarget] = useState<{
    block?: ScheduleBlock; defaultStartTime?: string; defaultWeekday?: number;
  }>({});
  // Plan-vs-actual chooser when a block occurrence is clicked
  const [chooserBlock, setChooserBlock] = useState<ScheduleBlock | null>(null);

  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync ?date= on change
  useEffect(() => {
    if (date === todayISO()) {
      if (searchParams.get("date")) {
        const next = new URLSearchParams(searchParams);
        next.delete("date");
        setSearchParams(next, { replace: true });
      }
    } else if (searchParams.get("date") !== date) {
      const next = new URLSearchParams(searchParams);
      next.set("date", date);
      setSearchParams(next, { replace: true });
    }
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekday = isoToWeekday(date);
  const isToday = date === todayISO();

  const { data: allBlocks, refresh: refreshBlocks } = useScheduleBlocks();
  const { data: visibleCategories, all: allCategories, refresh: refreshCats } = useVisibleCategories();
  const { data: dayLogs, setData: setDayLogs, refresh: refreshLogs, mode } = useTimeLogsInRange(date, date);

  const blocks = useMemo(
    () => (allBlocks as unknown as ScheduleBlock[]).filter((x) => x.days_of_week?.includes(weekday)),
    [allBlocks, weekday]
  );
  const logs = dayLogs as unknown as TimeLog[];
  const cats = allCategories as unknown as Category[];
  const logPickerCategories = useMemo(
    () => pickerCategories(visibleCategories as Category[], cats, logDefaults.defaultCategoryId),
    [visibleCategories, cats, logDefaults.defaultCategoryId]
  );
  const blockPickerCategories = useMemo(
    () => pickerCategories(visibleCategories as Category[], cats, blockDialogTarget.block?.category_id),
    [visibleCategories, cats, blockDialogTarget.block?.category_id]
  );

  // Tick "now" line
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to ~7am or "now" — only when the displayed day changes, not on
  // every minute tick (that would yank the viewport away from the user's scroll).
  useEffect(() => {
    if (!scrollRef.current) return;
    const current = new Date();
    const minute = isToday ? current.getHours() * 60 + current.getMinutes() : 7 * 60;
    const top = (minute / 60) * 56 - 120;
    scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [date, isToday]);

  const currentMinute = isToday ? now.getHours() * 60 + now.getMinutes() : null;

  // Listen for "add-block-here" custom event from DayTimeline context menu
  useEffect(() => {
    const handler = (e: Event) => {
      const { startMin } = (e as CustomEvent<{ startMin: number }>).detail;
      const h = Math.floor(startMin / 60);
      const hStr = `${String(h).padStart(2, "0")}:00`;
      // New blocks default to Weekdays (no defaultWeekday) — single-day blocks
      // were a recurring source of confusion.
      setBlockDialogTarget({ defaultStartTime: hStr });
      setBlockDialogOpen(true);
    };
    document.addEventListener("add-block-here", handler);
    return () => document.removeEventListener("add-block-here", handler);
  }, [weekday]);

  const openLogAt = (startMin: number) => {
    const snapped = Math.floor(startMin / 30) * 30;
    setLogDefaults({ start: fromMin(snapped), end: fromMin(snapped + 60) });
    setLogOpen(true);
  };

  const openQuickLog = () => {
    const base = isToday ? now.getHours() * 60 + now.getMinutes() - 30 : 9 * 60;
    openLogAt(Math.max(0, base));
  };

  // Clicking a block occurrence asks: log actual time, or edit the template?
  const handleBlockClick = useCallback((block: ScheduleBlock) => {
    setChooserBlock(block);
  }, []);

  const logFromBlock = useCallback((block: ScheduleBlock) => {
    const start = block.start_time.slice(0, 5);
    const overnight = toMin(block.end_time) <= toMin(block.start_time);
    const end = overnight ? fromMin(Math.min(toMin(start) + 60, 1439)) : block.end_time.slice(0, 5);
    setLogDefaults({ start, end, defaultTitle: block.name, defaultCategoryId: undefined });
    setLogOpen(true);
  }, []);

  const editBlockTemplate = useCallback((block: ScheduleBlock) => {
    setBlockDialogTarget({ block });
    setBlockDialogOpen(true);
  }, []);

  const handleLogClick = useCallback((log: TimeLog) => {
    setLogDefaults({
      start: log.start_time,
      end: log.end_time,
      editId: log.id,
      defaultCategoryId: log.category_id ?? undefined,
      defaultTitle: log.title ?? undefined,
      defaultNotes: log.notes ?? undefined,
    });
    setLogOpen(true);
  }, []);

  const handleLogReschedule = useCallback(
    async (logId: string, newStartMin: number, newEndMin: number) => {
      const log = logs.find((l) => l.id === logId);
      if (!log?.category_id) {
        toast.error("Assign a category before dragging this block.");
        return;
      }
      try {
        await updateTimeLog(mode, user?.id ?? null, logId, {
          start_time: fromMin(newStartMin),
          end_time: fromMin(newEndMin),
          category_id: log.category_id,
          type: log.type,
          notes: log.notes,
        });
        toast.success("Block rescheduled");
        await refreshLogs();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not reschedule";
        toast.error(msg);
      }
    },
    [logs, mode, user?.id, refreshLogs]
  );

  const heading = useMemo(() => fmtDayHeading(date), [date]);

  return (
    <>
      <div className="pt-4 pb-4 w-full lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Day view</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{heading}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setDate(addDaysISO(date, -1))} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate(todayISO())} className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDate(addDaysISO(date, 1))} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:flex-1 lg:min-h-0">
          <div className="relative lg:flex lg:flex-col lg:min-h-0">
            <div className="flex items-center gap-3 px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary/40" /> Planned</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-productive" /> Logged</span>
              <span className="ml-auto">Click a block to edit · right-click to add</span>
            </div>
            <div
              id="day-timeline-root"
              ref={scrollRef}
              className="overflow-y-auto rounded-2xl max-h-[60dvh] lg:max-h-none lg:flex-1 lg:min-h-0"
            >
              <DayTimeline
                blocks={blocks}
                logs={logs}
                categories={cats}
                onSlotClick={openLogAt}
                currentMinute={currentMinute}
                onLogReschedule={handleLogReschedule}
                onBlockClick={handleBlockClick}
                onLogClick={handleLogClick}
              />
            </div>
            {blocks.length === 0 && logs.length === 0 && (
              <div className="mt-3">
                <EmptyState
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Nothing logged yet — that's a clean canvas"
                  description="Click any hour to log time, right-click to add a repeating schedule block."
                  ctaLabel="Quick log"
                  onCtaClick={openQuickLog}
                />
              </div>
            )}
          </div>

          <div className="lg:min-h-0 lg:overflow-y-auto">
            <DaySummary logs={logs} categories={cats} />
          </div>
        </div>

        {/* Split FAB: log time (the common case) or add a recurring block */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-glow flex items-center justify-center animate-pulse-glow"
              aria-label="Add"
            >
              <Plus className="h-6 w-6" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            <DropdownMenuItem onClick={openQuickLog} className="gap-2">
              <NotebookPen className="h-4 w-4" /> {t("schedule.logTime")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setBlockDialogTarget({}); setBlockDialogOpen(true); }}
              className="gap-2"
            >
              <CalendarRange className="h-4 w-4" /> {t("schedule.addBlock")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <BlockActionChooser
          open={!!chooserBlock}
          onOpenChange={(o) => !o && setChooserBlock(null)}
          blockName={chooserBlock?.name ?? ""}
          onLog={() => chooserBlock && logFromBlock(chooserBlock)}
          onEdit={() => chooserBlock && editBlockTemplate(chooserBlock)}
        />

        <QuickLogDialog
          open={logOpen}
          onOpenChange={(v) => {
            setLogOpen(v);
            if (!v) setLogDefaults({ start: "09:00", end: "10:00" });
          }}
          date={date}
          categories={logPickerCategories}
          defaultStart={logDefaults.start}
          defaultEnd={logDefaults.end}
          editId={logDefaults.editId}
          defaultCategoryId={logDefaults.defaultCategoryId}
          defaultTitle={logDefaults.defaultTitle}
          defaultNotes={logDefaults.defaultNotes}
          onOptimisticInsert={(log) => {
            if (log.date === date) setDayLogs((prev) => [...prev, log as typeof prev[0]].sort((a, b) => a.start_time.localeCompare(b.start_time)));
          }}
          onSaved={refreshLogs}
          onDeleted={refreshLogs}
          onCategoriesRefresh={refreshCats}
        />

        <ScheduleBlockDialog
          open={blockDialogOpen}
          onOpenChange={setBlockDialogOpen}
          block={blockDialogTarget.block}
          defaultStartTime={blockDialogTarget.defaultStartTime}
          defaultWeekday={blockDialogTarget.defaultWeekday}
          onSaved={refreshBlocks}
          onDeleted={refreshBlocks}
          categories={blockPickerCategories}
          onCategoriesRefresh={refreshCats}
        />
      </div>
    </>
  );
}
