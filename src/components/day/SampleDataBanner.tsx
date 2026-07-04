import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useClearExampleDataMutation } from "@/lib/dataStore";

export function SampleDataBanner({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const clearMutation = useClearExampleDataMutation();

  if (!visible) return null;

  const confirmClear = async () => {
    try {
      await clearMutation.mutateAsync();
      toast.success(t("sampleData.cleared"));
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <div
      data-testid="sample-data-banner"
      className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-2.5 mb-4 text-sm"
    >
      <div className="flex items-center gap-2 text-foreground/80">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        {t("sampleData.bannerText")}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        data-testid="sample-data-clear-cta"
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        {t("sampleData.clearCta")}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sampleData.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sampleData.confirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sampleData.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClear} data-testid="sample-data-confirm-clear">
              {t("sampleData.confirmClear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
