import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { hasGuestData } from "@/lib/localStore";
import { migrateGuestToCloud } from "@/lib/migrateGuest";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PublicHeader } from "@/components/PublicHeader";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
          toast.success("Welcome to FreeSlot");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user && hasGuestData()) {
          setPendingUserId(data.user.id);
          setMigrateOpen(true);
        } else {
          toast.success("Signed in");
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
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
      ].filter(Boolean).join(" · ");
      toast.success("Your guest data is now in your account", { description: parts || undefined });
      setMigrateOpen(false);
      navigate("/app", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  const startFresh = () => {
    setMigrateOpen(false);
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60" style={{ backgroundImage: "var(--gradient-glow)" }} />

      <PublicHeader />

      <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">FreeSlot</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {mode === "signup" ? "Save your work, sync your time" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === "signup"
              ? "Create an account to keep your data, sync devices, and unlock AI plans."
              : "Sign in to your FreeSlot."}
          </p>
        </div>

        <div className="glass rounded-2xl border border-border p-6 shadow-elevated">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-primary hover:text-primary-glow transition-colors font-medium"
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </motion.div>
      </div>

      <AlertDialog open={migrateOpen} onOpenChange={setMigrateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bring your guest data along?</AlertDialogTitle>
            <AlertDialogDescription>
              We found data from your guest session. Want to import it into your new account so nothing is lost?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={startFresh} disabled={migrating}>Start fresh</AlertDialogCancel>
            <AlertDialogAction onClick={importNow} disabled={migrating}>
              {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
