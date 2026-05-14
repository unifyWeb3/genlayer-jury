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

// Tolerant verdict parser — tries three strategies in order.
function parseVerdict(text: string): Verdict {
  // Stage 1: ACCEPT/REJECT/UNDETERMINED token in first 40 chars
  const prefix = text.slice(0, 40).toUpperCase();
  if (prefix.includes("ACCEPT")) return "yes";
  if (prefix.includes("REJECT")) return "no";
  if (prefix.includes("UNDETERMINED")) return "und";

  // Stage 2: JSON object containing a "verdict" key
  const jsonMatch = text.match(/\{[^{}]*"verdict"[^{}]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { verdict?: string };
      const v = (parsed.verdict ?? "").toLowerCase();
      if (v === "yes" || v === "accept") return "yes";
      if (v === "no" || v === "reject") return "no";
      if (v === "und" || v === "undetermined") return "und";
    } catch {
      /* fall through */
    }
  }

  // Stage 3: keyword scan
  const lower = text.toLowerCase();
  if (/\b(accept|accepted|yes|complies|fulfilled|satisfi|criteria met)\b/.test(lower))
    return "yes";
  if (/\b(reject|rejected|no\b|failed|unmet|breach|violated|missing|not met)\b/.test(lower))
    return "no";
  if (/\b(undetermined|und\b|unclear|insufficient|ambiguous|inconclusive)\b/.test(lower))
    return "und";

  return "und";
}

// Resolves hostname via c-ares (same resolver as Node global fetch — avoids
// getaddrinfo EAI_AGAIN in WSL).
async function resolveIPv4(hostname: string): Promise<string> {
  const addrs = await dns.resolve4(hostname);
  return addrs[0];
}

// Streams an HTTPS POST, calling onChunk for every content fragment.
// Resolves when the response body ends with { statusCode, errorBody }.
function httpsPostStream(
  ip: string,
  hostname: string,
  path: string,
  headers: Record<string, string | number>,
  reqBody: string,
  signal: AbortSignal,
  onChunk: (text: string) => void
): Promise<{ statusCode: number; errorBody: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: hostname,
        path,
        method: "POST",
        headers: { ...headers, Host: hostname },
      },
      (res) => {
        const code = res.statusCode ?? 0;

        if (code < 200 || code >= 300) {
          const errBufs: Buffer[] = [];
          res.on("data", (c: Buffer) => errBufs.push(c));
          res.on("end", () =>
            resolve({
              statusCode: code,
              errorBody: Buffer.concat(errBufs).toString("utf8"),
            })
          );
          res.on("error", reject);
          return;
        }

        let lineBuffer = "";
        res.on("data", (chunk: Buffer) => {
          lineBuffer += chunk.toString("utf8");
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as OrChunk;
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) onChunk(content);
            } catch {
              /* skip malformed chunk */
            }
          }
        });
        res.on("end", () => resolve({ statusCode: code, errorBody: "" }));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    signal.addEventListener("abort", () => {
      req.destroy(new Error("AbortError"));
    });
    req.write(reqBody);
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
  const systemPrompt = `You are Validator Seat ${seatLabel} in GenLayer's decentralized jury, deciding a subjective dispute. The current mode is ${mode}.

Deliver your verdict in 1-2 short sentences (max 25 words total). Start your response with one of these exact tokens:
ACCEPT - if you agree with the claim
REJECT - if you disagree with the claim
UNDETERMINED - if there is not enough information to decide

Then a brief reasoning. Example: "REJECT — the freelancer missed both the deadline and the slide count."`;

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
      // Bug 1 fix: guard against double-close
      let isClosed = false;
      const safeEnqueue = (data: Uint8Array) => {
        if (isClosed) return;
        try {
          controller.enqueue(data);
        } catch {
          isClosed = true;
        }
      };
      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          /* already closed externally */
        }
      };
      const emit = (event: SseEvent) => safeEnqueue(sseChunk(event));

      // Close immediately if client aborts before we even start
      abort.signal.addEventListener("abort", safeClose);

      try {
        const ip = await resolveIPv4("openrouter.ai");

        let accumulated = "";
        let deltaCount = 0;

        const { statusCode } = await httpsPostStream(
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
          abort.signal,
          (chunk) => {
            accumulated += chunk;
            deltaCount++;
            emit({ type: "delta", text: chunk });
          }
        );

        if (statusCode < 200 || statusCode >= 300) {
          const userMsg =
            statusCode === 429
              ? "Model temporarily rate-limited — validator defaulting to undetermined."
              : `Validator unavailable (${statusCode}).`;
          emit({ type: "delta", text: userMsg });
          emit({ type: "verdict", verdict: "und" });
          emit({ type: "done" });
          return;
        }

        // Always emit at least one delta so the juror card is never blank
        if (deltaCount === 0) {
          emit({ type: "delta", text: "(no response)" });
        }

        const verdict = parseVerdict(accumulated);
        emit({ type: "verdict", verdict });
        emit({ type: "done" });
      } catch (err) {
        const msg = (err as Error).message ?? "";
        if (msg === "AbortError" || (err as Error).name === "AbortError") {
          emit({ type: "delta", text: "Validator timed out — defaulting to undetermined." });
          emit({ type: "verdict", verdict: "und" });
          emit({ type: "done" });
        } else {
          console.error("[jury] error:", msg);
          emit({ type: "delta", text: "Validator failed to respond — defaulting to undetermined." });
          emit({ type: "verdict", verdict: "und" });
          emit({ type: "done" });
        }
      } finally {
        clearTimeout(timeoutId);
        safeClose();
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
