const cells = [
  {
    num: "/ 01",
    title: { lead: "Intelligent", italic: "Contracts" },
    body: "Python contracts that call LLMs and read live web pages. Same on-chain guarantees as Solidity, plus the ability to reason about subjective inputs no oracle can answer.",
    trace: "contract → llm.exec_prompt() → state",
  },
  {
    num: "/ 02",
    title: { lead: "Optimistic", italic: "Democracy" },
    body: "A leader executes first. A small jury of validators re-runs and votes. Disagreement triggers an appeal; appeal doubles the jury. Finality is reached when the supermajority agrees.",
    trace: "leader → validators (5) → appeal (11) → finality",
  },
  {
    num: "/ 03",
    title: { lead: "Equivalence", italic: "Principle" },
    body: 'The rule the author writes that tells validators what "agreement" looks like. Strict equality for facts. Numeric tolerance for measurements. Rubric judgment for everything else.',
    trace: "strict · comparative · non-comparative",
  },
];

export function Trinity() {
  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-32 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12">
        <span className="overline overline-accent">Exhibit B</span>
        <span className="overline overline-faint">§02 / 07</span>
      </div>

      <h2 className="display">
        How the tribunal <em>works.</em>
      </h2>
      <p className="body-prose mt-8 max-w-[680px]">
        Three primitives, working in sequence. The contract proposes. The jury
        deliberates. The principle decides. Everything else is implementation.
      </p>

      <div
        className="grid grid-cols-3 mt-16 border max-lg:grid-cols-1"
        style={{ borderColor: "var(--color-rule)", background: "var(--color-surface)" }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`p-12 flex flex-col gap-6 min-h-[340px] max-lg:p-8 ${
              i < cells.length - 1 ? "border-r max-lg:border-r-0 max-lg:border-b" : ""
            }`}
            style={{ borderColor: "var(--color-rule)" }}
          >
            <span
              className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.2em]"
              style={{ color: "var(--color-ink-faint)" }}
            >
              {cell.num}
            </span>
            <h3
              className="font-[family-name:var(--font-display)] text-[28px] font-normal leading-[1.1]"
              style={{ letterSpacing: "-0.01em" }}
            >
              {cell.title.lead}{" "}
              <em className="italic font-light" style={{ color: "var(--color-ink-muted)" }}>
                {cell.title.italic}
              </em>
            </h3>
            <p className="text-[15px] leading-[1.55]" style={{ color: "var(--color-ink-muted)" }}>
              {cell.body}
            </p>
            <div
              className="mt-auto pt-6 border-t font-[family-name:var(--font-mono)] text-[11px]"
              style={{
                borderColor: "var(--color-rule)",
                color: "var(--color-ink-faint)",
                letterSpacing: "0.05em",
              }}
            >
              {cell.trace}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
