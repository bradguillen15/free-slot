import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Brain, ChevronDown, Eye, EyeOff, GripVertical, Heart, Plus, Trash2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories, upsertCategory, deleteCategory, reorderCategories } from "@/lib/dataStore";
import type { LocalCategory } from "@/lib/localStore";
import { nextCreateColor } from "@/lib/categoryColors";
import { AddLabelDialog } from "@/components/labels/AddLabelDialog";
import type { AddLabelValues } from "@/components/labels/addLabelSchema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/Surface";

type LabelType = "productive" | "essential" | "unproductive";
const COLUMN_TYPES: LabelType[] = ["productive", "essential", "unproductive"];

function typeIcon(type: LabelType) {
  if (type === "productive") return <Brain className="h-4 w-4 text-productive" />;
  if (type === "essential") return <Heart className="h-4 w-4 text-primary" />;
  return <Zap className="h-4 w-4 text-unproductive" />;
}

type RowLabels = {
  hide: string;
  show: string;
  delete: string;
  defaultBadge: string;
  typeLabel: string;
  dragLabel: string;
  productive: string;
  essential: string;
  unproductive: string;
};

function SortableLabelRow({
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
  labels: RowLabels;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Surface
      ref={setNodeRef}
      style={style}
      elevation="muted"
      radius="lg"
      data-testid={`label-row-${cat.id}`}
      className="flex flex-wrap items-center gap-2 p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        data-testid={`label-drag-${cat.id}`}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0"
        aria-label={labels.dragLabel}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <input
        type="color"
        value={cat.color}
        onChange={(e) => onUpdate(cat.id, { color: e.target.value })}
        className="h-8 w-9 rounded cursor-pointer bg-transparent border border-border shrink-0"
        aria-label={`Color for ${cat.name}`}
      />
      <Input
        key={`${cat.id}-${cat.name}`}
        defaultValue={cat.name}
        data-testid={`label-name-${cat.id}`}
        onBlur={(e) => {
          const name = e.target.value.trim();
          if (name && name !== cat.name) onUpdate(cat.id, { name });
        }}
        className="flex-1 h-9 min-w-[120px]"
      />
      <Select value={cat.type} onValueChange={(v) => onUpdate(cat.id, { type: v as LabelType })}>
        <SelectTrigger className="h-9 w-[140px] shrink-0" data-testid={`label-type-${cat.id}`} aria-label={labels.typeLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="productive">{labels.productive}</SelectItem>
          <SelectItem value="essential">{labels.essential}</SelectItem>
          <SelectItem value="unproductive">{labels.unproductive}</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1 ml-auto shrink-0">
        {cat.is_default && (
          <Badge variant="secondary" className="text-[10px]">{labels.defaultBadge}</Badge>
        )}
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => onToggleHidden(cat)}>
          <EyeOff className="h-3.5 w-3.5" /> {labels.hide}
        </Button>
        {!cat.is_default && (
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`label-delete-${cat.id}`} onClick={() => onDelete(cat)} aria-label={labels.delete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </Surface>
  );
}

function CollapsibleColumn({
  type,
  title,
  ids,
  cats,
  open,
  onOpenChange,
  emptyLabel,
  rowLabels,
  onUpdate,
  onToggleHidden,
  onDelete,
}: {
  type: LabelType;
  title: string;
  ids: string[];
  cats: Map<string, LocalCategory>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emptyLabel: string;
  rowLabels: RowLabels;
  onUpdate: (id: string, patch: Partial<LocalCategory>) => void;
  onToggleHidden: (cat: LocalCategory) => void;
  onDelete: (cat: LocalCategory) => void;
}) {
  const { setNodeRef } = useDroppable({ id: type });

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-xl border border-border bg-surface/40">
      <CollapsibleTrigger
        data-testid={`label-column-${type}`}
        className="flex w-full items-center gap-2 p-3 text-sm font-semibold"
      >
        {typeIcon(type)}
        <span>{title}</span>
        <Badge variant="outline" className="text-[10px]">{ids.length}</Badge>
        <ChevronDown className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div ref={setNodeRef} className="space-y-2 p-3 pt-0 min-h-[3.5rem]">
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {ids.map((id) => {
              const cat = cats.get(id);
              if (!cat) return null;
              return (
                <SortableLabelRow
                  key={id}
                  cat={cat}
                  onUpdate={onUpdate}
                  onToggleHidden={onToggleHidden}
                  onDelete={onDelete}
                  labels={rowLabels}
                />
              );
            })}
          </SortableContext>
          {ids.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              {emptyLabel}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function LabelsEditor() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mode = user ? "cloud" : "guest";
  const { data: categoriesRaw, refresh } = useCategories();
  const categories = categoriesRaw as LocalCategory[];

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LocalCategory | null>(null);
  const [items, setItems] = useState<Record<LabelType, string[]>>({ productive: [], essential: [], unproductive: [] });
  const [openColumns, setOpenColumns] = useState<Record<LabelType, boolean>>({ productive: true, essential: true, unproductive: true });
  const [hiddenOpen, setHiddenOpen] = useState(false);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const hiddenCats = useMemo(() => categories.filter((c) => c.hidden), [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Rebuild the per-column id arrays from the canonical (already-ordered) category list.
  useEffect(() => {
    const next: Record<LabelType, string[]> = { productive: [], essential: [], unproductive: [] };
    for (const c of categories) {
      if (c.hidden) continue;
      next[c.type].push(c.id);
    }
    setItems(next);
  }, [categories]);

  const rowLabels: RowLabels = {
    hide: t("labels.hide"),
    show: t("labels.restore"),
    delete: t("labels.delete"),
    defaultBadge: t("labels.defaultBadge"),
    typeLabel: t("labels.typeLabel"),
    dragLabel: t("labels.dragToReorder"),
    productive: t("labels.typeProductive"),
    essential: t("labels.typeEssential"),
    unproductive: t("labels.typeUnproductive"),
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
      await upsertCategory(mode, user?.id ?? null, { name: values.name, color: values.color, type: values.type });
      toast.success(t("labels.created"));
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
      return false;
    }
  };

  const findContainer = (id: string): LabelType | undefined => {
    if (COLUMN_TYPES.includes(id as LabelType)) return id as LabelType;
    return COLUMN_TYPES.find((type) => items[type].includes(id));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to || from === to) return;
    setItems((prev) => {
      const target = prev[to];
      const insertAt = COLUMN_TYPES.includes(overId as LabelType)
        ? target.length
        : (target.indexOf(overId) >= 0 ? target.indexOf(overId) : target.length);
      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== activeId),
        [to]: [...target.slice(0, insertAt), activeId, ...target.slice(insertAt)],
      };
    });
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const container = findContainer(activeId);
    if (!container) return;

    const overId = String(over.id);
    let finalItems = items;
    if (!COLUMN_TYPES.includes(overId as LabelType)) {
      const overContainer = findContainer(overId);
      if (overContainer === container && activeId !== overId) {
        const oldIndex = items[container].indexOf(activeId);
        const newIndex = items[container].indexOf(overId);
        if (oldIndex >= 0 && newIndex >= 0) {
          finalItems = { ...items, [container]: arrayMove(items[container], oldIndex, newIndex) };
          setItems(finalItems);
        }
      }
    }

    const cat = catById.get(activeId);
    const typeChanged = !!cat && cat.type !== container;
    const orderedIds = [
      ...finalItems.productive,
      ...finalItems.essential,
      ...finalItems.unproductive,
      ...hiddenCats.map((c) => c.id),
    ];

    try {
      if (typeChanged) {
        await upsertCategory(mode, user?.id ?? null, { id: activeId, type: container });
      }
      await reorderCategories(mode, user?.id ?? null, orderedIds);
      if (typeChanged) toast.success(t("labels.updated"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
      refresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-xl">{t("labels.dragHint")}</p>
        <Button
          size="sm"
          className="gap-1.5 shrink-0 gradient-primary text-primary-foreground font-medium hover:opacity-90 shadow-glow"
          data-testid="labels-add"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> {t("labels.addLabel")}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-2">
          <CollapsibleColumn
            type="productive"
            title={t("labels.typeProductive")}
            ids={items.productive}
            cats={catById}
            open={openColumns.productive}
            onOpenChange={(o) => setOpenColumns((p) => ({ ...p, productive: o }))}
            emptyLabel={t("labels.emptyColumn")}
            rowLabels={rowLabels}
            onUpdate={updateLabel}
            onToggleHidden={toggleHidden}
            onDelete={requestDelete}
          />
          <CollapsibleColumn
            type="essential"
            title={t("labels.typeEssential")}
            ids={items.essential}
            cats={catById}
            open={openColumns.essential}
            onOpenChange={(o) => setOpenColumns((p) => ({ ...p, essential: o }))}
            emptyLabel={t("labels.emptyColumn")}
            rowLabels={rowLabels}
            onUpdate={updateLabel}
            onToggleHidden={toggleHidden}
            onDelete={requestDelete}
          />
        </div>
        <div className="mt-4">
          <CollapsibleColumn
            type="unproductive"
            title={t("labels.typeUnproductive")}
            ids={items.unproductive}
            cats={catById}
            open={openColumns.unproductive}
            onOpenChange={(o) => setOpenColumns((p) => ({ ...p, unproductive: o }))}
            emptyLabel={t("labels.emptyColumn")}
            rowLabels={rowLabels}
            onUpdate={updateLabel}
            onToggleHidden={toggleHidden}
            onDelete={requestDelete}
          />
        </div>
      </DndContext>

      <Collapsible open={hiddenOpen} onOpenChange={setHiddenOpen} className="rounded-xl border border-border bg-surface/40">
        <CollapsibleTrigger data-testid="labels-hidden-section" className="flex w-full items-center gap-2 p-3 text-sm font-semibold text-muted-foreground">
          <EyeOff className="h-4 w-4" />
          <span>{t("labels.hiddenSection")}</span>
          <Badge variant="outline" className="text-[10px]">{hiddenCats.length}</Badge>
          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", hiddenOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 p-3 pt-0">
            <p className="text-xs text-muted-foreground">{t("labels.hiddenSectionDesc")}</p>
            {hiddenCats.length === 0 && (
              <p className="text-xs text-muted-foreground">—</p>
            )}
            {hiddenCats.map((cat) => (
              <Surface
                key={cat.id}
                elevation="muted"
                radius="lg"
                data-testid={`label-hidden-${cat.id}`}
                className="flex items-center gap-2 p-2 opacity-70"
              >
                <span className="h-4 w-4 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: cat.color }} aria-hidden />
                <span className="text-sm flex-1 min-w-0 truncate">{cat.name}</span>
                {typeIcon(cat.type)}
                <Button variant="ghost" size="sm" className="h-8 gap-1 shrink-0" data-testid={`label-restore-${cat.id}`} onClick={() => toggleHidden(cat)}>
                  <Eye className="h-3.5 w-3.5" /> {t("labels.restore")}
                </Button>
              </Surface>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AddLabelDialog
        open={addDialogOpen}
        defaultColor={nextCreateColor(categories.length)}
        onOpenChange={setAddDialogOpen}
        onSave={saveNewLabel}
      />

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
              data-testid="labels-confirm-delete"
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
