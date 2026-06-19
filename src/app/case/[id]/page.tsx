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

      {scenario.id === "flight" && (
        <ChainVerdict
          question="AA42 was scheduled to land at 14:00. The flight tracker shows it landed at 16:47. Did it land more than 2 hours late?"
          apiEndpoint="/api/genlayer/flight"
          contractAddress={process.env.NEXT_PUBLIC_FLIGHT_CONTRACT_ADDRESS ?? ""}
          modeLabel="Strict mode · 5 validators"
        />
      )}

      {scenario.id === "freelancer" && (
        <ChainVerdict
          question="A freelancer was paid $800 to deliver a 10-slide pitch deck by Friday. They delivered an 8-slide deck on Monday. Did they fulfill the contract?"
          apiEndpoint="/api/genlayer/dispute"
          contractAddress={process.env.NEXT_PUBLIC_DISPUTE_COURT_ADDRESS ?? ""}
          mode="non_comparative"
          criteria="The contract requires delivery of exactly 10 slides by Friday. Evaluate whether the freelancer materially fulfilled both requirements: (1) the slide count of 10, and (2) the Friday deadline. Delivering 8 slides (not 10) on Monday (not Friday) — missing both the count and the deadline with no prior notice — constitutes material breach unless the client waived the terms."
          modeLabel="Non-comparative mode · 5 validators"
        />
      )}

      {scenario.id === "dao" && (
        <ChainVerdict
          question={scenario.question}
          apiEndpoint="/api/genlayer/dispute"
          contractAddress={process.env.NEXT_PUBLIC_DISPUTE_COURT_ADDRESS ?? ""}
          mode="non_comparative"
          criteria={
            "Assess whether the $50K sponsorship falls within the DAO charter phrase 'protocol development and community growth'. Consider: (1) whether funds are directly tied to protocol development (code, audits, integrations), (2) whether the event materially and measurably advances community growth (targeted developer outreach, onboarding metrics), (3) budget reasonableness relative to treasury size, and (4) whether the proposal requires a charter amendment rather than interpretation. Answer yes or no only."
          }
          modeLabel="Non-comparative mode · 5 validators"
        />
      )}

      {scenario.id === "prediction" && (
        <ChainVerdict
          question={scenario.question}
          apiEndpoint="/api/genlayer/dispute"
          contractAddress={process.env.NEXT_PUBLIC_DISPUTE_COURT_ADDRESS ?? ""}
          mode="non_comparative"
          criteria={
            "Determine if the public release as of the cutoff constitutes 'GPT-5' for the market question. Inspect official OpenAI naming, release notes, and announcements: if the release is explicitly marketed or documented as 'GPT-5' (the flagship), answer yes; if it is a named subvariant (e.g., 'GPT-5-mini') or explicitly described as a separate product, answer no. Base judgment on ordinary market intent, not promotional spin. Answer yes or no only."
          }
          modeLabel="Non-comparative mode · 5 validators"
        />
      )}

      {scenario.id === "ai-agent" && (
        <ChainVerdict
          question={scenario.question}
          apiEndpoint="/api/genlayer/dispute"
          contractAddress={process.env.NEXT_PUBLIC_DISPUTE_COURT_ADDRESS ?? ""}
          mode="non_comparative"
          criteria={
            "Evaluate whether ALL provided citations meet the SLA 'peer-reviewed academic sources only'. For each citation, judge the publication venue: peer-reviewed journal or conference proceedings count; arXiv preprints only count if there is verifiable evidence they underwent peer review; blogs, Medium posts, and podcasts do not meet the standard. If any citation fails the peer-reviewed test, answer no. Answer yes or no only."
          }
          modeLabel="Non-comparative mode · 5 validators"
        />
      )}

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
