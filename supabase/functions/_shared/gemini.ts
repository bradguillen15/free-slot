export const GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

/** Outbound Gemini request timeout — fail before Supabase edge runtime limit. */
export const GEMINI_FETCH_TIMEOUT_MS = 30_000;

export function geminiGenerateContentUrl(model = GEMINI_MODEL): string {
  return `${GEMINI_API_BASE}/models/${model}:generateContent`;
}

export type GeminiPart = {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
};

export type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
};

export const PROPOSE_PLAN_DECLARATION = {
  name: "propose_plan",
  description: "Return scheduled slots for the week.",
  parameters: {
    type: "OBJECT",
    properties: {
      slots: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            activity_id: { type: "STRING" },
            activity_name: { type: "STRING" },
            day: { type: "STRING", description: "ISO date YYYY-MM-DD" },
            start: { type: "STRING", description: "HH:MM 24h" },
            end: { type: "STRING", description: "HH:MM 24h" },
            rationale: { type: "STRING" },
          },
          required: ["activity_id", "activity_name", "day", "start", "end"],
        },
      },
      summary: { type: "STRING" },
    },
    required: ["slots", "summary"],
  },
};

export function buildPlanGeminiBody(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 2048
): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    tools: [{ functionDeclarations: [PROPOSE_PLAN_DECLARATION] }],
    toolConfig: {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: ["propose_plan"],
      },
    },
    generationConfig: { maxOutputTokens },
  };
}

export function buildReviewGeminiBody(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 512
): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens },
  };
}

export async function callGeminiGenerateContent(
  apiKey: string,
  body: Record<string, unknown>
): Promise<
  | { ok: true; status: number; json: GeminiResponse }
  | { ok: false; status: number; text: string }
> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(geminiGenerateContentUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, status: res.status, text: await res.text() };
    }

    return { ok: true, status: res.status, json: (await res.json()) as GeminiResponse };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, status: 504, text: "Gemini request timed out" };
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseGeminiText(response: GeminiResponse): string | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const raw = parts.find((p) => typeof p.text === "string")?.text;
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseGeminiFunctionCall(
  response: GeminiResponse,
  expectedName: string
): Record<string, unknown> | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.functionCall?.name === expectedName && part.functionCall.args) {
      return part.functionCall.args;
    }
  }
  return null;
}

type GeminiApiErrorBody = {
  error?: { message?: string; status?: string; code?: number };
};

function tryParseGeminiErrorBody(responseBody: string): GeminiApiErrorBody["error"] | null {
  try {
    const json = JSON.parse(responseBody) as GeminiApiErrorBody;
    return json.error ?? null;
  } catch {
    return null;
  }
}

/** Strip key-like substrings before returning provider text to the client. */
export function sanitizeGeminiMessage(message: string): string {
  return message.trim().replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]").slice(0, 280);
}

/**
 * Turn a failed Gemini HTTP response into a user-safe error string.
 * Full response body is logged server-side — never returned verbatim if it may contain secrets.
 */
export function formatGeminiApiError(httpStatus: number, responseBody: string): string {
  const apiError = tryParseGeminiErrorBody(responseBody);
  const apiMessage = apiError?.message;
  const apiStatus = apiError?.status ?? "";

  if (httpStatus === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
    return "Gemini rate limit reached. Try again in a few minutes.";
  }

  const keyRelated =
    httpStatus === 403 ||
    httpStatus === 401 ||
    apiMessage?.toLowerCase().includes("api key") ||
    apiMessage?.toLowerCase().includes("api_key");

  if (keyRelated) {
    return "Gemini API key is invalid or missing. Set GEMINI_API_KEY in Supabase secrets and redeploy edge functions.";
  }

  if (httpStatus === 404 || apiStatus === "NOT_FOUND") {
    return `Gemini model "${GEMINI_MODEL}" was not found. It may have been renamed — update the model in edge function config.`;
  }

  if (httpStatus === 400 || apiStatus === "INVALID_ARGUMENT") {
    if (apiMessage) return sanitizeGeminiMessage(apiMessage);
    return "Gemini rejected the request (invalid arguments). Check edge function logs.";
  }

  if (httpStatus >= 500) {
    return "Gemini is temporarily unavailable. Try again shortly.";
  }

  if (apiMessage) return sanitizeGeminiMessage(apiMessage);

  return `Gemini request failed (HTTP ${httpStatus}). Check Supabase edge function logs for details.`;
}

export function geminiFailureHttpStatus(httpStatus: number): number {
  if (httpStatus === 429) return 429;
  if (httpStatus === 400) return 400;
  if (httpStatus === 401 || httpStatus === 403) return 502;
  return 502;
}

export function resolveGeminiApiFailure(
  httpStatus: number,
  responseBody: string
): { message: string; httpStatus: number } {
  const message = formatGeminiApiError(httpStatus, responseBody);
  return { message, httpStatus: geminiFailureHttpStatus(httpStatus) };
}
