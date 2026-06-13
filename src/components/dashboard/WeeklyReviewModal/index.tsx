import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { fmtDuration } from "@/lib/time";
import { fmtWeekRange } from "@/lib/week";
import { useWeeklyReviewData } from "./useWeeklyReviewData";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weekStart: string;
};

export function WeeklyReviewModal({ open, onOpenChange, weekStart }: Props) {
  const { user } = useAuth();
  const { loading, insights, ratio, total, existing, merged, generate } =
    useWeeklyReviewData({ open, user, weekStart });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Weekly review
          </DialogTitle>
          <DialogDescription>{fmtWeekRange(weekStart)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Tracked" value={fmtDuration(total)} />
            <Stat label="Productive" value={`${ratio}%`} />
            <Stat label="Activities" value={String(merged.length)} />
          </div>

          {merged.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Plan vs actual
              </div>
              <ul className="space-y-2">
                {merged.map((m) => {
                  const max = Math.max(m.planned, m.actual, 1);
                  return (
                    <li key={m.name} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="truncate">{m.name}</span>
                        <span className="font-mono-num text-muted-foreground">
                          {fmtDuration(m.actual)} / {fmtDuration(m.planned)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden flex gap-px">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${(m.planned / max) * 50}%` }}
                          className="bg-primary/60 h-full"
                        />
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${(m.actual / max) * 50}%` }}
                          className="bg-productive h-full"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-3 min-h-[88px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> AI reflection
            </div>
            {insights ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm leading-relaxed">
                {insights}
              </motion.p>
            ) : loading ? (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Generate a thoughtful summary of what worked and what to try next week.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={generate} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : existing ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {existing ? "Regenerate" : "Generate review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold font-mono-num">{value}</div>
    </div>
  );
}
