import { notFound } from "next/navigation";
import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";
import { Docket, DocketFoot } from "@/components/Docket";
import { Simulator } from "@/components/Simulator";
import { CaseContract } from "@/components/CaseContract";
import { ChainVerdict } from "@/components/ChainVerdict";

const CASEBOOK_SCENARIOS = SCENARIOS.slice(0, 5);

export async function generateStaticParams() {
  return CASEBOOK_SCENARIOS.map((scenario) => ({ id: scenario.id }));
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scenario = CASEBOOK_SCENARIOS.find((s) => s.id === id);
  if (!scenario) notFound();

  const currentIndex = CASEBOOK_SCENARIOS.findIndex((s) => s.id === id);
  const nextScenario =
    CASEBOOK_SCENARIOS[(currentIndex + 1) % CASEBOOK_SCENARIOS.length];

  return (
    <>
      <Docket subtitle={`${scenario.caseNum} — Detail View`} />

      <section
        className="max-w-[1280px] mx-auto px-8 pt-24 pb-16 border-b"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="flex justify-between items-baseline mb-8 max-lg:flex-col max-lg:gap-3">
          <span className="overline overline-accent">{scenario.caseNum}</span>
          <span className="overline overline-faint">
            Pattern: {scenario.pattern}
          </span>
        </div>

        <h1
          className="font-[family-name:var(--font-display)] font-light"
          style={{
            fontSize: "clamp(36px, 5vw, 72px)",
            lineHeight: 1.1,
            letterSpacing: 0,
            color: "var(--color-ink)",
          }}
        >
          {scenario.shortLabel.replace("The ", "The ")}
        </h1>

        <p
          className="mt-8 max-w-[680px]"
          style={{ fontSize: 18, lineHeight: 1.65, color: "var(--color-ink-muted)" }}
        >
          {scenario.dispute}
        </p>

        <div className="flex gap-6 mt-10 flex-wrap">
          <div
            className="border px-5 py-3"
            style={{ borderColor: "var(--color-rule-strong)", background: "var(--color-surface)" }}
          >
            <span
              className="font-[family-name:var(--font-mono)] uppercase block"
              style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--color-ink-faint)", marginBottom: 6 }}
            >
              Mode
            </span>
            <span
              className="font-[family-name:var(--font-mono)] uppercase"
              style={{ fontSize: 12, letterSpacing: "0.15em", color: "var(--color-accent)" }}
            >
              {scenario.recommendedMode}
            </span>
          </div>
          <div
            className="border px-5 py-3"
            style={{ borderColor: "var(--color-rule-strong)", background: "var(--color-surface)" }}
          >
            <span
              className="font-[family-name:var(--font-mono)] uppercase block"
              style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--color-ink-faint)", marginBottom: 6 }}
            >
              Expected verdict
            </span>
            <span
              className="font-[family-name:var(--font-mono)] uppercase"
              style={{
                fontSize: 12,
                letterSpacing: "0.15em",
                color:
                  scenario.expectedVerdict === "yes"
                    ? "var(--color-verdict-yes)"
                    : scenario.expectedVerdict === "no"
                    ? "var(--color-verdict-no)"
                    : "var(--color-verdict-und)",
              }}
            >
              {scenario.expectedVerdict === "yes"
                ? "Accepted"
                : scenario.expectedVerdict === "no"
                  ? "Rejected"
                  : "Undetermined"}
            </span>
          </div>
        </div>
      </section>

      <section
        className="max-w-[1280px] mx-auto px-8 py-16 border-b"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div
          className="grid grid-cols-3 gap-0 border max-lg:grid-cols-1"
          style={{ borderColor: "var(--color-rule-strong)" }}
        >
          <div
            className="p-8 border-r max-lg:border-r-0 max-lg:border-b"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <span className="overline block mb-6">The Dispute</span>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--color-ink-muted)",
                margin: 0,
              }}
            >
              {scenario.dispute}
            </p>
          </div>

          <div
            className="p-8 border-r max-lg:border-r-0 max-lg:border-b"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <span className="overline block mb-6">Mode Fit</span>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--color-ink-muted)",
                margin: 0,
              }}
            >
              {scenario.contract.whyMode}
            </p>
          </div>

          <div className="p-8">
            <span className="overline block mb-6">Why Not Ethereum?</span>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--color-ink-muted)",
                margin: 0,
              }}
            >
              {scenario.contract.whyNotEth}
            </p>
          </div>
        </div>
      </section>

      {scenario.id === "flight" && <ChainVerdict />}

      <Simulator lockedScenarioId={id} defaultContractOpen={true} />

      <CaseContract scenario={scenario} />

      <div
        className="max-w-[1280px] mx-auto px-8 pb-24 border-t flex justify-between gap-6 flex-wrap"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <Link
          href="/#casebook"
          className="inline-flex items-center gap-3 mt-12 no-underline group"
          style={{ color: "var(--color-ink-muted)", textDecoration: "none" }}
        >
          <span
            className="font-[family-name:var(--font-mono)] group-hover:-translate-x-1"
            style={{
              transition: "transform 0.28s var(--ease-tribunal)",
              color: "var(--color-ink-faint)",
            }}
          >
            ←
          </span>
          <span
            className="font-[family-name:var(--font-mono)] uppercase"
            style={{ fontSize: 11, letterSpacing: "0.15em" }}
          >
            Back to Casebook
          </span>
        </Link>
        <Link
          href={`/case/${nextScenario.id}`}
          className="inline-flex items-center gap-3 mt-12 no-underline group"
          style={{ color: "var(--color-ink-muted)", textDecoration: "none" }}
        >
          <span
            className="font-[family-name:var(--font-mono)] uppercase"
            style={{ fontSize: 11, letterSpacing: "0.15em" }}
          >
            Next file · {nextScenario.shortLabel}
          </span>
          <span
            className="font-[family-name:var(--font-mono)] group-hover:translate-x-1"
            style={{
              transition: "transform 0.28s var(--ease-tribunal)",
              color: "var(--color-ink-faint)",
            }}
          >
            →
          </span>
        </Link>
      </div>

      <DocketFoot />
    </>
  );
}
