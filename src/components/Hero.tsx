export function Hero() {
  return (
    <section className="max-w-[1280px] mx-auto px-8 pt-32 pb-24">
      <div className="reveal reveal-d0">
        <span className="overline">Exhibit A — Interactive Demonstration</span>
      </div>

      <h1 className="hero-title reveal reveal-d1 mt-12">
        The Jury<span className="period">.</span>
      </h1>

      <p className="lede reveal reveal-d2">
        When code can&apos;t decide,
        <br />
        <em>five AIs can.</em>
      </p>

      <div
        className="grid grid-cols-[1fr_auto] items-end gap-8 mt-20 pt-8 border-t reveal reveal-d3 max-md:grid-cols-1 max-md:items-start"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div>
          <p className="body-lg m-0">
            Smart contracts move money. Intelligent Contracts decide who{" "}
            <em>deserves</em> it. Pose a subjective question, watch five LLMs
            deliberate as GenLayer validators, and see the Equivalence Principle
            deliver a verdict — live, in your browser.
          </p>
          <p
            className="mt-4 font-[family-name:var(--font-mono)]"
            style={{ fontSize: 12, lineHeight: 1.75, color: "var(--color-accent)", letterSpacing: "0.18em" }}
          >
            Live on GenLayer Studionet — every verdict is real on-chain validator consensus, verifiable on the block explorer.
          </p>
        </div>
        <div className="text-right max-md:text-left" style={{ color: "var(--color-ink-faint)" }}>
          <div className="mono-sm">Filed · GenLayer Builder Program</div>
          <div className="mono-sm mt-1">Educational Content · v0.1.0</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-8 mt-12 reveal reveal-d4">
        <a href="#simulator" className="btn-primary">
          Convene the jury →
        </a>
        <a href="#field-guide" className="btn-ghost">
          Read the field guide
        </a>
      </div>
    </section>
  );
}
