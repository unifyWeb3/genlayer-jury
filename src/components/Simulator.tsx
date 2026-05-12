"use client";

import { useState } from "react";

type JurorState = {
  model: string;
  seat: string;
  status: "yes" | "no" | "und" | "deliberating";
  text: string;
};

const demoJury: JurorState[] = [
  {
    model: "GPT-4o",
    seat: "Seat 01",
    status: "no",
    text: "Two slides short and three days late constitutes material breach.",
  },
  {
    model: "Claude 3.5",
    seat: "Seat 02",
    status: "no",
    text: "Both deliverable count and deadline missed without prior negotiation.",
  },
  {
    model: "Gemini 1.5",
    seat: "Seat 03",
    status: "und",
    text: "Insufficient context on whether 8 slides covered the agreed scope.",
  },
  {
    model: "Llama 3.1",
    seat: "Seat 04",
    status: "deliberating",
    text: "Examining whether late delivery alone breaks materiality",
  },
  {
    model: "Mistral L",
    seat: "Seat 05",
    status: "no",
    text: "Failed on two of two specified terms. Partial credit not warranted.",
  },
];

const accentByStatus: Record<JurorState["status"], string> = {
  yes: "var(--color-verdict-yes)",
  no: "var(--color-verdict-no)",
  und: "var(--color-verdict-und)",
  deliberating: "var(--color-accent)",
};

const chipClassByStatus: Record<JurorState["status"], string> = {
  yes: "chip chip-yes",
  no: "chip chip-no",
  und: "chip chip-und",
  deliberating: "chip chip-pending",
};

const chipLabelByStatus: Record<JurorState["status"], string> = {
  yes: "Accept",
  no: "Reject",
  und: "Undetermined",
  deliberating: "Deliberating",
};

const MODES = ["Strict", "Comparative", "Non-comparative"] as const;
type Mode = (typeof MODES)[number];

export function Simulator() {
  const [activeMode, setActiveMode] = useState<Mode>("Non-comparative");

  return (
    <section
      id="simulator"
      className="max-w-[1280px] mx-auto px-8 py-32 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12">
        <span className="overline overline-accent">Exhibit D — Live System State</span>
        <span className="overline overline-faint">§04 / 07</span>
      </div>

      <h2 className="display">
        The jury <em>convenes.</em>
      </h2>
      <p className="body-prose mt-8 max-w-[680px]">
        Pose a question. Pick a mode. Watch five validators deliberate. See the
        Equivalence Principle deliver a verdict. Disagreement triggers appeal.
      </p>

      {/* MODE SELECTOR */}
      <div className="grid grid-cols-[1fr_auto] gap-8 items-end mb-8 mt-16 max-lg:grid-cols-1">
        <div>
          <span className="overline block mb-4">Mode</span>
          <div
            className="inline-flex border rounded-[2px] overflow-hidden"
            style={{ borderColor: "var(--color-rule-strong)" }}
          >
            {MODES.map((mode, i) => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className="font-[family-name:var(--font-mono)] uppercase cursor-pointer"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  padding: "14px 20px",
                  borderRight:
                    i < MODES.length - 1 ? "1px solid var(--color-rule-strong)" : "0",
                  background:
                    activeMode === mode ? "rgba(197,255,60,0.08)" : "transparent",
                  color:
                    activeMode === mode ? "var(--color-accent)" : "var(--color-ink-muted)",
                  transition:
                    "color 0.12s var(--ease-tribunal), background 0.28s var(--ease-tribunal)",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="text-right max-lg:text-left">
          <div className="overline overline-faint">Case · 24·001</div>
          <div className="mono-sm mt-2" style={{ color: "var(--color-ink-muted)" }}>
            Pattern: freelancer milestone
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
          <span className="overline overline-faint">186 / 500</span>
        </div>
        <p
          className="m-0 italic"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 24,
            lineHeight: 1.35,
            color: "var(--color-ink)",
          }}
        >
          &quot;A freelancer was paid $800 to deliver a 10-slide pitch deck by
          Friday. They delivered an 8-slide deck on Monday. Did they fulfill the
          contract?&quot;
        </p>
      </div>

      {/* JURY GRID */}
      <div
        className="grid grid-cols-5 mt-8 border max-lg:grid-cols-2 max-sm:grid-cols-1"
        style={{ borderColor: "var(--color-rule)" }}
      >
        {demoJury.map((juror, i) => {
          const isLast = i === demoJury.length - 1;
          return (
            <div
              key={i}
              className={`relative p-6 flex flex-col gap-4 min-h-[220px] ${
                !isLast ? "border-r max-sm:border-r-0" : ""
              } max-lg:border-b`}
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-rule)",
              }}
            >
              <span
                aria-hidden
                className={`absolute left-0 top-0 bottom-0 w-[2px] ${
                  juror.status === "deliberating" ? "pulse-tribunal" : ""
                }`}
                style={{ background: accentByStatus[juror.status] }}
              />
              <div className="flex justify-between items-center">
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px] uppercase"
                  style={{ color: "var(--color-ink-muted)", letterSpacing: "0.15em" }}
                >
                  {juror.model}
                </span>
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px]"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  {juror.seat}
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
                  color:
                    juror.status === "deliberating"
                      ? "var(--color-ink-muted)"
                      : "var(--color-ink)",
                }}
              >
                &quot;{juror.text}
                {juror.status === "deliberating" ? (
                  <span className="stream-cursor" />
                ) : (
                  '"'
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* VERDICT BAR */}
      <div
        className="p-8 border border-t-0 grid grid-cols-[auto_1fr_auto] items-center gap-12 max-lg:grid-cols-1 max-lg:text-center"
        style={{
          borderColor: "var(--color-rule-strong)",
          background: "var(--color-surface)",
        }}
      >
        <div className="flex gap-8 items-baseline max-lg:justify-center">
          <Tally count={3} label="Reject"  color="var(--color-verdict-no)"  />
          <Tally count={1} label="Undet."  color="var(--color-verdict-und)" />
          <Tally count={1} label="Pending" color="var(--color-ink-faint)"   />
        </div>
        <div
          className="italic text-center"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            color: "var(--color-ink-muted)",
          }}
        >
          Equivalence Principle:{" "}
          <em style={{ color: "var(--color-verdict-no)", fontWeight: 500, fontStyle: "italic" }}>
            Rejected (3 / 5)
          </em>
        </div>
        <AppealButton />
      </div>
    </section>
  );
}

function AppealButton() {
  return (
    <button
      className="font-[family-name:var(--font-mono)] uppercase px-5 py-3.5 border rounded-[2px] bg-transparent cursor-pointer max-lg:mx-auto"
      style={{
        fontSize: 11,
        letterSpacing: "0.18em",
        color: "var(--color-ink)",
        borderColor: "var(--color-rule-strong)",
        transition:
          "border-color 0.12s var(--ease-tribunal), color 0.12s var(--ease-tribunal)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-accent)";
        e.currentTarget.style.color = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-rule-strong)";
        e.currentTarget.style.color = "var(--color-ink)";
      }}
    >
      Appeal · double jury →
    </button>
  );
}

function Tally({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div>
      <div
        className="font-[family-name:var(--font-display)] font-light leading-none"
        style={{ fontSize: 56, letterSpacing: "-0.02em", color }}
      >
        {count}
      </div>
      <span
        className="font-[family-name:var(--font-mono)] uppercase block mt-2"
        style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--color-ink-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}
