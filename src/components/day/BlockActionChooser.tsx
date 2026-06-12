import { NotebookPen, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Plan-vs-actual chooser shown when a block OCCURRENCE is clicked on a calendar.
 * Logging records what actually happened (the recurring plan stays untouched);
 * editing changes the template for every day it repeats.
 */
export function BlockActionChooser({
  open, onOpenChange, blockName, onLog, onEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blockName: string;
  onLog: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const choose = (fn: () => void) => () => {
    onOpenChange(false);
    fn();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg truncate">{blockName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <button
            type="button"
            onClick={choose(onLog)}
            className="w-full flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <NotebookPen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-medium">{t("schedule.logHere")}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{t("schedule.logHereDesc")}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={choose(onEdit)}
            className="w-full flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <Pencil className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-medium">{t("schedule.editBlock")}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{t("schedule.editBlockDesc")}</span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
