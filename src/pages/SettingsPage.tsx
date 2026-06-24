import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings as SettingsIcon, Trash2, Save, Tag, AlertTriangle, CalendarRange, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, updateProfile, useDeleteAccountMutation } from "@/lib/dataStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { plannerPrefsSchema, type PlannerPrefsValues } from "@/lib/formSchemas";
import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { toast } from "sonner";

const deleteAccountSchema = z.object({ confirmText: z.literal("DELETE") });

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const days = t("settings.days", { returnObjects: true }) as string[];
  const navigate = useNavigate();
  const mode = user ? "cloud" : "guest";

  const { data: profileRaw, refresh: refreshProfile } = useProfile();

  const form = useForm<PlannerPrefsValues>({
    resolver: zodResolver(plannerPrefsSchema),
    defaultValues: { includeWeekends: true, weeklyReviewDay: 0 },
  });

  // Hydrate from the loaded profile; don't clobber unsaved edits on refetch.
  useEffect(() => {
    if (!profileRaw || form.formState.isDirty) return;
    form.reset({
      includeWeekends: profileRaw.include_weekends ?? true,
      weeklyReviewDay: profileRaw.weekly_review_day ?? 0,
    });
  }, [profileRaw, form]);

  const deleteAccountMutation = useDeleteAccountMutation();
  const deleting = deleteAccountMutation.isPending;
  const deleteForm = useForm<{ confirmText: string }>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmText: "" },
    mode: "onChange",
  });

  const saveProfile = async (values: PlannerPrefsValues) => {
    if (mode === "cloud" && !user) return;
    try {
      await updateProfile(mode, user?.id ?? null, {
        include_weekends: values.includeWeekends,
        weekly_review_day: values.weeklyReviewDay,
      });
      await refreshProfile();
      form.reset(values); // mark clean so the next profile refetch can rehydrate
      toast.success(t("settings.preferencesSaved"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("settings.couldNotSavePrefs"));
    }
  };

  const deleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync();
      toast.success(t("settings.accountDeleted"));
      await signOut();
      navigate("/", { replace: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("settings.failedDeleteAccount"));
    }
  };

  if (!profileRaw) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("settings.subtitle")}</p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarRange className="h-4 w-4" /> {t("schedule.manageCard")}
            </CardTitle>
            <CardDescription className="mt-1.5">{t("schedule.manageCardDesc")}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Link to="/app/schedule">
              {t("schedule.title")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-4 w-4" /> {t("labels.manageCard")}
            </CardTitle>
            <CardDescription className="mt-1.5">{t("labels.manageCardDesc")}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Link to="/app/labels">
              {t("labels.title")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("settings.plannerPrefs")}</CardTitle>
          <CardDescription>{t("settings.plannerPrefsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(saveProfile)} className="space-y-6" noValidate>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label className="text-base">{t("settings.includeWeekends")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t("settings.includeWeekendsDesc")}</p>
                </div>
                <FormField
                  control={form.control}
                  name="includeWeekends"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="weeklyReviewDay"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label>{t("settings.weeklyReviewDay")}</Label>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {days.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <Save className="h-4 w-4" /> {form.formState.isSubmitting ? t("actions.saving") : t("settings.savePreferences")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {user && <ChangePasswordCard />}

      {user && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> {t("settings.dangerZone")}
            </CardTitle>
            <CardDescription>
              {t("settings.dangerZoneDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog onOpenChange={(o) => !o && deleteForm.reset({ confirmText: "" })}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> {t("settings.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.deleteAccountTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.deleteAccountDescBefore")} <span className="font-mono font-semibold text-foreground">DELETE</span> {t("settings.deleteAccountDescAfter")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  {...deleteForm.register("confirmText")}
                  placeholder="DELETE"
                  autoFocus
                />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>{t("actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!deleteForm.formState.isValid || deleting}
                    onClick={(e) => { e.preventDefault(); deleteAccount(); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? t("actions.deleting") : t("settings.deleteForever")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
