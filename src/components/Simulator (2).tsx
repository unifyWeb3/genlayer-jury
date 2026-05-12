"use client";

import { useMemo, useState } from "react";
import { SCENARIOS, type Mode } from "@/lib/scenarios";
import { useJury, type LiveJuror } from "@/lib/useJury";

const MODES: Mode[] = ["Strict", "Comparative", "Non-comparative"];

const accentByStatus: Record<LiveJuror["status"], string> = {
  idle: "var(--color-rule-strong)",
  yes: "var(--color-verdict-yes)",
  no: "var(--color-verdict-no)",
  und: "var(--color-verdict-und)",
  deliberating: "var(--color-accent)",
};

const chipClassByStatus: Record<LiveJuror["status"], string> = {
  idle: "chip",
  yes: "chip chip-yes",
  no: "chip chip-no",
  und: "chip chip-und",
  deliberating: "chip chip-pending",
};

const chipLabelByStatus: Record<LiveJuror["status"], string> = {
  idle: "Awaiting",
  yes: "Accept",
  no: "Reject",
  und: "Undetermined",
  deliberating: "Deliberating",
};

const outcomeColor = {
  accepted: "var(--color-verdict-yes)",
  rejected: "var(--color-verdict-no)",
  undetermined: "var(--color-verdict-und)",
  no_consensus: "var(--color-accent)",
} as const;

export function Simulator() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId]
  );
  const [mode, setMode] = useState<Mode>(scenario.recommendedMode);

  // When scenario changes, reset mode to its recommended one
  useMemo(() => {
    setMode(scenario.recommendedMode);
  }, [scenario.recommendedMode]);

  const { jurors, phase, verdict, convene, reset, appeal } = useJury(
    scenario,
    mode
  );

  const charCount = scenario.question.length;

  return (
    <section
      id="simulator"
      className="max-w-[1280px] mx-auto px-8 py-32 border-t scroll-mt-20"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12">
        <span className="overline overline-accent">
          Exhibit D — Live System State
        </span>
        <span className="overline overline-faint">§04 / 07</span>
      </div>

      <h2 className="display">
        The jury <em>convenes.</em>
      </h2>
      <p className="body-prose mt-8 max-w-[680px]">
        Pose a question. Pick a mode. Watch five validators deliberate. See the
        Equivalence Principle deliver a verdict. Disagreement triggers appeal.
      </p>

      {/* SCENARIO PICKER */}
      <div className="mt-16">
        <span className="overline block mb-4">Select a case</span>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setScenarioId(s.id);
                reset();
              }}
              className="font-[family-name:var(--font-mono)] uppercase cursor-pointer transition-colors px-4 py-2.5 border rounded-[2px]"
              style={{
                fontSize: 11,
                letterSpacing: "0.15em",
                background:
                  scenarioId === s.id
                    ? "rgba(197,255,60,0.08)"
                    : "transparent",
                borderColor:
                  scenarioId === s.id
                    ? "var(--color-accent)"
                    : "var(--color-rule-strong)",
                color:
                  scenarioId === s.id
                    ? "var(--color-accent)"
                    : "var(--color-ink-muted)",
                transition:
                  "color 0.12s var(--ease-tribunal), background 0.28s var(--ease-tribunal), border-color 0.12s var(--ease-tribunal)",
              }}
              disabled={phase === "deliberating"}
            >
              {s.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* SIM CONTROLS */}
      <div className="grid grid-cols-[1fr_auto] gap-8 items-end mb-8 mt-12 max-lg:grid-cols-1">
        <div>
          <span className="overline block mb-4">Equivalence Principle</span>
          <div
            className="inline-flex border rounded-[2px] overflow-hidden"
            style={{ borderColor: "var(--color-rule-strong)" }}
          >
            {MODES.map((m, i) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  reset();
                }}
                className="font-[family-name:var(--font-mono)] uppercase cursor-pointer"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  padding: "14px 20px",
                  borderRight:
                    i < MODES.length - 1
                      ? "1px solid var(--color-rule-strong)"
                      : "0",
                  background:
                    mode === m
                      ? "rgba(197,255,60,0.08)"
                      : "transparent",
                  color:
                    mode === m
                      ? "var(--color-accent)"
                      : "var(--color-ink-muted)",
                  transition:
                    "color 0.12s var(--ease-tribunal), background 0.28s var(--ease-tribunal)",
                }}
                disabled={phase === "deliberating"}
              >
                {m}
              </button>
            ))}
          </div>
          {mode !== scenario.recommendedMode && (
            <div
              className="mono-sm mt-3"
              style={{ color: "var(--color-ink-faint)" }}
            >
              Author recommended: <em
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--color-accent)",
                }}
              >{scenario.recommendedMode}</em>
            </div>
          )}
        </div>
        <div className="text-right max-lg:text-left">
          <div className="overline overline-faint">Case · {scenario.caseNum.replace("№ ", "")}</div>
          <div
            className="mono-sm mt-2"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Pattern: {scenario.pattern}
          </div>
        </div>
      </div>

      {/* PROMPT */}
      <div
        className="border p-8 flex flex-col gap-4"
        style={{
          borderColor: "var(--color-rule-strong)",
          background: "var(--color-surface)",
        }}
      >
        <div className="flex justify-between items-center">
          <span className="overline">Question on Trial</span>
          <span className="overline overline-faint">{charCount} / 500</span>
        </div>
        <p
          className="m-0 italic"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 22,
            lineHeight: 1.4,
            color: "var(--color-ink)",
          }}
        >
          &quot;{scenario.question}&quot;
        </p>
        <div className="flex gap-4 mt-2 items-center">
          <button
            onClick={convene}
            disabled={phase === "deliberating"}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "idle" && "Convene the jury →"}
            {phase === "deliberating" && "Deliberating..."}
            {phase === "resolved" && "Re-convene →"}
          </button>
          {phase !== "idle" && (
            <button
              onClick={reset}
              className="btn-ghost"
              disabled={phase === "deliberating"}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* JURY */}
      <div
        className="grid grid-cols-5 mt-8 border max-lg:grid-cols-2 max-sm:grid-cols-1"
        style={{ borderColor: "var(--color-rule)" }}
      >
        {jurors.map((juror, i) => {
          const isLast = i === jurors.length - 1;
          const showText = juror.status !== "idle";
          const isStreaming = juror.status === "deliberating";
          return (
            <div
              key={`${juror.seat}-${i}`}
              className={`relative p-6 flex flex-col gap-4 min-h-[220px] ${
                !isLast ? "border-r max-sm:border-r-0" : ""
              } max-lg:border-b max-sm:border-b`}
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-rule)",
              }}
            >
              <span
                aria-hidden
                className={`absolute left-0 top-0 bottom-0 w-[2px] ${
                  isStreaming ? "pulse-tribunal" : ""
                }`}
                style={{ background: accentByStatus[juror.status] }}
              />
              <div className="flex justify-between items-center">
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px] uppercase"
                  style={{
                    color: "var(--color-ink-muted)",
                    letterSpacing: "0.15em",
                  }}
                >
                  {juror.model}
                </span>
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px]"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  Seat 0{juror.seat}
                </span>
              </div>
              <span className={chipClassByStatus[juror.status]}>
                <span className="chip-dot" />
                {chipLabelByStatus[juror.status]}
              </span>
              <p
                className="italic m-0 flex-1"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: isStreaming
                    ? "var(--color-ink-muted)"
                    : juror.status === "idle"
                    ? "var(--color-ink-faint)"
                    : "var(--color-ink)",
                }}
              >
                {showText ? (
                  <>
                    &quot;{juror.streamedText}
                    {isStreaming && <span className="stream-cursor" />}
                    {!isStreaming && '"'}
                  </>
                ) : (
                  <span style={{ color: "var(--color-ink-faint)" }}>
                    Awaiting summons.
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* VERDICT BAR */}
      <VerdictBar
        jurors={jurors}
        verdict={verdict}
        phase={phase}
        onAppeal={appeal}
      />
    </section>
  );
}

function VerdictBar({
  jurors,
  verdict,
  phase,
  onAppeal,
}: {
  jurors: LiveJuror[];
  verdict: ReturnType<typeof useJury>["verdict"];
  phase: ReturnType<typeof useJury>["phase"];
  onAppeal: () => void;
}) {
  const tally = jurors.reduce(
    (acc, j) => {
      if (j.status === "yes") acc.yes += 1;
      else if (j.status === "no") acc.no += 1;
      else if (j.status === "und") acc.und += 1;
      else if (j.status === "deliberating" || j.status === "idle") acc.pending += 1;
      return acc;
    },
    { yes: 0, no: 0, und: 0, pending: 0 }
  );

  const showAppeal =
    phase === "resolved" &&
    verdict &&
    (verdict.outcome === "no_consensus" || verdict.outcome === "undetermined");

  return (
    <div
      className="p-8 border border-t-0 grid grid-cols-[auto_1fr_auto] items-center gap-12 max-lg:grid-cols-1 max-lg:text-center"
      style={{
        borderColor: "var(--color-rule-strong)",
        background: "var(--color-surface)",
      }}
    >
      <div className="flex gap-8 items-baseline max-lg:justify-center">
        <Tally count={tally.yes} label="Accept" color="var(--color-verdict-yes)" />
        <Tally count={tally.no} label="Reject" color="var(--color-verdict-no)" />
        <Tally count={tally.und} label="Undet." color="var(--color-verdict-und)" />
        <Tally count={tally.pending} label="Pending" color="var(--color-ink-faint)" />
      </div>
      <div
        className="italic text-center"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          color: "var(--color-ink-muted)",
        }}
      >
        {phase === "idle" && (
          <span style={{ color: "var(--color-ink-faint)" }}>
            The jury awaits summons.
          </span>
        )}
        {phase === "deliberating" && (
          <span>
            Equivalence Principle:{" "}
            <em
              style={{
                color: "var(--color-accent)",
                fontWeight: 500,
                fontStyle: "italic",
              }}
            >
              calculating...
            </em>
          </span>
        )}
        {phase === "resolved" && verdict && (
          <div>
            <div>
              Equivalence Principle:{" "}
              <em
                style={{
                  color: outcomeColor[verdict.outcome],
                  fontWeight: 500,
                  fontStyle: "italic",
                }}
              >
                {verdict.voteText}
              </em>
            </div>
            <div
              className="caption mt-2"
              style={{
                fontSize: 12,
                color: "var(--color-ink-muted)",
                fontStyle: "normal",
                fontFamily: "var(--font-sans)",
              }}
            >
              {verdict.reason}
            </div>
          </div>
        )}
      </div>
      {showAppeal ? (
        <button
          onClick={onAppeal}
          className="font-[family-name:var(--font-mono)] uppercase px-5 py-3.5 border rounded-[2px] bg-transparent cursor-pointer max-lg:mx-auto"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--color-ink)",
            borderColor: "var(--color-accent)",
            transition:
              "border-color 0.12s var(--ease-tribunal), color 0.12s var(--ease-tribunal)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-ink)";
          }}
        >
          Appeal · double jury →
        </button>
      ) : (
        <div className="max-lg:hidden">&nbsp;</div>
      )}
    </div>
  );
}

function Tally({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div>
      <div
        className="font-[family-name:var(--font-display)] font-light leading-none transition-colors"
        style={{
          fontSize: 48,
          letterSpacing: "-0.02em",
          color: count > 0 ? color : "var(--color-ink-faint)",
        }}
      >
        {count}
      </div>
      <span
        className="font-[family-name:var(--font-mono)] uppercase block mt-2"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "var(--color-ink-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
