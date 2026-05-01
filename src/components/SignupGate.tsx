import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function SignupGate({
  title = "Create a free account to unlock this",
  description = "Your guest data stays. Sign up to enable AI weekly plans, dashboards, weekly reviews, and sync across devices.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-6 overflow-hidden"
    >
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="relative flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-glow shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create free account
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
