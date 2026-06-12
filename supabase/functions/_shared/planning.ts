// Pure helpers shared by the AI edge functions. No Deno APIs here — this file
// is unit-tested with Vitest from the main repo (see planning.test.ts).

export type GapWindow = { day: string; start: string; end: string; durationMin: number; isPeak: boolean };
export type PlanActivity = { id: string; name: string; target_hours_per_week: number; category_id: string | null };
export type Priority = { activity_id: string; rank: number };
export type AISlot = {
  activity_id: string;
  activity_name: string;
  day: string;
  start: string;
  end: string;
  rationale?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

export function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

/** Order activities by explicit priorities, falling back to target hours desc. */
export function rankActivities(
  activities: PlanActivity[],
  priorities: Priority[]
): PlanActivity[] {
  if (!priorities.length) {
    return [...activities].sort(
      (a, b) => (b.target_hours_per_week ?? 0) - (a.target_hours_per_week ?? 0)
    );
  }
  return [...priorities]
    .sort((a, b) => a.rank - b.rank)
    .map((p) => activities.find((x) => x.id === p.activity_id))
    .filter((a): a is PlanActivity => Boolean(a));
}

export function buildPlanPrompts(
  weekStart: string,
  gaps: GapWindow[],
  activities: PlanActivity[],
  priorities: Priority[]
): { system: string; user: string } {
  const ordered = rankActivities(activities, priorities);
  const ranked = ordered
    .map((a, i) => `${i + 1}. ${a.name} (target ${a.target_hours_per_week}h/wk, id=${a.id})`)
    .join("\n");
  const gapText = gaps
    .map((g) => `- ${g.day} ${g.start}-${g.end} (${g.durationMin}m${g.isPeak ? ", PEAK" : ""})`)
    .join("\n");

  const system = `You are a focused weekly time-planning assistant. Given a list of free time windows and ranked activity priorities, you assign activities to specific windows to best meet weekly hour targets. Prefer peak windows for top-ranked activities. Never exceed a window's duration. Leave space if there isn't enough free time. Return tool call only.`;

  const user = `Week starting ${weekStart}.

RANKED PRIORITIES (top first):
${ranked || "(none)"}

FREE WINDOWS:
${gapText || "(none)"}

Plan activities into these windows. Each slot must use start/end inside one window on the same day. Slot duration in minutes <= window duration. Total minutes per activity should approximate target_hours_per_week*60 if possible.`;

  return { system, user };
}

/**
 * Keep only well-formed slots that fit inside one of the submitted free
 * windows on the same day. The model is told these rules, but its output is
 * untrusted — invalid slots would otherwise be persisted and later inserted
 * into time_logs unchecked.
 */
export function validateSlots(slots: unknown, gaps: GapWindow[]): AISlot[] {
  if (!Array.isArray(slots)) return [];
  const out: AISlot[] = [];
  for (const raw of slots) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    if (
      typeof s.activity_id !== "string" ||
      typeof s.activity_name !== "string" ||
      typeof s.day !== "string" || !ISO_DATE.test(s.day) ||
      typeof s.start !== "string" || !HHMM.test(s.start) ||
      typeof s.end !== "string" || !HHMM.test(s.end)
    ) continue;
    // Free windows never wrap midnight, so a valid slot has end > start...
    if (s.end <= s.start) continue;
    // ...and sits inside one window on the same day (HH:MM compares lexically).
    const fits = gaps.some(
      (g) => g.day === s.day && g.start <= (s.start as string) && (s.end as string) <= g.end
    );
    if (!fits) continue;
    out.push({
      activity_id: s.activity_id,
      activity_name: s.activity_name,
      day: s.day,
      start: s.start,
      end: s.end,
      rationale: typeof s.rationale === "string" ? s.rationale : undefined,
    });
  }
  return out;
}

export type ReviewInput = {
  weekStart: string;
  planned: { name: string; minutes: number }[];
  actual: { name: string; minutes: number }[];
  productiveRatio: number;
  totalTracked: number;
};

export function buildReviewPrompts(input: ReviewInput): { system: string; user: string } {
  const lines = (items: { name: string; minutes: number }[], empty: string) =>
    items.length ? items.map((p) => `- ${p.name}: ${fmtMinutes(p.minutes)}`).join("\n") : empty;

  const system = `You are a thoughtful weekly review coach. You analyze a user's planned vs actual time use and write a SHORT, warm, specific reflection (3-5 sentences). Celebrate wins, name one clear gap honestly, and suggest one concrete experiment for next week. No emojis, no bullet points, no headings. Talk to the user directly ("you").`;

  const user = `Week of ${input.weekStart}.
Productive ratio: ${input.productiveRatio}% (${fmtMinutes(input.totalTracked)} tracked).

PLANNED:
${lines(input.planned, "(no plan)")}

ACTUAL:
${lines(input.actual, "(no logs)")}

Write the reflection now.`;

  return { system, user };
}
