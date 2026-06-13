import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tag, Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories, upsertCategory, deleteCategory } from "@/lib/dataStore";
import type { LocalCategory } from "@/lib/localStore";
import { nextCreateColor } from "@/lib/categoryColors";
import { AddLabelDialog } from "@/components/labels/AddLabelDialog";
import type { AddLabelValues } from "@/components/labels/addLabelSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/Surface";

type LabelType = "productive" | "unproductive";

function LabelRow({
  cat,
  onUpdate,
  onToggleHidden,
  onDelete,
  labels,
}: {
  cat: LocalCategory;
  onUpdate: (id: string, patch: Partial<LocalCategory>) => void;
  onToggleHidden: (cat: LocalCategory) => void;
  onDelete: (cat: LocalCategory) => void;
  labels: {
    defaultBadge: string;
    hiddenBadge: string;
    hide: string;
    show: string;
    delete: string;
  };
}) {
  return (
    <Surface
      elevation="muted"
      radius="lg"
      className={cn("flex flex-wrap items-center gap-2 p-2", cat.hidden && "opacity-60")}
    >
      <input
        type="color"
        value={cat.color}
        onChange={(e) => onUpdate(cat.id, { color: e.target.value })}
        className="h-8 w-10 rounded cursor-pointer bg-transparent border border-border shrink-0"
        aria-label={`Color for ${cat.name}`}
      />
      <Input
        key={`${cat.id}-${cat.name}`}
        defaultValue={cat.name}
        onBlur={(e) => {
          const name = e.target.value.trim();
          if (name && name !== cat.name) onUpdate(cat.id, { name });
        }}
        className="flex-1 h-9 min-w-[120px]"
      />
      <div className="flex items-center gap-1.5 shrink-0">
        {cat.is_default && (
          <Badge variant="secondary" className="text-[10px]">{labels.defaultBadge}</Badge>
        )}
        {cat.hidden && (
          <Badge variant="outline" className="text-[10px]">{labels.hiddenBadge}</Badge>
        )}
      </div>
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => onToggleHidden(cat)}>
          {cat.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {cat.hidden ? labels.show : labels.hide}
        </Button>
        {!cat.is_default && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(cat)} aria-label={labels.delete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </Surface>
  );
}

export default function LabelsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mode = user ? "cloud" : "guest";
  const { data: categoriesRaw } = useCategories();
  const categories = categoriesRaw as LocalCategory[];

  const [addDialogType, setAddDialogType] = useState<LabelType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalCategory | null>(null);

  const grouped = useMemo(() => ({
    productive: categories.filter((c) => c.type === "productive"),
    unproductive: categories.filter((c) => c.type === "unproductive"),
  }), [categories]);

  const rowLabels = {
    defaultBadge: t("labels.defaultBadge"),
    hiddenBadge: t("labels.hiddenBadge"),
    hide: t("labels.hide"),
    show: t("labels.show"),
    delete: t("labels.delete"),
  };

  const updateLabel = async (id: string, patch: Partial<LocalCategory>) => {
    try {
      await upsertCategory(mode, user?.id ?? null, { id, ...patch });
      toast.success(t("labels.updated"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
    }
  };

  const toggleHidden = async (cat: LocalCategory) => {
    try {
      await upsertCategory(mode, user?.id ?? null, { id: cat.id, hidden: !cat.hidden });
      toast.success(cat.hidden ? t("labels.shown") : t("labels.hidden"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
    }
  };

  const removeLabel = async (cat: LocalCategory) => {
    try {
      await deleteCategory(mode, user?.id ?? null, cat.id);
      setDeleteTarget(null);
      toast.success(t("labels.deleted"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
    }
  };

  const requestDelete = (cat: LocalCategory) => {
    if (cat.is_default) {
      toast.error(t("labels.cannotDeleteDefault"));
      return;
    }
    setDeleteTarget(cat);
  };

  const saveNewLabel = async (values: AddLabelValues): Promise<boolean> => {
    try {
      await upsertCategory(mode, user?.id ?? null, {
        name: values.name,
        color: values.color,
        type: values.type,
      });
      toast.success(t("labels.created"));
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
      return false;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          {t("labels.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">{t("labels.subtitle")}</p>
      </header>

      {(["productive", "unproductive"] as const).map((type) => (
        <Card key={type}>
          <CardHeader className="flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-lg">{t(`labels.${type}`)}</CardTitle>
            <Button
              size="sm"
              className="gap-1.5 shrink-0 gradient-primary text-primary-foreground font-medium hover:opacity-90 shadow-glow"
              onClick={() => setAddDialogType(type)}
            >
              <Plus className="h-3.5 w-3.5" /> {t("labels.addLabel")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped[type].length === 0 && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {grouped[type].map((cat) => (
              <LabelRow
                key={cat.id}
                cat={cat}
                onUpdate={updateLabel}
                onToggleHidden={toggleHidden}
                onDelete={requestDelete}
                labels={rowLabels}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {addDialogType && (
        <AddLabelDialog
          open={!!addDialogType}
          type={addDialogType}
          defaultColor={nextCreateColor(categories.length)}
          onOpenChange={(open) => !open && setAddDialogType(null)}
          onSave={saveNewLabel}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("labels.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("labels.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("labels.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && removeLabel(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("labels.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
