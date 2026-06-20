import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/time";
import { upsertGuestRecurringNote, findMostRecentRecurringNote, getGuestRecurringNote } from "@/lib/localStore";
import { useAllDailyNoteDates } from "@/lib/dataStore";
import { NotesCarousel } from "@/components/notes/NotesCarousel";

const RecurringNoteEditor = lazy(() =>
  import("@/components/notes/RecurringNoteEditor").then((m) => ({ default: m.RecurringNoteEditor }))
);

export default function NotesPage() {
  const { t } = useTranslation();
  const today = todayISO();
  const recurringNote = getGuestRecurringNote(today);
  const carriedNote = !recurringNote ? findMostRecentRecurringNote(today) : null;
  const recurringInitialContent = recurringNote?.content ?? carriedNote?.content ?? null;

  const dailyNoteDates = useAllDailyNoteDates();
  const [selectedISO, setSelectedISO] = useState<string>(today);

  return (
    <div data-testid="page-notes" className="px-6 md:px-10 py-8 w-full">
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-6">{t("notes.tab")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Standing note — primary */}
        <div className="pb-6 lg:pb-0 lg:pr-6">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{t("notes.recurringNote")}</h2>
          <Suspense fallback={null}>
            <RecurringNoteEditor
              key={today}
              date={today}
              initialContent={recurringInitialContent}
              carriedFrom={carriedNote?.date ?? null}
              onChange={(json) => upsertGuestRecurringNote(today, json)}
            />
          </Suspense>
        </div>

        {/* Daily notes carousel */}
        <div className="pt-6 lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">{t("notes.dailyNotes")}</h2>
            <button
              onClick={() => setSelectedISO(today)}
              className={cn(
                "px-2 py-0.5 rounded-md text-xs font-medium gradient-primary text-primary-foreground shadow-glow transition-opacity duration-200",
                selectedISO === today ? "opacity-0 pointer-events-none" : "opacity-100 hover:opacity-90"
              )}
            >
              {t("notes.goToToday")}
            </button>
          </div>
          <NotesCarousel dates={dailyNoteDates} selectedISO={selectedISO} onSelectDate={setSelectedISO} />
        </div>
      </div>
    </div>
  );
}
