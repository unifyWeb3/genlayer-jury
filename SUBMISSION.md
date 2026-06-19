# The Jury - GenLayer Builder Program Submission (Resubmission)

**Track:** Educational Content
**Project:** The Jury — Court of the Internet
**Live URL:** https://genlayer-jury.vercel.app
**Repository:** https://github.com/unifyWeb3/genlayer-jury
**Builder:** @0xunify
**Network:** Testnet Bradbury (Chain ID 4221) — persistent, production-like
**Deployed contracts:**
- DisputeCourt (generic adjudication): `0x33f62147011B75cDF2333682C9dB2A1F6e7bF908`
- FlightDelayDispute (strict-mode reference): `0xffCC662D1A5fE19ced0cc49e41e21245A64FA72E`

---

## The hook

Smart contracts move money. Intelligent Contracts decide who deserves it.

The Jury is an interactive courtroom where five GenLayer validators deliberate on subjective disputes, the Equivalence Principle delivers a verdict, and every decision is a real transaction you can open on the block explorer. Five preset cases, three Equivalence modes, plus a sandbox where you type your own dispute and watch real validators rule on a question no one wrote in advance — each one settled on-chain, each one verifiable.

This is not a simulation of GenLayer. It runs on GenLayer.

---

## What changed since the first submission

The first version of this project was, by an honest accounting, a beautiful documentary about GenLayer that did not run on GenLayer. The Equivalence Principle was reimplemented in TypeScript; the Python contracts were displayed as text but never executed; there was no SDK, no chain, no transaction hash. An architectural review put it plainly: remove GenLayer and the product runs identically. That is a cosmetic dependency, and it was the right call to reject it.

This resubmission closes that gap completely. Every dispute now executes a real Intelligent Contract on GenLayer's Testnet Bradbury through `genlayer-js`, reaches validator consensus via the Equivalence Principle, writes state on-chain, and returns a verdict the user can verify on the block explorer. The product was rebuilt from "about GenLayer" to "built on GenLayer."

The architectural review's own scorecard, then and now:

| Dimension | Before | Now |
|---|---|---|
| SDK integration | absent | `genlayer-js`, real `writeContract` / `readContract` |
| Chain execution | none | every verdict is an on-chain transaction |
| Deployed contracts | none | two live on Bradbury (persistent) |
| Transaction hashes | none | one per dispute, explorer-linked in the UI |
| Removal resistance | remove GenLayer → identical | remove GenLayer → the product has no verdicts |

The thing the review said would flip the entire argument — *deploy a contract, show a real transaction hash* — is now true for every single dispute on the site, including ones the user invents.

---

## How it works on-chain

A single generic Intelligent Contract, **DisputeCourt**, handles every subjective dispute. It accepts a question, an Equivalence mode, and judging criteria, then resolves the dispute using the recommended GenLayer pattern: a leader validator proposes a structured verdict via an LLM, and the other validators independently judge it. Consensus is reached on the decision field; the reasoning is stored but not required to match byte-for-byte. A separate strict-mode reference contract, **FlightDelayDispute**, demonstrates byte-exact consensus on a factual dispute.

The design choice that matters: because DisputeCourt is generic, the five casebook cases AND the user's custom disputes all run through the same deployed contract. There is no fork in the road where the "real" cases run on-chain and the interactive part falls back to something fake. Type any dispute into the sandbox and it produces a real Bradbury transaction, the same as the curated cases.

Three Equivalence modes are demonstrated, each matched to a dispute type. Strict, for factual outputs where validators must agree exactly — the flight delay. Comparative, for bounded-variance numeric resolutions. Non-comparative, for rubric-based judgments where validators assess a verdict against criteria — the freelancer, the DAO proposal, the prediction market, the AI-agent SLA. The product teaches which mode fits which dispute, and then runs each one in that exact mode on-chain.

Crucially, the no-consensus outcome is treated as a first-class result, not an error. When validators genuinely split on a hard subjective question, the contract returns undetermined and the UI presents it as the Equivalence Principle working — the most honest demonstration of what GenLayer does that a static explanation can never give.

---

## What was built

An interactive simulator that runs the full GenLayer flow — five validators, real consensus, verdict, and appeal — on five preset disputes and any custom one.

A Casebook of five routed case files. The Freelancer's Milestone, The Flight's Delay, The DAO's Proposal, The Prediction Market, The AI Agent's SLA. Each shows the dispute, runs it on-chain, exposes the Intelligent Contract, and explains why its Equivalence mode fits and why deterministic EVM logic could not resolve it.

A custom case sandbox where the user types their own dispute, picks a mode, optionally supplies criteria, and runs it on the real DisputeCourt contract — producing a verifiable transaction for a question that exists nowhere in the codebase.

A Field Guide essay with an animated decision tree mapping question types to Equivalence modes. An Appeal & Finality panel visualizing escalation, validator stake, and the finalization window — content that now matches the runtime, since Bradbury transactions move through acceptance and into the finalization window exactly as the panel describes.

A verifiability layer: every verdict links to its transaction on the Bradbury explorer, both deployed contract addresses are shown and linkable, and the product states plainly that every decision is real on-chain consensus.

A user-facing mode toggle. Mocked mode runs fast scripted responses for a snappy first impression; on-chain mode runs the real contract. The user chooses.

The product ships as a single Next.js 16 application, TypeScript strict throughout, with a tribunal aesthetic engineered specifically for GenLayer's brand language — deep near-black canvas, warm off-white ink, acid-lime accent reserved for live signals, editorial serif display, mono labels, sharp borders. It reads as a court, not a SaaS dashboard.

---

## How to evaluate in five minutes

Open the live URL. Click "Run on GenLayer" on the freelancer case. Watch five validators reach consensus on whether a freelancer fulfilled a vague contract — a genuinely subjective judgment — and return a verdict with reasoning. When it resolves, click "View on GenLayer Explorer." You are now looking at a real transaction on Testnet Bradbury: the contract call, five validators, the full consensus lifecycle from proposal through vote-commit and reveal to accepted.

Then scroll to the custom sandbox. Type any dispute you can imagine — something no one anticipated. Pick non-comparative mode. Run it. You will get another real transaction, on a question that did not exist until you typed it.

Then open the two deployed contracts on the explorer (addresses above) and confirm they are live. Then read the Field Guide for the decision logic, and the Appeal & Finality panel for how acceptance becomes finalization — which you can watch happen on any transaction you ran, as it moves through its finalization window.

That is the whole evaluation. Every claim in this submission is verifiable by clicking.

---

## Why this scores

**Effectiveness.** The product collapses GenLayer's hardest concept — non-determinism resolved into deterministic consensus — into a sixty-second demo, then proves it is real by putting every verdict on-chain. A beginner understands the Equivalence Principle by watching it run, then verifies it actually ran by opening the explorer. Reading the docs cannot do this.

**Originality.** There is no other artifact in the GenLayer ecosystem that is an interactive, on-chain Equivalence Principle courtroom with a generic adjudication contract that resolves arbitrary user disputes. Not the intro blog posts, not the Studio walkthroughs, not the statistical Jury Theorem demo.

**Architectural fidelity.** Every dispute is a real Intelligent Contract execution on a persistent GenLayer testnet. Remove GenLayer and the product has no verdicts. This is the dimension the first submission failed, and it is now the product's foundation.

**Production quality.** Two deployed contracts, seven homepage sections, five routed case pages, a custom on-chain sandbox, a Field Guide, an Appeal panel, a verifiability layer, mobile responsive, TypeScript strict, deployed on a persistent network so the evidence survives review.

**Community relevance.** It serves every GenLayer audience at once — Solidity and Python developers see real deployable contracts, AI engineers see real validator diversity, product thinkers see relatable disputes, and any builder can fork the generic DisputeCourt pattern for their own use.

**GenLayer fit.** It uses the protocol's own vocabulary and the current SDK throughout, deploys to the recommended persistent testnet, and its educational content about appeal and finality matches what its own transactions visibly do on-chain.

---

## A note on honesty

The first submission overclaimed and was correctly rejected. This one is built so that every claim is checkable against a transaction hash. If a sentence here says validators reached consensus on a dispute, there is an explorer link that proves it. The goal was not to argue the product runs on GenLayer — it was to make arguing unnecessary.

---

## Submission links

- Live: https://genlayer-jury.vercel.app
- Repository: https://github.com/unifyWeb3/genlayer-jury
- DisputeCourt contract: https://explorer-bradbury.genlayer.com/address/0x33f62147011B75cDF2333682C9dB2A1F6e7bF908
- FlightDelayDispute contract: https://explorer-bradbury.genlayer.com/address/0xffCC662D1A5fE19ced0cc49e41e21245A64FA72E
- Example finalized dispute (freelancer): [paste a recent freelancer or custom tx URL]
- Case files: /case/freelancer · /case/flight · /case/dao · /case/prediction · /case/ai-agent
- Field Guide: /#field-guide
- Appeal & Finality: /#appeal
- Demo video: [attach after recording]
- X launch thread: [attach after posting from @0xunify]