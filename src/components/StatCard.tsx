import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneClasses, type StatTone } from "@/lib/toneClasses";

type StatCardProps = {
  label: string;
  value: string;
  tone?: StatTone;
  icon?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, tone = "muted", icon, className }: StatCardProps) {
  const { ring, bg } = toneClasses(tone);
  return (
    <div className={cn("flex h-full flex-col rounded-2xl border border-border bg-surface px-4 py-3 ring-1", ring, className)}>
      {icon ? (
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center", bg)}>{icon}</span>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      ) : (
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      )}
      <div className="mt-auto font-display text-2xl font-semibold tracking-tight font-mono-num">{value}</div>
    </div>
  );
}
