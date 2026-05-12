"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEquivalencePrinciple,
  type FinalVerdict,
  type Juror,
  type Mode,
  type Scenario,
  type Verdict,
  tallyVerdicts,
} from "./scenarios";

// Per-juror live state during a deliberation
export type LiveJuror = {
  seat: 1 | 2 | 3 | 4 | 5;
  model: string;
  status: "idle" | "deliberating" | "yes" | "no" | "und";
  // Text streamed so far, character by character
  streamedText: string;
  // The full text the juror is streaming toward (hidden from UI until status resolves)
  targetText: string;
  finalVerdict: Verdict;
};

export type JuryState =
  | { phase: "idle"; jurors: LiveJuror[]; verdict: null }
  | { phase: "deliberating"; jurors: LiveJuror[]; verdict: null }
  | { phase: "resolved"; jurors: LiveJuror[]; verdict: FinalVerdict };

const idleJurors = (jurors: Juror[]): LiveJuror[] =>
  jurors.map((j) => ({
    seat: j.seat,
    model: j.model,
    status: "idle",
    streamedText: "",
    targetText: j.text,
    finalVerdict: j.verdict,
  }));

/**
 * Drives a jury deliberation:
 *  - On `convene()`: each juror waits `startDelay` ms, then streams its text
 *    at `charsPerSec`. When fully streamed, status flips from "deliberating"
 *    to its final verdict.
 *  - When all jurors resolve, applies the Equivalence Principle to produce a
 *    final verdict.
 *  - Reset clears everything back to idle.
 */
export function useJury(scenario: Scenario, mode: Mode) {
  const [jurors, setJurors] = useState<LiveJuror[]>(() =>
    idleJurors(scenario.jurors)
  );
  const [phase, setPhase] = useState<"idle" | "deliberating" | "resolved">(
    "idle"
  );
  const [verdict, setVerdict] = useState<FinalVerdict | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Reset when scenario changes
  useEffect(() => {
    clearAllTimers();
    setJurors(idleJurors(scenario.jurors));
    setPhase("idle");
    setVerdict(null);
    return clearAllTimers;
  }, [scenario.id, scenario.jurors]);

  const convene = useCallback(() => {
    clearAllTimers();
    setPhase("deliberating");
    setVerdict(null);
    setJurors(idleJurors(scenario.jurors));

    scenario.jurors.forEach((juror, index) => {
      // Step 1: After startDelay, flip to "deliberating"
      const startTimer = setTimeout(() => {
        setJurors((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status: "deliberating" };
          return next;
        });

        // Step 2: stream the text character by character
        const intervalMs = 1000 / juror.charsPerSec;
        let charIdx = 0;
        const streamTimer = setInterval(() => {
          charIdx += 1;
          if (charIdx >= juror.text.length) {
            clearInterval(streamTimer);
            // Step 3: flip to final verdict
            setJurors((prev) => {
              const next = [...prev];
              next[index] = {
                ...next[index],
                streamedText: juror.text,
                status: juror.verdict,
              };
              // Check if all are done
              const allDone = next.every((j) => j.status !== "deliberating" && j.status !== "idle");
              if (allDone) {
                const tally = tallyVerdicts(next.map((j) => j.status));
                const final = applyEquivalencePrinciple(tally, mode, next.length);
                if (final) {
                  // Defer state set to avoid double-render warning
                  queueMicrotask(() => {
                    setVerdict(final);
                    setPhase("resolved");
                  });
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

        // Track this interval as a "timer" so we can cancel mid-flight
        timersRef.current.push(streamTimer as unknown as ReturnType<typeof setTimeout>);
      }, juror.startDelay);
      timersRef.current.push(startTimer);
    });
  }, [scenario, mode]);

  const reset = useCallback(() => {
    clearAllTimers();
    setJurors(idleJurors(scenario.jurors));
    setPhase("idle");
    setVerdict(null);
  }, [scenario]);

  // Appeal: re-runs with a doubled jury (5 → 11 in tier 2)
  // For now, this just re-runs the same 5 + adds 6 more "synthetic" jurors
  // who echo the supermajority. This is a Day-3 polish target; for Day 2,
  // appeal just runs another deliberation cycle.
  const appeal = useCallback(() => {
    convene();
  }, [convene]);

  return { jurors, phase, verdict, convene, reset, appeal };
}
