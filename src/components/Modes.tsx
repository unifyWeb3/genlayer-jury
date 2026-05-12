type CodeTok = { text: string; kind: "kw" | "str" | "plain" };

const modes = [
  {
    glyph: "⚡ Mode 01",
    name: "Strict",
    factWord: "fact",
    whenLead:
      "Did the flight land? What was the closing price? Validators must return byte-identical JSON. No interpretation permitted.",
    code: ['gl.eq_principle.strict_eq(', '  "flight AA42 status"', ")"],
    fn: "strict_eq",
  },
  {
    glyph: "≈ Mode 02",
    name: "Comparative",
    factWord: "measurement",
    whenLead:
      "How late was the delivery? What was the sentiment score? Validators must agree within a tolerance window.",
    code: ["gl.eq_principle.prompt_comparative(", "  tolerance=0.15", ")"],
    fn: "prompt_comparative",
  },
  {
    glyph: "⚖ Mode 03",
    name: "Non-comparative",
    factWord: "judgment",
    whenLead:
      'Did the freelancer fulfill the contract? Is this proposal valid? Validators apply a rubric the author wrote and a sixth LLM judges agreement.',
    code: ["gl.eq_principle.prompt_non_comparative(", '  rubric="..."', ")"],
    fn: "prompt_non_comparative",
  },
];

function tokenize(line: string, fn: string): CodeTok[] {
  const keywords = ["gl", fn];
  const tokens: CodeTok[] = [];
  const re = /("[^"]*")/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const segments: { text: string; isString: boolean }[] = [];
  while ((m = re.exec(line)) !== null) {
    if (m.index > last)
      segments.push({ text: line.slice(last, m.index), isString: false });
    segments.push({ text: m[0], isString: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) segments.push({ text: line.slice(last), isString: false });

  for (const seg of segments) {
    if (seg.isString) { tokens.push({ text: seg.text, kind: "str" }); continue; }
    let rem = seg.text;
    while (rem.length) {
      let matched = false;
      for (const kw of keywords) {
        if (rem.startsWith(kw)) {
          tokens.push({ text: kw, kind: "kw" });
          rem = rem.slice(kw.length);
          matched = true;
          break;
        }
      }
      if (!matched) { tokens.push({ text: rem[0], kind: "plain" }); rem = rem.slice(1); }
    }
  }
  return tokens;
}

export function Modes() {
  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-32 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12">
        <span className="overline overline-accent">Exhibit C</span>
        <span className="overline overline-faint">§03 / 07</span>
      </div>

      <h2 className="display">
        Three modes of <em>agreement.</em>
      </h2>
      <p className="body-prose mt-8 max-w-[680px]">
        The Equivalence Principle isn&apos;t one rule — it&apos;s three. Choosing the
        right one is the entire skill of writing an Intelligent Contract.
      </p>

      <div className="grid grid-cols-3 gap-12 mt-16 max-lg:grid-cols-1">
        {modes.map((mode, i) => (
          <article
            key={i}
            className="flex flex-col gap-5 pt-6 relative border-t"
            style={{ borderColor: "var(--color-rule-strong)" }}
          >
            <span
              aria-hidden
              className="absolute top-[-1px] left-0 w-12 h-px"
              style={{ background: "var(--color-accent)" }}
            />
            <span
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase"
              style={{ color: "var(--color-accent)", letterSpacing: "0.2em" }}
            >
              {mode.glyph}
            </span>
            <h3
              className="font-[family-name:var(--font-display)] text-[32px] font-normal leading-none"
              style={{ letterSpacing: "-0.015em" }}
            >
              {mode.name}
            </h3>
            <p className="text-[14px] leading-[1.55]" style={{ color: "var(--color-ink-muted)" }}>
              Use when the answer is a{" "}
              <em
                className="italic"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                }}
              >
                {mode.factWord}
              </em>
              . {mode.whenLead}
            </p>
            <div
              className="mt-4 p-4 border font-[family-name:var(--font-mono)] text-[11px] leading-[1.6]"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-rule)",
                color: "var(--color-ink-muted)",
              }}
            >
              {mode.code.map((line, j) => (
                <div key={j}>
                  {tokenize(line, mode.fn).map((tok, k) => (
                    <span
                      key={k}
                      style={{
                        color:
                          tok.kind === "kw"
                            ? "var(--color-accent)"
                            : tok.kind === "str"
                            ? "var(--color-ink)"
                            : "inherit",
                        whiteSpace: "pre",
                      }}
                    >
                      {tok.text}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
