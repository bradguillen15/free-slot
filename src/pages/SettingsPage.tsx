import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Plus, Trash2, Save, Tag, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

type Profile = {
  peak_hours: { start: string; end: string };
  buffer_minutes: number;
  include_weekends: boolean;
  weekly_review_day: number;
};

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

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
  const [newCat, setNewCat] = useState({ name: "", color: "#3b82f6", type: "productive" as "productive" | "unproductive" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: cats }] = await Promise.all([
        supabase.from("profiles").select("peak_hours,buffer_minutes,include_weekends,weekly_review_day").eq("id", user.id).maybeSingle(),
        supabase.from("categories").select("id,name,color,type,is_default").eq("user_id", user.id).order("type").order("name"),
      ]);
      if (prof) {
        setProfile({
          peak_hours: (prof.peak_hours as any) ?? { start: "09:00", end: "12:00" },
          buffer_minutes: prof.buffer_minutes ?? 15,
          include_weekends: prof.include_weekends ?? true,
          weekly_review_day: prof.weekly_review_day ?? 0,
        });
      }
      setCategories((cats as Category[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        peak_hours: profile.peak_hours,
        buffer_minutes: profile.buffer_minutes,
        include_weekends: profile.include_weekends,
        weekly_review_day: profile.weekly_review_day,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Preferences saved");
  };

  const addCategory = async () => {
    if (!user || !newCat.name.trim()) return;
    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: user.id, name: newCat.name.trim(), color: newCat.color, type: newCat.type })
      .select("id,name,color,type,is_default")
      .single();
    if (error) return toast.error(error.message);
    setCategories((c) => [...c, data as Category]);
    setNewCat({ name: "", color: "#3b82f6", type: "productive" });
    toast.success("Category added");
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    setCategories((c) => c.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)));
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Logs and activities using it will keep working but lose color.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setCategories((c) => c.filter((cat) => cat.id !== id));
  };

  if (loading || !profile) {
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
            <CardDescription>How the AI fills your week.</CardDescription>
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
                    value={cat.name}
                    onChange={(e) => setCategories((c) => c.map((x) => x.id === cat.id ? { ...x, name: e.target.value } : x))}
                    onBlur={(e) => updateCategory(cat.id, { name: e.target.value })}
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
              <Select value={newCat.type} onValueChange={(v) => setNewCat({ ...newCat, type: v as any })}>
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
    </div>
  );
}
