import { useMemo } from "react";
import { fmtDuration, expandRange, toMin } from "@/lib/time";
import { segmentsForLogOnDay } from "@/lib/daySegments";
import { Surface } from "@/components/Surface";
import { useCategoryName } from "@/lib/categoryLabels";
import type { Category } from "./QuickLogDialog";
import type { TimeLog } from "./DayTimeline";

export function DaySummary({ logs, categories, date }: { logs: TimeLog[]; categories: Category[]; date?: string }) {
  const categoryName = useCategoryName();
  const stats = useMemo(() => {
    const byCat = new Map<string, { name: string; color: string; mins: number }>();
    let total = 0;

    for (const l of logs) {
      const mins = date
        ? segmentsForLogOnDay(l, date).reduce((a, s) => a + (s.endMin - s.startMin), 0)
        : expandRange(toMin(l.start_time), toMin(l.end_time)).reduce((a, [s, e]) => a + (e - s), 0);
      if (mins <= 0) continue;
      total += mins;

      const cat = l.category_id ? categories.find((c) => c.id === l.category_id) : undefined;
      const key = cat?.id ?? "other";
      const prev = byCat.get(key) ?? {
        name: cat?.name ?? "Other",
        color: cat?.color ?? "#6b7280",
        mins: 0,
      };
      prev.mins += mins;
      byCat.set(key, prev);
    }

    const top = Array.from(byCat.values()).sort((a, b) => b.mins - a.mins).slice(0, 5);
    return { top, total };
  }, [logs, categories, date]);

  return (
    <div className="space-y-4">
      <Stat label="Logged" value={fmtDuration(stats.total)} accent="text-foreground" />

      <Surface padding="md">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Top categories</div>
        {stats.top.length === 0 ? (
          <div className="text-sm text-muted-foreground">No logs yet today.</div>
        ) : (
          <ul className="space-y-2">
            {stats.top.map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="truncate">{categoryName(c.name)}</span>
                </span>
                <span className="font-mono-num text-muted-foreground">{fmtDuration(c.mins)}</span>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Surface padding="md">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold font-mono-num ${accent}`}>{value}</div>
    </Surface>
  );
}
