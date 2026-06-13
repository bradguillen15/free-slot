import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings as SettingsIcon, Trash2, Save, Tag, AlertTriangle, CalendarRange, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, updateProfile } from "@/lib/dataStore";
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
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const deleteAccountSchema = z.object({ confirmText: z.literal("DELETE") });

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mode = user ? "cloud" : "guest";

  const { data: profileRaw, refresh: refreshProfile } = useProfile();

  const form = useForm<PlannerPrefsValues>({
    resolver: zodResolver(plannerPrefsSchema),
    defaultValues: { peakStart: "09:00", peakEnd: "12:00", includeWeekends: true, weeklyReviewDay: 0 },
  });

  // Hydrate from the loaded profile; don't clobber unsaved edits on refetch.
  useEffect(() => {
    if (!profileRaw || form.formState.isDirty) return;
    const peak = (profileRaw.peak_hours as { start: string; end: string } | null) ?? { start: "09:00", end: "12:00" };
    form.reset({
      peakStart: peak.start ?? "09:00",
      peakEnd: peak.end ?? "12:00",
      includeWeekends: profileRaw.include_weekends ?? true,
      weeklyReviewDay: profileRaw.weekly_review_day ?? 0,
    });
  }, [profileRaw, form]);

  const [deleting, setDeleting] = useState(false);
  const deleteForm = useForm<{ confirmText: string }>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmText: "" },
    mode: "onChange",
  });

  const saveProfile = async (values: PlannerPrefsValues) => {
    if (mode === "cloud" && !user) return;
    try {
      await updateProfile(mode, user?.id ?? null, {
        peak_hours: { start: values.peakStart, end: values.peakEnd },
        include_weekends: values.includeWeekends,
        weekly_review_day: values.weeklyReviewDay,
      });
      await refreshProfile();
      form.reset(values); // mark clean so the next profile refetch can rehydrate
      toast.success("Preferences saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save preferences");
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      setDeleting(false);
      toast.error(error.message ?? "Failed to delete account");
      return;
    }
    toast.success("Account deleted");
    await signOut();
    navigate("/", { replace: true });
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
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Tune the planner and manage your labels.</p>
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
          <CardTitle className="text-lg">Planner preferences</CardTitle>
          <CardDescription>How free time is detected and how the AI fills your week.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(saveProfile)} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="peakStart"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label>Peak hours start</Label>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="peakEnd"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label>Peak hours end</Label>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label className="text-base">Include weekends</Label>
                  <p className="text-xs text-muted-foreground mt-1">Plan activities on Saturday and Sunday.</p>
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
                    <Label>Weekly review day</Label>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2">
                <Save className="h-4 w-4" /> {form.formState.isSubmitting ? "Saving…" : "Save preferences"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {user && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Danger zone
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog onOpenChange={(o) => !o && deleteForm.reset({ confirmText: "" })}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently erase your profile, activities, categories, time logs,
                    weekly plans, and reviews. Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  {...deleteForm.register("confirmText")}
                  placeholder="DELETE"
                  autoFocus
                />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!deleteForm.formState.isValid || deleting}
                    onClick={(e) => { e.preventDefault(); deleteAccount(); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Delete forever"}
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
