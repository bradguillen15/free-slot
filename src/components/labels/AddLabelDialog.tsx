import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Brain, Zap, Heart } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RequiredMark } from "@/components/ui/required-mark";
import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/ColorInput";
import { addLabelSchema, type AddLabelValues } from "./addLabelSchema";
import { cn } from "@/lib/utils";

type LabelType = "productive" | "unproductive" | "essential";

const TYPE_OPTIONS: { value: LabelType; label: string; description: string; icon: React.ReactNode; activeClass: string }[] = [
  {
    value: "productive",
    label: "Productive",
    description: "Counts toward your ratio",
    icon: <Brain className="h-4 w-4" />,
    activeClass: "border-productive bg-productive/10 text-productive",
  },
  {
    value: "unproductive",
    label: "Unproductive",
    description: "Counts against your ratio",
    icon: <Zap className="h-4 w-4" />,
    activeClass: "border-unproductive bg-unproductive/10 text-unproductive",
  },
  {
    value: "essential",
    label: "Essential",
    description: "Sleep, meals, hygiene — excluded from ratio",
    icon: <Heart className="h-4 w-4" />,
    activeClass: "border-primary/60 bg-primary/10 text-primary",
  },
];

type Props = {
  open: boolean;
  defaultColor: string;
  onOpenChange: (open: boolean) => void;
  onSave: (values: AddLabelValues) => Promise<boolean>;
};

export function AddLabelDialog({ open, defaultColor, onOpenChange, onSave }: Props) {
  const { t } = useTranslation();

  const schema = useMemo(
    () => addLabelSchema.extend({ name: z.string().trim().min(1, t("labels.nameRequired")) }),
    [t],
  );

  const form = useForm<AddLabelValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", color: defaultColor, type: "productive" },
  });

  useEffect(() => {
    if (open) form.reset({ name: "", color: defaultColor, type: "productive" });
  }, [open, defaultColor, form]);

  const onSubmit = async (values: AddLabelValues) => {
    const ok = await onSave(values);
    if (ok) onOpenChange(false);
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("labels.addModalTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="label-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("labels.namePlaceholder")}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input id="label-name" placeholder={t("labels.namePlaceholder")} data-testid="label-dialog-name" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    Type
                    <RequiredMark />
                  </FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors",
                          field.value === opt.value
                            ? opt.activeClass
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                        data-testid={`label-type-${opt.value}`}
                      >
                        {opt.icon}
                        <span className="text-[11px] font-medium leading-tight">{opt.label}</span>
                        <span className="text-[9px] leading-tight opacity-75">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("labels.color")}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <ColorInput value={field.value} onChange={field.onChange} ariaLabel={t("labels.color")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("labels.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="label-dialog-submit"
                className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                {submitting ? t("common.loading") : t("labels.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
