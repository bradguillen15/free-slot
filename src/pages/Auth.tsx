import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { clearGuestData, hasGuestData } from "@/lib/localStore";
import { migrateGuestToCloud } from "@/lib/migrateGuest";
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
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  // If we land on /auth already signed-in, decide what to do.
  useEffect(() => {
    if (!user) return;
    if (hasGuestData() && !pendingUserId) {
      setPendingUserId(user.id);
      setMigrateOpen(true);
      return;
    }
    if (!migrateOpen) navigate("/app", { replace: true });
  }, [user, navigate, pendingUserId, migrateOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        // Auto-confirm is on, so the user is signed in immediately.
        const newUser = data.user;
        if (newUser && hasGuestData()) {
          setPendingUserId(newUser.id);
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
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.somethingWrong"));
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
            {mode === "signup" ? t("auth.titleSignup") : t("auth.titleSignin")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === "signup" ? t("auth.subtitleSignup") : t("auth.subtitleSignin")}
          </p>
        </div>

        <div className="glass rounded-2xl border border-border p-6 shadow-elevated">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="bg-input border-border"
              />
            </div>
            <Button type="submit" disabled={loading || googleLoading} className="w-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? t("auth.submitSignup") : t("auth.submitSignin")}
            </Button>
          </form>

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
            disabled={loading || googleLoading}
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

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? t("auth.haveAccount") : t("auth.newHere")}{" "}
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-primary hover:text-primary-glow transition-colors font-medium"
            >
              {mode === "signup" ? t("auth.submitSignin") : t("auth.createOne")}
            </button>
          </div>
        </div>
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
            <AlertDialogCancel onClick={startFresh} disabled={migrating}>{t("auth.migrate.startFresh")}</AlertDialogCancel>
            <AlertDialogAction onClick={importNow} disabled={migrating}>
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
