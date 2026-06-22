import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDailyNote, useUpsertDailyNote } from "@/lib/dataStore";
import { fmtDayHeading } from "@/lib/time";
import { DailyNoteCard } from "./DailyNoteCard";

type Props = {
  dates: string[];
  selectedISO: string;
  onSelectDate: (iso: string) => void;
};

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDay(iso: string, delta: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

export function NotesCarousel({ dates, selectedISO, onSelectDate }: Props) {
  const { t } = useTranslation();
  const [calOpen, setCalOpen] = useState(false);

  const noteDates = dates.map(parseLocal);
  const selectedDate = parseLocal(selectedISO);
  // Wait for the query to settle before mounting DailyNoteCard so useEditor
  // initialises with the correct content (same pattern as CalendarPage). Guard
  // on status rather than `data` so the editor still renders (allowing note
  // creation) when the fetch fails and `data` stays undefined.
  const dailyNoteQuery = useDailyNote(selectedISO);
  const upsertDailyNote = useUpsertDailyNote();

  const handleDayClick = (day: Date) => {
    onSelectDate(toISO(day));
    setCalOpen(false);
  };

  return (
    <div className="space-y-4" data-testid="notes-carousel">
      {/* Date navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSelectDate(shiftDay(selectedISO, -1))}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={t("notes.prevDay")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-sm font-medium hover:bg-accent transition-colors"
              aria-label={t("notes.openCalendar")}
            >
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {fmtDayHeading(selectedISO)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onDayClick={handleDayClick}
              modifiers={{ hasNote: noteDates }}
              modifiersClassNames={{
                hasNote:
                  "after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary after:content-[''] relative",
              }}
              showOutsideDays={false}
            />
          </PopoverContent>
        </Popover>

        <button
          onClick={() => onSelectDate(shiftDay(selectedISO, 1))}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={t("notes.nextDay")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {dailyNoteQuery.status !== "pending" && (
        <DailyNoteCard
          key={selectedISO}
          date={selectedISO}
          initialContent={dailyNoteQuery.data?.content ?? null}
          onChange={(json) => upsertDailyNote.mutate({ date: selectedISO, content: json })}
        />
      )}
    </div>
  );
}
