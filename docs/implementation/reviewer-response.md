# The Jury v2 — Response to GenLayer Review

> This document explains the architectural changes made after the "More information requested" review and demonstrates that The Jury now performs all authoritative subjective reasoning inside GenLayer Intelligent Contracts — not in an external LLM. Every claim below is verifiable against a deployed contract, a transaction hash, or a file in this repository.

**Network:** Testnet Bradbury (Chain ID 4221)
**v2 contract:** [`0x2EA4313E7c945B7D74Cf0eE1785B94583232d95a`](https://explorer-bradbury.genlayer.com/address/0x2EA4313E7c945B7D74Cf0eE1785B94583232d95a)
**Live URL:** https://genlayer-jury.vercel.app

---

## Table of Contents

1. [Original Review Feedback](#1-original-review-feedback)
2. [Executive Summary](#2-executive-summary)
3. [Before vs After](#3-before-vs-after)
4. [Updated Architecture](#4-updated-architecture)
5. [Review Items Addressed](#5-review-items-addressed)
6. [Evidence Pipeline](#6-evidence-pipeline)
7. [Final Case Dossier](#7-final-case-dossier)
8. [Live Deployment](#8-live-deployment)
9. [End-to-End Validation](#9-end-to-end-validation)
10. [Repository Changes](#10-repository-changes)
11. [Remaining Work](#11-remaining-work)
12. [Conclusion](#12-conclusion)

---

## 1. Original Review Feedback

The reviewer (Gen. Dave) flagged the previous submission with **"More information requested"**:

> "Your project isn't using GenLayer contracts... it's using OpenRouter for the AI reasoning. So please use the GenLayer contract for reasoning."

The review carried two further asks:

1. Each Equivalence mode should select its **corresponding adjudication principle** in the contract.
2. Evidence should be handled **contract-side** — retrieved and processed by validators, not supplied pre-digested by the client.

### Status

**✅ Implemented.** Every requested architectural change is complete, deployed, and demonstrated by a finalized on-chain dispute (see [Section 9](#9-end-to-end-validation)).

---

## 2. Executive Summary

The Jury v2 moves all authoritative reasoning into a GenLayer Intelligent Contract, **DisputeCourt v2** ([`contracts/dispute_court_v2.py`](../../contracts/dispute_court_v2.py)), live on Testnet Bradbury. OpenRouter no longer determines any verdict. The official judgment for a dispute is produced entirely on-chain: validators independently **fetch the evidence themselves** via `gl.nondet.web.render`, sanitize it against prompt injection, hash it for provenance, reason over it with `gl.nondet.exec_prompt`, and reach consensus through the adjudication principle selected by the dispute's mode. The result is stored in contract state and read back through a clean `get_verdict` view — the UI is a viewer of on-chain data, never a generator of verdicts.

The previous multi-model panel still exists, but only as a clearly-labeled local **"Reasoning Preview"** — an educational visualization that never writes state, never produces the official verdict, and carries a permanent disclaimer pointing to the on-chain path. The primary call-to-action everywhere is **Run on GenLayer**.

Remove GenLayer from this product and there are no verdicts.

---

## 3. Before vs After

| Dimension | v1 (as reviewed) | v2 (this response) |
|---|---|---|
| Authoritative reasoning | OpenRouter multi-model panel in the client | `gl.nondet.exec_prompt` executed by GenLayer validators inside the contract |
| Who reasons | One client-side process | Leader + validators, each independently |
| Evidence | Described in the prompt by the user | Fetched by validators themselves via `gl.nondet.web.render`, sanitized, hashed on-chain |
| Mode → principle | Modes were UI concepts | Each mode selects its adjudication principle in contract code (see [Section 5.3](#53-each-mode-selects-its-corresponding-adjudication-principle)) |
| Verdict retrieval | Streamed LLM output | `get_verdict()` contract view (never receipt parsing) |
| Audit trail | Tx hash only | Final Case Dossier: evidence hashes, evidence summary, reasoning, consensus signal, why-consensus explainer, explorer link |
| Role of OpenRouter | Produced the displayed verdict | Educational "Reasoning Preview" only — non-authoritative, labeled, never writes state |

---

## 4. Updated Architecture

The system boundary is explicit: **everything before GenLayer consensus prepares evidence; consensus performs exactly one subjective judgment; everything after consensus is deterministic state transition.**

```
Reasoning Preview (local, educational, never authoritative)
        │
        ▼
Create Case ─► Attach Evidence URLs (≤3, https only)
        │
        ▼
submit_and_resolve()                      ── deterministic validation:
        │                                    id unused · mode valid · https
        ▼                                    enforced · duplicates removed
Validators fetch evidence themselves      ── gl.nondet.web.render(mode="text")
        │                                    each validator fetches independently
        ▼
Evidence sanitization                     ── control chars stripped, prompt-
        │                                    injection tokens → "[filtered]",
        ▼                                    3,000 chars/source, ~9,000 total
Evidence hashing                          ── sha256 per sanitized source
        │
        ▼
GenLayer consensus                        ── adjudication principle selected
        │                                    by the dispute's mode
        ▼
Deterministic settlement                  ── verdict/reasoning/hashes stored
        │                                    in contract state (TreeMap)
        ▼
Final Case Dossier                        ── read via get_verdict() view
```

Two design rules follow from GenLayer's own stability guidance:

- **Consensus is on decision labels, never on raw fetched bytes.** Leader and validators fetch the same URL independently, and live pages differ between fetches (timestamps, counters, ads). The contract therefore never compares page content byte-for-byte; each party reasons over its own fetch and consensus is reached on the verdict decision fields.
- **Deterministic logic stays deterministic.** Input validation, dedup, storage, and settlement never involve an LLM. Consensus exists solely for the one subjective question.

---

## 5. Review Items Addressed

### 5.1 "Use the GenLayer contract for reasoning"

**Status: ✅ Completed**

- All authoritative reasoning happens inside [`contracts/dispute_court_v2.py`](../../contracts/dispute_court_v2.py) via `gl.nondet.exec_prompt(prompt, response_format="json")`, executed by GenLayer validators under the Equivalence Principle.
- The web client calls `submit_and_resolve` and then **only displays** what `get_verdict` returns. There is no code path where a client-side LLM output is presented as a verdict.
- OpenRouter survives only in the **Reasoning Preview**, which is labeled on every surface: *"This preview is generated locally for educational purposes. The official verdict is produced by GenLayer Intelligent Contracts on-chain."*

### 5.2 Contract-side evidence handling

**Status: ✅ Completed**

Validators retrieve and process the evidence themselves, inside the non-deterministic block:

- **Fetch:** `gl.nondet.web.render(url, mode="text")` per source — every validator fetches independently; nothing is fed to them by the client.
- **Sanitize:** a `greybox_sanitize` pass strips non-printable characters and neutralizes prompt-injection tokens (`"ignore previous"`, `"<|im_start|>"`, `"system:"`, `"new instructions"`, …) by replacing them with `[filtered]` before any text enters a prompt. The judgment prompt additionally frames evidence as untrusted **data**, never instructions.
- **Bound:** 3,000 characters per source, ~9,000 characters total, at most 3 sources, `https://` enforced, duplicates removed.
- **Hash:** each sanitized source is sha256-hashed; hashes are stored on-chain for provenance.
- **Degrade gracefully:** a dead link is recorded as an `[EXTERNAL]` note for that source and the dispute continues; it does not abort the case.

### 5.3 Each mode selects its corresponding adjudication principle

**Status: ✅ Completed**

The mapping is explicit in contract code — one adjudication function per mode:

| Mode | Adjudication principle | Agreement rule |
|---|---|---|
| `strict` | `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` | Validator independently re-runs the judgment; agrees **iff the verdict label matches exactly** |
| `comparative` | `gl.eq_principle.prompt_comparative(leader_fn, principle)` | Validators judge equivalence by prose principle: verdict and remedy-follows must match; reasoning wording may differ |
| `non_comparative` | `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` | Validator independently re-runs the judgment; agrees **iff verdict AND remedy_follows both match** — reasoning and confidence are free to differ |

Notes for the reviewer:

- In all three modes, validators compare only the **decision fields** (`verdict`, `remedy_follows`) — never the reasoning text. Same conclusion via different reasoning paths is agreement; that is the point of subjective consensus.
- `strict` mode intentionally does **not** use `strict_eq` over fetched page content: because each validator fetches the evidence independently, raw bytes are not stable across fetches, and byte-exact comparison would make every web-grounded dispute fail. Strict mode instead demands exact agreement on the verdict label — the strictest comparison that is honest about how the web behaves.
- Every validator guards against leader failure: `if not isinstance(leader_result, gl.vm.Return): return False`.
- The contract returns Python dicts (calldata-encoded), never hand-built JSON strings.
- A validator split is a first-class outcome: `UNDETERMINED` / `status: "no_consensus"` is stored and rendered as the Equivalence Principle working — not as an error.

---

## 6. Evidence Pipeline

The full journey of one evidence URL:

```
User submits URL
      │
      ▼
Deterministic checks      https:// only · ≤3 sources · duplicates removed
      │
      ▼
Validator fetch           gl.nondet.web.render(url, mode="text")
      │                   (every validator fetches for itself)
      ▼
Sanitization              control chars stripped · injection tokens
      │                   → "[filtered]" · 3,000-char cap per source
      ▼
Hashing                   sha256 over the sanitized text → stored on-chain
      │
      ▼
Reasoning                 evidence enters the judgment prompt as untrusted
      │                   DATA, wrapped in <EVIDENCE> tags
      ▼
Consensus                 agreement on decision fields per the mode's principle
      │
      ▼
Settlement                record written to contract state · read via get_verdict()
```

Failure taxonomy: the contract raises `gl.vm.UserError` with deterministic class prefixes — `[EXPECTED]` (input rejected), `[EXTERNAL]` (source unreachable), `[TRANSIENT]`, `[LLM_ERROR]` — so validators agree on failure paths as well as success paths.

---

## 7. Final Case Dossier

Every resolved dispute produces a permanent, inspectable record — the verdict is only one section of it. Fields returned by `get_verdict(dispute_id)`:

| Field | Source |
|---|---|
| Claim | User |
| Criteria | User |
| Requested remedy | User |
| Evidence URLs | User |
| Evidence hashes (sha256, per source) | Contract |
| Evidence summary (per-source fetch status + what was used) | Contract / GenLayer validators |
| Verdict — `UPHELD` / `DISMISSED` / `UNDETERMINED` | Validator consensus |
| Reasoning | GenLayer validators (leader) |
| Consensus Signal (`agreement_strength_bps`, 0–1000) | GenLayer validators (leader) |
| Remedy follows (yes/no) | Validator consensus |
| Status — `resolved` / `no_consensus` | Contract |
| Why consensus was needed (plain-language explainer) | Contract |
| Transaction hash → explorer link | Blockchain |

**A note on the Consensus Signal, for accuracy:** `agreement_strength_bps` is the leader's in-band confidence signal (0–1000 basis points) stored with the verdict. It is **not** a validator vote count — vote-level data lives in the transaction receipt on the explorer, which the dossier links to. The UI deliberately renders "Consensus Signal: 950/1000" and never claims "N/M validators agreed."

---

## 8. Live Deployment

| Item | Value |
|---|---|
| Network | Testnet Bradbury (Chain ID 4221, persistent) |
| DisputeCourt v2 contract | [`0x2EA4313E7c945B7D74Cf0eE1785B94583232d95a`](https://explorer-bradbury.genlayer.com/address/0x2EA4313E7c945B7D74Cf0eE1785B94583232d95a) |
| Deployment tx | [`0xeb6c78d84a222903056d334487ee83c427f92e718c3f2dbd5bc683e81dac3353`](https://explorer-bradbury.genlayer.com/tx/0xeb6c78d84a222903056d334487ee83c427f92e718c3f2dbd5bc683e81dac3353) |
| Runner | Blessed `py-genlayer` runner, pinned by hash on line 1 of the contract |

The v1 contracts remain live and untouched, exactly as originally submitted — they are the evidence under review:

| v1 contract | Address |
|---|---|
| DisputeCourt (generic adjudication) | [`0x33f62147011B75cDF2333682C9dB2A1F6e7bF908`](https://explorer-bradbury.genlayer.com/address/0x33f62147011B75cDF2333682C9dB2A1F6e7bF908) |
| FlightDelayDispute (strict-mode reference) | [`0xffCC662D1A5fE19ced0cc49e41e21245A64FA72E`](https://explorer-bradbury.genlayer.com/address/0xffCC662D1A5fE19ced0cc49e41e21245A64FA72E) |

---

## 9. End-to-End Validation

A real evidence-based dispute was run through the full v2 pipeline on Bradbury and finalized:

| | |
|---|---|
| Dispute ID | `v2-test-1784234744276` |
| Claim | "The Eiffel Tower is taller than 300 metres." |
| Criteria | "UPHOLD if the evidence states the Eiffel Tower height exceeds 300 metres; otherwise DISMISS." |
| Evidence | https://en.wikipedia.org/wiki/Eiffel_Tower |
| Mode | `non_comparative` |
| **Verdict** | **UPHELD** (`status: resolved`) |
| Consensus Signal | 950/1000 |
| Remedy follows | true |
| Evidence hash | `cc249256654056b73be0e46a2da4fcd50d61a95d511df24998f33836cc8120dd` |
| Transaction | [`0x14e133e11ab0f182a1b8f985f0171a3408af2c1df4eec807660370053c714d1a`](https://explorer-bradbury.genlayer.com/tx/0x14e133e11ab0f182a1b8f985f0171a3408af2c1df4eec807660370053c714d1a) |

What this proves, end to end: validators fetched a live web page themselves, sanitized and hashed it on-chain, reasoned over it, agreed on the decision fields under the non-comparative principle, and the stored verdict — read back via the `get_verdict` view, not receipt parsing — cites the fetched evidence: *"The evidence explicitly states that the Eiffel Tower is 330 metres tall, which exceeds the 300 metres threshold required by the criteria."*

Reproduce it yourself: open the live URL, type any claim, attach any https evidence link, press **Run on GenLayer**. Or run [`deploy/test_dispute_court_v2.ts`](../../deploy/test_dispute_court_v2.ts) against the deployed address.

---

## 10. Repository Changes

| File | Change |
|---|---|
| [`contracts/dispute_court_v2.py`](../../contracts/dispute_court_v2.py) | **New.** Evidence-first Intelligent Contract: validation → validator-side fetch/sanitize/hash → mode-selected adjudication → deterministic settlement → `get_verdict` / `get_evidence_summary` views |
| [`deploy/deploy_dispute_court_v2.ts`](../../deploy/deploy_dispute_court_v2.ts) | **New.** Bradbury deploy script |
| [`deploy/test_dispute_court_v2.ts`](../../deploy/test_dispute_court_v2.ts) | **New.** End-to-end acceptance test (the dispute in Section 9) |
| [`src/app/api/genlayer/dispute-v2/route.ts`](../../src/app/api/genlayer/dispute-v2/route.ts) | **New.** SSE route: `submit_and_resolve` → stream tx hash → await receipt → read `get_verdict` with retry/backoff |
| [`src/components/DossierBlock.tsx`](../../src/components/DossierBlock.tsx) | **New.** Final Case Dossier renderer |
| [`src/components/Simulator.tsx`](../../src/components/Simulator.tsx) | Renamed to "Reasoning Preview" (user-facing copy), permanent disclaimer, evidence-first custom flow, **Run on GenLayer** as primary CTA |
| [`src/components/ChainVerdict.tsx`](../../src/components/ChainVerdict.tsx) | Header relabeled "Official GenLayer Verdict"; v1 wiring untouched |

Phase-by-phase detail: [`phase-a.md`](phase-a.md) (contract + deploy) and [`phase-b.md`](phase-b.md) (UI integration).

---

## 11. Remaining Work

Planned improvements, deliberately out of scope for this response:

- Shareable `/dispute/[id]` dossier permalink pages (the dossier currently renders in the dispute flow).
- A provenance overlay labeling every displayed field with its origin (user / contract / validators / blockchain).
- Consensus-replay visualization.
- Deriving validator-agreement counts from the explorer receipt (the dossier links to the receipt today; the UI intentionally does not claim vote counts it cannot prove).
- A UI consumer for the deployed `get_evidence_summary` view.

---

## 12. Conclusion

The Jury v2 uses GenLayer Intelligent Contracts as the authoritative reasoning engine. The client no longer determines verdicts — every official judgment is produced by decentralized validator consensus over evidence the validators retrieved, sanitized, and hashed themselves, through the adjudication principle selected by the dispute's mode, and exposed as an inspectable Final Case Dossier with an explorer-verifiable transaction. These changes directly and completely address the review's three requests: GenLayer-native reasoning, per-mode adjudication principles, and contract-side evidence handling.

Every claim in this document is checkable by clicking a link in it.
