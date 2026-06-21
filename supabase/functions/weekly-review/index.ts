import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { buildReviewPrompts } from "../_shared/planning.ts";

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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return json({ error: "AI not configured" }, 500);

    const { system: systemPrompt, user: userPrompt } = buildReviewPrompts({
      weekStart: week_start,
      planned,
      actual,
      productiveRatio,
      totalTracked,
    });

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limit, try again shortly." }, 429);
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "AI error" }, 500);
    }

    const aiJson = await aiRes.json();
    const insights: string =
      aiJson.content?.[0]?.text?.trim() ?? "Nice work showing up this week.";

    const planned_vs_actual = { planned, actual, productive_ratio: productiveRatio, total_tracked: totalTracked };

    // Atomic upsert against UNIQUE (user_id, week_start) — the previous
    // delete-then-insert raced with concurrent regenerations.
    const { data: saved, error: insErr } = await supabase
      .from("weekly_reviews")
      .upsert(
        { user_id: user.id, week_start, insights, planned_vs_actual },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();

    if (insErr) {
      console.error("Insert err", insErr);
      return json({ error: "Could not save review" }, 500);
    }

    return json({ review: saved });
  } catch (e) {
    // Log internals server-side; never return raw error details to the client.
    console.error("fn error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
