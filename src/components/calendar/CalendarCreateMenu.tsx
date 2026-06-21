import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type CalendarCreateMenuProps = {
  /** View identifier used to derive a stable test id (e.g. "day" → day-fab). */
  viewId: string;
  onLogTime: () => void;
};

export function CalendarCreateMenu({ viewId, onLogTime }: CalendarCreateMenuProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onLogTime}
      className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-glow flex items-center justify-center animate-pulse-glow"
      aria-label="Log time"
      data-testid={`${viewId}-fab`}
    >
      <Plus className="h-6 w-6" />
    </motion.button>
  );
}
