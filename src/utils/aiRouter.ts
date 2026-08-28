import { AIAuditRequest, AIAuditResponse } from "../types/codebase";

/**
 * IMPORTANT: Never call OpenAI/Anthropic directly from client-side code with
 * a real API key — it will be exposed in the browser bundle. This function
 * calls a local backend proxy endpoint (`/api/ai-audit`) that you stand up
 * separately (Express, a Vite plugin middleware, a Cloudflare Worker, etc.)
 * and which holds the actual API key server-side.
 *
 * For local dev without a backend yet, this falls back to a mock response
 * so the UI is fully clickable end-to-end immediately.
 */
export async function askAIArchitect(request: AIAuditRequest): Promise<AIAuditResponse> {
  try {
    const res = await fetch("/api/ai-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!res.ok) throw new Error(`AI audit endpoint returned ${res.status}`);
    return (await res.json()) as AIAuditResponse;
  } catch (err) {
    // Fallback mock — lets the UI work before a backend proxy exists.
    console.warn("[aiRouter] Falling back to mock AI response:", err);
    return mockAudit(request);
  }
}

function mockAudit(request: AIAuditRequest): AIAuditResponse {
  const lineCount = request.code.split("\n").length;
  return {
    summary: `${request.fileName} is a ${lineCount}-line module. (Mock response — connect a real backend proxy at /api/ai-audit to get live AI analysis.)`,
    qualityScore: 78,
    issues: [
      "No backend proxy connected yet — this is placeholder data.",
      "Consider splitting large files once they exceed ~200 lines.",
    ],
    suggestions: [
      "Wire up an Express/Worker route at /api/ai-audit that calls the Anthropic or OpenAI API server-side.",
      "Pass the actual file content and its dependency list for richer architectural context.",
    ],
  };
}

/* ------------------------------------------------------------------------
 * EXAMPLE backend route (Node/Express) — copy this into a separate server,
 * NOT into this Vite client project:
 *
 * import Anthropic from "@anthropic-ai/sdk";
 * const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *
 * app.post("/api/ai-audit", async (req, res) => {
 *   const { fileName, code } = req.body;
 *   const msg = await anthropic.messages.create({
 *     model: "claude-sonnet-4-6",
 *     max_tokens: 500,
 *     messages: [{
 *       role: "user",
 *       content: `Audit this file (${fileName}) for architecture quality. Return JSON with summary, qualityScore (0-100), issues[], suggestions[]:\n\n${code}`
 *     }],
 *   });
 *   res.json(JSON.parse(msg.content[0].text));
 * });
 * ---------------------------------------------------------------------- */
