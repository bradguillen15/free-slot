import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Calendar, Target, Brain, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const featureKeys = [
  { icon: Calendar, key: "schedule" },
  { icon: Activity, key: "logging" },
  { icon: Brain, key: "ai" },
  { icon: Target, key: "goals" },
] as const;

export default function Landing() {
  const { t } = useTranslation();
  return (
    <div className="h-dvh flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-70" style={{ backgroundImage: "var(--gradient-glow)" }} />

      <header className="shrink-0 w-full px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app">
            <Button variant="ghost" size="sm">{t("landing.tryApp")}</Button>
          </Link>
          <Link to="/auth">
            <Button variant="ghost" size="sm">{t("common.signIn")}</Button>
          </Link>
          <LanguageSwitcher compact />
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="m-auto w-full max-w-6xl px-6 py-6">
          <section className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-muted-foreground mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
                {t("landing.badge")}
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto">
                {t("landing.titlePre")}{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                  {t("landing.titleHighlight")}
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
                {t("landing.subtitle")}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/app">
                  <Button size="lg" className="gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
                    {t("landing.tryFree")} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline">
                    {t("common.createAccount")}
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {t("landing.note")}
              </p>
            </motion.div>
          </section>

          <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featureKeys.map((f, i) => (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.32, 0.72, 0, 1] }}
                className="glass rounded-2xl border border-border p-4 hover:border-primary/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-1">{t(`landing.features.${f.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.features.${f.key}.body`)}</p>
              </motion.div>
            ))}
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-border py-3 text-center text-xs text-muted-foreground">
        {t("landing.footer")}
      </footer>
    </div>
  );
}
