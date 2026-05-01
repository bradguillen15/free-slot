import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Calendar, Target, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Calendar, title: "Recurring schedule", body: "Map your week once. FreeSlot rebuilds it for you every Monday." },
  { icon: Activity, title: "Proactive logging", body: "Tap to capture what you actually did. See plan vs reality, hour by hour." },
  { icon: Brain, title: "AI weekly plan", body: "Free time gaps + your priorities → a plan for the activities you keep skipping." },
  { icon: Target, title: "Goal stack", body: "A persistent list of what matters. Re-rank weekly. The plan adapts." },
];

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-70" style={{ backgroundImage: "var(--gradient-glow)" }} />

      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <section className="pt-20 pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-muted-foreground mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              Close the gap between intention and behavior
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto">
              Find time for{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                what matters
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl mx-auto">
              FreeSlot maps your recurring week, tracks where your time actually goes, and uses AI to schedule the activities you keep meaning to do.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app">
                <Button size="lg" className="gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow">
                  Try it free — no signup <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Create account
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Use FreeSlot instantly with local storage. Sign up to sync across devices and unlock AI plans + dashboards.
            </p>
          </motion.div>
        </section>

        <section className="pb-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.32, 0.72, 0, 1] }}
              className="glass rounded-2xl border border-border p-5 hover:border-primary/40 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-display font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        FreeSlot · Built for people with too many good intentions
      </footer>
    </div>
  );
}
