import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, fmtDayHeading, fromMin, isoToWeekday, todayISO } from "@/lib/time";
import { DayTimeline, type ScheduleBlock, type TimeLog } from "@/components/day/DayTimeline";
import { DaySummary } from "@/components/day/DaySummary";
import { QuickLogDialog, type Category } from "@/components/day/QuickLogDialog";

export default function CalendarPage() {
  const { user } = useAuth();
  const [date, setDate] = useState<string>(todayISO());
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [logDefaults, setLogDefaults] = useState<{ start: string; end: string }>({ start: "09:00", end: "10:00" });
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekday = isoToWeekday(date);
  const isToday = date === todayISO();

  const load = useCallback(async () => {
    if (!user) return;
    const [b, l, c] = await Promise.all([
      supabase.from("schedule_blocks").select("*").eq("user_id", user.id),
      supabase.from("time_logs").select("*").eq("user_id", user.id).eq("date", date).order("start_time"),
      supabase.from("categories").select("id,name,color,type").eq("user_id", user.id).order("name"),
    ]);
    setBlocks(((b.data ?? []) as ScheduleBlock[]).filter((x) => x.days_of_week?.includes(weekday)));
    setLogs((l.data ?? []) as TimeLog[]);
    setCategories((c.data ?? []) as Category[]);
  }, [user, date, weekday]);

  useEffect(() => { load(); }, [load]);

  // Tick "now" line
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to ~7am or "now"
  useEffect(() => {
    if (!scrollRef.current) return;
    const minute = isToday ? now.getHours() * 60 + now.getMinutes() : 7 * 60;
    const top = (minute / 60) * 56 - 120;
    scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [date, isToday, now]);

  const currentMinute = isToday ? now.getHours() * 60 + now.getMinutes() : null;

  const openLogAt = (startMin: number) => {
    const snapped = Math.floor(startMin / 30) * 30;
    setLogDefaults({ start: fromMin(snapped), end: fromMin(snapped + 60) });
    setLogOpen(true);
  };

  const openQuickLog = () => {
    const base = isToday ? now.getHours() * 60 + now.getMinutes() - 30 : 9 * 60;
    openLogAt(Math.max(0, base));
  };

  const heading = useMemo(() => fmtDayHeading(date), [date]);

  return (
    <AppLayout>
      <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Day view</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{heading}</h1>
          </motion.div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setDate(addDaysISO(date, -1))} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(todayISO())}
              className="gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDate(addDaysISO(date, 1))} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Timeline */}
          <div className="relative">
            <div className="flex items-center gap-3 px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary/40" /> Planned</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-productive" /> Logged</span>
              <span className="ml-auto">Click any hour to log</span>
            </div>
            <div ref={scrollRef} className="max-h-[calc(100vh-220px)] overflow-y-auto rounded-2xl">
              <DayTimeline
                blocks={blocks}
                logs={logs}
                categories={categories}
                onSlotClick={openLogAt}
                currentMinute={currentMinute}
              />
            </div>
          </div>

          {/* Side summary */}
          <div>
            <DaySummary logs={logs} categories={categories} />
          </div>
        </div>

        {/* Floating quick-log */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openQuickLog}
          className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-glow flex items-center justify-center animate-pulse-glow"
          aria-label="Quick log"
        >
          <Plus className="h-6 w-6" />
        </motion.button>

        <QuickLogDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          date={date}
          categories={categories}
          defaultStart={logDefaults.start}
          defaultEnd={logDefaults.end}
          onSaved={load}
        />
      </div>
    </AppLayout>
  );
}
