import { describe, it, expect } from "vitest";
import {
  GEMINI_MODEL,
  buildPlanGeminiBody,
  buildReviewGeminiBody,
  formatGeminiApiError,
  geminiFailureHttpStatus,
  geminiGenerateContentUrl,
  parseGeminiFunctionCall,
  parseGeminiText,
  sanitizeGeminiMessage,
  type GeminiResponse,
} from "./gemini.ts";

describe("geminiGenerateContentUrl", () => {
  it("builds the v1beta generateContent endpoint for the default model", () => {
    expect(geminiGenerateContentUrl()).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
    );
  });
});

describe("buildPlanGeminiBody", () => {
  it("includes system instruction, tools, and forced propose_plan call", () => {
    const body = buildPlanGeminiBody("sys", "user");
    expect(body.systemInstruction).toEqual({ parts: [{ text: "sys" }] });
    expect(body.contents).toEqual([{ parts: [{ text: "user" }] }]);
    expect(body.toolConfig).toEqual({
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: ["propose_plan"],
      },
    });
    const tools = body.tools as Array<{ functionDeclarations: Array<{ name: string }> }>;
    expect(tools[0].functionDeclarations[0].name).toBe("propose_plan");
  });
});

describe("buildReviewGeminiBody", () => {
  it("includes system instruction without tools", () => {
    const body = buildReviewGeminiBody("sys", "user");
    expect(body.systemInstruction).toEqual({ parts: [{ text: "sys" }] });
    expect(body.tools).toBeUndefined();
    expect(body.generationConfig).toEqual({ maxOutputTokens: 512 });
  });
});

describe("parseGeminiText", () => {
  it("extracts trimmed text from the first text part", () => {
    const response: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "  Hello week.  " }],
          },
        },
      ],
    };
    expect(parseGeminiText(response)).toBe("Hello week.");
  });

  it("returns null when no text part exists", () => {
    expect(parseGeminiText({ candidates: [{ content: { parts: [] } }] })).toBeNull();
  });

  it("returns null for whitespace-only text", () => {
    const response: GeminiResponse = {
      candidates: [{ content: { parts: [{ text: "   \n\t  " }] } }],
    };
    expect(parseGeminiText(response)).toBeNull();
  });
});

describe("parseGeminiFunctionCall", () => {
  it("returns args when the expected function name matches", () => {
    const response: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "propose_plan",
                  args: { slots: [], summary: "done" },
                },
              },
            ],
          },
        },
      ],
    };
    expect(parseGeminiFunctionCall(response, "propose_plan")).toEqual({
      slots: [],
      summary: "done",
    });
  });

  it("returns null for a different function name", () => {
    const response: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: "other", args: {} } }],
          },
        },
      ],
    };
    expect(parseGeminiFunctionCall(response, "propose_plan")).toBeNull();
  });
});

describe("formatGeminiApiError", () => {
  it("maps invalid API key responses to a setup hint", () => {
    const body = JSON.stringify({
      error: {
        message: "API key not valid. Please pass a valid API key.",
        status: "INVALID_ARGUMENT",
      },
    });
    expect(formatGeminiApiError(400, body)).toContain("GEMINI_API_KEY");
  });

  it("maps rate limits to a retry message", () => {
    expect(formatGeminiApiError(429, "")).toContain("rate limit");
  });

  it("maps model not found to the configured model name", () => {
    expect(formatGeminiApiError(404, "")).toContain(GEMINI_MODEL);
  });

  it("sanitizes embedded key-like strings in provider messages", () => {
    const body = JSON.stringify({
      error: { message: "Bad key AIzaSyDUMMYKEY123", status: "INVALID_ARGUMENT" },
    });
    expect(formatGeminiApiError(400, body)).not.toContain("AIzaSy");
    expect(sanitizeGeminiMessage("token AIzaSySECRET")).toContain("[redacted]");
  });
});

describe("geminiFailureHttpStatus", () => {
  it("preserves 429 and maps upstream failures to 502", () => {
    expect(geminiFailureHttpStatus(429)).toBe(429);
    expect(geminiFailureHttpStatus(500)).toBe(502);
    expect(geminiFailureHttpStatus(403)).toBe(502);
  });
});
