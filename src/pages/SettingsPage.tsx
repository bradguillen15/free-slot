import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Plus, Trash2, Save, Tag, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useCategories, updateProfile } from "@/lib/dataStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  color: string;
  type: "productive" | "unproductive";
  is_default: boolean;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const mode = user ? "cloud" : "guest";

  const { data: profileRaw, refresh: refreshProfile } = useProfile();
  const { data: categoriesRaw, refresh: refreshCats } = useCategories();

  // Local editable copy of profile
  const [localProfile, setLocalProfile] = useState<{
    peak_hours: { start: string; end: string };
    buffer_minutes: number;
    include_weekends: boolean;
    weekly_review_day: number;
  } | null>(null);

  // Sync local profile whenever the dataStore profile changes
  const profile = localProfile ?? (profileRaw ? {
    peak_hours: (profileRaw.peak_hours as { start: string; end: string } | null) ?? { start: "09:00", end: "12:00" },
    buffer_minutes: profileRaw.buffer_minutes ?? 15,
    include_weekends: profileRaw.include_weekends ?? true,
    weekly_review_day: profileRaw.weekly_review_day ?? 0,
  } : null);

  // Optimistic overlay for category mutations so the list updates instantly
  // without waiting for refreshCats() to resolve.
  const [localCats, setLocalCats] = useState<Category[] | null>(null);
  const categories = localCats ?? ((categoriesRaw ?? []) as unknown as Category[]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [newCat, setNewCat] = useState({ name: "", color: "#3b82f6", type: "productive" as "productive" | "unproductive" });

  const setProfile = (patch: typeof profile) => setLocalProfile(patch);

  const saveProfile = async () => {
    if (!profile) return;
    if (mode === "cloud" && !user) return; // cloud write requires an authenticated user
    setSaving(true);
    try {
      await updateProfile(mode, user?.id ?? null, {
        peak_hours: profile.peak_hours,
        buffer_minutes: profile.buffer_minutes,
        include_weekends: profile.include_weekends,
        weekly_review_day: profile.weekly_review_day,
      });
      setLocalProfile(null); // let dataStore be the source of truth
      await refreshProfile();
      toast.success("Preferences saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  // Category mutations remain cloud-only (categories aren't in the localStorage CRUD schema via Settings)
  const addCategory = async () => {
    if (!user || !newCat.name.trim()) return;
    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: user.id, name: newCat.name.trim(), color: newCat.color, type: newCat.type })
      .select("id,name,color,type,is_default")
      .single();
    if (error) return toast.error(error.message);
    // Optimistically append so the list updates instantly
    setLocalCats((prev) => [...(prev ?? categories), data as Category]);
    setNewCat({ name: "", color: "#3b82f6", type: "productive" });
    toast.success("Category added");
    // Sync authoritative data in the background; clear override once done
    refreshCats().then(() => setLocalCats(null));
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    if (!user) return;
    // Optimistically update local state so the UI reflects the change instantly
    setLocalCats((prev) => (prev ?? categories).map((c) => c.id === id ? { ...c, ...patch } : c));
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      setLocalCats(null); // revert to authoritative data on failure
    } else {
      refreshCats().then(() => setLocalCats(null));
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    if (!confirm("Delete this category? Logs and activities using it will keep working but lose color.")) return;
    setLocalCats((prev) => (prev ?? categories).filter((c) => c.id !== id));
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setLocalCats(null); // revert on failure
    } else {
      refreshCats().then(() => setLocalCats(null));
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

  if (!profile) {
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
        <p className="text-muted-foreground mt-1 text-sm">Tune the planner and curate your categories.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Planner preferences</CardTitle>
          <CardDescription>How free time is detected and how the AI fills your week.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peak hours start</Label>
              <Input
                type="time"
                value={profile.peak_hours.start}
                onChange={(e) => setProfile({ ...profile, peak_hours: { ...profile.peak_hours, start: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Peak hours end</Label>
              <Input
                type="time"
                value={profile.peak_hours.end}
                onChange={(e) => setProfile({ ...profile, peak_hours: { ...profile.peak_hours, end: e.target.value } })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Buffer between blocks</Label>
              <span className="text-sm font-mono text-muted-foreground">{profile.buffer_minutes} min</span>
            </div>
            <Slider
              value={[profile.buffer_minutes]}
              onValueChange={([v]) => setProfile({ ...profile, buffer_minutes: v })}
              min={0}
              max={60}
              step={5}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-base">Include weekends</Label>
              <p className="text-xs text-muted-foreground mt-1">Plan activities on Saturday and Sunday.</p>
            </div>
            <Switch
              checked={profile.include_weekends}
              onCheckedChange={(v) => setProfile({ ...profile, include_weekends: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Weekly review day</Label>
            <Select
              value={String(profile.weekly_review_day)}
              onValueChange={(v) => setProfile({ ...profile, weekly_review_day: Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Categories — cloud-only */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Tag className="h-4 w-4" /> Categories</CardTitle>
            <CardDescription>Color-coded buckets for time logs and activities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card/40">
                  <input
                    type="color"
                    value={cat.color}
                    onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                    className="h-8 w-10 rounded cursor-pointer bg-transparent border border-border"
                  />
                  <Input
                    key={`${cat.id}-${cat.name}`}
                    defaultValue={cat.name}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== cat.name) updateCategory(cat.id, { name });
                    }}
                    className="flex-1 h-9"
                  />
                  <Select
                    value={cat.type}
                    onValueChange={(v) => updateCategory(cat.id, { type: v as "productive" | "unproductive" })}
                  >
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="productive">Productive</SelectItem>
                      <SelectItem value="unproductive">Unproductive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="color"
                value={newCat.color}
                onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
                className="h-8 w-10 rounded cursor-pointer bg-transparent border border-border"
              />
              <Input
                placeholder="New category name"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className="flex-1 h-9"
              />
              <Select value={newCat.type} onValueChange={(v) => setNewCat({ ...newCat, type: v as "productive" | "unproductive" })}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="productive">Productive</SelectItem>
                  <SelectItem value="unproductive">Unproductive</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addCategory} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger zone — cloud-only */}
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
            <AlertDialog onOpenChange={(o) => !o && setConfirmText("")}>
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
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "DELETE" || deleting}
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
