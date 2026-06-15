import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, fmtDayHeading, fromMin, isoToWeekday, todayISO } from "@/lib/time";
import { logDefaultsFromBlock } from "@/lib/schedule";
import { DayTimeline, type ScheduleBlock, type TimeLog } from "@/components/day/DayTimeline";
import { DaySummary } from "@/components/day/DaySummary";
import { QuickLogDialog, type Category } from "@/components/day/QuickLogDialog";
import { ScheduleBlockDialog } from "@/components/day/ScheduleBlockDialog";
import { BlockActionChooser } from "@/components/day/BlockActionChooser";
import { CalendarNav } from "@/components/calendar/CalendarNav";
import { CalendarCreateMenu } from "@/components/calendar/CalendarCreateMenu";
import { toast } from "sonner";
import { useVisibleCategories, pickerCategories, useScheduleBlocks, useTimeLogsInRange, updateTimeLog } from "@/lib/dataStore";
import { useNowMinute } from "@/hooks/useNowMinute";
import { useAutoScrollToHour } from "./useAutoScrollToHour";
import { useAddBlockHereListener } from "./useAddBlockHereListener";

export default function CalendarPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = searchParams.get("date") || todayISO();
  const [date, setDate] = useState<string>(initialDate);

  const [logOpen, setLogOpen] = useState(false);
  const [logDefaults, setLogDefaults] = useState<{
    start: string; end: string; editId?: string;
    defaultCategoryId?: string; defaultTitle?: string; defaultNotes?: string;
  }>({ start: "09:00", end: "10:00" });

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogTarget, setBlockDialogTarget] = useState<{
    block?: ScheduleBlock; defaultStartTime?: string; defaultWeekday?: number;
  }>({});
  const [chooserBlock, setChooserBlock] = useState<ScheduleBlock | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps -- searchParams in deps causes a sync loop

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

  const currentMinute = useNowMinute(isToday);

  useAutoScrollToHour(scrollRef, date, isToday);

  // New blocks default to Weekdays (no defaultWeekday) — single-day blocks were a
  // recurring source of confusion.
  useAddBlockHereListener(
    useCallback((startMin: number) => {
      const h = Math.floor(startMin / 60);
      const hStr = `${String(h).padStart(2, "0")}:00`;
      setBlockDialogTarget({ defaultStartTime: hStr });
      setBlockDialogOpen(true);
    }, [])
  );

  const openLogAt = (startMin: number) => {
    const snapped = Math.floor(startMin / 30) * 30;
    setLogDefaults({ start: fromMin(snapped), end: fromMin(snapped + 60) });
    setLogOpen(true);
  };

  const openQuickLog = () => {
    // currentMinute is non-null exactly when the displayed day is today.
    const base = currentMinute != null ? currentMinute - 30 : 9 * 60;
    openLogAt(Math.max(0, base));
  };

  const handleBlockClick = useCallback((block: ScheduleBlock) => {
    setChooserBlock(block);
  }, []);

  const logFromBlock = useCallback((block: ScheduleBlock) => {
    setLogDefaults({ ...logDefaultsFromBlock(block), defaultCategoryId: undefined });
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
      <div data-testid="page-day" className="pt-4 pb-4 w-full lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Day view</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{heading}</h1>
          </div>
          <CalendarNav
            onToday={() => setDate(todayISO())}
            onPrev={() => setDate(addDaysISO(date, -1))}
            onNext={() => setDate(addDaysISO(date, 1))}
            prevLabel="Previous day"
            nextLabel="Next day"
          />
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

        <CalendarCreateMenu
          viewId="day"
          onLogTime={openQuickLog}
          onAddBlock={() => { setBlockDialogTarget({}); setBlockDialogOpen(true); }}
        />

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
