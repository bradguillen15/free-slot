import { useMemo } from "react";
import { motion } from "framer-motion";
import { fmtDuration, expandRange, toMin } from "@/lib/time";
import { Surface } from "@/components/Surface";
import type { Category } from "./QuickLogDialog";
import type { TimeLog } from "./DayTimeline";

export function DaySummary({ logs, categories }: { logs: TimeLog[]; categories: Category[] }) {
  const stats = useMemo(() => {
    const byCat = new Map<string, { name: string; color: string; type: string; mins: number }>();
    let productive = 0;
    let unproductive = 0;

    for (const l of logs) {
      const segs = expandRange(toMin(l.start_time), toMin(l.end_time));
      const total = segs.reduce((a, [s, e]) => a + (e - s), 0);
      if (l.type === "productive") productive += total;
      else unproductive += total;

      const cat = l.category_id ? categories.find((c) => c.id === l.category_id) : undefined;
      const key = cat?.id ?? l.type;
      const prev = byCat.get(key) ?? {
        name: cat?.name ?? l.type,
        color: cat?.color ?? (l.type === "productive" ? "#10b981" : "#ef4444"),
        type: l.type,
        mins: 0,
      };
      prev.mins += total;
      byCat.set(key, prev);
    }

    const top = Array.from(byCat.values()).sort((a, b) => b.mins - a.mins).slice(0, 5);
    return { productive, unproductive, top, total: productive + unproductive };
  }, [logs, categories]);

  const ratio = stats.total > 0 ? stats.productive / stats.total : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Productive" value={fmtDuration(stats.productive)} accent="text-productive" />
        <Stat label="Unproductive" value={fmtDuration(stats.unproductive)} accent="text-unproductive" />
        <Stat label="Logged" value={fmtDuration(stats.total)} accent="text-foreground" />
      </div>

      <Surface padding="md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Productive ratio</span>
          <span className="font-mono-num text-sm">{Math.round(ratio * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="h-full bg-productive"
          />
        </div>
      </Surface>

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
                  <span className="truncate">{c.name}</span>
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
