import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function TimelineLogMobileDragHandle({
  compact,
  onPointerDown,
}: {
  compact: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const { t } = useTranslation();
  const iconClass = compact ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex shrink-0 touch-none items-center justify-center rounded-sm",
            "text-foreground/80 hover:text-foreground hover:bg-black/10",
            compact ? "p-px" : "p-0.5",
          )}
          aria-label={t("week.dragToReschedule")}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown(e);
          }}
        >
          <GripVertical className={iconClass} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{t("week.dragToReschedule")}</TooltipContent>
    </Tooltip>
  );
}
