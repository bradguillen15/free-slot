import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Sparkles, Zap, CalendarRange, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { CalendarViewHeader } from "@/components/calendar/CalendarViewHeader";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, expandRange, fmtDuration, fromMin, isoToWeekday, todayISO, toMin } from "@/lib/time";
import { fmtWeekRange, weekDays, weekStartISO } from "@/lib/week";
import { findFreeWindows, totalFreeMinutes, type GapWindow } from "@/lib/gaps";
import { WeekGrid, type DayCellData, type DayCellBlock, type DayCellLog } from "@/components/week/WeekGrid";
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
} from "@/lib/dataStore";
import { StatCard } from "@/components/StatCard";

const SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const FULL = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

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
    date: string; start: string; end: string; editId?: string;
    defaultCategoryId?: string; defaultTitle?: string; defaultNotes?: string;
  }>({ date: todayISO(), start: "09:00", end: "10:00" });

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogTarget, setBlockDialogTarget] = useState<{
    block?: ScheduleBlock; defaultStartTime?: string; defaultWeekday?: number;
  }>({});

  const [aiPlan, setAiPlan] = useState<WeeklyPlan | null>(null);
  const [chooser, setChooser] = useState<{ block: ScheduleBlock; iso: string } | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const today = todayISO();
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const { data: blocksRaw, refresh: refreshBlocks } = useScheduleBlocks();
  const { data: logsRaw, refresh: refreshLogs } = useTimeLogsInRange(weekStart, weekEnd);
  const { data: visibleCategoriesRaw, all: allCategoriesRaw, refresh: refreshCats } = useVisibleCategories();
  const { data: activitiesRaw } = useActivities();
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

  const catMap = useMemo(
    () => Object.fromEntries(allCategories.map((c) => [c.id, c])),
    [allCategories]
  );

  const blockById = useMemo(
    () => Object.fromEntries(blocks.map((b) => [b.id, b])),
    [blocks]
  );

  const logById = useMemo(
    () => Object.fromEntries(logs.map((l) => [l.id, l])),
    [logs]
  );

  const dayCells: DayCellData[] = useMemo(() => {
    const peak = profile?.peak_hours ?? null;

    return days.map((iso) => {
      const weekday = isoToWeekday(iso);
      const dayBlocks = blocks.filter((b) => b.days_of_week?.includes(weekday));
      const dayLogs = logs.filter((l) => l.date === iso);

      const gaps: GapWindow[] = findFreeWindows({
        // Full list, not dayBlocks: blocksOnDay attributes an overnight block's
        // post-midnight segment to the following day, so it needs the previous
        // day's blocks too.
        blocks,
        logs: dayLogs,
        weekday,
        minWindowMinutes: 30,
        peakStart: peak?.start,
        peakEnd: peak?.end,
      });

      const blockSegs: DayCellBlock[] = dayBlocks.flatMap((b) =>
        expandRange(toMin(b.start_time), toMin(b.end_time)).map(([a, c]) => ({
          id: b.id,
          seg: { startMin: a, endMin: c },
          name: b.name,
          color: b.color,
        }))
      );

      const logSegs: DayCellLog[] = dayLogs.flatMap((l) => {
        const cat = l.category_id ? catMap[l.category_id] : undefined;
        const color = cat?.color ?? (l.type === "productive" ? "hsl(var(--productive))" : "hsl(var(--unproductive))");
        return expandRange(toMin(l.start_time), toMin(l.end_time)).map(([a, c]) => ({
          id: l.id,
          seg: { startMin: a, endMin: c },
          name: l.title || (cat?.name ?? l.type),
          color,
        }));
      });

      const aiSlots = (aiPlan?.slots ?? [])
        .filter((s) => s.day === iso)
        .map((s) => ({
          seg: { startMin: toMin(s.start), endMin: toMin(s.end) },
          name: s.activity_name,
          rationale: s.rationale,
        }));

      return {
        iso,
        weekday,
        label: FULL[(weekday + 6) % 7],
        short: SHORT[(weekday + 6) % 7],
        isToday: iso === today,
        blocks: blockSegs,
        logs: logSegs,
        gaps,
        aiSlots,
        totalFree: totalFreeMinutes(gaps),
      };
    });
  }, [days, blocks, logs, catMap, profile, today, aiPlan]);

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
    const start = block.start_time.slice(0, 5);
    const overnight = toMin(block.end_time) <= toMin(block.start_time);
    const end = overnight ? fromMin(Math.min(toMin(start) + 60, 1439)) : block.end_time.slice(0, 5);
    setLogCtx({ date: iso, start, end, defaultTitle: block.name });
    setLogOpen(true);
  };

  const onLogClick = (iso: string, cellLog: DayCellLog) => {
    const full = cellLog.id ? logById[cellLog.id] : undefined;
    if (!full) return;
    setLogCtx({
      date: iso,
      start: full.start_time,
      end: full.end_time,
      editId: full.id,
      defaultCategoryId: full.category_id ?? undefined,
      defaultTitle: full.title ?? undefined,
      defaultNotes: full.notes ?? undefined,
    });
    setLogOpen(true);
  };

  return (
    <>
      <CalendarViewHeader
        label="Week view"
        title={fmtWeekRange(weekStart)}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 mr-1"
              onClick={() => { setBlockDialogTarget({}); setBlockDialogOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" /> {t("schedule.addBlock")}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(weekStartISO())} className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> This week
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

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
          <span className="ml-auto">Click a block or log to edit</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <WeekGrid
              days={dayCells}
              onGapClick={onGapClick}
              onSlotClick={onSlotClick}
              onBlockClick={onBlockClick}
              onLogClick={onLogClick}
            />
          </div>
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

