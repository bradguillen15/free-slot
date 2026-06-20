import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Sparkles, Zap, CalendarRange, Lock, Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { CalendarViewHeader } from "@/components/calendar/CalendarViewHeader";
import { CalendarNav } from "@/components/calendar/CalendarNav";
import { CalendarCreateMenu } from "@/components/calendar/CalendarCreateMenu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { addDaysISO, fmtDuration, fromMin, todayISO } from "@/lib/time";
import { logDefaultsFromBlock } from "@/lib/schedule";
import { fmtWeekRange, weekDays, weekStartISO } from "@/lib/week";
import { type GapWindow } from "@/lib/gaps";
import { buildDayCells, type DayCellData, type DayCellBlock, type DayCellLog } from "@/lib/calendarDays";
import { WeekGrid } from "@/components/week/WeekGrid";
import { QuickLogDialog, type Category } from "@/components/day/QuickLogDialog";
import { ScheduleBlockDialog } from "@/components/day/ScheduleBlockDialog";
import { BlockActionChooser } from "@/components/day/BlockActionChooser";
import type { ScheduleBlock, TimeLog } from "@/components/day/DayTimeline";
import { AIPlanPanel, type WeeklyPlan, type ActivityLite } from "@/components/week/AIPlanPanel";
import {
  useActivities,
  useVisibleCategories,
  pickerCategories,
  useProfile,
  useScheduleBlocks,
  useTimeLogsInRange,
  updateTimeLog,
  upsertCategory,
  useDailyNotesForWeek,
  useInboxItems,
} from "@/lib/dataStore";
import { InboxPanel } from "@/components/notes/InboxPanel";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/StatCard";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function weekFromSearchParams(sp: URLSearchParams): string {
  const w = sp.get("week");
  if (w && ISO.test(w)) return w;
  const d = sp.get("date");
  if (d && ISO.test(d)) return weekStartISO(d);
  return weekStartISO();
}

export default function WeekPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isGuest = !user;
  const [searchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(() => weekFromSearchParams(searchParams));

  const [logOpen, setLogOpen] = useState(false);
  const [logCtx, setLogCtx] = useState<{
    date: string; start: string; end: string; editId?: string; editDate?: string;
    defaultCategoryId?: string; defaultTitle?: string; defaultNotes?: string;
  }>({ date: todayISO(), start: "09:00", end: "10:00" });

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogTarget, setBlockDialogTarget] = useState<{
    block?: ScheduleBlock; defaultStartTime?: string; defaultWeekday?: number;
  }>({});

  const [aiPlan, setAiPlan] = useState<WeeklyPlan | null>(null);
  const [chooser, setChooser] = useState<{ block: ScheduleBlock; iso: string } | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const today = todayISO();
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);
  const logsStart = useMemo(() => addDaysISO(weekStart, -1), [weekStart]);

  const { data: blocksRaw, refresh: refreshBlocks } = useScheduleBlocks();
  const { data: logsRaw, refresh: refreshLogs } = useTimeLogsInRange(logsStart, weekEnd);
  const { data: visibleCategoriesRaw, all: allCategoriesRaw, refresh: refreshCats } = useVisibleCategories();
  const { data: activitiesRaw } = useActivities();
  const { data: weekNotes = [] } = useDailyNotesForWeek(weekStart, weekEnd);
  const notedDates = useMemo(() => new Set(weekNotes.map((n) => n.date)), [weekNotes]);
  const { data: inboxItems = [] } = useInboxItems();
  const { data: profileRaw } = useProfile();

  const blocks = blocksRaw as unknown as ScheduleBlock[];
  const logs = logsRaw as unknown as TimeLog[];
  const allCategories = allCategoriesRaw as unknown as Category[];
  const visibleCategories = visibleCategoriesRaw as unknown as Category[];
  const logPickerCategories = useMemo(
    () => pickerCategories(visibleCategories, allCategories, logCtx.defaultCategoryId),
    [visibleCategories, allCategories, logCtx.defaultCategoryId]
  );
  const blockPickerCategories = useMemo(
    () => pickerCategories(visibleCategories, allCategories, blockDialogTarget.block?.category_id),
    [visibleCategories, allCategories, blockDialogTarget.block?.category_id]
  );
  const activities = useMemo(
    () => (activitiesRaw ?? []).filter((a) => (a as { is_active?: boolean }).is_active),
    [activitiesRaw]
  );
  const profile = profileRaw as unknown as { peak_hours: { start: string; end: string } | null } | null;

  const blockById = useMemo(
    () => Object.fromEntries(blocks.map((b) => [b.id, b])),
    [blocks]
  );

  const logById = useMemo(
    () => Object.fromEntries(logs.map((l) => [l.id, l])),
    [logs]
  );

  const dayCells: DayCellData[] = useMemo(
    () => buildDayCells({
      days,
      blocks: blocks as unknown as Parameters<typeof buildDayCells>[0]["blocks"],
      logs: logs as unknown as Parameters<typeof buildDayCells>[0]["logs"],
      categories: allCategories as unknown as Parameters<typeof buildDayCells>[0]["categories"],
      profile: profile as unknown as Parameters<typeof buildDayCells>[0]["profile"],
      today,
      aiPlan,
    }),
    [days, blocks, logs, allCategories, profile, today, aiPlan]
  );

  const flatGaps = useMemo(
    () => dayCells.flatMap((d) => d.gaps.map((g) => ({
      day: d.iso, start: fromMin(g.start), end: fromMin(g.end),
      durationMin: g.durationMin, isPeak: g.isPeak,
    }))),
    [dayCells]
  );

  const totalWeekFree = useMemo(
    () => dayCells.reduce((s, d) => s + d.totalFree, 0),
    [dayCells]
  );
  const peakFree = useMemo(
    () => dayCells.reduce((s, d) => s + d.gaps.filter((g) => g.isPeak).reduce((a, g) => a + g.durationMin, 0), 0),
    [dayCells]
  );

  const openQuickLog = () => {
    // Default a new log to today when today is in the displayed week, else the week's first day.
    const inWeek = today >= weekStart && today <= addDaysISO(weekStart, 6);
    setLogCtx({ date: inWeek ? today : weekStart, start: "09:00", end: "10:00" });
    setLogOpen(true);
  };
  const openAddBlock = () => { setBlockDialogTarget({}); setBlockDialogOpen(true); };

  const openSleepLog = async () => {
    const inWeek = today >= weekStart && today <= addDaysISO(weekStart, 6);
    const targetDate = inWeek ? today : weekStart;
    let sleepCat = allCategories.find((c) => (c as { name?: string }).name === "Sleep");
    if (!sleepCat) {
      const mode = isGuest ? "guest" as const : "cloud" as const;
      const created = await upsertCategory(mode, user?.id ?? null, {
        name: "Sleep", type: "productive", color: "#6366f1",
      });
      await refreshCats();
      sleepCat = created as typeof allCategories[0];
    }
    setLogCtx({
      date: targetDate,
      start: "23:00",
      end: "07:00",
      defaultCategoryId: (sleepCat as { id: string }).id,
      defaultTitle: "Sleep",
    });
    setLogOpen(true);
  };

  const onGapClick = (iso: string, gap: GapWindow) => {
    setLogCtx({ date: iso, start: fromMin(gap.start), end: fromMin(Math.min(gap.start + 60, gap.end)) });
    setLogOpen(true);
  };
  const onSlotClick = (iso: string, startMin: number) => {
    const snapped = Math.floor(startMin / 30) * 30;
    setLogCtx({ date: iso, start: fromMin(snapped), end: fromMin(snapped + 60) });
    setLogOpen(true);
  };

  const onBlockClick = (iso: string, cellBlock: DayCellBlock) => {
    const full = cellBlock.id ? blockById[cellBlock.id] : undefined;
    if (full) setChooser({ block: full, iso });
  };

  const logFromBlock = (block: ScheduleBlock, iso: string) => {
    setLogCtx({ date: iso, ...logDefaultsFromBlock(block) });
    setLogOpen(true);
  };

  const handleLogReschedule = async (logId: string, newDate: string, newStartMin: number, newEndMin: number) => {
    const log = (logsRaw ?? []).find((l) => (l as { id?: string }).id === logId);
    if (!(log as { category_id?: string | null } | undefined)?.category_id) {
      toast.error("Assign a category before dragging this block.");
      return;
    }
    try {
      const mode = isGuest ? "guest" as const : "cloud" as const;
      await updateTimeLog(mode, user?.id ?? null, logId, {
        date: newDate,
        start_time: fromMin(newStartMin),
        end_time: fromMin(newEndMin),
        category_id: (log as { category_id: string }).category_id,
        type: (log as { type: "productive" | "unproductive" }).type,
        notes: (log as { notes: string | null }).notes,
      });
      toast.success("Block rescheduled");
      await refreshLogs();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not reschedule");
    }
  };

  const onLogClick = (iso: string, cellLog: DayCellLog) => {
    const full = cellLog.id ? logById[cellLog.id] : undefined;
    if (!full) return;
    setLogCtx({
      date: iso,
      start: full.start_time,
      end: full.end_time,
      editId: full.id,
      editDate: full.date,
      defaultCategoryId: full.category_id ?? undefined,
      defaultTitle: full.title ?? undefined,
      defaultNotes: full.notes ?? undefined,
    });
    setLogOpen(true);
  };

  return (
    <>
      <CalendarViewHeader
        testId="page-week"
        label="Week view"
        title={fmtWeekRange(weekStart)}
        actions={
          <CalendarNav
            onToday={() => setWeekStart(weekStartISO())}
            onPrev={() => setWeekStart(addDaysISO(weekStart, -7))}
            onNext={() => setWeekStart(addDaysISO(weekStart, 7))}
            prevLabel="Previous week"
            nextLabel="Next week"
          />
        }
      />

      <CalendarCreateMenu viewId="week" onLogTime={openQuickLog} onAddBlock={openAddBlock} onLogSleep={openSleepLog} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Total free time" value={fmtDuration(totalWeekFree)} tone="primary" />
        <StatCard icon={<Zap className="h-4 w-4" />} label="Peak-hour free" value={fmtDuration(peakFree)} tone="accent" />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Avg per day" value={fmtDuration(Math.round(totalWeekFree / 7))} tone="muted" />
      </div>

      {isGuest ? (
        <div className="mb-5 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.05] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">AI weekly planning is a member feature</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a free account to let FreeSlot fit your activities into your free windows automatically.
            </p>
          </div>
          <Button asChild size="sm" className="gradient-primary shadow-glow">
            <Link to="/auth">Create account</Link>
          </Button>
        </div>
      ) : activities.length === 0 ? (
        <div className="mb-5">
          <EmptyState
            icon={<CalendarRange className="h-5 w-5" />}
            title="Add a few activities to unlock AI planning"
            description="Tell FreeSlot what you want to spend more time on and the AI will fit them into your free windows."
            ctaLabel="Add activities"
            ctaTo="/app/activities"
          />
        </div>
      ) : (
        <AIPlanPanel
          weekStart={weekStart}
          gaps={flatGaps}
          activities={activities as ActivityLite[]}
          categories={allCategories}
          onPlanChange={setAiPlan}
          onSlotAccepted={refreshLogs}
        />
      )}

      <div>
        <div className="flex items-center gap-3 px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary/40" /> Planned</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-productive" /> Logged</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm border border-dashed border-primary/60 bg-primary/10" /> Free / peak</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm border border-primary/70 bg-primary/20" /> AI suggestion</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="hidden lg:inline">Click a block or log to edit</span>
            <button
              type="button"
              aria-label="Toggle inbox"
              onClick={() => setInboxOpen((v) => !v)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Inbox</span>
              {inboxItems.length > 0 && (
                <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {inboxItems.length}
                </span>
              )}
            </button>
          </span>
        </div>

        <div className="flex gap-4">
          <div className="overflow-x-auto flex-1 min-w-0">
            <div className="min-w-[720px]">
              <WeekGrid
                days={dayCells}
                onGapClick={onGapClick}
                onSlotClick={onSlotClick}
                onBlockClick={onBlockClick}
                onLogClick={onLogClick}
                onLogReschedule={handleLogReschedule}
                notedDates={notedDates}
              />
            </div>
          </div>

          <AnimatePresence>
            {inboxOpen && (
              <motion.div
                initial={{ opacity: 0, x: 24, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 280 }}
                exit={{ opacity: 0, x: 24, width: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 overflow-hidden"
              >
                <InboxPanel className="w-[280px] rounded-xl border border-border bg-surface p-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <QuickLogDialog
        open={logOpen}
        onOpenChange={(v) => {
          setLogOpen(v);
          if (!v) setLogCtx({ date: todayISO(), start: "09:00", end: "10:00" });
        }}
        date={logCtx.date}
        categories={logPickerCategories}
        defaultStart={logCtx.start}
        defaultEnd={logCtx.end}
        editId={logCtx.editId}
        editDate={logCtx.editDate}
        defaultCategoryId={logCtx.defaultCategoryId}
        defaultTitle={logCtx.defaultTitle}
        defaultNotes={logCtx.defaultNotes}
        onOptimisticInsert={() => { /* refresh below covers it */ }}
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

      <BlockActionChooser
        open={!!chooser}
        onOpenChange={(o) => !o && setChooser(null)}
        blockName={chooser?.block.name ?? ""}
        onLog={() => chooser && logFromBlock(chooser.block, chooser.iso)}
        onEdit={() => {
          if (!chooser) return;
          setBlockDialogTarget({ block: chooser.block });
          setBlockDialogOpen(true);
        }}
      />
    </>
  );
}
