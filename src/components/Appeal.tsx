const finalityNotes = [
  {
    label: "Appeals double the court",
    title: "A split panel escalates.",
    body:
      "The first panel starts small so most cases finish quickly. If the result is inconclusive, an appeal summons a larger validator set and raises the agreement threshold.",
  },
  {
    label: "Stake makes votes costly",
    title: "Validators have skin in the verdict.",
    body:
      "Validators earn fees when their judgment aligns with the supermajority. Bad or lazy votes risk stake, so the incentive is careful reasoning rather than automatic agreement.",
  },
  {
    label: "Finality is a threshold",
    title: "Agreement writes the outcome.",
    body:
      "Once the appellate jury reaches the required supermajority, the verdict becomes final and the contract can move state with an auditable trail of why it happened.",
  },
];

export function Appeal() {
  return (
    <section
      id="appeal"
      className="max-w-[1280px] mx-auto px-8 py-32 border-t scroll-mt-20"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12 max-lg:flex-col max-lg:gap-3">
        <span className="overline overline-accent">
          Exhibit F — Appeal &amp; Finality
        </span>
        <span className="overline overline-faint">§06 / 07</span>
      </div>

      <div className="grid grid-cols-[0.95fr_1.05fr] gap-16 items-end max-lg:grid-cols-1">
        <div>
          <h2 className="display">
            Appeals turn doubt into <em>procedure.</em>
          </h2>
        </div>
        <p className="body-prose m-0 max-w-none">
          A no-consensus result is not a dead end. The contract can demand more
          validators, require a stronger majority, and make each vote
          economically accountable before final state changes.
        </p>
      </div>

      <div className="max-lg:mt-14 max-lg:mb-3 hidden max-lg:block">
        <span className="overline overline-faint">
          Scroll sideways on small screens
        </span>
      </div>

      <div
        className="mt-16 border overflow-x-auto"
        style={{ borderColor: "var(--color-rule-strong)" }}
      >
        <div className="min-w-[1060px]">
          <AppealFlowDiagram />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 mt-16 max-lg:grid-cols-1 max-lg:gap-12">
        {finalityNotes.map((note, index) => (
          <article
            key={note.label}
            className="p-8 border flex flex-col gap-4 relative"
            style={{ borderColor: "var(--color-rule)", background: "var(--color-surface)" }}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 w-12 h-px"
              style={{ background: "var(--color-accent)" }}
            />
            <div className="flex justify-between items-baseline">
              <span className="overline overline-accent">{note.label}</span>
              <span className="overline overline-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3
              className="m-0 font-[family-name:var(--font-display)] font-normal"
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                color: "var(--color-ink)",
              }}
            >
              {note.title}
            </h3>
            <p
              className="m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--color-ink-muted)",
              }}
            >
              {note.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AppealFlowDiagram() {
  const tierOne = [0, 1, 2, 3, 4];
  const tierTwo = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <svg
      className="w-full h-auto block"
      viewBox="0 0 1180 520"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="appeal-flow-title appeal-flow-desc"
    >
      <title id="appeal-flow-title">Appeal escalation flow</title>
      <desc id="appeal-flow-desc">
        A five validator panel can escalate through an appeal bond to an
        eleven validator appellate panel, where nine of eleven votes finalize
        the verdict.
      </desc>
      <defs>
        <linearGradient id="appealAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.75" />
          <stop offset="48%" stopColor="#c5ff3c" stopOpacity="1" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.85" />
        </linearGradient>
        <marker
          id="appealArrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10Z" fill="#c5ff3c" />
        </marker>
        <filter id="appealGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1180" height="520" fill="#080808" />
      <path
        d="M70 84H1110M70 436H1110"
        stroke="rgba(245,245,240,0.08)"
        strokeWidth="1"
      />

      <text x="72" y="54" fill="#7a7a72" className="appeal-svg-overline">
        ESCALATION FLOW
      </text>
      <text x="1010" y="54" fill="#3f3f3a" className="appeal-svg-overline">
        FINALITY BY THRESHOLD
      </text>

      <g>
        <text x="92" y="130" fill="#c5ff3c" className="appeal-svg-overline">
          TIER 01
        </text>
        <text x="92" y="166" fill="#f2f2ec" className="appeal-svg-title">
          5 validators
        </text>
        <text x="92" y="196" fill="#7a7a72" className="appeal-svg-copy">
          Fast first pass. Cheap enough to run, strict enough to reject weak
          agreement.
        </text>

        {tierOne.map((node) => (
          <g key={node} transform={`translate(${92 + node * 54} 236)`}>
            <rect
              width="38"
              height="38"
              fill="none"
              stroke={node < 3 ? "#fbbf24" : "rgba(245,245,240,0.18)"}
            >
              <animate
                attributeName="stroke-opacity"
                values="0.35;1;0.35"
                dur="3s"
                begin={`${node * 0.12}s`}
                repeatCount="indefinite"
              />
            </rect>
            <circle
              cx="19"
              cy="19"
              r="4"
              fill={node < 3 ? "#fbbf24" : "#3f3f3a"}
            />
          </g>
        ))}

        <text x="92" y="318" fill="#fbbf24" className="appeal-svg-overline">
          split result · no finality
        </text>
      </g>

      <g>
        <path
          d="M388 260C460 260 475 178 540 178C605 178 616 260 676 260"
          fill="none"
          stroke="url(#appealAccent)"
          strokeWidth="2"
          strokeDasharray="10 14"
          markerEnd="url(#appealArrow)"
          filter="url(#appealGlow)"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-96"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </path>

        <rect
          x="472"
          y="214"
          width="148"
          height="92"
          fill="rgba(197,255,60,0.035)"
          stroke="#c5ff3c"
        >
          <animate
            attributeName="stroke-opacity"
            values="0.35;1;0.35"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </rect>
        <text x="546" y="248" textAnchor="middle" fill="#c5ff3c" className="appeal-svg-overline">
          APPEAL BOND
        </text>
        <text x="546" y="276" textAnchor="middle" fill="#f2f2ec" className="appeal-svg-copy">
          appellant posts cost
        </text>
      </g>

      <g>
        <text x="708" y="130" fill="#c5ff3c" className="appeal-svg-overline">
          TIER 02
        </text>
        <text x="708" y="166" fill="#f2f2ec" className="appeal-svg-title">
          11 validators
        </text>
        <text x="708" y="196" fill="#7a7a72" className="appeal-svg-copy">
          Larger jury. Higher confidence. Supermajority required before state
          can move.
        </text>

        {tierTwo.map((node) => (
          <g
            key={node}
            transform={`translate(${708 + (node % 6) * 48} ${
              node < 6 ? 232 : 286
            })`}
          >
            <rect
              width="34"
              height="34"
              fill={node < 9 ? "rgba(74,222,128,0.08)" : "none"}
              stroke={node < 9 ? "#4ade80" : "rgba(245,245,240,0.18)"}
            >
              <animate
                attributeName="fill-opacity"
                values="0.3;0.95;0.3"
                dur="3.6s"
                begin={`${node * 0.08}s`}
                repeatCount="indefinite"
              />
            </rect>
            <circle
              cx="17"
              cy="17"
              r="4"
              fill={node < 9 ? "#4ade80" : "#3f3f3a"}
            />
          </g>
        ))}
      </g>

      <g>
        <path
          d="M920 365H1084"
          stroke="rgba(245,245,240,0.14)"
          strokeWidth="10"
          strokeLinecap="square"
        />
        <path
          d="M920 365H1054"
          stroke="#4ade80"
          strokeWidth="10"
          strokeLinecap="square"
          filter="url(#appealGlow)"
        >
          <animate
            attributeName="stroke-dasharray"
            values="0 164;134 30;134 30"
            dur="3.6s"
            repeatCount="indefinite"
          />
        </path>
        <text x="920" y="406" fill="#4ade80" className="appeal-svg-overline">
          FINALITY · 9 / 11
        </text>
        <text x="920" y="432" fill="#f2f2ec" className="appeal-svg-copy">
          verdict accepted · state updated
        </text>
      </g>

      <g>
        <text x="92" y="394" fill="#7a7a72" className="appeal-svg-overline">
          STAKE ACCOUNTING
        </text>
        <path d="M92 412H284" stroke="#4ade80" strokeWidth="3" />
        <path d="M92 424H218" stroke="#c5ff3c" strokeWidth="3" />
        <path d="M92 436H150" stroke="#f87171" strokeWidth="3" />
        <text x="304" y="416" fill="#7a7a72" className="appeal-svg-copy">
          aligned votes earn
        </text>
        <text x="304" y="438" fill="#7a7a72" className="appeal-svg-copy">
          bad votes lose stake
        </text>
      </g>

      <style>
        {`
          .appeal-svg-overline {
            font-family: var(--font-mono);
            font-size: 11px;
            letter-spacing: 0;
            text-transform: uppercase;
          }
          .appeal-svg-title {
            font-family: var(--font-display);
            font-size: 32px;
            font-weight: 300;
            letter-spacing: 0;
          }
          .appeal-svg-copy {
            font-family: var(--font-sans);
            font-size: 13px;
            letter-spacing: 0;
          }
        `}
      </style>
    </svg>
  );
}
