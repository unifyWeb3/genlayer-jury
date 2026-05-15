const guideNotes = [
  {
    title: "Start with evidence shape",
    body:
      "Mode choice is not about model preference. It is about the shape of the evidence you expect validators to return.",
  },
  {
    title: "Escalate only when needed",
    body:
      "A small jury resolves most disputes quickly. Appeals exist for hard edges where interpretation or noisy data blocks confident agreement.",
  },
  {
    title: "Write the rubric like law",
    body:
      "For subjective disputes, phrase the rubric like a legal clause. Clear scope gives validators room to reason without drifting from intent.",
  },
];

export function FieldGuide() {
  return (
    <section
      id="field-guide"
      className="max-w-[1280px] mx-auto px-8 py-32 border-t scroll-mt-20"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12 max-lg:flex-col max-lg:gap-3">
        <span className="overline overline-accent">
          Field Guide - Author Workflow
        </span>
        <span className="overline overline-faint">Decision tree for mode fit</span>
      </div>

      <div className="grid grid-cols-[0.9fr_1.1fr] gap-16 items-start max-lg:grid-cols-1">
        <div>
          <h2 className="display">
            Choose the mode with <em>intent.</em>
          </h2>
          <p className="body-prose mt-8">
            Intelligent Contracts fail when authors treat equivalence modes as
            cosmetic. They succeed when mode choice matches the evidence type,
            dispute shape, and confidence requirement.
          </p>
        </div>

        <div>
          <div className="max-lg:mb-3 hidden max-lg:block">
            <span className="overline overline-faint">
              Scroll sideways on small screens
            </span>
          </div>
          <div
            className="overflow-x-auto border"
            style={{ borderColor: "var(--color-rule-strong)" }}
          >
            <div className="min-w-[920px]">
              <DecisionTree />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 mt-16 max-lg:grid-cols-1 max-lg:gap-12">
        {guideNotes.map((note, index) => (
          <article
            key={note.title}
            className="p-8 border flex flex-col gap-4 relative"
            style={{ borderColor: "var(--color-rule)", background: "var(--color-surface)" }}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 w-12 h-px"
              style={{ background: "var(--color-accent)" }}
            />
            <div className="flex justify-end">
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

function DecisionTree() {
  return (
    <svg
      className="w-full h-auto block"
      viewBox="0 0 920 520"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="decision-tree-title decision-tree-desc"
    >
      <title id="decision-tree-title">Mode selection decision tree</title>
      <desc id="decision-tree-desc">
        A decision tree that maps dispute evidence shape to strict, comparative,
        or non-comparative equivalence mode.
      </desc>
      <defs>
        <marker
          id="tree-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10Z" fill="#7a7a72" />
        </marker>
        <linearGradient id="tree-branch" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#c5ff3c" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      <rect width="920" height="520" fill="#080808" />

      <g>
        <rect
          x="268"
          y="44"
          width="384"
          height="96"
          fill="rgba(197,255,60,0.04)"
          stroke="#c5ff3c"
          strokeWidth="1.4"
        />
        <text x="460" y="80" textAnchor="middle" fill="#c5ff3c" className="tree-overline">
          ROOT QUESTION
        </text>
        <text x="460" y="112" textAnchor="middle" fill="#f2f2ec" className="tree-title">
          What kind of answer does this contract need?
        </text>
      </g>

      <path
        d="M460 140V188"
        stroke="url(#tree-branch)"
        strokeWidth="2"
        strokeDasharray="8 9"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-68"
          dur="2.8s"
          repeatCount="indefinite"
        />
      </path>

      <g>
        <path
          d="M460 188L170 250"
          fill="none"
          stroke="rgba(245,245,240,0.26)"
          strokeWidth="1.3"
          markerEnd="url(#tree-arrow)"
        />
        <path
          d="M460 188L460 250"
          fill="none"
          stroke="rgba(245,245,240,0.26)"
          strokeWidth="1.3"
          markerEnd="url(#tree-arrow)"
        />
        <path
          d="M460 188L750 250"
          fill="none"
          stroke="rgba(245,245,240,0.26)"
          strokeWidth="1.3"
          markerEnd="url(#tree-arrow)"
        />
      </g>

      <BranchNode
        x={46}
        y={252}
        w={250}
        h={112}
        mode="STRICT"
        promptLines={[
          "Is the answer a single factual value",
          "every validator should match exactly?",
        ]}
        summaryLines={["Use strict_eq for flight delay,", "market close, or binary status."]}
        tone="#4ade80"
        delay="0s"
      />
      <BranchNode
        x={335}
        y={252}
        w={250}
        h={112}
        mode="COMPARATIVE"
        promptLines={[
          "Is the answer numeric but tolerant",
          "to small variance or measurement noise?",
        ]}
        summaryLines={["Use prompt_comparative", "with tolerance bands."]}
        tone="#c5ff3c"
        delay="0.35s"
      />
      <BranchNode
        x={624}
        y={252}
        w={250}
        h={112}
        mode="NON-COMPARATIVE"
        promptLines={[
          "Does the dispute require legal or",
          "semantic judgment from a rubric?",
        ]}
        summaryLines={[
          "Use prompt_non_comparative for",
          "charter intent and SLA quality.",
        ]}
        tone="#fbbf24"
        delay="0.7s"
      />

      <g>
        <path
          d="M170 364V422H750V364"
          fill="none"
          stroke="rgba(245,245,240,0.16)"
          strokeWidth="1.2"
        />
        <rect
          x="250"
          y="422"
          width="420"
          height="66"
          fill="none"
          stroke="#c5ff3c"
          strokeWidth="1.2"
        />
        <text x="460" y="448" textAnchor="middle" fill="#c5ff3c" className="tree-overline">
          FINAL CHECK
        </text>
        <text x="460" y="474" textAnchor="middle" fill="#f2f2ec" className="tree-copy">
          If confidence is low after Tier 1, trigger appeal escalation before final state.
        </text>
      </g>

      <style>
        {`
          .tree-overline {
            font-family: var(--font-mono);
            font-size: 11px;
            letter-spacing: 0;
            text-transform: uppercase;
          }
          .tree-title {
            font-family: var(--font-display);
            font-size: 29px;
            font-weight: 300;
            letter-spacing: 0;
          }
          .tree-copy {
            font-family: var(--font-sans);
            font-size: 12.5px;
            letter-spacing: 0;
          }
        `}
      </style>
    </svg>
  );
}

function BranchNode({
  x,
  y,
  w,
  h,
  mode,
  promptLines,
  summaryLines,
  tone,
  delay,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  mode: string;
  promptLines: string[];
  summaryLines: string[];
  tone: string;
  delay: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} fill="none" stroke={tone} strokeWidth="1.1">
        <animate
          attributeName="stroke-opacity"
          values="0.5;1;0.5"
          dur="3.4s"
          begin={delay}
          repeatCount="indefinite"
        />
      </rect>
      <text x={16} y={24} fill={tone} className="tree-overline">
        {mode}
      </text>
      <text x={16} y={50} fill="#f2f2ec" className="tree-copy">
        {promptLines.map((line, index) => (
          <tspan key={line} x={16} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
      <text x={16} y={90} fill="#7a7a72" className="tree-copy">
        {summaryLines.map((line, index) => (
          <tspan key={line} x={16} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
