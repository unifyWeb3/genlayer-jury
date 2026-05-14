import https from "node:https";
import dns from "node:dns/promises";
import { SCENARIOS } from "@/lib/scenarios";
import type { Mode, Verdict } from "@/lib/scenarios";

// ── SSE event types ───────────────────────────────────────────────────────────

export type SseEvent =
  | { type: "delta"; text: string }
  | { type: "verdict"; verdict: Verdict }
  | { type: "error"; message: string }
  | { type: "done" };

// ── Request body ──────────────────────────────────────────────────────────────

type RequestBody = {
  scenarioId: string;
  mode: Mode;
  seat: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  modelId: string;
};

// ── OpenRouter chunk shape (partial) ─────────────────────────────────────────

type OrChunk = {
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const enc = new TextEncoder();

function sseChunk(event: SseEvent): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function extractVerdict(text: string): { verdict: Verdict; reasoning: string } {
  const match = text.match(/\{[\s\S]*?"verdict"[\s\S]*?\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as {
        verdict?: string;
        reasoning?: string;
      };
      const v = parsed.verdict;
      const verdict: Verdict =
        v === "yes" ? "yes" : v === "no" ? "no" : "und";
      const reasoning =
        typeof parsed.reasoning === "string" && parsed.reasoning.trim()
          ? parsed.reasoning.trim()
          : text.trim();
      return { verdict, reasoning };
    } catch {
      // fall through
    }
  }
  return { verdict: "und", reasoning: text.trim() || "Unable to determine." };
}

// Resolves hostname via c-ares (same resolver used by global fetch — avoids
// getaddrinfo EAI_AGAIN failures seen with https.request in WSL).
async function resolveIPv4(hostname: string): Promise<string> {
  const addrs = await dns.resolve4(hostname);
  return addrs[0];
}

// Makes an HTTPS POST using node:https with an explicit IPv4 address so we
// bypass both Next.js's patched fetch and WSL's unreliable getaddrinfo.
function httpsPost(
  ip: string,
  hostname: string,
  path: string,
  headers: Record<string, string | number>,
  body: string,
  signal: AbortSignal
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: hostname, // SNI for TLS
        path,
        method: "POST",
        headers: { ...headers, Host: hostname },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    signal.addEventListener("abort", () => {
      req.destroy(new Error("AbortError"));
    });
    req.write(body);
    req.end();
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  const { scenarioId, mode, seat, modelId } = body;
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    return new Response(JSON.stringify({ error: "Scenario not found" }), {
      status: 404,
    });
  }

  const seatLabel = String(seat).padStart(2, "0");
  const systemPrompt = `You are Validator Seat ${seatLabel} in GenLayer's decentralized jury. A subjective dispute has been brought before the tribunal. You must deliver a verdict and a one-sentence reasoning.

Mode: ${mode}
  - Strict: You must answer factually with a definitive verdict.
  - Comparative: You must answer with a tolerance-aware judgment.
  - Non-comparative: You must apply a rubric and judge whether the claim holds.

Respond in exactly this JSON format, no other text:
{"verdict": "yes" | "no" | "und", "reasoning": "<one terse sentence, max 18 words>"}

"yes" = accept the claim. "no" = reject. "und" = undetermined / not enough info.`;

  const userPrompt = scenario.question;

  const abort = new AbortController();
  const timeoutId = setTimeout(() => abort.abort(), 35000);

  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const siteUrl = process.env.OPENROUTER_SITE_URL ?? "";
  const siteName = process.env.OPENROUTER_SITE_NAME ?? "The Jury";

  const payload = JSON.stringify({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: true,
    max_tokens: 200,
    temperature: 0.7,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: SseEvent) => controller.enqueue(sseChunk(event));

      try {
        const ip = await resolveIPv4("openrouter.ai");

        const { statusCode, body: rawBody } = await httpsPost(
          ip,
          "openrouter.ai",
          "/api/v1/chat/completions",
          {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "HTTP-Referer": siteUrl,
            "X-Title": siteName,
          },
          payload,
          abort.signal
        );

        if (statusCode < 200 || statusCode >= 300) {
          emit({
            type: "error",
            message: `OpenRouter ${statusCode}: ${rawBody.slice(0, 120)}`,
          });
          emit({ type: "verdict", verdict: "und" });
          emit({ type: "done" });
          controller.close();
          return;
        }

        // Parse the accumulated SSE body
        let accumulated = "";
        for (const line of rawBody.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const chunk = JSON.parse(data) as OrChunk;
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) accumulated += content;
          } catch {
            // skip malformed chunk
          }
        }

        const { verdict, reasoning } = extractVerdict(accumulated);
        if (reasoning) emit({ type: "delta", text: reasoning });
        emit({ type: "verdict", verdict });
        emit({ type: "done" });
      } catch (err) {
        const msg = (err as Error).message ?? "";
        if (msg === "AbortError" || (err as Error).name === "AbortError") {
          emit({ type: "verdict", verdict: "und" });
          emit({ type: "done" });
        } else {
          console.error("[jury] error:", msg);
          emit({ type: "error", message: msg || "Streaming error" });
          emit({ type: "verdict", verdict: "und" });
          emit({ type: "done" });
        }
      } finally {
        clearTimeout(timeoutId);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
