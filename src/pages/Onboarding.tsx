import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, ArrowRight, ArrowLeft, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { plannerPrefsSchema, type PlannerPrefsValues } from "@/lib/formSchemas";
import { toast } from "sonner";
import { DAYS } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { PublicHeader } from "@/components/PublicHeader";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { ActivityEditor } from "@/components/activities/ActivityEditor";
import { useTranslation } from "react-i18next";
import { ensureBootstrap } from "@/lib/localStore";
import { useActivities, useVisibleCategories, useProfile, updateProfile } from "@/lib/dataStore";
import type { Category } from "@/components/day/QuickLogDialog";

type Activity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const STEPS = [t("onboarding.steps.schedule"), t("onboarding.steps.activities"), t("onboarding.steps.preferences")];
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const { all: allCategoriesRaw, refresh: refreshCats } = useVisibleCategories();
  const { data: activitiesRaw, refresh: refreshActs } = useActivities();
  const { data: profile } = useProfile();

  const categories = (allCategoriesRaw ?? []) as unknown as Category[];
  const activities = (activitiesRaw ?? []) as unknown as Activity[];
  const reloadActivities = () => { refreshCats(); refreshActs(); };

  // Step 3 — preferences, pre-populated from saved profile on first load only
  const form = useForm<PlannerPrefsValues>({
    resolver: zodResolver(plannerPrefsSchema),
    defaultValues: { includeWeekends: true, weeklyReviewDay: 0 },
  });
  const prefsLoaded = useRef(false);

  useEffect(() => {
    if (!user) ensureBootstrap();
  }, [user]);

  useEffect(() => {
    if (prefsLoaded.current || !profile) return;
    form.reset({
      includeWeekends: profile.include_weekends ?? true,
      weeklyReviewDay: profile.weekly_review_day ?? 0,
    });
    prefsLoaded.current = true;
  }, [profile, form]);

  const mode = user ? "cloud" : "guest";

  const skip = async () => {
    setSaving(true);
    try {
      await updateProfile(mode, user?.id ?? null, { onboarding_skipped: true });
      navigate("/app", { replace: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.somethingWrong"));
    } finally {
      setSaving(false);
    }
  };

  const finish = async (values: PlannerPrefsValues) => {
    setSaving(true);
    try {
      await updateProfile(mode, user?.id ?? null, {
        include_weekends: values.includeWeekends,
        weekly_review_day: values.weeklyReviewDay,
        onboarding_completed: true,
      });
      toast.success(t("onboarding.allSet"));
      navigate("/app", { replace: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.somethingWrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-dvh flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-50" style={{ backgroundImage: "var(--gradient-glow)" }} />

      <div className="shrink-0">
        <PublicHeader showAppLink={false} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto px-6 py-6">

        <div className="flex items-center gap-3 mb-6">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                    i < step && "bg-primary text-primary-foreground border-primary",
                    i === step && "border-primary text-primary bg-primary/10",
                    i > step && "border-border text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn("text-sm font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px bg-border mt-3 -mb-3" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {step === 0 && (
              <section className="space-y-5">
                <header>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">{t("onboarding.schedule.title")}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{t("onboarding.schedule.subtitle")}</p>
                </header>

                <ScheduleEditor />
              </section>
            )}

            {step === 1 && (
              <section className="space-y-5">
                <header>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">{t("onboarding.activities.title")}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{t("onboarding.activities.subtitle")}</p>
                </header>

                <ActivityEditor
                  userId={user?.id ?? null}
                  categories={categories}
                  activities={activities}
                  onChange={reloadActivities}
                />
              </section>
            )}

            {step === 2 && (
              <section className="space-y-6">
                <header>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">{t("onboarding.preferences.title")}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{t("onboarding.preferences.subtitle")}</p>
                </header>

                <Form {...form}>
                  <div className="glass rounded-xl border border-border p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="block">{t("onboarding.preferences.weekends")}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("onboarding.preferences.weekendsHint")}</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="includeWeekends"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block">{t("onboarding.preferences.reviewDay")}</Label>
                      <FormField
                        control={form.control}
                        name="weeklyReviewDay"
                        render={({ field }) => (
                          <div className="flex flex-wrap gap-1.5">
                            {DAYS.map((d) => (
                              <button
                                key={d.idx}
                                type="button"
                                data-testid={`onboarding-review-day-${d.idx}`}
                                onClick={() => field.onChange(d.idx)}
                                className={cn(
                                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                                  field.value === d.idx
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-surface border-border text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {d.short}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Settings2 className="h-4 w-4 shrink-0" />
                      <p className="text-xs">{t("onboarding.preferences.settingsHint")}</p>
                    </div>
                  </div>
                </Form>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.back")}
          </Button>

          <Button
            variant="ghost"
            onClick={skip}
            disabled={saving}
            data-testid="onboarding-skip"
            className="text-muted-foreground hover:text-foreground"
          >
            {t("onboarding.skip")}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              data-testid="onboarding-continue"
              className="gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow"
            >
              {t("common.continue")} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={form.handleSubmit(finish)}
              disabled={saving}
              data-testid="onboarding-finish"
              className="gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-glow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("common.finish")} <Check className="h-4 w-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
