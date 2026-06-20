import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DashboardVisibleCards } from "@/lib/localStore";

type Props = {
  visible: DashboardVisibleCards;
  onChange: (cards: DashboardVisibleCards) => void;
};

type CardKey = keyof DashboardVisibleCards;

export function CardVisibilityMenu({ visible, onChange }: Props) {
  const { t } = useTranslation();

  const toggle = (key: CardKey) => {
    onChange({ ...visible, [key]: !visible[key] });
  };

  const cards: { key: CardKey; label: string }[] = [
    { key: "perDay", label: t("dashboard.visibility.perDay") },
    { key: "byCategory", label: t("dashboard.visibility.byCategory") },
    { key: "planVsLogged", label: t("dashboard.visibility.planVsLogged") },
    { key: "agenda", label: t("dashboard.visibility.agenda") },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("dashboard.visibility.menu")} title={t("dashboard.visibility.menu")}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="end">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {t("dashboard.visibility.menu")}
        </p>
        <div className="space-y-2">
          {cards.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`card-${key}`}
                checked={visible[key]}
                onCheckedChange={() => toggle(key)}
              />
              <Label htmlFor={`card-${key}`} className="text-sm font-normal cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
