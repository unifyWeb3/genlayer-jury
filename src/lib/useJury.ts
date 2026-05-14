"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEquivalencePrinciple,
  type FinalVerdict,
  type Juror,
  type Mode,
  type Scenario,
  type Verdict,
  type VerdictTally,
  tallyVerdicts,
} from "./scenarios";
// SSE event discriminated union — must match the shape emitted by /api/jury/route.ts
type SseEvent =
  | { type: "delta"; text: string }
  | { type: "verdict"; verdict: Verdict }
  | { type: "error"; message: string }
  | { type: "done" };

// Inlined at build time by Next.js (NEXT_PUBLIC_* vars)
const LIVE_MODE = process.env.NEXT_PUBLIC_LIVE_JURY === "true";

// Models assigned to seats 1–5 in live mode (seat 6–11 cycle back)
const LIVE_MODELS = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
] as const;

function modelForSeat(seat: number): string {
  return LIVE_MODELS[(seat - 1) % LIVE_MODELS.length];
}

// ── LiveJuror type ────────────────────────────────────────────────────────────

export type LiveJuror = {
  seat: number;
  model: string;
  status: "idle" | "deliberating" | "yes" | "no" | "und";
  streamedText: string;
  targetText: string;
  finalVerdict: Verdict;
};

export type JuryState =
  | { phase: "idle"; jurors: LiveJuror[]; verdict: null }
  | { phase: "deliberating"; jurors: LiveJuror[]; verdict: null }
  | { phase: "resolved"; jurors: LiveJuror[]; verdict: FinalVerdict };

// ── Tier-2 synthetic jurors (mock path) ───────────────────────────────────────

const TIER2_MODELS = [
  "Grok-3",
  "Mistral-Large",
  "Command-R+",
  "Llama-4-Scout",
  "Phi-4-Mini",
  "Gemini-2.5-Flash",
];

const ECHO_TEXTS: Record<Verdict, string[]> = {
  yes: [
    "Appellate review sustains: conditions materially satisfied.",
    "Second-tier assessment: acceptance warranted on evidence.",
    "Affirmed on appeal — criteria are met.",
    "Tier-2 review confirms majority: compliant.",
    "Appellate concurrence: fulfillment threshold reached.",
  ],
  no: [
    "Appellate review sustains: conditions unmet.",
    "Second-tier assessment: rejection warranted.",
    "Affirmed on appeal — criteria not satisfied.",
    "Tier-2 review confirms majority: non-compliant.",
    "Appellate concurrence: breach threshold met.",
  ],
  und: [
    "Appellate review: ambiguity persists at tier 2.",
    "Second-tier assessment: evidence remains inconclusive.",
    "Affirmed on appeal — undetermined.",
    "Tier-2 review confirms majority: insufficient evidence.",
    "Appellate concurrence: undetermined verdict stands.",
  ],
};

const DISSENT_TEXTS: Record<Verdict, string> = {
  yes: "Tier-2 dissent: minority view holds acceptance criteria unmet.",
  no: "Tier-2 dissent: minority view holds conditions were satisfied.",
  und: "Tier-2 dissent: minority view disputes majority undetermination.",
};

function generateTier2Jurors(tally: VerdictTally): Juror[] {
  const majority: Verdict =
    tally.yes >= tally.no && tally.yes >= tally.und
      ? "yes"
      : tally.no >= tally.yes && tally.no >= tally.und
      ? "no"
      : "und";
  const minority: Verdict =
    majority === "yes" ? "no" : majority === "no" ? "yes" : "no";

  return TIER2_MODELS.map((model, i) => ({
    seat: 6 + i,
    model,
    verdict: i < 5 ? majority : minority,
    text: i < 5 ? ECHO_TEXTS[majority][i] : DISSENT_TEXTS[majority],
    startDelay: 400 + i * 700,
    charsPerSec: 28 + i * 2,
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const idleJurors = (jurors: Juror[]): LiveJuror[] =>
  jurors.map((j) => ({
    seat: j.seat,
    model: j.model,
    status: "idle",
    streamedText: "",
    targetText: j.text,
    finalVerdict: j.verdict,
  }));

// ── Mock streaming ─────────────────────────────────────────────────────────────

function runStream(
  specs: Juror[],
  baseIndex: number,
  mode: Mode,
  totalJurors: number,
  tier: 1 | 2,
  setJurors: (fn: (prev: LiveJuror[]) => LiveJuror[]) => void,
  onResolved: (v: FinalVerdict) => void,
  timersRef: { current: ReturnType<typeof setTimeout>[] }
) {
  specs.forEach((juror, localIdx) => {
    const index = baseIndex + localIdx;
    const startTimer = setTimeout(() => {
      setJurors((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: "deliberating" };
        return next;
      });

      const intervalMs = 1000 / juror.charsPerSec;
      let charIdx = 0;
      const streamTimer = setInterval(() => {
        charIdx += 1;
        if (charIdx >= juror.text.length) {
          clearInterval(streamTimer);
          setJurors((prev) => {
            const next = [...prev];
            next[index] = {
              ...next[index],
              streamedText: juror.text,
              status: juror.verdict,
            };
            const allDone = next.every(
              (j) => j.status !== "deliberating" && j.status !== "idle"
            );
            if (allDone) {
              const tally = tallyVerdicts(next.map((j) => j.status));
              const final = applyEquivalencePrinciple(
                tally,
                mode,
                totalJurors,
                tier
              );
              if (final) {
                queueMicrotask(() => onResolved(final));
              }
            }
            return next;
          });
          return;
        }
        setJurors((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            streamedText: juror.text.slice(0, charIdx),
          };
          return next;
        });
      }, intervalMs);

      timersRef.current.push(
        streamTimer as unknown as ReturnType<typeof setTimeout>
      );
    }, juror.startDelay);
    timersRef.current.push(startTimer);
  });
}

// ── Live streaming ─────────────────────────────────────────────────────────────

async function streamJurorLive(
  seat: number,
  scenarioId: string,
  mode: Mode,
  index: number,
  totalJurors: number,
  tier: 1 | 2,
  setJurors: (fn: (prev: LiveJuror[]) => LiveJuror[]) => void,
  onResolved: (v: FinalVerdict) => void,
  abortControllers: AbortController[]
): Promise<void> {
  const ac = new AbortController();
  abortControllers.push(ac);

  setJurors((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], status: "deliberating" };
    return next;
  });

  try {
    const res = await fetch("/api/jury", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId,
        mode,
        seat,
        modelId: modelForSeat(seat),
      }),
      signal: ac.signal,
    });

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = "";
    let verdict: Verdict = "und";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const event = JSON.parse(data) as SseEvent;

          if (event.type === "delta") {
            setJurors((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                streamedText: next[index].streamedText + event.text,
              };
              return next;
            });
          } else if (event.type === "verdict") {
            verdict = event.verdict;
          } else if (event.type === "error") {
            setJurors((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                streamedText:
                  "Validator failed to respond. Defaulting to undetermined.",
              };
              return next;
            });
            verdict = "und";
          } else if (event.type === "done") {
            setJurors((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                status: verdict,
                finalVerdict: verdict,
              };
              const allDone = next.every(
                (j) => j.status !== "deliberating" && j.status !== "idle"
              );
              if (allDone) {
                const tally = tallyVerdicts(next.map((j) => j.status));
                const final = applyEquivalencePrinciple(
                  tally,
                  mode,
                  totalJurors,
                  tier
                );
                if (final) {
                  queueMicrotask(() => onResolved(final));
                }
              }
              return next;
            });
          }
        } catch {
          // skip malformed SSE event
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    setJurors((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        status: "und",
        streamedText:
          "Validator failed to respond. Defaulting to undetermined.",
        finalVerdict: "und",
      };
      // Check if all are done after error
      const allDone = next.every(
        (j) => j.status !== "deliberating" && j.status !== "idle"
      );
      if (allDone) {
        const tally = tallyVerdicts(next.map((j) => j.status));
        const final = applyEquivalencePrinciple(tally, mode, totalJurors, tier);
        if (final) {
          queueMicrotask(() => onResolved(final));
        }
      }
      return next;
    });
  }
}

// ── useJury hook ──────────────────────────────────────────────────────────────

export function useJury(scenario: Scenario, mode: Mode) {
  const [tier, setTier] = useState<1 | 2>(1);
  const [jurors, setJurors] = useState<LiveJuror[]>(() =>
    idleJurors(scenario.jurors)
  );
  const [phase, setPhase] = useState<"idle" | "deliberating" | "resolved">(
    "idle"
  );
  const [verdict, setVerdict] = useState<FinalVerdict | null>(null);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortControllersRef = useRef<AbortController[]>([]);

  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    abortControllersRef.current.forEach((ac) => ac.abort());
    abortControllersRef.current = [];
    setTier(1);
    setJurors(idleJurors(scenario.jurors));
    setPhase("idle");
    setVerdict(null);
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      abortControllersRef.current.forEach((ac) => ac.abort());
      abortControllersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  const onResolved = useCallback((v: FinalVerdict) => {
    setVerdict(v);
    setPhase("resolved");
  }, []);

  const convene = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    abortControllersRef.current.forEach((ac) => ac.abort());
    abortControllersRef.current = [];

    setTier(1);
    setPhase("deliberating");
    setVerdict(null);
    setJurors(idleJurors(scenario.jurors));

    if (LIVE_MODE) {
      const acs: AbortController[] = [];
      abortControllersRef.current = acs;
      scenario.jurors.forEach((juror, i) => {
        const t = setTimeout(() => {
          void streamJurorLive(
            juror.seat,
            scenario.id,
            mode,
            i,
            scenario.jurors.length,
            1,
            setJurors,
            onResolved,
            acs
          );
        }, i * 400);
        timersRef.current.push(t);
      });
    } else {
      runStream(
        scenario.jurors,
        0,
        mode,
        scenario.jurors.length,
        1,
        setJurors,
        onResolved,
        timersRef
      );
    }
  }, [scenario, mode, onResolved]);

  const reset = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    abortControllersRef.current.forEach((ac) => ac.abort());
    abortControllersRef.current = [];
    setTier(1);
    setJurors(idleJurors(scenario.jurors));
    setPhase("idle");
    setVerdict(null);
  }, [scenario]);

  const appeal = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    abortControllersRef.current.forEach((ac) => ac.abort());
    abortControllersRef.current = [];

    const tier1 = jurors.slice(0, 5);
    const tally = tallyVerdicts(tier1.map((j) => j.status));
    const tier2Specs = generateTier2Jurors(tally);
    const tier2Live: LiveJuror[] = tier2Specs.map((j) => ({
      seat: j.seat,
      model: j.model,
      status: "idle" as const,
      streamedText: "",
      targetText: j.text,
      finalVerdict: j.verdict,
    }));

    setTier(2);
    setPhase("deliberating");
    setVerdict(null);
    setJurors([...tier1, ...tier2Live]);

    if (LIVE_MODE) {
      const acs: AbortController[] = [];
      abortControllersRef.current = acs;
      // Seats 6–11: stagger tier-2 calls by 400ms each
      tier2Specs.forEach((spec, localIdx) => {
        const t = setTimeout(() => {
          void streamJurorLive(
            spec.seat,
            scenario.id,
            mode,
            5 + localIdx,
            11,
            2,
            setJurors,
            onResolved,
            acs
          );
        }, localIdx * 400);
        timersRef.current.push(t);
      });
    } else {
      runStream(tier2Specs, 5, mode, 11, 2, setJurors, onResolved, timersRef);
    }
  }, [jurors, mode, scenario.id, onResolved]);

  return { jurors, phase, verdict, tier, convene, reset, appeal };
}
