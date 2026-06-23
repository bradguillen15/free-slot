import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicHeader } from "@/components/PublicHeader";
import { updatePassword } from "@/lib/authActions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { makePasswordSchema, type PasswordValues } from "@/lib/formSchemas";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const schema = useMemo(() => makePasswordSchema(t), [t]);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const submit = async ({ password }: PasswordValues) => {
    try {
      await updatePassword(password);
      toast.success(t("auth.reset.done"));
      navigate("/app", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("settings.password.failed"));
    }
  };

  // The recovery link establishes a session; without one the link is invalid/expired.
  const linkInvalid = !loading && !user;

  return (
    <div className="h-dvh flex flex-col px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60" style={{ backgroundImage: "var(--gradient-glow)" }} />
      <div className="shrink-0">
        <PublicHeader />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-md m-auto"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <BrandLogo size={36} className="rounded-xl shadow-glow" />
              <span className="font-display text-xl font-semibold tracking-tight">FreeSlot</span>
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{t("auth.reset.title")}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {linkInvalid ? t("auth.reset.invalid") : t("auth.reset.desc")}
            </p>
          </div>

          <div className="glass rounded-2xl border border-border p-6 shadow-elevated">
            {linkInvalid ? (
              <Button asChild className="w-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
                <Link to="/auth" data-testid="reset-request-new">{t("auth.reset.requestNew")}</Link>
              </Button>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="reset-password">{t("settings.password.new")}</FormLabel>
                        <FormControl>
                          <Input id="reset-password" type="password" autoComplete="new-password" data-testid="reset-new-password" className="bg-input border-border" {...field} />
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
                        <FormLabel htmlFor="reset-confirm">{t("settings.password.confirm")}</FormLabel>
                        <FormControl>
                          <Input id="reset-confirm" type="password" autoComplete="new-password" data-testid="reset-confirm-password" className="bg-input border-border" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" data-testid="reset-submit" disabled={form.formState.isSubmitting} className="w-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
                    {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.reset.submit")}
                  </Button>
                </form>
              </Form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
