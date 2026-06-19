import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type CalendarNavProps = {
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Visible label for the "jump to today" control. Defaults to "Today". */
  todayLabel?: string;
  /** Accessible names for the icon-only step controls. */
  prevLabel?: string;
  nextLabel?: string;
};

/**
 * Shared calendar navigation used by the Day, Week, and Month views. Renders a
 * consistent **Today, ‹, ›** order with stable test ids so every view navigates
 * the same way.
 */
export function CalendarNav({
  onToday,
  onPrev,
  onNext,
  todayLabel = "Today",
  prevLabel = "Previous",
  nextLabel = "Next",
}: CalendarNavProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={onToday} className="gap-1.5" data-testid="calendar-today">
        <CalendarDays className="h-3.5 w-3.5" />
        {todayLabel}
      </Button>
      <Button variant="ghost" size="icon" onClick={onPrev} aria-label={prevLabel} data-testid="calendar-prev">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onNext} aria-label={nextLabel} data-testid="calendar-next">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
