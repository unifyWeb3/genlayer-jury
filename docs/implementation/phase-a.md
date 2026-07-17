# Phase A — DisputeCourt v2: Evidence-First Consensus (Contract Layer)

> Scope: a new Intelligent Contract that moves all authoritative reasoning and evidence handling on-chain. No UI changes in this phase. The v1 contracts were not modified or redeployed — they remain live as originally submitted.

**Commit:** `2719add` · **Deployed:** 2026-07-16 · **Status:** complete, acceptance-tested on-chain

---

## What was built

### `contracts/dispute_court_v2.py`

A single contract implementing a three-layer architecture:

**Layer 1 — Evidence pipeline.**
Deterministic pre-checks (dispute id unused, claim non-empty, mode whitelist, ≤3 evidence URLs, `https://` enforced, duplicates removed), then — inside the non-deterministic block — each validator fetches every source itself via `gl.nondet.web.render(url, mode="text")`, runs `greybox_sanitize` (strips non-printable characters, neutralizes prompt-injection tokens such as `"ignore previous"`, `"<|im_start|>"`, `"system:"` by replacing them with `[filtered]`), caps content at 3,000 chars/source and ~9,000 total, and computes a sha256 hash per sanitized source for provenance. A dead link is recorded as an `[EXTERNAL]` note and the dispute continues.

**Layer 2 — Consensus (mode → adjudication principle).**
The judgment prompt frames evidence as untrusted data and demands a JSON decision object. The dispute's mode selects the principle:

| Mode | Principle | Agreement rule |
|---|---|---|
| `strict` | `gl.vm.run_nondet_unsafe` | exact verdict-label match |
| `comparative` | `gl.eq_principle.prompt_comparative` | prose principle: decision fields must match, wording free |
| `non_comparative` | `gl.vm.run_nondet_unsafe` | verdict AND remedy_follows must match |

Validators compare decision fields only — never reasoning text — and never compare raw fetched bytes (independent fetches of live pages differ). Every validator guards `if not isinstance(leader_result, gl.vm.Return): return False`. The leader returns Python dicts, never hand-built JSON strings.

**Layer 3 — Deterministic settlement.**
The record (claim, criteria, remedy, evidence URLs/hashes/summary, verdict, reasoning, `agreement_strength_bps` as integer basis points, `remedy_follows`, status, why-consensus explainer) is stored in a `TreeMap` and read back via the `get_verdict` / `get_evidence_summary` views. `UNDETERMINED` / `no_consensus` is a stored, first-class outcome. Errors use `gl.vm.UserError` with `[EXPECTED]` / `[EXTERNAL]` / `[TRANSIENT]` / `[LLM_ERROR]` prefixes so failure paths are deterministic too.

### Deploy & test scripts

- `deploy/deploy_dispute_court_v2.ts` — deploys to Testnet Bradbury, prints address + tx hash.
- `deploy/test_dispute_court_v2.ts` — submits a real evidence-based dispute and reads the verdict back through `get_verdict`.

---

## SDK verification notes

All `gl.*` signatures were verified against the GenLayer Python SDK source (genvm `v0.2.16`, matching the blessed runner pinned on line 1 of the contract) before writing code. Two deviations from common documentation phrasing, resolved in favor of the SDK source:

- `UserError` lives at `gl.vm.UserError` (not `gl.UserError`).
- `gl.eq_principle.prompt_comparative(fn, principle)` — the second parameter is the prose `principle` string.
- The pinned runner uses `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`; newer SDK `main` renames it, so the runner hash and the API were matched deliberately.

---

## Deployment record

| Item | Value |
|---|---|
| Contract | [`0x2EA4313E7c945B7D74Cf0eE1785B94583232d95a`](https://explorer-bradbury.genlayer.com/address/0x2EA4313E7c945B7D74Cf0eE1785B94583232d95a) |
| Deploy tx | [`0xeb6c78d84a222903056d334487ee83c427f92e718c3f2dbd5bc683e81dac3353`](https://explorer-bradbury.genlayer.com/tx/0xeb6c78d84a222903056d334487ee83c427f92e718c3f2dbd5bc683e81dac3353) |
| Acceptance test | Dispute `v2-test-1784234744276` — UPHELD, 950/1000, evidence hash `cc249256…` — tx [`0x14e133e1…c714d1a`](https://explorer-bradbury.genlayer.com/tx/0x14e133e11ab0f182a1b8f985f0171a3408af2c1df4eec807660370053c714d1a) |

Full context and the reviewer-facing narrative: [`reviewer-response.md`](reviewer-response.md).
