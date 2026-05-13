"use client";

import Link from "next/link";

type Case = {
  num: string;
  title: { lead: string; italic: string };
  sub: string;
  mode: "Strict" | "Comparative" | "Non-comparative";
  finality: string;
  href: string;
};

const cases: Case[] = [
  {
    num: "№ 24·001",
    title: { lead: "The freelancer's", italic: "milestone." },
    sub: "Was the pitch deck delivered? Eight slides on Monday for ten-by-Friday.",
    mode: "Non-comparative",
    finality: "Finality · 0.41s",
    href: "/case/freelancer",
  },
  {
    num: "№ 24·002",
    title: { lead: "The flight's", italic: "delay." },
    sub: "Parametric insurance: did AA42 land more than 2 hours late?",
    mode: "Strict",
    finality: "Finality · 0.18s",
    href: "/case/flight",
  },
  {
    num: "№ 24·003",
    title: { lead: "The DAO's", italic: "proposal." },
    sub: "Does this treasury allocation fall within the charter's intent?",
    mode: "Non-comparative",
    finality: "Finality · 0.72s",
    href: "#",
  },
  {
    num: "№ 24·004",
    title: { lead: "The prediction", italic: "market." },
    sub: '"Will GPT-5 ship before July?" Who won when ambiguity resolves slowly?',
    mode: "Comparative",
    finality: "Finality · 0.34s",
    href: "#",
  },
  {
    num: "№ 24·005",
    title: { lead: "The AI agent's", italic: "SLA." },
    sub: 'Did the autonomous research agent meet "high-quality citations" as promised?',
    mode: "Non-comparative",
    finality: "Finality · 0.58s",
    href: "#",
  },
];

export function Casebook() {
  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-32 border-t"
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

      <div className="border-t" style={{ borderColor: "var(--color-rule-strong)" }}>
        {cases.map((c, i) => {
          const isLast = i === cases.length - 1;
          return (
            <Link
              key={i}
              href={c.href}
              className="group grid grid-cols-[80px_1fr_200px_140px_32px] items-center gap-8 py-8 border-b no-underline text-inherit max-lg:grid-cols-[60px_1fr_32px] max-lg:gap-4"
              style={{
                borderColor: isLast ? "var(--color-rule-strong)" : "var(--color-rule)",
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
                style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--color-ink-faint)" }}
              >
                {c.num}
              </span>
              <div>
                <div
                  className="font-[family-name:var(--font-display)] font-normal"
                  style={{ fontSize: 24, letterSpacing: "-0.01em", lineHeight: 1.2, color: "var(--color-ink)" }}
                >
                  {c.title.lead}{" "}
                  <em className="italic font-light" style={{ color: "var(--color-ink-muted)" }}>
                    {c.title.italic}
                  </em>
                </div>
                <div className="mt-1.5" style={{ fontSize: 13, color: "var(--color-ink-muted)", lineHeight: 1.4 }}>
                  {c.sub}
                </div>
              </div>
              <span
                className="font-[family-name:var(--font-mono)] uppercase max-lg:hidden"
                style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--color-accent)" }}
              >
                {c.mode}
              </span>
              <span
                className="font-[family-name:var(--font-mono)] max-lg:hidden"
                style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--color-ink-muted)" }}
              >
                {c.finality}
              </span>
              <span
                className="font-[family-name:var(--font-mono)] group-hover:translate-x-1"
                style={{
                  color: "var(--color-ink-faint)",
                  transition: "color 0.12s var(--ease-tribunal), transform 0.28s var(--ease-tribunal)",
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
