import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useCategoryName } from "@/lib/categoryLabels";

export type FilterCategory = { id: string; name: string; color: string };

type Props = {
  categories: FilterCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function LabelFilter({ categories, selectedIds, onChange }: Props) {
  const { t } = useTranslation();
  const categoryName = useCategoryName();

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  };

  const isAll = selectedIds.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      <button
        type="button"
        onClick={() => onChange([])}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
          isAll
            ? "border-primary bg-primary/15 text-primary"
            : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
        )}
      >
        {t("dashboard.filter.all")}
      </button>
      {categories.map((cat) => {
        const active = selectedIds.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
              active
                ? "border-transparent text-foreground"
                : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
            style={active ? { backgroundColor: `${cat.color}26`, borderColor: cat.color } : undefined}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            {categoryName(cat.name)}
          </button>
        );
      })}
    </div>
  );
}
