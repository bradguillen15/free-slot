import type { ReactNode } from "react";

type CalendarViewHeaderProps = {
  label: string;
  title: ReactNode;
  actions: ReactNode;
};

/** Fixed header row so day/week/month titles stay aligned when switching views. */
export function CalendarViewHeader({ label, title, actions }: CalendarViewHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    </div>
  );
}
