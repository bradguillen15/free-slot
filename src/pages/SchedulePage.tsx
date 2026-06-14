import { CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";

export default function SchedulePage() {
  const { t } = useTranslation();

  return (
    <div data-testid="page-schedule" className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-primary" />
          {t("schedule.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-xl">{t("schedule.subtitle")}</p>
      </header>

      <ScheduleEditor />
    </div>
  );
}
