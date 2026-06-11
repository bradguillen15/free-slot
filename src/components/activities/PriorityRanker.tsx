import { useEffect, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Flame, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { weekStartISO, fmtWeekRange } from "@/lib/week";
import { addDaysISO } from "@/lib/time";
import { listPriorities, setPriorities } from "@/lib/localStore";

type Category = { id: string; name: string; color: string; type: string };
type Activity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

type RankItem = Activity & { rank: number };

function SortableRow({ item, idx, cat }: { item: RankItem; idx: number; cat?: Category }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const medal = idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-700" : "text-muted-foreground";
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border/60 bg-background/40 hover:border-primary/30 transition-colors group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className={`flex items-center justify-center w-7 h-7 rounded-full bg-muted/50 text-sm font-bold ${medal}`}>
        {idx < 3 ? <Trophy className="h-3.5 w-3.5" /> : idx + 1}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "hsl(var(--muted-foreground))" }} />
        <span className="font-medium truncate">{item.name}</span>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{item.target_hours_per_week}h/wk</span>
      {idx === 0 && <Flame className="h-3.5 w-3.5 text-orange-400" />}
    </div>
  );
}

export function PriorityRanker({
  userId,
  activities,
  categories,
}: {
  userId: string | null;
  activities: Activity[];
  categories: Category[];
}) {
  const [weekStart, setWeekStart] = useState(weekStartISO());
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const active = activities.filter((a) => a.is_active);
      let prios: { activity_id: string; rank: number }[] | null;
      if (userId) {
        const { data, error } = await supabase
          .from("weekly_priorities")
          .select("activity_id, rank")
          .eq("user_id", userId)
          .eq("week_start", weekStart);
        if (error) console.error("weekly_priorities fetch failed:", error.message);
        prios = data;
      } else {
        prios = listPriorities(weekStart);
      }
      if (cancelled) return;
      const rankMap = new Map(prios?.map((p) => [p.activity_id, p.rank]) ?? []);
      const ordered = [...active].sort((a, b) => {
        const ra = rankMap.get(a.id) ?? 999;
        const rb = rankMap.get(b.id) ?? 999;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      });
      setItems(ordered.map((a, i) => ({ ...a, rank: i })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, weekStart, activities]);

  const persist = async (next: RankItem[]) => {
    if (!userId) {
      setPriorities(weekStart, next.map((it, i) => ({ activity_id: it.id, rank: i })));
      return;
    }
    if (next.length === 0) return;
    const rows = next.map((it, i) => ({
      user_id: userId,
      week_start: weekStart,
      activity_id: it.id,
      rank: i,
    }));
    // Single round trip; UNIQUE (user_id, week_start, activity_id) makes this
    // race-safe where the previous delete-all-then-insert was not.
    const { error } = await supabase
      .from("weekly_priorities")
      .upsert(rows, { onConflict: "user_id,week_start,activity_id" });
    if (error) toast.error(error.message);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    const next = arrayMove(items, oldIdx, newIdx).map((x, i) => ({ ...x, rank: i }));
    setItems(next);
    persist(next);
  };

  const catOf = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Trophy className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">This week's priorities</h2>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums px-2 min-w-[110px] text-center">{fmtWeekRange(weekStart)}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Drag to rank. Top three drive AI scheduling and daily nudges.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2].map((i) => <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
          Add and activate activities above to rank them.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <motion.div layout className="space-y-2">
              {items.map((item, idx) => (
                <SortableRow key={item.id} item={item} idx={idx} cat={catOf(item.category_id)} />
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
