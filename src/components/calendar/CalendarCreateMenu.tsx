import { motion } from "framer-motion";
import { Plus, NotebookPen, CalendarRange, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CalendarCreateMenuProps = {
  /** View identifier used to derive stable test ids (e.g. "day" → day-fab, day-log-time). */
  viewId: string;
  onLogTime: () => void;
  onAddBlock: () => void;
  /** Opens the log dialog pre-filled as an overnight Sleep entry. */
  onLogSleep?: () => void;
};

/**
 * Shared floating create affordance for calendar views: a split FAB offering
 * "Log time" (the common case), "Sleep" preset (overnight one-action), and
 * "Add block" (a recurring schedule block).
 * Reused by Day and Week so their create UX is identical.
 */
export function CalendarCreateMenu({ viewId, onLogTime, onAddBlock, onLogSleep }: CalendarCreateMenuProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-glow flex items-center justify-center animate-pulse-glow"
          aria-label="Add"
          data-testid={`${viewId}-fab`}
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="mb-2">
        <DropdownMenuItem onClick={onLogTime} className="gap-2" data-testid={`${viewId}-log-time`}>
          <NotebookPen className="h-4 w-4" /> {t("schedule.logTime")}
        </DropdownMenuItem>
        {onLogSleep && (
          <DropdownMenuItem onClick={onLogSleep} className="gap-2" data-testid={`${viewId}-log-sleep`}>
            <Moon className="h-4 w-4" /> Log sleep
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onAddBlock} className="gap-2" data-testid={`${viewId}-add-block`}>
          <CalendarRange className="h-4 w-4" /> {t("schedule.addBlock")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
