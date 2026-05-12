// The case archive. Each scenario has:
// - A question on trial
// - The mode the author chose (which is also the correct teaching answer)
// - Five mocked validator responses with verdict + reasoning
// - Streaming timing per validator so they finish at different moments (like real LLMs)

export type Mode = "Strict" | "Comparative" | "Non-comparative";
export type Verdict = "yes" | "no" | "und";

export type Juror = {
  seat: 1 | 2 | 3 | 4 | 5;
  model: string;
  verdict: Verdict;
  text: string;
  // Time in ms before this juror starts streaming, and chars/sec while streaming.
  // Real LLMs finish at different times — we mimic that.
  startDelay: number;
  charsPerSec: number;
};

export type Scenario = {
  id: string;
  caseNum: string;
  shortLabel: string;
  pattern: string;
  question: string;
  recommendedMode: Mode;
  // The verdict the Equivalence Principle should produce given these 5 responses.
  // For teaching: this is the *correct* answer that the EP comparator delivers.
  expectedVerdict: Verdict;
  jurors: Juror[];
};

// Five model names. We label by the *seat* so swapping to live models on Day 4
// doesn't break the UI. The jury is always 5 seats; what model sits in each
// seat is a wiring detail.
const SEAT_LABELS = [
  "GPT-4o",
  "Claude 3.5",
  "Gemini 1.5",
  "Llama 3.1",
  "Mistral L",
] as const;

export const SCENARIOS: Scenario[] = [
  {
    id: "freelancer",
    caseNum: "№ 24·001",
    shortLabel: "The freelancer's milestone",
    pattern: "freelancer milestone",
    question:
      "A freelancer was paid $800 to deliver a 10-slide pitch deck by Friday. They delivered an 8-slide deck on Monday. Did they fulfill the contract?",
    recommendedMode: "Non-comparative",
    expectedVerdict: "no",
    jurors: [
      {
        seat: 1,
        model: SEAT_LABELS[0],
        verdict: "no",
        text: "Two slides short and three days late constitutes material breach.",
        startDelay: 320,
        charsPerSec: 42,
      },
      {
        seat: 2,
        model: SEAT_LABELS[1],
        verdict: "no",
        text: "Both deliverable count and deadline missed without prior negotiation.",
        startDelay: 180,
        charsPerSec: 38,
      },
      {
        seat: 3,
        model: SEAT_LABELS[2],
        verdict: "und",
        text: "Insufficient context on whether 8 slides covered the agreed scope.",
        startDelay: 540,
        charsPerSec: 35,
      },
      {
        seat: 4,
        model: SEAT_LABELS[3],
        verdict: "no",
        text: "Material breach: late and incomplete. Partial credit not justified.",
        startDelay: 720,
        charsPerSec: 32,
      },
      {
        seat: 5,
        model: SEAT_LABELS[4],
        verdict: "no",
        text: "Failed on two of two specified terms. Strict interpretation required.",
        startDelay: 240,
        charsPerSec: 40,
      },
    ],
  },
  {
    id: "flight",
    caseNum: "№ 24·002",
    shortLabel: "The flight's delay",
    pattern: "parametric insurance",
    question:
      "AA42 was scheduled to land at 14:00. The flight tracker shows it landed at 16:47. Did it land more than 2 hours late?",
    recommendedMode: "Strict",
    expectedVerdict: "yes",
    jurors: [
      {
        seat: 1,
        model: SEAT_LABELS[0],
        verdict: "yes",
        text: "Delay of 2h 47m exceeds 2-hour threshold. Confirmed.",
        startDelay: 160,
        charsPerSec: 45,
      },
      {
        seat: 2,
        model: SEAT_LABELS[1],
        verdict: "yes",
        text: "Yes. 2:47 > 2:00. Strict numeric comparison.",
        startDelay: 240,
        charsPerSec: 50,
      },
      {
        seat: 3,
        model: SEAT_LABELS[2],
        verdict: "yes",
        text: "Threshold breached by 47 minutes.",
        startDelay: 120,
        charsPerSec: 48,
      },
      {
        seat: 4,
        model: SEAT_LABELS[3],
        verdict: "yes",
        text: "Confirmed: actual delay 2h47m vs threshold 2h00m.",
        startDelay: 380,
        charsPerSec: 42,
      },
      {
        seat: 5,
        model: SEAT_LABELS[4],
        verdict: "yes",
        text: "Yes. Source: live flight tracker. Delta = +47min.",
        startDelay: 200,
        charsPerSec: 46,
      },
    ],
  },
  {
    id: "dao",
    caseNum: "№ 24·003",
    shortLabel: "The DAO's proposal",
    pattern: "DAO proposal review",
    question:
      "A DAO's charter restricts treasury spending to 'protocol development and community growth.' A proposal allocates $50K to sponsor a music festival. Does this fall within the charter's intent?",
    recommendedMode: "Non-comparative",
    expectedVerdict: "no",
    jurors: [
      {
        seat: 1,
        model: SEAT_LABELS[0],
        verdict: "no",
        text: "Music festival sponsorship is brand marketing, not protocol or community growth in the chartered sense.",
        startDelay: 380,
        charsPerSec: 36,
      },
      {
        seat: 2,
        model: SEAT_LABELS[1],
        verdict: "no",
        text: "Falls outside 'protocol development.' 'Community growth' is stretched beyond chartered intent.",
        startDelay: 260,
        charsPerSec: 38,
      },
      {
        seat: 3,
        model: SEAT_LABELS[2],
        verdict: "und",
        text: "Could qualify as community growth depending on attendee composition. Ambiguous.",
        startDelay: 480,
        charsPerSec: 34,
      },
      {
        seat: 4,
        model: SEAT_LABELS[3],
        verdict: "no",
        text: "Sponsorship spend doesn't develop the protocol. Community growth claim is tenuous.",
        startDelay: 620,
        charsPerSec: 30,
      },
      {
        seat: 5,
        model: SEAT_LABELS[4],
        verdict: "no",
        text: "Outside chartered scope. Requires charter amendment, not interpretation.",
        startDelay: 340,
        charsPerSec: 37,
      },
    ],
  },
  {
    id: "prediction",
    caseNum: "№ 24·004",
    shortLabel: "The prediction market",
    pattern: "subjective resolution",
    question:
      "A prediction market asks: 'Will GPT-5 ship before July 2026?' On June 30, OpenAI releases 'GPT-5-mini' but not the full GPT-5. Should the market resolve YES?",
    recommendedMode: "Non-comparative",
    expectedVerdict: "no",
    jurors: [
      {
        seat: 1,
        model: SEAT_LABELS[0],
        verdict: "no",
        text: "'GPT-5-mini' is a variant, not GPT-5. The market specified the full model.",
        startDelay: 280,
        charsPerSec: 38,
      },
      {
        seat: 2,
        model: SEAT_LABELS[1],
        verdict: "no",
        text: "Mini variants don't satisfy a 'GPT-5' resolution criterion in common usage.",
        startDelay: 360,
        charsPerSec: 36,
      },
      {
        seat: 3,
        model: SEAT_LABELS[2],
        verdict: "und",
        text: "Depends on whether the market spec defines 'GPT-5' as the family or the flagship.",
        startDelay: 540,
        charsPerSec: 32,
      },
      {
        seat: 4,
        model: SEAT_LABELS[3],
        verdict: "no",
        text: "Common interpretation: 'GPT-5' means the full release, not a sub-variant.",
        startDelay: 220,
        charsPerSec: 40,
      },
      {
        seat: 5,
        model: SEAT_LABELS[4],
        verdict: "no",
        text: "Resolution should be NO. A mini release is not the named model.",
        startDelay: 420,
        charsPerSec: 34,
      },
    ],
  },
  {
    id: "ai-agent",
    caseNum: "№ 24·005",
    shortLabel: "The AI agent's SLA",
    pattern: "AI agent service-level dispute",
    question:
      "An autonomous research agent was contracted to deliver 'high-quality citations from peer-reviewed sources.' It returned 12 citations: 8 from arXiv preprints, 3 from Medium, 1 from a podcast. Did it fulfill the SLA?",
    recommendedMode: "Non-comparative",
    expectedVerdict: "no",
    jurors: [
      {
        seat: 1,
        model: SEAT_LABELS[0],
        verdict: "no",
        text: "arXiv preprints aren't peer-reviewed; Medium and podcasts clearly aren't. SLA failed.",
        startDelay: 320,
        charsPerSec: 38,
      },
      {
        seat: 2,
        model: SEAT_LABELS[1],
        verdict: "no",
        text: "Zero of twelve citations meet 'peer-reviewed.' Material SLA breach.",
        startDelay: 200,
        charsPerSec: 42,
      },
      {
        seat: 3,
        model: SEAT_LABELS[2],
        verdict: "und",
        text: "arXiv could be considered scholarly even if not peer-reviewed. Borderline.",
        startDelay: 580,
        charsPerSec: 30,
      },
      {
        seat: 4,
        model: SEAT_LABELS[3],
        verdict: "no",
        text: "SLA explicitly says 'peer-reviewed.' None of the 12 sources qualify.",
        startDelay: 440,
        charsPerSec: 34,
      },
      {
        seat: 5,
        model: SEAT_LABELS[4],
        verdict: "no",
        text: "Failed. Peer-reviewed is the criterion; preprints and Medium don't meet it.",
        startDelay: 280,
        charsPerSec: 39,
      },
    ],
  },
  {
    id: "tweet",
    caseNum: "№ 24·006",
    shortLabel: "The original tweet",
    pattern: "content authenticity",
    question:
      "A creator claims a 200-word tweet thread is their original work. Detection tools score it 87% likely AI-generated. The author insists they wrote it with light AI assistance for grammar. Is the thread original work?",
    recommendedMode: "Non-comparative",
    expectedVerdict: "und",
    jurors: [
      {
        seat: 1,
        model: SEAT_LABELS[0],
        verdict: "und",
        text: "Detection scores are probabilistic, not definitive. Author's claim is plausible.",
        startDelay: 360,
        charsPerSec: 34,
      },
      {
        seat: 2,
        model: SEAT_LABELS[1],
        verdict: "no",
        text: "87% AI likelihood paired with stylistic uniformity suggests primarily AI authorship.",
        startDelay: 260,
        charsPerSec: 38,
      },
      {
        seat: 3,
        model: SEAT_LABELS[2],
        verdict: "und",
        text: "Insufficient evidence to distinguish 'light assistance' from primary generation.",
        startDelay: 480,
        charsPerSec: 32,
      },
      {
        seat: 4,
        model: SEAT_LABELS[3],
        verdict: "no",
        text: "Detection signal is strong. Original work claim not supported by evidence.",
        startDelay: 320,
        charsPerSec: 36,
      },
      {
        seat: 5,
        model: SEAT_LABELS[4],
        verdict: "und",
        text: "Authorship attribution requires more than a single detection score. Inconclusive.",
        startDelay: 540,
        charsPerSec: 30,
      },
    ],
  },
];

// =================================================================
// THE EQUIVALENCE PRINCIPLE COMPARATORS
// =================================================================
// Three real functions that take the 5 verdicts and produce a final state.
// This is genuinely how GenLayer's EP works conceptually:
//   - strict_eq: all validators must produce identical output
//   - prompt_comparative: validators must agree within a tolerance
//   - prompt_non_comparative: a sixth LLM judges agreement against a rubric
//                            (we simulate this as a supermajority threshold)

export type VerdictTally = {
  yes: number;
  no: number;
  und: number;
  pending: number;
};

export function tallyVerdicts(
  jurorStatuses: ("yes" | "no" | "und" | "deliberating" | "idle")[]
): VerdictTally {
  return jurorStatuses.reduce<VerdictTally>(
    (acc, s) => {
      if (s === "yes") acc.yes += 1;
      else if (s === "no") acc.no += 1;
      else if (s === "und") acc.und += 1;
      else acc.pending += 1;
      return acc;
    },
    { yes: 0, no: 0, und: 0, pending: 0 }
  );
}

export type FinalVerdict = {
  outcome: "accepted" | "rejected" | "undetermined" | "no_consensus";
  voteText: string; // "Accepted (4 / 5)" etc
  reason: string; // teaching layer — explains WHY the EP produced this result
};

// Determine the final verdict given a complete tally and the active mode.
// Returns null while the jury is still deliberating.
export function applyEquivalencePrinciple(
  tally: VerdictTally,
  mode: Mode,
  jurySize: number
): FinalVerdict | null {
  // Still deliberating
  if (tally.pending > 0) return null;

  const total = tally.yes + tally.no + tally.und;

  if (mode === "Strict") {
    // strict_eq: all jurors must produce identical output. Anything else is no_consensus.
    if (tally.yes === total)
      return {
        outcome: "accepted",
        voteText: `Accepted (${total} / ${total})`,
        reason: "Unanimous. Strict equality satisfied.",
      };
    if (tally.no === total)
      return {
        outcome: "rejected",
        voteText: `Rejected (${total} / ${total})`,
        reason: "Unanimous rejection. Strict equality satisfied.",
      };
    return {
      outcome: "no_consensus",
      voteText: `No consensus (${tally.yes}/${tally.no}/${tally.und})`,
      reason:
        "Strict mode requires unanimity. Any disagreement → appeal or rewrite the contract.",
    };
  }

  if (mode === "Comparative") {
    // prompt_comparative: simple majority within tolerance (≥60% same side)
    const threshold = Math.ceil(jurySize * 0.6);
    if (tally.yes >= threshold)
      return {
        outcome: "accepted",
        voteText: `Accepted (${tally.yes} / ${total})`,
        reason: `Majority within tolerance. ${tally.yes} of ${total} agree.`,
      };
    if (tally.no >= threshold)
      return {
        outcome: "rejected",
        voteText: `Rejected (${tally.no} / ${total})`,
        reason: `Majority within tolerance. ${tally.no} of ${total} reject.`,
      };
    return {
      outcome: "no_consensus",
      voteText: `Split (${tally.yes}/${tally.no}/${tally.und})`,
      reason: "Below 60% threshold. Disagreement exceeds tolerance.",
    };
  }

  // Non-comparative: supermajority (≥66%) judged by a rubric.
  // Undetermined votes can swing either way; we treat them as withholding.
  const supermajority = Math.ceil(jurySize * 0.66);
  if (tally.yes >= supermajority)
    return {
      outcome: "accepted",
      voteText: `Accepted (${tally.yes} / ${total})`,
      reason: `Supermajority on rubric. ${tally.yes} of ${total} agree.`,
    };
  if (tally.no >= supermajority)
    return {
      outcome: "rejected",
      voteText: `Rejected (${tally.no} / ${total})`,
      reason: `Supermajority on rubric. ${tally.no} of ${total} reject.`,
    };
  return {
    outcome: "undetermined",
    voteText: `Inconclusive (${tally.yes}/${tally.no}/${tally.und})`,
    reason:
      "No supermajority on the rubric. Appeal doubles the jury for resolution.",
  };
}
