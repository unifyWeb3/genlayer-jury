"use client";

import { useState } from "react";

type Phase = "idle" | "submitting" | "waiting" | "resolved" | "error";

type SseEvent =
  | { type: "submitted"; txHash: string }
  | { type: "verdict"; verdict: string; reasoning: string }
  | { type: "error"; message: string }
  | { type: "done" };

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_FLIGHT_CONTRACT_ADDRESS ?? "";
const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://studio.genlayer.com/";

function truncateHex(hex: string): string {
  return hex.length > 18 ? hex.slice(0, 10) + "…" + hex.slice(-6) : hex;
}

export function ChainVerdict() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [txHash, setTxHash] = useState("");
  const [verdict, setVerdict] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function run() {
    setPhase("submitting");
    setTxHash("");
    setVerdict("");
    setReasoning("");
    setErrorMsg("");

    let res: Response;
    try {
      res = await fetch("/api/genlayer/flight", { method: "POST" });
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
          } else if (ev.type === "error") {
            setErrorMsg(ev.message);
            setPhase("error");
          }
        }
      }
    } catch {
      if (phase !== "resolved") {
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

  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-16 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-8 max-lg:flex-col max-lg:gap-3">
        <span className="overline overline-accent">Live On-Chain Execution</span>
        <span className="overline overline-faint">Deployed · Studionet</span>
      </div>

      <div
        className="border"
        style={{ borderColor: "var(--color-rule-strong)" }}
      >
        {/* Contract address bar */}
        <div
          className="flex justify-between items-center px-8 py-4 border-b flex-wrap gap-3"
          style={{
            borderColor: "var(--color-rule)",
            background: "var(--color-surface)",
          }}
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
              {CONTRACT_ADDRESS || "—"}
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

        {/* Question + trigger */}
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
            &ldquo;AA42 was scheduled to land at 14:00. The flight tracker
            shows it landed at 16:47. Did it land more than 2 hours late?&rdquo;
          </p>
          <button
            onClick={run}
            disabled={isRunning}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "idle" && "Run on GenLayer →"}
            {phase === "submitting" && "Submitting tx…"}
            {phase === "waiting" && "Awaiting consensus…"}
            {phase === "resolved" && "Run again →"}
            {phase === "error" && "Retry →"}
          </button>
        </div>

        {/* Transaction hash row — appears after submission */}
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

        {/* Verdict — shown when resolved */}
        {phase === "resolved" && (
          <div className="px-8 py-8">
            <div className="flex items-baseline gap-6 mb-4 flex-wrap">
              <span
                className="font-[family-name:var(--font-mono)] uppercase"
                style={{
                  fontSize: 18,
                  letterSpacing: "0.12em",
                  fontWeight: 600,
                  color: verdictColor,
                }}
              >
                {verdict}
              </span>
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
              >
                Equivalence Principle · Strict mode · 5 validators
              </span>
            </div>
            <p
              className="m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--color-ink-muted)",
              }}
            >
              {reasoning}
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
