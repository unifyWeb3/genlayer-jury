"use client";

import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

const casebookScenarios = SCENARIOS.slice(0, 5);

function verdictLabel(verdict: (typeof SCENARIOS)[number]["expectedVerdict"]) {
  if (verdict === "yes") return "Expected · accept";
  if (verdict === "no") return "Expected · reject";
  return "Expected · undet.";
}

export function Casebook() {
  return (
    <section
      id="casebook"
      className="max-w-[1280px] mx-auto px-8 py-32 border-t scroll-mt-20"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="grid grid-cols-[2fr_1fr] gap-16 items-end mb-20 max-lg:grid-cols-1 max-lg:gap-8">
        <div>
          <div className="flex justify-between items-baseline mb-6">
            <span className="overline overline-accent">The Casebook</span>
            <span className="overline overline-faint">§05 / 07</span>
          </div>
          <h2 className="display">
            Five cases on <em>file.</em>
          </h2>
          <p className="body-prose mt-8">
            Each case shows the same path:{" "}
            <em>
              the dispute, the jury&apos;s verdict, which mode fits, why
              Ethereum couldn&apos;t.
            </em>{" "}
            Open one to leave with judgment, not just awe.
          </p>
        </div>
        <div className="text-right max-lg:text-left">
          <div className="overline overline-faint block mb-2">In Docket</div>
          <div
            className="font-[family-name:var(--font-display)] font-light"
            style={{ fontSize: 96, lineHeight: 1, color: "var(--color-ink)" }}
          >
            05
          </div>
        </div>
      </div>

      <div
        className="border-t"
        style={{ borderColor: "var(--color-rule-strong)" }}
      >
        {casebookScenarios.map((c, i) => {
          const isLast = i === casebookScenarios.length - 1;
          return (
            <Link
              key={c.id}
              href={`/case/${c.id}`}
              className="group grid grid-cols-[80px_1fr_200px_150px_32px] items-center gap-8 py-8 border-b no-underline text-inherit max-lg:grid-cols-[60px_1fr_32px] max-lg:gap-4"
              style={{
                borderColor: isLast
                  ? "var(--color-rule-strong)"
                  : "var(--color-rule)",
                transition: "background 0.12s var(--ease-tribunal)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(245,245,240,0.015)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  color: "var(--color-ink-faint)",
                }}
              >
                {c.caseNum}
              </span>
              <div>
                <div
                  className="font-[family-name:var(--font-display)] font-normal"
                  style={{
                    fontSize: 24,
                    letterSpacing: 0,
                    lineHeight: 1.2,
                    color: "var(--color-ink)",
                  }}
                >
                  {c.shortLabel.replace(/\.$/, "")}{" "}
                  <em
                    className="italic font-light"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    on file.
                  </em>
                </div>
                <div
                  className="mt-1.5"
                  style={{
                    fontSize: 13,
                    color: "var(--color-ink-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {c.question}
                </div>
              </div>
              <span
                className="font-[family-name:var(--font-mono)] uppercase max-lg:hidden"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  color: "var(--color-accent)",
                }}
              >
                {c.recommendedMode}
              </span>
              <span
                className="font-[family-name:var(--font-mono)] uppercase max-lg:hidden"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.05em",
                  color: "var(--color-ink-muted)",
                }}
              >
                {verdictLabel(c.expectedVerdict)}
              </span>
              <span
                className="font-[family-name:var(--font-mono)] group-hover:translate-x-1"
                style={{
                  color: "var(--color-ink-faint)",
                  transition:
                    "color 0.12s var(--ease-tribunal), transform 0.28s var(--ease-tribunal)",
                }}
              >
                →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
