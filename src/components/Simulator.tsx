"use client";

import { useEffect, useMemo, useState } from "react";
import { SCENARIOS, type Mode, type Scenario } from "@/lib/scenarios";
import { useJury, type LiveJuror } from "@/lib/useJury";
import { useJuryContext } from "@/lib/JuryContext";
import { useMode } from "@/lib/ModeContext";
import { DossierBlock, type V2DossierRecord } from "@/components/DossierBlock";

const MODES: Mode[] = ["Strict", "Comparative", "Non-comparative"];

// Maps the UI Mode labels to the API's snake_case strings
const MODE_TO_API: Record<Mode, string> = {
  Strict: "strict",
  Comparative: "comparative",
  "Non-comparative": "non_comparative",
};

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL?.replace(/\/$/, "") ??
  "https://explorer-bradbury.genlayer.com";

function explorerAddressUrl(address: string) {
  return `${EXPLORER_BASE}/address/${address}`;
}

function explorerTxUrl(hash: string) {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

function truncateHex(hex: string) {
  return hex.length > 18 ? hex.slice(0, 10) + "…" + hex.slice(-6) : hex;
}

const DEFAULT_CRITERIA =
  "Judge the claim fairly against the retrieved evidence. " +
  "Determine UPHELD if the claim is supported by the evidence, DISMISSED if it is not. " +
  "Base the decision on the evidence content only, without assuming information not provided.";

const MAX_EVIDENCE_URLS = 3;

type ChainPhase =
  | "idle"
  | "submitting"
  | "waiting"
  | "resolved"
  | "no_consensus"
  | "error";

type ChainSseEvent =
  | { type: "submitted"; txHash: string }
  | { type: "dossier"; txHash: string; record: V2DossierRecord }
  | { type: "no_consensus"; txHash: string; message: string }
  | { type: "error"; message: string }
  | { type: "done" };

const accentByStatus: Record<LiveJuror["status"], string> = {
  idle: "var(--color-rule-strong)",
  yes: "var(--color-verdict-yes)",
  no: "var(--color-verdict-no)",
  und: "var(--color-verdict-und)",
  deliberating: "var(--color-accent)",
};

const chipClassByStatus: Record<LiveJuror["status"], string> = {
  idle: "chip",
  yes: "chip chip-yes",
  no: "chip chip-no",
  und: "chip chip-und",
  deliberating: "chip chip-pending",
};

const chipLabelByStatus: Record<LiveJuror["status"], string> = {
  idle: "Awaiting",
  yes: "Accept",
  no: "Reject",
  und: "Undetermined",
  deliberating: "Deliberating",
};

const outcomeColor = {
  accepted: "var(--color-verdict-yes)",
  rejected: "var(--color-verdict-no)",
  undetermined: "var(--color-verdict-und)",
  no_consensus: "var(--color-accent)",
} as const;

// ── Python tokenizer ──────────────────────────────────────────────────────────

type TokenKind =
  | "keyword"
  | "string"
  | "comment"
  | "decorator"
  | "gl"
  | "number"
  | "plain";

const PY_KEYWORDS = new Set([
  "from",
  "import",
  "class",
  "def",
  "return",
  "if",
  "else",
  "elif",
  "for",
  "in",
  "as",
  "lambda",
  "and",
  "or",
  "not",
  "True",
  "False",
  "None",
  "with",
  "try",
  "except",
  "raise",
  "pass",
  "self",
]);

const TOKEN_COLORS: Record<TokenKind, string> = {
  keyword: "#7dd3fc",
  string: "#86efac",
  comment: "#6b7280",
  decorator: "#c084fc",
  gl: "#c5ff3c",
  number: "#fb923c",
  plain: "#e2e8f0",
};

function tokenizePython(
  code: string,
): Array<{ text: string; kind: TokenKind }> {
  const result: Array<{ text: string; kind: TokenKind }> = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i];

    // Comment
    if (ch === "#") {
      let end = i;
      while (end < code.length && code[end] !== "\n") end++;
      result.push({ text: code.slice(i, end), kind: "comment" });
      i = end;
      continue;
    }

    // Triple-quoted string
    const triple = code.slice(i, i + 3);
    if (triple === '"""' || triple === "'''") {
      const close = code.indexOf(triple, i + 3);
      const end = close === -1 ? code.length : close + 3;
      result.push({ text: code.slice(i, end), kind: "string" });
      i = end;
      continue;
    }

    // f-string or regular string
    if (
      ch === '"' ||
      ch === "'" ||
      (ch === "f" && (code[i + 1] === '"' || code[i + 1] === "'"))
    ) {
      const q = ch === "f" ? code[i + 1] : ch;
      let end = ch === "f" ? i + 2 : i + 1;
      while (end < code.length && code[end] !== q && code[end] !== "\n") {
        if (code[end] === "\\") end++;
        end++;
      }
      result.push({ text: code.slice(i, end + 1), kind: "string" });
      i = end + 1;
      continue;
    }

    // Decorator
    if (ch === "@") {
      let end = i + 1;
      while (end < code.length && /[\w.]/.test(code[end])) end++;
      result.push({ text: code.slice(i, end), kind: "decorator" });
      i = end;
      continue;
    }

    // Identifier / keyword / gl call
    if (/[a-zA-Z_]/.test(ch)) {
      let end = i + 1;
      while (end < code.length && /\w/.test(code[end])) end++;
      const word = code.slice(i, end);
      if (word === "gl" && code[end] === ".") {
        end++;
        while (end < code.length && /[\w.]/.test(code[end])) end++;
        result.push({ text: code.slice(i, end), kind: "gl" });
      } else if (PY_KEYWORDS.has(word)) {
        result.push({ text: word, kind: "keyword" });
      } else {
        result.push({ text: word, kind: "plain" });
      }
      i = end;
      continue;
    }

    // Number
    if (/\d/.test(ch)) {
      let end = i + 1;
      while (end < code.length && /[\d.]/.test(code[end])) end++;
      result.push({ text: code.slice(i, end), kind: "number" });
      i = end;
      continue;
    }

    result.push({ text: ch, kind: "plain" });
    i++;
  }
  return result;
}

function PythonCode({ code }: { code: string }) {
  const tokens = useMemo(() => tokenizePython(code), [code]);
  return (
    <code>
      {tokens.map((tok, idx) => (
        <span key={idx} style={{ color: TOKEN_COLORS[tok.kind] }}>
          {tok.text}
        </span>
      ))}
    </code>
  );
}

// ── ContractSection ───────────────────────────────────────────────────────────

export function ContractSection({
  contract,
  open,
  onToggle,
}: {
  contract: Scenario["contract"];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="border border-t-0"
      style={{ borderColor: "var(--color-rule-strong)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center px-8 py-5 cursor-pointer bg-transparent border-0 text-left"
      >
        <span
          className="font-[family-name:var(--font-mono)] uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            color: "var(--color-accent)",
          }}
        >
          {open ? "Hide the contract ▴" : "View the contract ▾"}
        </span>
        <span
          className="font-[family-name:var(--font-mono)]"
          style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
        >
          Python · Intelligent Contract
        </span>
      </button>

      <div
        style={{
          maxHeight: open ? "2400px" : "0",
          overflow: "hidden",
          transition: "max-height 0.45s var(--ease-tribunal)",
        }}
      >
        <div className="border-t" style={{ borderColor: "var(--color-rule)" }}>
          <pre
            className="overflow-x-auto px-8 py-6 m-0 font-[family-name:var(--font-mono)]"
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              background: "#080808",
              tabSize: 4,
            }}
          >
            <PythonCode code={contract.python} />
          </pre>
          <div
            className="px-8 py-4 border-t flex justify-between items-center"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <span
              className="font-[family-name:var(--font-mono)]"
              style={{
                fontSize: 11,
                color: "var(--color-ink-faint)",
                letterSpacing: "0.05em",
              }}
            >
              Real deployable contract. No mocks.
            </span>
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
              Fork in GenLayer Studio →
            </a>
          </div>
        </div>

        <div
          className="grid grid-cols-2 border-t max-lg:grid-cols-1"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <div
            className="px-8 py-8 border-r max-lg:border-r-0 max-lg:border-b"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <span className="overline block mb-4">Why this mode?</span>
            <p
              className="m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--color-ink-muted)",
              }}
            >
              {contract.whyMode}
            </p>
          </div>
          <div className="px-8 py-8">
            <span className="overline block mb-4">Why not Ethereum?</span>
            <p
              className="m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--color-ink-muted)",
              }}
            >
              {contract.whyNotEth}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── JurorCard ─────────────────────────────────────────────────────────────────

function JurorCard({
  juror,
  isLast,
  borderClass,
}: {
  juror: LiveJuror;
  isLast: boolean;
  borderClass?: string;
}) {
  const isStreaming = juror.status === "deliberating";
  const showText = juror.status !== "idle";
  return (
    <div
      className={`relative p-6 flex flex-col gap-4 min-h-[200px] ${
        !isLast ? (borderClass ?? "border-r max-sm:border-r-0") : ""
      } max-lg:border-b max-sm:border-b`}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-rule)",
      }}
    >
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-[2px] ${isStreaming ? "pulse-tribunal" : ""}`}
        style={{ background: accentByStatus[juror.status] }}
      />
      <div className="flex justify-between items-center">
        <span
          className="font-[family-name:var(--font-mono)] text-[10px] uppercase"
          style={{ color: "var(--color-ink-muted)", letterSpacing: "0.15em" }}
        >
          {juror.model}
        </span>
        <span
          className="font-[family-name:var(--font-mono)] text-[10px]"
          style={{ color: "var(--color-ink-faint)" }}
        >
          Seat {String(juror.seat).padStart(2, "0")}
        </span>
      </div>
      <span className={chipClassByStatus[juror.status]}>
        <span className="chip-dot" />
        {chipLabelByStatus[juror.status]}
      </span>
      <p
        className="italic m-0 flex-1"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          lineHeight: 1.45,
          color: isStreaming
            ? "var(--color-ink-muted)"
            : juror.status === "idle"
              ? "var(--color-ink-faint)"
              : "var(--color-ink)",
        }}
      >
        {showText ? (
          <>
            &quot;{juror.streamedText}
            {isStreaming && <span className="stream-cursor" />}
            {!isStreaming && '"'}
          </>
        ) : (
          <span style={{ color: "var(--color-ink-faint)" }}>
            Awaiting summons.
          </span>
        )}
      </p>
    </div>
  );
}

// ── JuryGrid ──────────────────────────────────────────────────────────────────

function JuryGrid({ jurors, tier }: { jurors: LiveJuror[]; tier: 1 | 2 }) {
  const tier1 = jurors.slice(0, 5);
  const tier2 = jurors.slice(5);

  if (tier === 1 || tier2.length === 0) {
    return (
      <div
        className="grid grid-cols-5 mt-8 border max-lg:grid-cols-2 max-sm:grid-cols-1"
        style={{ borderColor: "var(--color-rule)" }}
      >
        {tier1.map((juror, i) => (
          <JurorCard
            key={`t1-${juror.seat}`}
            juror={juror}
            isLast={i === tier1.length - 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-0">
      {/* Tier 1 header */}
      <div
        className="flex justify-between items-center px-6 py-2.5 border"
        style={{
          borderColor: "var(--color-rule-strong)",
          background: "var(--color-surface)",
        }}
      >
        <span
          className="font-[family-name:var(--font-mono)] uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--color-ink-faint)",
          }}
        >
          Tier 1 — Original Panel
        </span>
        <span
          className="font-[family-name:var(--font-mono)]"
          style={{ fontSize: 10, color: "var(--color-ink-faint)" }}
        >
          5 validators
        </span>
      </div>
      <div
        className="grid grid-cols-5 border border-t-0 max-lg:grid-cols-2 max-sm:grid-cols-1"
        style={{ borderColor: "var(--color-rule)" }}
      >
        {tier1.map((juror, i) => (
          <JurorCard
            key={`t1-${juror.seat}`}
            juror={juror}
            isLast={i === tier1.length - 1}
          />
        ))}
      </div>

      {/* Tier 2 header */}
      <div
        className="flex justify-between items-center px-6 py-2.5 border mt-4"
        style={{
          borderColor: "var(--color-accent)",
          background: "rgba(197,255,60,0.03)",
        }}
      >
        <span
          className="font-[family-name:var(--font-mono)] uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--color-accent)",
          }}
        >
          Tier 2 — Appellate Panel
        </span>
        <span
          className="font-[family-name:var(--font-mono)]"
          style={{ fontSize: 10, color: "var(--color-ink-faint)" }}
        >
          Supermajority required · 9 of 11
        </span>
      </div>
      <div
        className="grid grid-cols-6 border border-t-0 max-lg:grid-cols-3 max-sm:grid-cols-2"
        style={{ borderColor: "var(--color-rule)" }}
      >
        {tier2.map((juror, i) => (
          <JurorCard
            key={`t2-${juror.seat}`}
            juror={juror}
            isLast={i === tier2.length - 1}
            borderClass="border-r max-sm:border-r-0"
          />
        ))}
      </div>
    </div>
  );
}

// ── Simulator ─────────────────────────────────────────────────────────────────

export function Simulator({
  lockedScenarioId,
  defaultContractOpen = false,
}: {
  lockedScenarioId?: string;
  defaultContractOpen?: boolean;
}) {
  const [scenarioId, setScenarioId] = useState<string>(
    lockedScenarioId ?? SCENARIOS[0].id,
  );
  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );
  const [mode, setMode] = useState<Mode>(scenario.recommendedMode);
  const [contractOpen, setContractOpen] = useState(defaultContractOpen);
  const [customQuestion, setCustomQuestion] = useState("");

  useMemo(() => {
    if (!lockedScenarioId) setMode(scenario.recommendedMode);
  }, [scenario.recommendedMode, lockedScenarioId]);

  useEffect(() => {
    setCustomQuestion("");
  }, [scenarioId]);

  // Custom disputes run on DisputeCourt v2 (evidence-first).
  const courtAddress = process.env.NEXT_PUBLIC_DISPUTE_COURT_V2_ADDRESS ?? "";
  const courtExplorerUrl = courtAddress
    ? explorerAddressUrl(courtAddress)
    : EXPLORER_BASE;

  const { jurors, phase, verdict, tier, convene, reset, appeal } = useJury(
    scenario,
    mode,
    customQuestion,
  );

  const { setTier: setCtxTier } = useJuryContext();
  const { mode: juryMode } = useMode();

  useEffect(() => {
    setCtxTier(tier);
  }, [tier, setCtxTier]);

  const charCount =
    scenario.id === "custom" ? customQuestion.length : scenario.question.length;

  // ── On-chain custom dispute state (DisputeCourt v2, evidence-first) ───────
  const [chainPhase, setChainPhase] = useState<ChainPhase>("idle");
  const [chainTxHash, setChainTxHash] = useState("");
  const [chainDossier, setChainDossier] = useState<V2DossierRecord | null>(
    null,
  );
  const [chainMsg, setChainMsg] = useState("");
  const [customCriteria, setCustomCriteria] = useState("");
  const [customRemedy, setCustomRemedy] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    setChainPhase("idle");
    setChainTxHash("");
    setChainDossier(null);
    setChainMsg("");
    setCustomCriteria("");
    setCustomRemedy("");
    setEvidenceUrls(["", "", ""]);
  }, [scenarioId]);

  // Client-side evidence hygiene — mirrors the contract's own rules so users
  // don't burn a tx on input the contract will reject: https only, trimmed,
  // deduped, 1–3 sources.
  const trimmedEvidence = evidenceUrls.map((u) => u.trim());
  const hasInvalidEvidence = trimmedEvidence.some(
    (u) => u !== "" && !u.startsWith("https://"),
  );
  const validEvidenceUrls = Array.from(
    new Set(trimmedEvidence.filter((u) => u.startsWith("https://"))),
  ).slice(0, MAX_EVIDENCE_URLS);
  const claimReady = customQuestion.trim().length >= 10;
  const canRunOnChain =
    claimReady && validEvidenceUrls.length >= 1 && !hasInvalidEvidence;

  function setEvidenceUrl(index: number, value: string) {
    setEvidenceUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  async function runOnChain() {
    if (!canRunOnChain) return;
    if (!courtAddress) {
      setChainPhase("error");
      setChainMsg("NEXT_PUBLIC_DISPUTE_COURT_V2_ADDRESS is not configured.");
      return;
    }
    const disputeId = `custom-${Date.now()}`;
    const criteria = customCriteria.trim() || DEFAULT_CRITERIA;
    const apiMode = MODE_TO_API[mode];

    setChainPhase("submitting");
    setChainTxHash("");
    setChainDossier(null);
    setChainMsg("");

    let res: Response;
    try {
      res = await fetch("/api/genlayer/dispute-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disputeId,
          claim: customQuestion.trim(),
          criteria,
          requestedRemedy: customRemedy.trim(),
          evidenceUrls: validEvidenceUrls,
          mode: apiMode,
        }),
      });
    } catch {
      setChainPhase("error");
      setChainMsg("Could not reach the server.");
      return;
    }
    if (!res.ok || !res.body) {
      setChainPhase("error");
      setChainMsg(`Server error ${res.status}.`);
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let localPhase: ChainPhase = "submitting";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let ev: ChainSseEvent;
          try {
            ev = JSON.parse(line.slice(6)) as ChainSseEvent;
          } catch {
            continue;
          }
          if (ev.type === "submitted") {
            setChainTxHash(ev.txHash);
            setChainPhase("waiting");
            localPhase = "waiting";
          } else if (ev.type === "dossier") {
            setChainTxHash(ev.txHash);
            setChainDossier(ev.record);
            setChainPhase("resolved");
            localPhase = "resolved";
          } else if (ev.type === "no_consensus") {
            setChainTxHash(ev.txHash);
            setChainMsg(ev.message);
            setChainPhase("no_consensus");
            localPhase = "no_consensus";
          } else if (ev.type === "error") {
            setChainMsg(ev.message);
            setChainPhase("error");
            localPhase = "error";
          }
        }
      }
    } catch {
      if (localPhase !== "resolved" && localPhase !== "no_consensus") {
        setChainPhase("error");
        setChainMsg("Connection lost.");
      }
    }
  }

  return (
    <section
      id="simulator"
      className="max-w-[1280px] mx-auto px-8 py-32 border-t scroll-mt-20"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline mb-12">
        <span className="overline overline-accent">
          Exhibit D — Live System State
        </span>
        <span className="overline overline-faint">§04 / 07</span>
      </div>

      <h2 className="display">
        The jury <em>convenes.</em>
      </h2>
      <p className="body-prose mt-8 max-w-[680px]">
        Pose a question. Pick a mode. Preview how five model jurors might
        reason — then send the case to GenLayer, where the official verdict is
        decided on-chain.
      </p>

      {/* SCENARIO PICKER — hidden when locked */}
      {!lockedScenarioId && (
        <div className="mt-16">
          <span className="overline block mb-4">Select a case</span>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.filter((s) => s.id !== "custom").map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setScenarioId(s.id);
                  reset();
                  setContractOpen(false);
                }}
                className="font-[family-name:var(--font-mono)] uppercase cursor-pointer transition-colors px-4 py-2.5 border rounded-[2px]"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  background:
                    scenarioId === s.id
                      ? "rgba(197,255,60,0.08)"
                      : "transparent",
                  borderColor:
                    scenarioId === s.id
                      ? "var(--color-accent)"
                      : "var(--color-rule-strong)",
                  color:
                    scenarioId === s.id
                      ? "var(--color-accent)"
                      : "var(--color-ink-muted)",
                  transition:
                    "color 0.12s var(--ease-tribunal), background 0.28s var(--ease-tribunal), border-color 0.12s var(--ease-tribunal)",
                }}
                disabled={phase === "deliberating"}
              >
                {s.shortLabel}
              </button>
            ))}
            <button
              onClick={() => {
                setScenarioId("custom");
                reset();
                setContractOpen(false);
              }}
              disabled={phase === "deliberating"}
              className="font-[family-name:var(--font-mono)] uppercase cursor-pointer px-4 py-2.5 rounded-[2px]"
              style={{
                fontSize: 11,
                letterSpacing: "0.15em",
                fontStyle: "italic",
                border: "2px dashed",
                background:
                  scenarioId === "custom"
                    ? "rgba(197,255,60,0.08)"
                    : "transparent",
                borderColor:
                  scenarioId === "custom"
                    ? "var(--color-accent)"
                    : "var(--color-rule-strong)",
                color:
                  scenarioId === "custom"
                    ? "var(--color-accent)"
                    : "var(--color-ink-muted)",
                transition:
                  "color 0.12s var(--ease-tribunal), background 0.28s var(--ease-tribunal), border-color 0.12s var(--ease-tribunal)",
              }}
            >
              Write your own case →
            </button>
          </div>
        </div>
      )}

      {/* SIM CONTROLS */}
      <div className="grid grid-cols-[1fr_auto] gap-8 items-end mb-8 mt-12 max-lg:grid-cols-1">
        <div>
          <span className="overline block mb-4">Equivalence Principle</span>
          <div
            className="inline-flex border rounded-[2px] overflow-hidden"
            style={{ borderColor: "var(--color-rule-strong)" }}
          >
            {MODES.map((m, i) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  reset();
                }}
                className="font-[family-name:var(--font-mono)] uppercase cursor-pointer"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  padding: "14px 20px",
                  borderRight:
                    i < MODES.length - 1
                      ? "1px solid var(--color-rule-strong)"
                      : "0",
                  background:
                    mode === m ? "rgba(197,255,60,0.08)" : "transparent",
                  color:
                    mode === m
                      ? "var(--color-accent)"
                      : "var(--color-ink-muted)",
                  transition:
                    "color 0.12s var(--ease-tribunal), background 0.28s var(--ease-tribunal)",
                }}
                disabled={phase === "deliberating"}
              >
                {m}
              </button>
            ))}
          </div>
          {mode !== scenario.recommendedMode && (
            <div
              className="mono-sm mt-3"
              style={{ color: "var(--color-ink-faint)" }}
            >
              Author recommended:{" "}
              <em
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--color-accent)",
                }}
              >
                {scenario.recommendedMode}
              </em>
            </div>
          )}
        </div>
        <div className="text-right max-lg:text-left">
          <div className="overline overline-faint">
            Case · {scenario.caseNum.replace("№ ", "")}
          </div>
          <div
            className="mono-sm mt-2"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Pattern: {scenario.pattern}
          </div>
        </div>
      </div>

      {/* PROMPT */}
      <div
        className="border p-8 flex flex-col gap-4"
        style={{
          borderColor: "var(--color-rule-strong)",
          background: "var(--color-surface)",
        }}
      >
        <div className="flex justify-between items-center">
          {scenario.id === "custom" ? (
            <span className="overline overline-accent">Your Claim</span>
          ) : (
            <span className="overline">Question on Trial</span>
          )}
          <span className="overline overline-faint">{charCount} / 500</span>
        </div>
        {scenario.id === "custom" ? (
          <textarea
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value.slice(0, 500))}
            placeholder="State the claim to be judged. Example: The contractor fulfilled the verbal agreement to 'paint the room professionally' — despite finishing in 2 hours and leaving visible streaks."
            disabled={phase === "deliberating"}
            rows={3}
            className="w-full bg-transparent border-0 resize-none focus:outline-none italic"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: 22,
              lineHeight: 1.4,
              color: "var(--color-ink)",
            }}
          />
        ) : (
          <p
            className="m-0 italic"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: 22,
              lineHeight: 1.4,
              color: "var(--color-ink)",
            }}
          >
            &quot;{scenario.question}&quot;
          </p>
        )}
        <div className="flex gap-4 mt-2 items-center flex-wrap">
          <button
            onClick={convene}
            disabled={
              phase === "deliberating" ||
              (scenario.id === "custom" && customQuestion.trim().length < 10)
            }
            className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "idle" && "Run Reasoning Preview →"}
            {phase === "deliberating" && "Previewing..."}
            {phase === "resolved" && "Re-run preview →"}
          </button>
          {phase !== "idle" && (
            <button
              onClick={() => {
                reset();
                setContractOpen(false);
              }}
              className="btn-ghost"
              disabled={phase === "deliberating"}
            >
              Reset
            </button>
          )}
          {scenario.id === "custom" &&
            customQuestion.trim().length < 10 &&
            phase === "idle" && (
              <span
                className="mono-sm"
                style={{ color: "var(--color-ink-faint)" }}
              >
                Write at least 10 characters to run the preview.
              </span>
            )}
        </div>
      </div>

      {/* REASONING PREVIEW — educational analysis, never the official verdict */}
      <div
        className="mt-10 border px-6 py-4"
        style={{
          borderColor: "var(--color-rule-strong)",
          background: "var(--color-surface)",
        }}
      >
        <div className="flex justify-between items-baseline flex-wrap gap-2">
          <span className="overline overline-accent">Reasoning Preview</span>
          <span className="overline overline-faint">
            Educational analysis · Not authoritative
          </span>
        </div>
        <p
          className="m-0 mt-3 font-[family-name:var(--font-mono)]"
          style={{
            fontSize: 11,
            lineHeight: 1.6,
            letterSpacing: "0.04em",
            color: "var(--color-ink-faint)",
          }}
        >
          This preview is generated locally for educational purposes. The
          official verdict is produced by GenLayer Intelligent Contracts
          on-chain.
        </p>
      </div>

      {/* JURY GRID */}
      <JuryGrid jurors={jurors} tier={tier} />

      {/* VERDICT BAR */}
      <VerdictBar
        jurors={jurors}
        verdict={verdict}
        phase={phase}
        tier={tier}
        onAppeal={appeal}
      />

      {/* PREVIEW FOOTNOTE — custom cases only */}
      {scenario.id === "custom" && phase === "resolved" && (
        <p
          className="mono-sm mt-4 text-center"
          style={{ color: "var(--color-ink-faint)" }}
        >
          Reasoning Preview — local educational analysis only.{" "}
          {juryMode === "mocked"
            ? "Toggle to live mode for real LLM reasoning. "
            : "Live LLM reasoning. "}
          The official verdict is decided on GenLayer below.
        </p>
      )}

      {/* CONTRACT SECTION — visible once resolved, hidden for custom */}
      {phase === "resolved" && scenario.id !== "custom" && (
        <ContractSection
          contract={scenario.contract}
          open={contractOpen}
          onToggle={() => setContractOpen((o) => !o)}
        />
      )}

      {/* ON-CHAIN PANEL — custom case only, always visible so user sees the option */}
      {scenario.id === "custom" && (
        <div
          className="mt-12 border"
          style={{ borderColor: "var(--color-rule-strong)" }}
        >
          {/* Header */}
          <div
            className="flex justify-between items-center px-8 py-5 border-b"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-surface)",
            }}
          >
            <span className="overline overline-accent">
              Official GenLayer Verdict
            </span>
            <div className="flex flex-col items-end max-lg:items-start gap-1">
              <span className="overline overline-faint">
                DisputeCourt v2 · Bradbury
              </span>
              <a
                href={courtExplorerUrl}
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
                Verify on-chain ↗
              </a>
            </div>
          </div>

          {/* Claim echo — connects this panel to the primary textarea above */}
          <div
            className="px-8 py-5 border-b"
            style={{ borderColor: "var(--color-rule)", background: "#080808" }}
          >
            {claimReady ? (
              <>
                <span
                  className="overline block mb-2"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  Claim on trial
                </span>
                <p
                  className="m-0 italic"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: "var(--color-ink-muted)",
                  }}
                >
                  &ldquo;
                  {customQuestion.trim().length > 120
                    ? customQuestion.trim().slice(0, 120) + "…"
                    : customQuestion.trim()}
                  &rdquo;
                </p>
              </>
            ) : (
              <p
                className="m-0 font-[family-name:var(--font-mono)]"
                style={{ fontSize: 12, color: "var(--color-ink-faint)" }}
              >
                ↑ State your claim in the{" "}
                <span style={{ color: "var(--color-ink-muted)" }}>
                  Your Claim
                </span>{" "}
                box above to run it on-chain.
              </p>
            )}
          </div>

          {/* Criteria — how validators should judge (optional) */}
          <div
            className="px-8 py-5 border-b"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-surface)",
            }}
          >
            <span
              className="overline block mb-3"
              style={{ color: "var(--color-ink-faint)" }}
            >
              Criteria · optional — how validators should judge
            </span>
            <textarea
              value={customCriteria}
              onChange={(e) => setCustomCriteria(e.target.value.slice(0, 300))}
              placeholder="Leave blank to apply a default fairness standard. Or specify how validators should judge — e.g. 'Evaluate whether the service was delivered as described, ignoring subjective satisfaction.'"
              rows={2}
              disabled={chainPhase === "submitting" || chainPhase === "waiting"}
              className="w-full bg-transparent border resize-none focus:outline-none"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--color-ink-muted)",
                borderColor: "var(--color-rule)",
                padding: "8px 12px",
              }}
            />
          </div>

          {/* Requested remedy (optional) */}
          <div
            className="px-8 py-5 border-b"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-surface)",
            }}
          >
            <span
              className="overline block mb-3"
              style={{ color: "var(--color-ink-faint)" }}
            >
              Requested remedy · optional
            </span>
            <input
              type="text"
              value={customRemedy}
              onChange={(e) => setCustomRemedy(e.target.value.slice(0, 200))}
              placeholder="e.g. Refund the escrow to the freelancer."
              disabled={chainPhase === "submitting" || chainPhase === "waiting"}
              className="w-full bg-transparent border focus:outline-none"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--color-ink-muted)",
                borderColor: "var(--color-rule)",
                padding: "8px 12px",
              }}
            />
            <p
              className="m-0 mt-2 font-[family-name:var(--font-mono)]"
              style={{
                fontSize: 10,
                color: "var(--color-ink-faint)",
                letterSpacing: "0.05em",
              }}
            >
              Validators also judge whether this remedy follows from their
              verdict.
            </p>
          </div>

          {/* Evidence URLs — the heart of the evidence-first flow */}
          <div
            className="px-8 py-5 border-b"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-surface)",
            }}
          >
            <span
              className="overline block mb-1"
              style={{ color: "var(--color-accent)" }}
            >
              Evidence · 1–3 https sources · required
            </span>
            <p
              className="m-0 mb-3 font-[family-name:var(--font-mono)]"
              style={{
                fontSize: 11,
                color: "var(--color-ink-faint)",
                letterSpacing: "0.04em",
              }}
            >
              Validators will fetch and read these sources themselves.
            </p>
            <div className="flex flex-col gap-2">
              {evidenceUrls.map((url, i) => {
                const trimmed = url.trim();
                const invalid = trimmed !== "" && !trimmed.startsWith("https://");
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setEvidenceUrl(i, e.target.value)}
                      placeholder={
                        i === 0
                          ? "https:// — a page validators should read"
                          : "https:// — optional additional source"
                      }
                      disabled={
                        chainPhase === "submitting" || chainPhase === "waiting"
                      }
                      className="w-full bg-transparent border focus:outline-none"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: "var(--color-ink-muted)",
                        borderColor: invalid
                          ? "var(--color-verdict-no)"
                          : "var(--color-rule)",
                        padding: "8px 12px",
                      }}
                    />
                    {invalid && (
                      <span
                        className="font-[family-name:var(--font-mono)]"
                        style={{
                          fontSize: 10,
                          color: "var(--color-verdict-no)",
                        }}
                      >
                        Evidence links must start with https://
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Run button — the primary CTA */}
          <div
            className="px-8 py-5 flex items-center gap-4 flex-wrap border-b"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <button
              onClick={runOnChain}
              disabled={
                chainPhase === "submitting" ||
                chainPhase === "waiting" ||
                !canRunOnChain
              }
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chainPhase === "idle" && "Run on GenLayer →"}
              {chainPhase === "submitting" && "Submitting tx…"}
              {chainPhase === "waiting" && "Awaiting consensus…"}
              {(chainPhase === "resolved" ||
                chainPhase === "no_consensus" ||
                chainPhase === "error") &&
                "Run again →"}
            </button>
            {!canRunOnChain && chainPhase === "idle" && (
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{ fontSize: 11, color: "var(--color-ink-muted)" }}
              >
                {!claimReady
                  ? "State your claim above (at least 10 characters)."
                  : hasInvalidEvidence
                    ? "Fix the highlighted evidence link — https:// only."
                    : "Add at least one https:// evidence link."}
              </span>
            )}
          </div>

          {/* TX hash row */}
          {chainTxHash && (
            <div
              className="px-8 py-4 flex items-center gap-4 flex-wrap border-b"
              style={{
                borderColor: "var(--color-rule)",
                background: "#080808",
              }}
            >
              <span
                className="font-[family-name:var(--font-mono)] uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "var(--color-ink-faint)",
                }}
              >
                TX
              </span>
              <div className="flex flex-col gap-1">
                <a
                  href={explorerTxUrl(chainTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-[family-name:var(--font-mono)]"
                  style={{
                    fontSize: 12,
                    color: "var(--color-accent)",
                    textDecoration: "none",
                  }}
                  title={chainTxHash}
                >
                  {truncateHex(chainTxHash)}
                </a>
                <a
                  href={explorerTxUrl(chainTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-[family-name:var(--font-mono)]"
                  style={{
                    fontSize: 11,
                    color: "var(--color-accent)",
                    textDecoration: "none",
                  }}
                >
                  View on GenLayer Explorer ↗
                </a>
              </div>
              {chainPhase === "waiting" && (
                <span
                  className="font-[family-name:var(--font-mono)] pulse-tribunal ml-auto"
                  style={{ fontSize: 11, color: "var(--color-accent)" }}
                >
                  Waiting for consensus…
                </span>
              )}
            </div>
          )}

          {/* Final Case Dossier — the full on-chain record */}
          {chainPhase === "resolved" && chainDossier && (
            <DossierBlock record={chainDossier} txHash={chainTxHash} />
          )}

          {/* No consensus — valid outcome, framed educationally */}
          {chainPhase === "no_consensus" && (
            <div className="px-8 py-8">
              <div className="flex items-baseline gap-6 mb-4 flex-wrap">
                <span
                  className="font-[family-name:var(--font-mono)] uppercase"
                  style={{
                    fontSize: 18,
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: "var(--color-verdict-und)",
                  }}
                >
                  The Jury Is Split
                </span>
                <span
                  className="font-[family-name:var(--font-mono)]"
                  style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
                >
                  Equivalence Principle · a valid outcome, not an error
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
                {chainMsg}
              </p>
            </div>
          )}

          {/* Error */}
          {chainPhase === "error" && (
            <div className="px-8 py-6">
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{ fontSize: 12, color: "var(--color-verdict-no)" }}
              >
                {chainMsg}
              </span>
              {chainTxHash && (
                <p
                  className="m-0 mt-2 font-[family-name:var(--font-mono)]"
                  style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
                >
                  Tx submitted: {chainTxHash} — check the explorer for status.
                </p>
              )}
            </div>
          )}

          {/* Panel footer */}
          <div
            className="px-8 py-4 border-t flex justify-between items-baseline gap-4 flex-wrap"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-surface)",
            }}
          >
            <span className="overline overline-faint">
              Powered by GenLayer Intelligent Contracts
            </span>
            <p
              className="m-0 font-[family-name:var(--font-mono)]"
              style={{
                fontSize: 10,
                color: "var(--color-ink-faint)",
                letterSpacing: "0.05em",
              }}
            >
              Evidence retrieved independently by validators · Consensus
              reached on-chain · Verifiable on Bradbury Explorer
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ── VerdictBar ────────────────────────────────────────────────────────────────

function VerdictBar({
  jurors,
  verdict,
  phase,
  tier,
  onAppeal,
}: {
  jurors: LiveJuror[];
  verdict: ReturnType<typeof useJury>["verdict"];
  phase: ReturnType<typeof useJury>["phase"];
  tier: 1 | 2;
  onAppeal: () => void;
}) {
  const tally = jurors.reduce(
    (acc, j) => {
      if (j.status === "yes") acc.yes += 1;
      else if (j.status === "no") acc.no += 1;
      else if (j.status === "und") acc.und += 1;
      else acc.pending += 1;
      return acc;
    },
    { yes: 0, no: 0, und: 0, pending: 0 },
  );

  const showAppeal =
    tier === 1 &&
    phase === "resolved" &&
    verdict &&
    (verdict.outcome === "no_consensus" || verdict.outcome === "undetermined");

  return (
    <div
      className="p-8 border border-t-0 grid grid-cols-[auto_1fr_auto] items-center gap-12 max-lg:grid-cols-1 max-lg:text-center"
      style={{
        borderColor: "var(--color-rule-strong)",
        background: "var(--color-surface)",
      }}
    >
      <div className="flex gap-8 items-baseline max-lg:justify-center">
        <Tally
          count={tally.yes}
          label="Accept"
          color="var(--color-verdict-yes)"
        />
        <Tally
          count={tally.no}
          label="Reject"
          color="var(--color-verdict-no)"
        />
        <Tally
          count={tally.und}
          label="Undet."
          color="var(--color-verdict-und)"
        />
        <Tally
          count={tally.pending}
          label="Pending"
          color="var(--color-ink-faint)"
        />
      </div>
      <div
        className="italic text-center"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          color: "var(--color-ink-muted)",
        }}
      >
        {phase === "idle" && (
          <span style={{ color: "var(--color-ink-faint)" }}>
            The jury awaits summons.
          </span>
        )}
        {phase === "deliberating" && (
          <span>
            {tier === 2 ? "Tier-2 appeal" : "Equivalence Principle"}:{" "}
            <em
              style={{
                color: "var(--color-accent)",
                fontWeight: 500,
                fontStyle: "italic",
              }}
            >
              calculating...
            </em>
          </span>
        )}
        {phase === "resolved" && verdict && (
          <div>
            <div>
              {tier === 2 ? "Tier-2 verdict" : "Equivalence Principle"}:{" "}
              <em
                style={{
                  color: outcomeColor[verdict.outcome],
                  fontWeight: 500,
                  fontStyle: "italic",
                }}
              >
                {verdict.voteText}
              </em>
            </div>
            <div
              className="caption mt-2"
              style={{
                fontSize: 12,
                color: "var(--color-ink-muted)",
                fontStyle: "normal",
                fontFamily: "var(--font-sans)",
              }}
            >
              {verdict.reason}
            </div>
          </div>
        )}
      </div>
      {showAppeal ? (
        <button
          onClick={onAppeal}
          className="font-[family-name:var(--font-mono)] uppercase px-5 py-3.5 border rounded-[2px] bg-transparent cursor-pointer max-lg:mx-auto"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--color-ink)",
            borderColor: "var(--color-accent)",
            transition:
              "border-color 0.12s var(--ease-tribunal), color 0.12s var(--ease-tribunal)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-ink)";
          }}
        >
          Appeal · double jury →
        </button>
      ) : (
        <div className="max-lg:hidden">&nbsp;</div>
      )}
    </div>
  );
}

// ── Tally ─────────────────────────────────────────────────────────────────────

function Tally({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div>
      <div
        className="font-[family-name:var(--font-display)] font-light leading-none"
        style={{
          fontSize: 48,
          letterSpacing: "-0.02em",
          color: count > 0 ? color : "var(--color-ink-faint)",
        }}
      >
        {count}
      </div>
      <span
        className="font-[family-name:var(--font-mono)] uppercase block mt-2"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "var(--color-ink-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
