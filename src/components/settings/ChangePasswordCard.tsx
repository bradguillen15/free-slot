import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword, IncorrectCurrentPasswordError } from "@/lib/authActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { makeChangePasswordSchema, type ChangePasswordValues } from "@/lib/formSchemas";

export function ChangePasswordCard() {
  const { t } = useTranslation();
  const schema = useMemo(() => makeChangePasswordSchema(t), [t]);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", password: "", confirm: "" },
  });

  const submit = async ({ currentPassword, password }: ChangePasswordValues) => {
    try {
      await changePassword(currentPassword, password);
      toast.success(t("settings.password.updated"));
      form.reset({ currentPassword: "", password: "", confirm: "" });
    } catch (err: unknown) {
      if (err instanceof IncorrectCurrentPasswordError) {
        form.setError("currentPassword", { message: t("settings.password.currentIncorrect") });
        return;
      }
      toast.error(err instanceof Error ? err.message : t("settings.password.failed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> {t("settings.password.title")}
        </CardTitle>
        <CardDescription>{t("settings.password.desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4 max-w-sm" noValidate>
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="current-password">{t("settings.password.current")}</FormLabel>
                  <FormControl>
                    <Input id="current-password" type="password" autoComplete="current-password" data-testid="settings-current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="new-password">{t("settings.password.new")}</FormLabel>
                  <FormControl>
                    <Input id="new-password" type="password" autoComplete="new-password" data-testid="settings-new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="confirm-password">{t("settings.password.confirm")}</FormLabel>
                  <FormControl>
                    <Input id="confirm-password" type="password" autoComplete="new-password" data-testid="settings-confirm-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} data-testid="settings-password-submit" className="gap-2 gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("settings.password.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
