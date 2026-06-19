import type { Scenario } from "@/lib/scenarios";

function numberedLines(code: string) {
  return code.split("\n").map((line, index) => ({
    number: index + 1,
    text: line || " ",
  }));
}

export function CaseContract({ scenario }: { scenario: Scenario }) {
  const lines = numberedLines(scenario.contract.python);

  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-24 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12 max-lg:flex-col max-lg:gap-3">
        <span className="overline overline-accent">Annotated Contract</span>
        <span className="overline overline-faint">
          Python · Intelligent Contract
        </span>
      </div>

      <div
        className="grid grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] border max-lg:grid-cols-1"
        style={{ borderColor: "var(--color-rule-strong)" }}
      >
        <pre
          className="m-0 overflow-x-auto p-0"
          style={{
            background: "#080808",
            borderRight: "1px solid var(--color-rule)",
          }}
        >
          <code
            className="block py-6 font-[family-name:var(--font-mono)]"
            style={{
              fontSize: 12,
              lineHeight: 1.8,
              color: "var(--color-ink)",
              tabSize: 4,
            }}
          >
            {lines.map((line) => (
              <span key={line.number} className="grid grid-cols-[56px_1fr]">
                <span
                  className="select-none text-right pr-4"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  {String(line.number).padStart(2, "0")}
                </span>
                <span className="pr-8">{line.text}</span>
              </span>
            ))}
          </code>
        </pre>

        <div
          className="flex flex-col"
          style={{ background: "var(--color-surface)" }}
        >
          {scenario.contract.annotations.map((item, index) => (
            <div
              key={item.label}
              className="p-7 border-b last:border-b-0"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <span
                  className="font-[family-name:var(--font-mono)] uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: "var(--color-accent)",
                  }}
                >
                  Note {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className="font-[family-name:var(--font-mono)]"
                  style={{
                    fontSize: 10,
                    color: "var(--color-ink-faint)",
                  }}
                >
                  {scenario.recommendedMode}
                </span>
              </div>
              <h3
                className="m-0 font-[family-name:var(--font-display)] font-normal"
                style={{
                  fontSize: 24,
                  lineHeight: 1.1,
                  letterSpacing: 0,
                  color: "var(--color-ink)",
                }}
              >
                {item.label}
              </h3>
              <p
                className="m-0 mt-4"
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "var(--color-ink-muted)",
                }}
              >
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
