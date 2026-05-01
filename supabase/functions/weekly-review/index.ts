import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const planned: { name: string; minutes: number }[] = body.planned ?? [];
    const actual: { name: string; minutes: number }[] = body.actual ?? [];
    const productiveRatio: number = body.productive_ratio ?? 0;
    const totalTracked: number = body.total_tracked ?? 0;

    if (!week_start) return json({ error: "week_start required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const fmt = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
    const plannedTxt = planned.length
      ? planned.map((p) => `- ${p.name}: ${fmt(p.minutes)}`).join("\n")
      : "(no plan)";
    const actualTxt = actual.length
      ? actual.map((p) => `- ${p.name}: ${fmt(p.minutes)}`).join("\n")
      : "(no logs)";

    const systemPrompt = `You are a thoughtful weekly review coach. You analyze a user's planned vs actual time use and write a SHORT, warm, specific reflection (3-5 sentences). Celebrate wins, name one clear gap honestly, and suggest one concrete experiment for next week. No emojis, no bullet points, no headings. Talk to the user directly ("you").`;

    const userPrompt = `Week of ${week_start}.
Productive ratio: ${productiveRatio}% (${fmt(totalTracked)} tracked).

PLANNED:
${plannedTxt}

ACTUAL:
${actualTxt}

Write the reflection now.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limit, try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiRes.json();
    const insights: string =
      aiJson.choices?.[0]?.message?.content?.trim() ?? "Nice work showing up this week.";

    const planned_vs_actual = { planned, actual, productive_ratio: productiveRatio, total_tracked: totalTracked };

    await supabase.from("weekly_reviews").delete().eq("user_id", user.id).eq("week_start", week_start);
    const { data: saved, error: insErr } = await supabase
      .from("weekly_reviews")
      .insert({ user_id: user.id, week_start, insights, planned_vs_actual })
      .select()
      .single();

    if (insErr) {
      console.error("Insert err", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({ review: saved });
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
