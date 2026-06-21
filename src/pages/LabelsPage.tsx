import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import { LabelsEditor } from "@/components/labels/LabelsEditor";

export default function LabelsPage() {
  const { t } = useTranslation();

  return (
    <div data-testid="page-labels" className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          {t("labels.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">{t("labels.subtitle")}</p>
      </header>

      <LabelsEditor />
    </div>
  );
}
