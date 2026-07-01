import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildPlanGeminiBody,
  callGeminiGenerateContent,
  formatGeminiApiError,
  geminiFailureHttpStatus,
  parseGeminiFunctionCall,
} from "../_shared/gemini.ts";
import {
  buildPlanPrompts,
  validateSlots,
  type GapWindow,
  type PlanActivity as Activity,
  type Priority,
} from "../_shared/planning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const gaps: GapWindow[] = body.gaps ?? [];
    const activities: Activity[] = body.activities ?? [];
    const priorities: Priority[] = body.priorities ?? [];

    if (!week_start) return json({ error: "week_start required" }, 400);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "AI not configured" }, 500);

    const { system: systemPrompt, user: userPrompt } = buildPlanPrompts(
      week_start, gaps, activities, priorities
    );

    const aiRes = await callGeminiGenerateContent(
      GEMINI_API_KEY,
      buildPlanGeminiBody(systemPrompt, userPrompt)
    );

    if (!aiRes.ok) {
      console.error("Gemini API error", aiRes.status, aiRes.text);
      return json(
        { error: formatGeminiApiError(aiRes.status, aiRes.text) },
        geminiFailureHttpStatus(aiRes.status)
      );
    }

    const toolArgs = parseGeminiFunctionCall(aiRes.json, "propose_plan");
    if (!toolArgs) {
      return json(
        { error: "AI did not return a plan structure. Try generating again." },
        500
      );
    }

    const parsed = toolArgs as { slots: unknown[]; summary: string };
    const slots = validateSlots(parsed.slots, gaps);

    const { data: saved, error: insErr } = await supabase
      .from("weekly_plans")
      .upsert(
        {
          user_id: user.id,
          week_start,
          slots,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();

    if (insErr) {
      console.error("Insert err", insErr);
      return json({ error: "Could not save plan" }, 500);
    }

    return json({ plan: saved, summary: parsed.summary });
  } catch (e) {
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
