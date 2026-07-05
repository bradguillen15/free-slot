import { useTranslation } from "react-i18next";
import { Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryName } from "@/lib/categoryLabels";

export type FilterCategory = { id: string; name: string; color: string };

type Props = {
  categories: FilterCategory[];
  selectedIds: string[];
  excludedIds: string[];
  onChange: (ids: string[]) => void;
  onExcludedChange: (ids: string[]) => void;
};

/**
 * Three-state label chips: neutral → included → excluded → neutral.
 * "All" resets both sets. Inclusions are per-visit; exclusions are persisted
 * by the caller.
 */
export function LabelFilter({ categories, selectedIds, excludedIds, onChange, onExcludedChange }: Props) {
  const { t } = useTranslation();
  const categoryName = useCategoryName();

  const cycle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
      onExcludedChange([...excludedIds, id]);
    } else if (excludedIds.includes(id)) {
      onExcludedChange(excludedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const isAll = selectedIds.length === 0 && excludedIds.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      <button
        type="button"
        onClick={() => {
          onChange([]);
          onExcludedChange([]);
        }}
        data-testid="label-filter-all"
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
        const included = selectedIds.includes(cat.id);
        const excluded = excludedIds.includes(cat.id);
        const state = included ? "included" : excluded ? "excluded" : "neutral";
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => cycle(cat.id)}
            data-testid={`label-filter-${cat.id}`}
            data-state={state}
            aria-pressed={included}
            aria-label={
              excluded
                ? t("dashboard.filter.excludedLabel", { name: categoryName(cat.name) })
                : categoryName(cat.name)
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
              included && "border-transparent text-foreground",
              excluded && "border-border bg-transparent text-muted-foreground/60 line-through opacity-70",
              !included && !excluded &&
                "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
            style={included ? { backgroundColor: `${cat.color}26`, borderColor: cat.color } : undefined}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            {categoryName(cat.name)}
            {excluded && <Ban className="h-3 w-3 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
