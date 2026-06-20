import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Surface } from "@/components/Surface";
import { fmtDuration } from "@/lib/time";
import type { DayCellData } from "@/lib/calendarDays";

type Props = {
  days: DayCellData[];
  labelIds: string[];
};

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, "0")}`;
}

export function AgendaCard({ days, labelIds }: Props) {
  const { t } = useTranslation();
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

  const toggle = (iso: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso); else next.add(iso);
      return next;
    });
  };

  return (
    <Surface padding="md">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        {t("dashboard.agenda.title")}
      </div>
      <div className="space-y-1">
        {days.map((day) => {
          const filteredLogs = labelIds.length === 0
            ? day.logs
            : day.logs.filter((l) => l.category_id != null && labelIds.includes(l.category_id));
          const totalLogged = filteredLogs.reduce((s, l) => s + (l.seg.endMin - l.seg.startMin), 0);
          const isOpen = openDays.has(day.iso);
          const hasData = day.blocks.length > 0 || filteredLogs.length > 0;
          const wd = (day.weekday + 6) % 7;
          const shortDay = WEEKDAY_SHORT[wd] ?? day.short;

          return (
            <div key={day.iso} className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(day.iso)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen
                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  }
                  <span className="font-medium">{shortDay}</span>
                  <span className="text-muted-foreground text-xs">{day.iso.slice(5)}</span>
                </div>
                {totalLogged > 0 && (
                  <span className="font-mono-num text-xs text-muted-foreground shrink-0">
                    {fmtDuration(totalLogged)}
                  </span>
                )}
              </button>

              {isOpen && (
                <div className="px-3 pb-2 space-y-2 border-t border-border bg-muted/10">
                  {!hasData && (
                    <p className="text-xs text-muted-foreground py-1">{t("dashboard.agenda.noActivity")}</p>
                  )}
                  {day.blocks.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                        {t("dashboard.agenda.planned")}
                      </div>
                      <ul className="space-y-0.5">
                        {day.blocks.map((b, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                            <span className="truncate">{b.name}</span>
                            <span className="ml-auto text-muted-foreground font-mono-num shrink-0">
                              {fmtTime(b.seg.startMin)}–{fmtTime(b.seg.endMin)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {filteredLogs.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                        {t("dashboard.agenda.logged")}
                      </div>
                      <ul className="space-y-0.5">
                        {filteredLogs.map((l, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
                            <span className="truncate">{l.name}</span>
                            <span className="ml-auto text-muted-foreground font-mono-num shrink-0">
                              {fmtDuration(l.seg.endMin - l.seg.startMin)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
