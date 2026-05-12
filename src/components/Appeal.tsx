export function Appeal() {
  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-32 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12">
        <span className="overline overline-accent">Exhibit F</span>
        <span className="overline overline-faint">§06 / 07</span>
      </div>

      <h2 className="display">
        Appeal &amp; <em>finality.</em>
      </h2>
      <p className="body-prose mt-8 max-w-[680px]">
        A split jury doesn&apos;t break the system — it escalates. Each appeal
        doubles the jury. Each doubling tightens the supermajority required.
        Disagreement has a price; agreement has a path.
      </p>

      <div className="grid grid-cols-[1fr_1.2fr] gap-24 mt-16 items-center max-lg:grid-cols-1 max-lg:gap-12">
        <AppealDiagram />
        <div>
          <span className="overline overline-accent">The economics</span>
          <h3 className="h2 mt-6">
            Disagreement has a <em>price.</em>
          </h3>
          <p className="body-prose mt-6">
            Filing an appeal costs the appellant. Validators who vote with the
            supermajority earn fees; those who deviate lose stake. The result is
            a system that <em>wants</em> to reach finality and punishes both
            lazy agreement and stubborn dissent. The court doesn&apos;t sleep,
            but it doesn&apos;t suffer fools either.
          </p>
        </div>
      </div>
    </section>
  );
}

function AppealDiagram() {
  return (
    <svg
      className="w-full h-auto"
      viewBox="0 0 480 360"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Appeal and finality flow diagram"
    >
      <defs>
        <marker
          id="ar"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 Z" fill="#3F3F3A" />
        </marker>
      </defs>

      {/* Tier 1 label */}
      <text
        x="20" y="48"
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="#7A7A72"
        letterSpacing="1.5"
      >
        TIER 01 — LEADER + 5 VALIDATORS
      </text>

      {/* Leader box */}
      <rect x="20" y="60" width="50" height="50" fill="none" stroke="#C5FF3C" strokeWidth="1" />
      <text x="45" y="90" textAnchor="middle" fontFamily="Fraunces" fontSize="11" fill="#F2F2EC">L</text>

      {/* Validator boxes tier 1 */}
      {[90, 150, 210, 270, 330].map((x) => (
        <rect key={x} x={x} y="60" width="50" height="50" fill="none" stroke="rgba(245,245,240,0.14)" />
      ))}

      <text x="400" y="90" fontFamily="JetBrains Mono" fontSize="9" fill="#7A7A72">→ split</text>

      <line x1="200" y1="125" x2="200" y2="155" stroke="#3F3F3A" strokeWidth="1" markerEnd="url(#ar)" />

      {/* Tier 2 label */}
      <text
        x="20" y="180"
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="#7A7A72"
        letterSpacing="1.5"
      >
        TIER 02 — APPEAL · 11 VALIDATORS
      </text>

      {/* Validator boxes tier 2 */}
      {[20, 60, 100, 140, 180, 220, 260, 300, 340, 380, 420].map((x) => (
        <rect key={x} x={x} y="190" width="32" height="32" fill="none" stroke="rgba(245,245,240,0.14)" />
      ))}

      <line x1="236" y1="235" x2="236" y2="265" stroke="#3F3F3A" strokeWidth="1" markerEnd="url(#ar)" />

      {/* Finality label */}
      <text
        x="20" y="290"
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="#C5FF3C"
        letterSpacing="1.5"
      >
        FINALITY · ≥ 9 / 11 SUPERMAJORITY
      </text>

      <rect x="20" y="300" width="432" height="40" fill="none" stroke="#C5FF3C" strokeWidth="1" />
      <text
        x="236" y="326"
        textAnchor="middle"
        fontFamily="Fraunces"
        fontStyle="italic"
        fontSize="16"
        fill="#F2F2EC"
      >
        verdict accepted · written to state
      </text>
    </svg>
  );
}
