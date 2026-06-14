import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/ColorInput";
import { addLabelSchema, type AddLabelValues } from "./addLabelSchema";

type Props = {
  open: boolean;
  type: "productive" | "unproductive";
  /** Seed color for a fresh label (cycled palette from the caller). */
  defaultColor: string;
  onOpenChange: (open: boolean) => void;
  /** Persist the label. Return `true` on success so the dialog can close. */
  onSave: (values: AddLabelValues) => Promise<boolean>;
};

export function AddLabelDialog({ open, type, defaultColor, onOpenChange, onSave }: Props) {
  const { t } = useTranslation();

  // Build the schema with a translated "required" message; the rest are static.
  const schema = useMemo(
    () => addLabelSchema.extend({ name: z.string().trim().min(1, t("labels.nameRequired")) }),
    [t],
  );

  const form = useForm<AddLabelValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", color: defaultColor, type },
  });

  // Re-seed when the dialog (re)opens for a given type/color.
  useEffect(() => {
    if (open) form.reset({ name: "", color: defaultColor, type });
  }, [open, defaultColor, type, form]);

  const title = type === "productive"
    ? t("labels.addModalTitleProductive")
    : t("labels.addModalTitleUnproductive");

  const onSubmit = async (values: AddLabelValues) => {
    const ok = await onSave(values);
    if (ok) onOpenChange(false);
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="label-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("labels.namePlaceholder")}
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("labels.color")}
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
              <Button type="submit" disabled={submitting} data-testid="label-dialog-submit">
                {submitting ? t("common.loading") : t("labels.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
