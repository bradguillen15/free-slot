import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { clearGuestData, hasGuestData } from "@/lib/localStore";
import { migrateGuestToCloud } from "@/lib/migrateGuest";
import { mapAuthError } from "@/lib/authErrors";
import { resetPasswordRedirectTo } from "@/lib/authConfig";
import { prefetchCloudData } from "@/lib/dataStore";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PublicHeader } from "@/components/PublicHeader";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  // Google OAuth is wired but hidden until the flow is refined — opt in with VITE_ENABLE_GOOGLE_SIGN_IN=true.
  const googleSignInEnabled = import.meta.env.VITE_ENABLE_GOOGLE_SIGN_IN === "true";
  // Default to sign-in — returning users are the common case; "Create account"
  // entry points opt into signup via ?mode=signup.
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const toggleMode = () => {
    const next = new URLSearchParams(searchParams);
    if (mode === "signup") next.delete("mode");
    else next.set("mode", "signup");
    setSearchParams(next, { replace: true });
  };
  const [googleLoading, setGoogleLoading] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const schema = useMemo(
    () => z.object({
      email: z.string().email(t("auth.invalidEmail")),
      password: z.string().min(6, t("auth.passwordMin")),
    }),
    [t],
  );
  type AuthValues = z.infer<typeof schema>;

  const form = useForm<AuthValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const forgotSchema = useMemo(
    () => z.object({ email: z.string().email(t("auth.invalidEmail")) }),
    [t],
  );
  const forgotForm = useForm<{ email: string }>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  // Carry over any email already typed once the forgot panel mounts. Resetting
  // before mount would leave the freshly-mounted field unresponsive to input.
  useEffect(() => {
    if (forgotOpen) forgotForm.reset({ email: form.getValues("email") });
  }, [forgotOpen, forgotForm, form]);

  useEffect(() => {
    if (!user) return;
    if (hasGuestData() && !pendingUserId) {
      setPendingUserId(user.id);
      setMigrateOpen(true);
      return;
    }
    // While a migration is in flight, the Radix dialog has already auto-closed
    // (migrateOpen=false) but the data isn't ready yet. Defer the redirect until
    // importNow finishes so the first /app render reads migrated, cache-refreshed data.
    if (!migrateOpen && !migrating) navigate("/app", { replace: true });
  }, [user, navigate, pendingUserId, migrateOpen, migrating]);

  const submit = async ({ email, password }: AuthValues) => {
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && hasGuestData()) {
          setPendingUserId(data.user.id);
          setMigrateOpen(true);
        } else {
          toast.success(t("auth.welcome"));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user && hasGuestData()) {
          setPendingUserId(data.user.id);
          setMigrateOpen(true);
        } else {
          toast.success(t("auth.signedIn"));
        }
      }
    } catch (err: unknown) {
      toast.error(t(mapAuthError(err)));
    }
  };

  const sendReset = async ({ email }: { email: string }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordRedirectTo(),
      });
      if (error) throw error;
      // Generic copy regardless of whether the email exists — don't leak account existence.
      toast.success(t("auth.forgot.sent"));
      setForgotOpen(false);
      forgotForm.reset({ email: "" });
    } catch (err: unknown) {
      toast.error(t(mapAuthError(err)));
    }
  };

  const openForgot = () => setForgotOpen(true);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(t(mapAuthError(err)));
    } finally {
      setGoogleLoading(false);
    }
  };

  const importNow = async () => {
    if (!pendingUserId) return;
    setMigrating(true);
    try {
      const result = await migrateGuestToCloud(pendingUserId);
      const c = result.counts;
      const parts = [
        c.time_logs && `${c.time_logs} log${c.time_logs > 1 ? "s" : ""}`,
        c.activities && `${c.activities} activit${c.activities > 1 ? "ies" : "y"}`,
        c.schedule_blocks && `${c.schedule_blocks} block${c.schedule_blocks > 1 ? "s" : ""}`,
        c.categories && `${c.categories} categor${c.categories > 1 ? "ies" : "y"}`,
        c.priorities && `${c.priorities} priorit${c.priorities > 1 ? "ies" : "y"}`,
      ].filter(Boolean).join(" · ");
      toast.success(t("auth.migrate.done"), { description: parts || undefined });
      setMigrateOpen(false);
      // Warm the cloud cache before navigating so the first /app render shows the
      // migrated data. invalidateQueries wouldn't help — the dashboard queries are
      // inactive here, so it marks them stale without fetching.
      await prefetchCloudData(pendingUserId);
      navigate("/app", { replace: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("auth.migrate.failed"));
    } finally {
      setMigrating(false);
    }
  };

  const startFresh = () => {
    // Discard the guest copy — otherwise the migrate prompt re-appears on every
    // future /auth visit and stale guest data resurfaces after sign-out.
    clearGuestData();
    setMigrateOpen(false);
    navigate("/app", { replace: true });
  };

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
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {forgotOpen
              ? t("auth.forgot.title")
              : mode === "signup" ? t("auth.titleSignup") : t("auth.titleSignin")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {forgotOpen
              ? t("auth.forgot.desc")
              : mode === "signup" ? t("auth.subtitleSignup") : t("auth.subtitleSignin")}
          </p>
        </div>

        {forgotOpen ? (
          <div key="forgot-panel" className="glass rounded-2xl border border-border p-6 shadow-elevated">
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(sendReset)} className="space-y-4" noValidate>
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="forgot-email">{t("auth.email")}</FormLabel>
                      <FormControl>
                        <Input id="forgot-email" type="email" autoComplete="email" data-testid="auth-forgot-email" className="bg-input border-border" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" data-testid="auth-forgot-submit" disabled={forgotForm.formState.isSubmitting} className="w-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
                  {forgotForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.forgot.submit")}
                </Button>
              </form>
            </Form>
            <div className="mt-5 text-center">
              <button type="button" onClick={() => setForgotOpen(false)} data-testid="auth-forgot-back" className="text-sm text-primary hover:text-primary-glow transition-colors font-medium">
                {t("auth.forgot.back")}
              </button>
            </div>
          </div>
        ) : (
        <div key="auth-form" className="glass rounded-2xl border border-border p-6 shadow-elevated">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">{t("auth.email")}</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        data-testid="auth-email"
                        className="bg-input border-border"
                        {...field}
                      />
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
                    <FormLabel htmlFor="password">{t("auth.password")}</FormLabel>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        data-testid="auth-password"
                        className="bg-input border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode === "signin" && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={openForgot} data-testid="auth-forgot-link" className="text-sm text-primary hover:text-primary-glow transition-colors font-medium">
                    {t("auth.forgot.link")}
                  </button>
                </div>
              )}
              <Button type="submit" data-testid="auth-submit" disabled={form.formState.isSubmitting || googleLoading} className="w-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? t("auth.submitSignup") : t("auth.submitSignin")}
              </Button>
            </form>
          </Form>

          {googleSignInEnabled && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t("auth.orDivider")}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting || googleLoading}
                onClick={signInWithGoogle}
                className="w-full bg-input border-border"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon className="h-4 w-4" />
                    {t("auth.continueWithGoogle")}
                  </>
                )}
              </Button>
            </>
          )}

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? t("auth.haveAccount") : t("auth.newHere")}{" "}
            <button
              onClick={toggleMode}
              data-testid="auth-mode-toggle"
              className="text-primary hover:text-primary-glow transition-colors font-medium"
            >
              {mode === "signup" ? t("auth.submitSignin") : t("auth.createOne")}
            </button>
          </div>
        </div>
        )}
      </motion.div>
      </div>

      <AlertDialog open={migrateOpen} onOpenChange={setMigrateOpen}>
        {/* Force an explicit choice — Escape-dismissing leaves guest data in limbo
            (re-prompts on every /auth visit and resurfaces after sign-out). */}
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("auth.migrate.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("auth.migrate.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={startFresh} disabled={migrating} data-testid="migrate-start-fresh">{t("auth.migrate.startFresh")}</AlertDialogCancel>
            <AlertDialogAction onClick={importNow} disabled={migrating} data-testid="migrate-import" className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.migrate.import")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
