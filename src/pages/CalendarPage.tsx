import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";

export default function CalendarPage() {
  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">Day · Week · Month — coming in Phase 3.</p>
        </motion.div>
        <div className="mt-10 glass rounded-2xl border border-border p-10 text-center">
          <p className="text-muted-foreground">Your animated Day/Week/Month calendar will live here.</p>
        </div>
      </div>
    </AppLayout>
  );
}
