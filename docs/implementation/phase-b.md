# Phase B — Surfacing the Consensus (UI Integration)

> Scope: make GenLayer visibly and unmistakably the authoritative reasoning engine. This phase exposes the protocol that already exists — it adds no new protocol mechanics and changes no contracts.

**Commits:** `8b0d3ce` (build fix) · `5283f3c` (integration) · `27bd1f1` (footer polish) · **Completed:** 2026-07-17, verified with a live dispute round-trip

---

## The seven builds

1. **"Simulator" → "Reasoning Preview".** Every user-facing label for the local multi-model panel now reads "Reasoning Preview · Educational analysis · Not authoritative". Internal identifiers kept; this is a copy change, the preview's logic is untouched.
2. **Permanent disclaimer.** Under every preview header, in tribunal mono: *"This preview is generated locally for educational purposes. The official verdict is produced by GenLayer Intelligent Contracts on-chain."* Visible text, not a tooltip.
3. **Run on GenLayer is the primary CTA.** The on-chain action is the acid-green filled button everywhere; the preview's convene button is demoted to a ghost/bordered secondary. The hierarchy reads: preview prepares you → GenLayer decides.
4. **Evidence-first custom flow → v2 contract.** Claim → criteria (optional) → requested remedy (optional) → up to 3 evidence URLs (https:// enforced inline, with "Validators will fetch and read these sources themselves") → mode selector (default `non_comparative`) → **Run on GenLayer**. Submits to `submit_and_resolve` on the v2 address via a new SSE route.
5. **Final Case Dossier block.** On resolution: verdict (green/red/amber), reasoning, **Consensus Signal: N/1000**, remedy-follows (when a remedy was given), per-source evidence with truncated mono sha256 hashes and the contract's evidence summary, the stored why-consensus text under "Why a deterministic blockchain couldn't answer this", and the explorer tx link. `no_consensus` renders as "The Jury Is Split" — an amber first-class outcome framed as the Equivalence Principle working, with tx + explorer link, not an error.
6. **Explorer links on every outcome**, reusing the existing pattern; explorer base and v2 address come from env (`NEXT_PUBLIC_DISPUTE_COURT_V2_ADDRESS`), never hardcoded.
7. **Client-side evidence hygiene** mirroring the contract's rules — https-only inline validation, trim, dedupe, Run disabled until the claim is ≥10 chars — so users don't burn a transaction on an input the contract will reject.

---

## Files changed

| File | Change |
|---|---|
| `src/app/api/genlayer/dispute-v2/route.ts` | **New.** SSE route modeled on the v1 dispute route: calls `submit_and_resolve`, streams the tx hash immediately, waits for the receipt, then reads `get_verdict` with retry/backoff. Never parses the write receipt for the verdict; never streams raw error objects. |
| `src/components/DossierBlock.tsx` | **New.** Final Case Dossier renderer (build 5). |
| `src/components/Simulator.tsx` | Builds 1–4, 7: renames, disclaimer, CTA hierarchy, evidence-first flow, v2 SSE client. |
| `src/components/ChainVerdict.tsx` | Header relabeled "Official GenLayer Verdict"; v1 preset wiring untouched. |
| `src/app/api/genlayer/flight/route.ts` | Pre-existing `txHash` TypeScript error fixed (`8b0d3ce`) to restore a clean build. |

Constraints held: v1 routes and preset-case on-chain wiring unchanged (the v1 contracts are review evidence and keep working exactly as submitted); no new dependencies; TypeScript strict with zero errors; "Consensus Signal: N/1000" is the only consensus-strength claim the UI makes — never validator vote counts, which live in the explorer receipt.

---

## Verification

- `npx tsc --noEmit` — clean.
- `npm run build` — succeeds (user-verified in Node 22).
- Live round-trip on Bradbury: custom dispute → tx hash row → dossier block rendered verdict UPHELD, Consensus Signal 1000/1000, evidence hash + summary, why-consensus, explorer link.
- Preset v1 cases confirmed still working unchanged.

Reviewer-facing narrative: [`reviewer-response.md`](reviewer-response.md). Contract layer: [`phase-a.md`](phase-a.md).
