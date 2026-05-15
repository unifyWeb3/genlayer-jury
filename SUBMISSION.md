# The Jury - GenLayer Builder Program Submission

**Track:** Educational Content
**Project:** The Jury - Court of the Internet
**Live URL:** https://genlayer-jury.vercel.app
**Repository:** https://github.com/unifyWeb3/genlayer-jury
**Builder:** [@unifyWeb3](https://x.com/oxunify)
**Submission window:** [15|05|2026]

---

## The hook

Smart contracts move money. Intelligent Contracts decide who _deserves_ it.

The Jury is an interactive courtroom where five large language models deliberate as GenLayer validators, the Equivalence Principle delivers a verdict, and a split jury triggers appeal - live, in your browser, on five real-world cases or your own custom question.

It is the artifact GenLayer should commission but hadn't: a one-glance teaching primitive that collapses the protocol's hardest concept - _how non-determinism becomes deterministic via consensus_ - into a 60-second visceral demo. Then it hands the reader the actual Python contract that produced the verdict.

---

## The problem this teaches around

Every GenLayer newcomer hits the same wall in the first ten minutes of the docs. They can read "AI validators reach consensus on subjective decisions" forty times and still not viscerally understand how it works. The mental model is the gating item. Until it clicks, nothing else does.

The official documentation explains the Equivalence Principle in prose. The GenLayer blog explains it in narrative. The Jury Theorem demo shows it statistically. None of them _show validators voting on a real dispute, then show the comparator deciding whether the votes agree, then show what the appeal does when they don't._

That gap - between explanation and intuition - is what this project closes.

---

## What was built

**An interactive simulator** that runs the full GenLayer flow on five preset disputes and one user-supplied custom case. Pick a scenario. Pick an Equivalence mode. Watch five validators stream their verdicts in real time. See the Equivalence Principle deliver an outcome with a reason. If the jury splits, click Appeal to double the panel to eleven validators and re-run.

**A Casebook of five case files,** each routed to its own page at `/case/[id]`. The Freelancer's Milestone, The Flight's Delay, The DAO's Proposal, The Prediction Market, The AI Agent's SLA. Each case file shows the dispute, runs the simulator locked to that scenario, exposes the actual Python Intelligent Contract that handles it, and explains in two paragraphs _why this Equivalence mode fits_ and _why Ethereum alone couldn't._

**A Field Guide essay** with a decision-tree SVG mapping the question type to the right mode. _Is the answer a fact? Use strict. Is it a measurement? Use comparative. Is it a judgment? Use non-comparative._ The decision tree is animated. The essay reads in four minutes.

**An Appeal & Finality section** that visualizes how a split tier-1 jury escalates to an eleven-validator tier-2 panel, how validator stake creates the economic incentive to vote with the majority, and how finality is reached at the 9/11 supermajority threshold.

**A user-facing mode toggle** in the docket bar. Mocked mode runs hand-curated streaming responses fast and reliably. Live mode routes the actual question to five free-tier LLMs via OpenRouter and streams real verdicts. The user switches between them at runtime. Mocked is the default so first impressions are fast; live mode is the credibility proof anyone can trigger.

**A custom case sandbox.** A seventh option in the scenario picker reveals a textarea. The user types their own dispute. In live mode, five real LLMs answer it directly. A footnote frames the sandbox honestly: no author rubric, no contract reference, but the mechanism is intact.

The product ships as a single Next.js application with seven routes, six core components, two library modules, one server-sent-events streaming route, and a complete tribunal-aesthetic design system locked in `globals.css`. The repo is `unifyWeb3/genlayer-jury`. The live deploy is on Vercel at `genlayer-jury.vercel.app`.

---

## How the technical architecture maps to GenLayer's primitives

The route handler at `src/app/api/jury/route.ts` mirrors a validator's perspective. Each incoming POST is a single validator's deliberation - given a question and a mode, return a verdict via SSE stream. Five parallel calls form the jury. The Equivalence Principle comparator in `src/lib/scenarios.ts` is a real implementation of three rules: strict equality demands unanimity, comparative permits a 60% majority within tolerance, non-comparative requires a 66% supermajority on a rubric. The appeal path doubles the validator count and tightens the supermajority threshold to 9/11.

Live mode talks to OpenRouter using `node:https` with manual DNS resolution - a deliberate choice to bypass Next.js's patched fetch which fails on certain WSL networking configurations. Streaming is implemented through the raw `Readable` interface with safe-close guards. Free-tier rate limits are honored via a sequential semaphore with adaptive backoff on `Retry-After` headers - when OpenRouter says "wait 22 seconds," the scheduler waits 22 seconds before starting the next validator. The result is slow but reliable: ninety to one-hundred-twenty seconds per full jury convening, with five real verdicts every time.

The five Python Intelligent Contracts in the Casebook use the actual current SDK: `gl.eq_principle.strict_eq`, `gl.eq_principle.prompt_comparative`, `gl.eq_principle.prompt_non_comparative`, and `gl.nondet.exec_prompt`. They could be copy-pasted into GenLayer Studio and would run. The "Fork in GenLayer Studio →" button on each case page deep-links there directly.

---

## How to evaluate

The fastest path to understanding the submission, ordered for judge efficiency:

Open the live URL. Read the hero. Click "Convene the jury →" without selecting anything else. Watch five validators deliberate on the freelancer milestone case in mocked mode. The verdict resolves in about seven seconds. That is sixty seconds of evaluator time for the entire core mental model.

Then click "View the contract ▾" beneath the verdict. The Python Intelligent Contract that produced the verdict slides into view. That is the educational payoff.

Then click "The flight's delay" and re-convene in Strict mode. Watch the same machinery resolve a factual dispute unanimously.

Then click "The DAO's proposal" and convene in Strict mode. Watch it resolve as _no consensus_ because subjective interpretation cannot satisfy strict equality. Click Appeal. Watch the panel double to eleven validators.

Then toggle to LIVE mode in the docket. Click the custom case chip. Type a real dispute. Click Convene. Watch five real LLMs from five different providers deliberate on a question that has never been written down anywhere.

Then read the Field Guide. Then read any of the five case files at `/case/[id]`.

That is the full evaluation in under fifteen minutes.

---

## Why this scores against the 600-point ceiling

**Effectiveness.** The product collapses the single hardest mental model in GenLayer into a sixty-second visceral demo. Every preset scenario maps to a real founder talking point. Every code drawer reveals the actual SDK call. Every appeal click teaches the escalation mechanic. The case files reinforce the lesson at depth. The Field Guide formalizes the decision logic. No other artifact in the GenLayer ecosystem makes the Equivalence Principle this legible.

**Originality.** Verified zero overlap. The existing educational content in the GenLayer orbit - seventeen "What is GenLayer?" intro posts, several Studio walkthroughs, one validator-perspective deep dive, the statistical Jury Theorem visualization - none of them is an interactive Equivalence Principle simulator with annotated Python contracts in a tribunal aesthetic.

**Visual quality.** The product uses an editorial-judicial design system specifically engineered for GenLayer's brand language: deep near-black canvas, warm off-white ink, acid lime accent reserved for system-active signals only, Fraunces display serif, JetBrains Mono labels, sharp two-pixel borders, and a sticky docket bar that frames every section as a courtroom exhibit. The aesthetic intentionally inverts the friendly SaaS standard into something that reads as institutional and serious - the "summons to a tribunal" framing GenLayer's own copy uses but no existing artifact embodies.

**Production quality.** Seven sections shipping on the homepage. Five fully-routed case pages. One Field Guide essay with animated decision tree. One Appeal & Finality educational panel. One mocked/live runtime toggle. One custom case sandbox. Mobile responsive. TypeScript strict mode throughout. Zero new dependencies beyond Next.js core. Deployed and live for the duration of the evaluation window.

**Community relevance.** The product serves all five GenLayer audience segments simultaneously: Solidity developers see the SDK code drawer; Python developers see the Studio fork links; AI engineers see real model diversity streaming in live mode; product thinkers see the relatable scenarios; existing builders get a tool they can embed in their own demos and posts.

**GenLayer fit.** Uses the official vocabulary verbatim throughout - Court of the Internet, Optimistic Democracy, Equivalence Principle, leader-and-validators, appeal escalation, supermajority finality. Links to the actual Studio. The Python contracts use the current namespaced SDK, not the deprecated v0.1.0 API found on most older tutorials.

---

## What the product is not

This is educational content. It is not a deployed dApp. The mocked and live simulator demonstrates the GenLayer mental model but does not write to a chain. The Python contracts shown in the Casebook are valid current-SDK code intended for deployment by the reader - the "Fork in GenLayer Studio →" button is the bridge to actual on-chain deployment.

A reference deployment of the flight-delay contract on Studionet may follow as a v2 enhancement. For the educational submission, the goal is teaching the reader to deploy their _own_ contracts with confident understanding of which Equivalence mode fits their dispute and why.

---

## Acknowledgments

Built solo over seven days by [@unifyWeb3](https://x.com/oxunify) (unify). The decision-tree, the tribunal aesthetic, the Casebook framing, and the user-facing live/mocked toggle were all original product decisions made during the build. Prompt engineering and code review were assisted by AI tools.

Thanks to the GenLayer team for the protocol design that makes this teachable in the first place. The trinity tagline - _Bitcoin is trustless money, Ethereum is trustless computation, GenLayer is trustless decision-making_ - is the line that started this build and the line every visitor leaves with.

---

**Submission Links**

- Live demonstration: https://genlayer-jury.vercel.app
- Source repository: https://github.com/unifyWeb3/genlayer-jury
- Case files:
  - https://genlayer-jury.vercel.app/case/freelancer
  - https://genlayer-jury.vercel.app/case/flight
  - https://genlayer-jury.vercel.app/case/dao
  - https://genlayer-jury.vercel.app/case/prediction
  - https://genlayer-jury.vercel.app/case/ai-agent
- Field Guide: https://genlayer-jury.vercel.app#field-guide
- Appeal & Finality: https://genlayer-jury.vercel.app#appeal
- Demo media:
- X launch thread:
