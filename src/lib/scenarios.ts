export type Mode = "Strict" | "Comparative" | "Non-comparative";
export type Verdict = "yes" | "no" | "und";

export type Juror = {
  seat: number;
  model: string;
  verdict: Verdict;
  text: string;
  startDelay: number;
  charsPerSec: number;
};

export type ContractData = {
  python: string;
  whyMode: string;
  whyNotEth: string;
  annotations: Array<{
    label: string;
    detail: string;
  }>;
};

export type Scenario = {
  id: string;
  caseNum: string;
  shortLabel: string;
  pattern: string;
  question: string;
  recommendedMode: Mode;
  expectedVerdict: Verdict;
  dispute?: string;
  jurors: Juror[];
  contract: ContractData;
};

const SEAT_LABELS = [
  "GPT-OSS 120B",
  "Llama 3.3",
  "Gemma 4 31B",
  "Dolphin Mistral",
  "Qwen 3 80B",
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
    dispute:
      "The contractor delivered 8 slides instead of 10, three days after the agreed deadline, with no prior notice or renegotiation. The client refuses to release the $800 payment.",
    contract: {
      python: `from genlayer import gl

class FreelancerMilestone:
    slides_required: int
    deadline: str

    def __init__(self) -> None:
        self.slides_required = 10
        self.deadline = "Friday"

    @gl.public.write
    def evaluate(self, slides: int, day: str) -> bool:
        rubric = (
            f"Contract: {self.slides_required} slides by {self.deadline}. "
            f"Delivered: {slides} slides on {day}. "
            "Did the freelancer materially fulfill the contract? "
            "Answer yes or no only."
        )
        result = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(rubric),
            comparative=False,
        )
        return "yes" in result.lower()`,
      whyMode:
        "Non-comparative because fulfillment is a judgment call, not a number. Two validators may phrase 'material breach' differently but still reach the same conclusion — a rubric lets the sixth LLM judge whether they actually agree.",
      whyNotEth:
        "Ethereum can only evaluate on-chain data. It cannot reason about whether 8 slides substantially fulfills a 10-slide contract — that requires language understanding. A Solidity contract would need an oracle that reduces subjective fulfillment to a binary, which defeats the purpose.",
      annotations: [
        {
          label: "State pins the promise",
          detail:
            "The contract stores the agreed deliverable and deadline so every validator judges against the same terms.",
        },
        {
          label: "Rubric carries the dispute",
          detail:
            "The prompt preserves the subjective phrase 'materially fulfill' instead of pretending the answer is a simple counter check.",
        },
        {
          label: "Non-comparative EP fits",
          detail:
            "Validators may explain breach differently, but the equivalence check asks whether their judgments resolve to the same yes/no outcome.",
        },
      ],
    },
    jurors: [
      { seat: 1, model: SEAT_LABELS[0], verdict: "no", text: "Two slides short and three days late constitutes material breach.", startDelay: 320, charsPerSec: 42 },
      { seat: 2, model: SEAT_LABELS[1], verdict: "no", text: "Both deliverable count and deadline missed without prior negotiation.", startDelay: 180, charsPerSec: 38 },
      { seat: 3, model: SEAT_LABELS[2], verdict: "und", text: "Insufficient context on whether 8 slides covered the agreed scope.", startDelay: 540, charsPerSec: 35 },
      { seat: 4, model: SEAT_LABELS[3], verdict: "no", text: "Material breach: late and incomplete. Partial credit not justified.", startDelay: 720, charsPerSec: 32 },
      { seat: 5, model: SEAT_LABELS[4], verdict: "no", text: "Failed on two of two specified terms. Strict interpretation required.", startDelay: 240, charsPerSec: 40 },
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
    dispute:
      "A parametric insurance policy pays out automatically when flight AA42 is delayed more than two hours. The question is purely factual — there is no interpretation, only data.",
    contract: {
      python: `from genlayer import gl

class ParametricFlightDelay:
    flight_id: str
    threshold_minutes: int

    def __init__(self) -> None:
        self.flight_id = "AA42"
        self.threshold_minutes = 120

    @gl.public.write
    def evaluate(self) -> bool:
        prompt = (
            f"Fetch the actual arrival delay in minutes for "
            f"flight {self.flight_id} today. Return only the integer."
        )
        delay_str = gl.eq_principle.strict_eq(
            lambda: gl.nondet.exec_prompt(prompt)
        )
        return int(delay_str.strip()) > self.threshold_minutes`,
      whyMode:
        "Strict because the answer is a number. Every validator should fetch the same public flight tracker and return the same delay in minutes. Any output difference is a data error, not a legitimate interpretation gap.",
      whyNotEth:
        "Ethereum cannot reach out to flight tracker APIs. A Chainlink oracle could fetch the data, but it introduces a single point of trust. GenLayer validators each query the live web independently — unanimity among them is the proof.",
      annotations: [
        {
          label: "Threshold is deterministic",
          detail:
            "The policy term is crisp: more than 120 minutes late. No moral or contextual interpretation is needed.",
        },
        {
          label: "Nondeterminism is data access",
          detail:
            "The LLM call exists to fetch or interpret external flight data, not to arbitrate meaning.",
        },
        {
          label: "Strict EP requires identity",
          detail:
            "If validators disagree on the minute count, the system treats it as a data failure rather than acceptable semantic variance.",
        },
      ],
    },
    jurors: [
      { seat: 1, model: SEAT_LABELS[0], verdict: "yes", text: "Delay of 2h 47m exceeds 2-hour threshold. Confirmed.", startDelay: 160, charsPerSec: 45 },
      { seat: 2, model: SEAT_LABELS[1], verdict: "yes", text: "Yes. 2:47 > 2:00. Strict numeric comparison.", startDelay: 240, charsPerSec: 50 },
      { seat: 3, model: SEAT_LABELS[2], verdict: "yes", text: "Threshold breached by 47 minutes.", startDelay: 120, charsPerSec: 48 },
      { seat: 4, model: SEAT_LABELS[3], verdict: "yes", text: "Confirmed: actual delay 2h47m vs threshold 2h00m.", startDelay: 380, charsPerSec: 42 },
      { seat: 5, model: SEAT_LABELS[4], verdict: "yes", text: "Yes. Source: live flight tracker. Delta = +47min.", startDelay: 200, charsPerSec: 46 },
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
    dispute:
      "A governance proposal seeks $50K from the community treasury to sponsor a music festival, arguing it builds brand awareness and 'community growth.' The charter restricts spending to 'protocol development and community growth.'",
    contract: {
      python: `from genlayer import gl

class DaoCharterReview:
    charter_scope: str

    def __init__(self) -> None:
        self.charter_scope = "protocol development and community growth"

    @gl.public.write
    def evaluate(self, proposal: str) -> bool:
        rubric = (
            f"DAO charter restricts spending to: {self.charter_scope}. "
            f"Proposal: {proposal}. "
            "Does this fall within the charter's intent? "
            "Answer yes or no only."
        )
        result = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(rubric),
            comparative=False,
        )
        return "yes" in result.lower()`,
      whyMode:
        "Non-comparative because charter interpretation is inherently subjective. Multiple validators may reach the same conclusion for different reasons — the rubric (the charter text itself) anchors the judgment.",
      whyNotEth:
        "Ethereum smart contracts operate on deterministic logic. There is no opcode for 'violates the spirit of the charter.' A Solidity contract can enforce hard spending caps, but it cannot reason about intent — which is exactly what this dispute requires.",
      annotations: [
        {
          label: "Charter text is the source of law",
          detail:
            "The contract does not invent a new rule; it asks validators to apply the DAO's own scope language.",
        },
        {
          label: "Intent is the hard part",
          detail:
            "A festival could be argued as community growth, so the validator must reason about how far that phrase can stretch.",
        },
        {
          label: "Rubric beats oracle voting",
          detail:
            "The Equivalence Principle lets multiple validators interpret the same charter instead of trusting one human resolver.",
        },
      ],
    },
    jurors: [
      { seat: 1, model: SEAT_LABELS[0], verdict: "no", text: "Music festival sponsorship is brand marketing, not protocol or community growth in the chartered sense.", startDelay: 380, charsPerSec: 36 },
      { seat: 2, model: SEAT_LABELS[1], verdict: "no", text: "Falls outside 'protocol development.' 'Community growth' is stretched beyond chartered intent.", startDelay: 260, charsPerSec: 38 },
      { seat: 3, model: SEAT_LABELS[2], verdict: "und", text: "Could qualify as community growth depending on attendee composition. Ambiguous.", startDelay: 480, charsPerSec: 34 },
      { seat: 4, model: SEAT_LABELS[3], verdict: "no", text: "Sponsorship spend doesn't develop the protocol. Community growth claim is tenuous.", startDelay: 620, charsPerSec: 30 },
      { seat: 5, model: SEAT_LABELS[4], verdict: "no", text: "Outside chartered scope. Requires charter amendment, not interpretation.", startDelay: 340, charsPerSec: 37 },
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
    dispute:
      "The market asked whether 'GPT-5' would ship before July. OpenAI released 'GPT-5-mini' on June 30. Whether a variant satisfies the 'GPT-5' criterion is the resolution dispute.",
    contract: {
      python: `from genlayer import gl

class PredictionResolution:
    question: str
    cutoff_date: str

    def __init__(self) -> None:
        self.question = "Will GPT-5 ship before July 2026?"
        self.cutoff_date = "2026-06-30"

    @gl.public.write
    def resolve(self) -> bool:
        news = gl.nondet.exec_prompt(
            f"News about GPT-5 releases as of {self.cutoff_date}."
        )
        rubric = (
            f"Market question: {self.question} "
            f"Evidence: {news} "
            "Has GPT-5 (not variants) shipped? Answer yes or no only."
        )
        result = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(rubric),
            comparative=False,
        )
        return "yes" in result.lower()`,
      whyMode:
        "Non-comparative because the resolution criteria has inherent ambiguity — 'GPT-5' vs 'GPT-5-mini.' Validators must apply judgment about what the market intended when the question was written. A rubric codifies that intent.",
      whyNotEth:
        "Ethereum prediction markets require a designated oracle or human arbiter for ambiguous resolutions. GenLayer replaces the arbiter with a supermajority of LLM validators, removing the single trusted party entirely.",
      annotations: [
        {
          label: "Evidence is gathered first",
          detail:
            "The market resolution depends on public release facts as of the cutoff, so validators inspect evidence before judging.",
        },
        {
          label: "The ambiguity is semantic",
          detail:
            "The core question is whether 'GPT-5-mini' satisfies the market's plain-language phrase 'GPT-5'.",
        },
        {
          label: "Non-comparative EP protects intent",
          detail:
            "Validators compare their conclusion to the market's intended meaning, not to a brittle string match on product names.",
        },
      ],
    },
    jurors: [
      { seat: 1, model: SEAT_LABELS[0], verdict: "no", text: "'GPT-5-mini' is a variant, not GPT-5. The market specified the full model.", startDelay: 280, charsPerSec: 38 },
      { seat: 2, model: SEAT_LABELS[1], verdict: "no", text: "Mini variants don't satisfy a 'GPT-5' resolution criterion in common usage.", startDelay: 360, charsPerSec: 36 },
      { seat: 3, model: SEAT_LABELS[2], verdict: "und", text: "Depends on whether the market spec defines 'GPT-5' as the family or the flagship.", startDelay: 540, charsPerSec: 32 },
      { seat: 4, model: SEAT_LABELS[3], verdict: "no", text: "Common interpretation: 'GPT-5' means the full release, not a sub-variant.", startDelay: 220, charsPerSec: 40 },
      { seat: 5, model: SEAT_LABELS[4], verdict: "no", text: "Resolution should be NO. A mini release is not the named model.", startDelay: 420, charsPerSec: 34 },
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
    dispute:
      "An automated research agent returned 12 citations: arXiv preprints, Medium posts, and a podcast transcript. The SLA required 'peer-reviewed sources.' Whether any of the 12 qualify is the question.",
    contract: {
      python: `from genlayer import gl

class AgentSlaAudit:
    sla_standard: str

    def __init__(self) -> None:
        self.sla_standard = "peer-reviewed academic sources only"

    @gl.public.write
    def evaluate(self, citations: list) -> bool:
        rubric = (
            f"SLA requires: {self.sla_standard}. "
            f"Citations provided: {citations}. "
            "Do ALL citations meet the SLA requirement? "
            "Answer yes or no only."
        )
        result = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(rubric),
            comparative=False,
        )
        return "yes" in result.lower()`,
      whyMode:
        "Non-comparative because 'peer-reviewed' requires definitional judgment — arXiv, for instance, is not peer-reviewed by traditional standards but is widely considered scholarly. Validators apply the rubric against the SLA's intent.",
      whyNotEth:
        "Ethereum cannot verify citation quality. An oracle would need to check each source against a curated allow-list, which is brittle and cannot adapt to new publication venues. GenLayer validators reason about quality directly.",
      annotations: [
        {
          label: "SLA standard is explicit",
          detail:
            "The contract turns 'high-quality citations' into a stricter audit target: peer-reviewed academic sources only.",
        },
        {
          label: "Source quality needs judgment",
          detail:
            "arXiv, Medium, and podcasts each require contextual classification rather than a simple URL lookup.",
        },
        {
          label: "The all-citations test is strict",
          detail:
            "The validator must decide whether every citation satisfies the SLA, making partial compliance insufficient.",
        },
      ],
    },
    jurors: [
      { seat: 1, model: SEAT_LABELS[0], verdict: "no", text: "arXiv preprints aren't peer-reviewed; Medium and podcasts clearly aren't. SLA failed.", startDelay: 320, charsPerSec: 38 },
      { seat: 2, model: SEAT_LABELS[1], verdict: "no", text: "Zero of twelve citations meet 'peer-reviewed.' Material SLA breach.", startDelay: 200, charsPerSec: 42 },
      { seat: 3, model: SEAT_LABELS[2], verdict: "und", text: "arXiv could be considered scholarly even if not peer-reviewed. Borderline.", startDelay: 580, charsPerSec: 30 },
      { seat: 4, model: SEAT_LABELS[3], verdict: "no", text: "SLA explicitly says 'peer-reviewed.' None of the 12 sources qualify.", startDelay: 440, charsPerSec: 34 },
      { seat: 5, model: SEAT_LABELS[4], verdict: "no", text: "Failed. Peer-reviewed is the criterion; preprints and Medium don't meet it.", startDelay: 280, charsPerSec: 39 },
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
    dispute:
      "An AI content detection tool scored the 200-word thread at 87% likely AI-generated. The author claims they wrote it with light grammar assistance. Neither claim is conclusive without interpretation.",
    contract: {
      python: `from genlayer import gl

class ContentOriginality:
    detection_ceiling: float

    def __init__(self) -> None:
        self.detection_ceiling = 0.8

    @gl.public.write
    def evaluate(self, content: str, ai_score: float, claim: str) -> bool:
        rubric = (
            f"Content snippet: {content[:200]} "
            f"AI-detection score: {ai_score:.0%}. "
            f"Author claim: {claim}. "
            "Is this plausibly original human work? "
            "Answer yes or no only."
        )
        result = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(rubric),
            comparative=False,
        )
        return "yes" in result.lower()`,
      whyMode:
        "Non-comparative because authorship intent is inconclusive from detection scores alone. The rubric acknowledges that scores are probabilistic, and validators must weigh evidence rather than apply an arithmetic threshold.",
      whyNotEth:
        "Ethereum has no concept of 'plausibly human-authored.' A Solidity contract could check a score against a threshold, but the threshold is arbitrary and ignores context. This dispute needs interpretation, not arithmetic.",
      annotations: [
        {
          label: "Detector score is evidence",
          detail:
            "The score influences the judgment, but it is not treated as a deterministic proof of authorship.",
        },
        {
          label: "Author claim remains relevant",
          detail:
            "The prompt keeps the author's explanation in view so validators weigh intent and assistance level.",
        },
        {
          label: "Undetermined is allowed",
          detail:
            "The contract can refuse overconfidence when probabilistic evidence does not settle originality.",
        },
      ],
    },
    jurors: [
      { seat: 1, model: SEAT_LABELS[0], verdict: "und", text: "Detection scores are probabilistic, not definitive. Author's claim is plausible.", startDelay: 360, charsPerSec: 34 },
      { seat: 2, model: SEAT_LABELS[1], verdict: "no", text: "87% AI likelihood paired with stylistic uniformity suggests primarily AI authorship.", startDelay: 260, charsPerSec: 38 },
      { seat: 3, model: SEAT_LABELS[2], verdict: "und", text: "Insufficient evidence to distinguish 'light assistance' from primary generation.", startDelay: 480, charsPerSec: 32 },
      { seat: 4, model: SEAT_LABELS[3], verdict: "no", text: "Detection signal is strong. Original work claim not supported by evidence.", startDelay: 320, charsPerSec: 36 },
      { seat: 5, model: SEAT_LABELS[4], verdict: "und", text: "Authorship attribution requires more than a single detection score. Inconclusive.", startDelay: 540, charsPerSec: 30 },
    ],
  },
  {
    id: "custom",
    caseNum: "№ 24·???",
    shortLabel: "Write your own case",
    pattern: "custom sandbox",
    question: "",
    recommendedMode: "Non-comparative",
    expectedVerdict: "und",
    jurors: [
      { seat: 1, model: SEAT_LABELS[0], verdict: "und", text: "Custom case received. Without author rubric, defaulting to undetermined.", startDelay: 200, charsPerSec: 38 },
      { seat: 2, model: SEAT_LABELS[1], verdict: "und", text: "Sandbox mode — no scenario context. Verdict withheld.", startDelay: 320, charsPerSec: 36 },
      { seat: 3, model: SEAT_LABELS[2], verdict: "und", text: "Live mode required for real deliberation on custom cases.", startDelay: 180, charsPerSec: 40 },
      { seat: 4, model: SEAT_LABELS[3], verdict: "und", text: "Validators withhold judgment on cases without rubric.", startDelay: 420, charsPerSec: 34 },
      { seat: 5, model: SEAT_LABELS[4], verdict: "und", text: "Toggle to live mode for actual LLM deliberation.", startDelay: 260, charsPerSec: 38 },
    ],
    contract: { python: "", whyMode: "", whyNotEth: "", annotations: [] },
  },
];

// =================================================================
// EQUIVALENCE PRINCIPLE COMPARATORS
// =================================================================

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
  voteText: string;
  reason: string;
};

export function applyEquivalencePrinciple(
  tally: VerdictTally,
  mode: Mode,
  jurySize: number,
  tier: 1 | 2 = 1
): FinalVerdict | null {
  if (tally.pending > 0) return null;

  const total = tally.yes + tally.no + tally.und;
  const tierLabel = tier === 2 ? "Tier 2 verdict" : "Equivalence Principle";

  if (mode === "Strict") {
    if (tally.yes === total)
      return { outcome: "accepted", voteText: `Accepted (${total} / ${total})`, reason: "Unanimous. Strict equality satisfied." };
    if (tally.no === total)
      return { outcome: "rejected", voteText: `Rejected (${total} / ${total})`, reason: "Unanimous rejection. Strict equality satisfied." };
    return {
      outcome: "no_consensus",
      voteText: `No consensus (${tally.yes}/${tally.no}/${tally.und})`,
      reason: "Strict mode requires unanimity. Any disagreement → appeal or rewrite the contract.",
    };
  }

  if (mode === "Comparative") {
    const threshold = Math.ceil(jurySize * 0.6);
    if (tally.yes >= threshold)
      return { outcome: "accepted", voteText: `Accepted (${tally.yes} / ${total})`, reason: `Majority within tolerance. ${tally.yes} of ${total} agree.` };
    if (tally.no >= threshold)
      return { outcome: "rejected", voteText: `Rejected (${tally.no} / ${total})`, reason: `Majority within tolerance. ${tally.no} of ${total} reject.` };
    return { outcome: "no_consensus", voteText: `Split (${tally.yes}/${tally.no}/${tally.und})`, reason: "Below 60% threshold. Disagreement exceeds tolerance." };
  }

  // Non-comparative: tier 2 requires ≥9/11, tier 1 uses ≥66%
  const supermajority =
    tier === 2 ? Math.round(jurySize * (9 / 11)) : Math.ceil(jurySize * 0.66);

  if (tally.yes >= supermajority)
    return { outcome: "accepted", voteText: `Accepted (${tally.yes} / ${total})`, reason: `Supermajority on rubric. ${tally.yes} of ${total} agree.` };
  if (tally.no >= supermajority)
    return { outcome: "rejected", voteText: `Rejected (${tally.no} / ${total})`, reason: `Supermajority on rubric. ${tally.no} of ${total} reject.` };
  return {
    outcome: "undetermined",
    voteText: `Inconclusive (${tally.yes}/${tally.no}/${tally.und})`,
    reason:
      tier === 2
        ? `No ${supermajority}/11 supermajority reached. Verdict stands as inconclusive.`
        : "No supermajority on the rubric. Appeal doubles the jury for resolution.",
  };

  // suppress unused variable warning
  void tierLabel;
}
