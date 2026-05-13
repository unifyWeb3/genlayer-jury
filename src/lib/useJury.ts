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

function generateTier2Jurors(tier1: LiveJuror[], tally: VerdictTally): Juror[] {
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

const idleJurors = (jurors: Juror[]): LiveJuror[] =>
  jurors.map((j) => ({
    seat: j.seat,
    model: j.model,
    status: "idle",
    streamedText: "",
    targetText: j.text,
    finalVerdict: j.verdict,
  }));

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
              const final = applyEquivalencePrinciple(tally, mode, totalJurors, tier);
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

  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setTier(1);
    setJurors(idleJurors(scenario.jurors));
    setPhase("idle");
    setVerdict(null);
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
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
    setTier(1);
    setPhase("deliberating");
    setVerdict(null);
    setJurors(idleJurors(scenario.jurors));
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
  }, [scenario, mode, onResolved]);

  const reset = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setTier(1);
    setJurors(idleJurors(scenario.jurors));
    setPhase("idle");
    setVerdict(null);
  }, [scenario]);

  const appeal = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    const tier1 = jurors.slice(0, 5);
    const tally = tallyVerdicts(tier1.map((j) => j.status));
    const tier2Specs = generateTier2Jurors(tier1, tally);
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

    runStream(tier2Specs, 5, mode, 11, 2, setJurors, onResolved, timersRef);
  }, [jurors, mode, onResolved]);

  return { jurors, phase, verdict, tier, convene, reset, appeal };
}
