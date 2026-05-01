import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type GapWindow = { day: string; start: string; end: string; durationMin: number; isPeak: boolean };
type Activity = { id: string; name: string; target_hours_per_week: number; category_id: string | null };
type Priority = { activity_id: string; rank: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const week_start: string = body.week_start;
    const gaps: GapWindow[] = body.gaps ?? [];
    const activities: Activity[] = body.activities ?? [];
    const priorities: Priority[] = body.priorities ?? [];

    if (!week_start) return json({ error: "week_start required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // If no explicit priorities, fall back to all activities ranked by target hours desc
    const ordered = priorities.length
      ? priorities
          .sort((a, b) => a.rank - b.rank)
          .map((p) => activities.find((x) => x.id === p.activity_id))
          .filter(Boolean) as Activity[]
      : [...activities].sort((a, b) => (b.target_hours_per_week ?? 0) - (a.target_hours_per_week ?? 0));

    const ranked = ordered
      .map((a, i) => `${i + 1}. ${a.name} (target ${a.target_hours_per_week}h/wk, id=${a.id})`)
      .join("\n");

    const gapText = gaps
      .map((g) => `- ${g.day} ${g.start}-${g.end} (${g.durationMin}m${g.isPeak ? ", PEAK" : ""})`)
      .join("\n");

    const systemPrompt = `You are a focused weekly time-planning assistant. Given a list of free time windows and ranked activity priorities, you assign activities to specific windows to best meet weekly hour targets. Prefer peak windows for top-ranked activities. Never exceed a window's duration. Leave space if there isn't enough free time. Return tool call only.`;

    const userPrompt = `Week starting ${week_start}.

RANKED PRIORITIES (top first):
${ranked || "(none)"}

FREE WINDOWS:
${gapText || "(none)"}

Plan activities into these windows. Each slot must use start/end inside one window on the same day. Slot duration in minutes <= window duration. Total minutes per activity should approximate target_hours_per_week*60 if possible.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "propose_plan",
              description: "Return scheduled slots for the week.",
              parameters: {
                type: "object",
                properties: {
                  slots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        activity_id: { type: "string" },
                        activity_name: { type: "string" },
                        day: { type: "string", description: "ISO date YYYY-MM-DD" },
                        start: { type: "string", description: "HH:MM 24h" },
                        end: { type: "string", description: "HH:MM 24h" },
                        rationale: { type: "string" },
                      },
                      required: ["activity_id", "activity_name", "day", "start", "end"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string" },
                },
                required: ["slots", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "propose_plan" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limit, try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "No plan returned" }, 500);

    let parsed: { slots: any[]; summary: string };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return json({ error: "Invalid AI output" }, 500);
    }

    // Atomic upsert by (user_id, week_start) — relies on unique constraint
    const { data: saved, error: insErr } = await supabase
      .from("weekly_plans")
      .upsert(
        {
          user_id: user.id,
          week_start,
          slots: parsed.slots,
          generated_at: new Date().toISOString(),
          raw_prompt: { system: systemPrompt, user: userPrompt },
          raw_response: aiJson,
        },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();

    if (insErr) {
      console.error("Insert err", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({ plan: saved, summary: parsed.summary });
  } catch (e) {
    console.error("fn error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
