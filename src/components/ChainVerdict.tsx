"use client";

import { useState } from "react";

export type ChainVerdictProps = {
  question: string;
  apiEndpoint: string;
  contractAddress: string;
  // Only required for the generic /api/genlayer/dispute route:
  mode?: string;
  criteria?: string;
  // Displayed in the verdict line, e.g. "Strict mode" vs "Non-comparative mode"
  modeLabel?: string;
};

type Phase = "idle" | "submitting" | "waiting" | "resolved" | "no_consensus" | "error";

type SseEvent =
  | { type: "submitted"; txHash: string }
  | { type: "verdict"; verdict: string; reasoning: string }
  | { type: "no_consensus"; txHash: string; message: string }
  | { type: "error"; message: string }
  | { type: "done" };

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://studio.genlayer.com/";

function truncateHex(hex: string): string {
  return hex.length > 18 ? hex.slice(0, 10) + "…" + hex.slice(-6) : hex;
}

export function ChainVerdict({
  question,
  apiEndpoint,
  contractAddress,
  mode,
  criteria,
  modeLabel = "5 validators",
}: ChainVerdictProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [txHash, setTxHash] = useState("");
  const [verdict, setVerdict] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [noConsensusMsg, setNoConsensusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function run() {
    setPhase("submitting");
    setTxHash("");
    setVerdict("");
    setReasoning("");
    setNoConsensusMsg("");
    setErrorMsg("");

    // Generate a unique dispute ID per run so the same case can be run multiple times.
    const disputeId = `dispute-${Date.now()}`;

    const isDisputeRoute = mode !== undefined;
    const fetchInit: RequestInit = isDisputeRoute
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disputeId, question, mode, criteria: criteria ?? "" }),
        }
      : { method: "POST" };

    let res: Response;
    try {
      res = await fetch(apiEndpoint, fetchInit);
    } catch {
      setPhase("error");
      setErrorMsg("Could not reach the server.");
      return;
    }

    if (!res.ok || !res.body) {
      setPhase("error");
      setErrorMsg(`Server error ${res.status}.`);
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let ev: SseEvent;
          try {
            ev = JSON.parse(line.slice(6)) as SseEvent;
          } catch {
            continue;
          }
          if (ev.type === "submitted") {
            setTxHash(ev.txHash);
            setPhase("waiting");
          } else if (ev.type === "verdict") {
            setVerdict(ev.verdict);
            setReasoning(ev.reasoning);
            setPhase("resolved");
          } else if (ev.type === "no_consensus") {
            setTxHash(ev.txHash);
            setNoConsensusMsg(ev.message);
            setPhase("no_consensus");
          } else if (ev.type === "error") {
            setErrorMsg(ev.message);
            setPhase("error");
          }
        }
      }
    } catch {
      if (phase !== "resolved" && phase !== "no_consensus") {
        setPhase("error");
        setErrorMsg("Connection lost.");
      }
    }
  }

  const verdictColor =
    verdict === "UPHELD"
      ? "var(--color-verdict-yes)"
      : verdict === "DISMISSED"
      ? "var(--color-verdict-no)"
      : "var(--color-ink-muted)";

  const isRunning = phase === "submitting" || phase === "waiting";
  const isDone = phase === "resolved" || phase === "no_consensus" || phase === "error";

  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-16 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-8 max-lg:flex-col max-lg:gap-3">
        <span className="overline overline-accent">Live On-Chain Execution</span>
        <span className="overline overline-faint">Deployed · Studionet</span>
      </div>

      <div className="border" style={{ borderColor: "var(--color-rule-strong)" }}>

        {/* Contract address bar */}
        <div
          className="flex justify-between items-center px-8 py-4 border-b flex-wrap gap-3"
          style={{ borderColor: "var(--color-rule)", background: "var(--color-surface)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-[family-name:var(--font-mono)] uppercase"
              style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--color-ink-faint)" }}
            >
              Contract
            </span>
            <span
              className="font-[family-name:var(--font-mono)]"
              style={{ fontSize: 12, color: "var(--color-ink-muted)" }}
            >
              {contractAddress || "—"}
            </span>
          </div>
          <a
            href={EXPLORER_BASE}
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-mono)] uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: "var(--color-accent)",
              textDecoration: "none",
            }}
          >
            View on Studionet →
          </a>
        </div>

        {/* Question + run button */}
        <div
          className="px-8 py-8 flex justify-between items-end gap-8 flex-wrap border-b"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <p
            className="m-0 italic max-w-[600px]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.5,
              color: "var(--color-ink)",
            }}
          >
            &ldquo;{question}&rdquo;
          </p>
          <button
            onClick={run}
            disabled={isRunning}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "idle" && "Run on GenLayer →"}
            {phase === "submitting" && "Submitting tx…"}
            {phase === "waiting" && "Awaiting consensus…"}
            {isDone && "Run again →"}
          </button>
        </div>

        {/* Transaction hash row */}
        {txHash && (
          <div
            className="px-8 py-4 flex items-center gap-4 flex-wrap border-b"
            style={{ borderColor: "var(--color-rule)", background: "#080808" }}
          >
            <span
              className="font-[family-name:var(--font-mono)] uppercase"
              style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--color-ink-faint)" }}
            >
              TX
            </span>
            <span
              className="font-[family-name:var(--font-mono)]"
              style={{ fontSize: 12, color: "var(--color-ink-muted)" }}
              title={txHash}
            >
              {truncateHex(txHash)}
            </span>
            <span
              className="font-[family-name:var(--font-mono)]"
              style={{ fontSize: 12, color: "var(--color-ink-faint)" }}
            >
              {txHash}
            </span>
            {phase === "waiting" && (
              <span
                className="font-[family-name:var(--font-mono)] pulse-tribunal ml-auto"
                style={{ fontSize: 11, color: "var(--color-accent)" }}
              >
                Waiting for GenLayer consensus…
              </span>
            )}
          </div>
        )}

        {/* Verdict */}
        {phase === "resolved" && (
          <div className="px-8 py-8">
            <div className="flex items-baseline gap-6 mb-4 flex-wrap">
              <span
                className="font-[family-name:var(--font-mono)] uppercase"
                style={{ fontSize: 18, letterSpacing: "0.12em", fontWeight: 600, color: verdictColor }}
              >
                {verdict}
              </span>
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
              >
                Equivalence Principle · {modeLabel}
              </span>
            </div>
            <p className="m-0" style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-ink-muted)" }}>
              {reasoning}
            </p>
          </div>
        )}

        {/* No consensus — valid outcome, framed educationally */}
        {phase === "no_consensus" && (
          <div className="px-8 py-8">
            <div className="flex items-baseline gap-6 mb-4 flex-wrap">
              <span
                className="font-[family-name:var(--font-mono)] uppercase"
                style={{ fontSize: 18, letterSpacing: "0.12em", fontWeight: 600, color: "var(--color-verdict-und)" }}
              >
                No Consensus
              </span>
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
              >
                Equivalence Principle · {modeLabel} · appeal available
              </span>
            </div>
            <p className="m-0" style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-ink-muted)" }}>
              {noConsensusMsg}
            </p>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="px-8 py-6">
            <span
              className="font-[family-name:var(--font-mono)]"
              style={{ fontSize: 12, color: "var(--color-verdict-no)" }}
            >
              {errorMsg}
            </span>
            {txHash && (
              <p
                className="m-0 mt-2 font-[family-name:var(--font-mono)]"
                style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
              >
                Tx submitted: {txHash} — check Studionet for status.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
