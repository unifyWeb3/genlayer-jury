"use client";

// Final Case Dossier — renders the full stored record of a v2 dispute.
// Every field shown here comes from the contract's get_verdict view, never
// from receipt parsing. agreement_strength_bps is the leader's in-band
// confidence signal (0–1000) — it is NOT a validator vote count; vote data
// lives only in the explorer receipt.

export type V2DossierRecord = {
  dispute_id: string;
  claim: string;
  criteria: string;
  requested_remedy: string;
  mode: string;
  evidence_urls: string[];
  evidence_hashes: string[];
  evidence_summary: string;
  verdict: string; // UPHELD | DISMISSED | UNDETERMINED
  reasoning: string;
  agreement_strength_bps: number;
  remedy_follows: boolean;
  status: string; // resolved | no_consensus
  why_consensus: string;
};

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL?.replace(/\/$/, "") ??
  "https://explorer-bradbury.genlayer.com";

function explorerTxUrl(hash: string) {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

function truncateHex(hex: string): string {
  return hex.length > 18 ? hex.slice(0, 10) + "…" + hex.slice(-6) : hex;
}

const VERDICT_COLOR: Record<string, string> = {
  UPHELD: "var(--color-verdict-yes)",
  DISMISSED: "var(--color-verdict-no)",
  UNDETERMINED: "var(--color-verdict-und)",
};

export function DossierBlock({
  record,
  txHash,
}: {
  record: V2DossierRecord;
  txHash: string;
}) {
  const verdictColor =
    VERDICT_COLOR[record.verdict] ?? "var(--color-ink-muted)";
  const isSplit = record.status === "no_consensus";
  const hasRemedy = record.requested_remedy.trim().length > 0;

  return (
    <div>
      {/* Verdict */}
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
            {record.verdict}
          </span>
          <span
            className="font-[family-name:var(--font-mono)]"
            style={{ fontSize: 11, color: "var(--color-ink-faint)" }}
          >
            Official GenLayer Verdict · Equivalence Principle ·{" "}
            {record.mode.replace("_", "-")} mode
          </span>
        </div>
        {isSplit && (
          <p
            className="m-0 mb-3 font-[family-name:var(--font-mono)]"
            style={{ fontSize: 12, color: "var(--color-verdict-und)" }}
          >
            The jury is split — the evidence could not determine this claim.
            A valid consensus outcome, not an error.
          </p>
        )}
        <p
          className="m-0"
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--color-ink-muted)",
          }}
        >
          {record.reasoning}
        </p>

        <div className="flex gap-8 mt-6 flex-wrap">
          <span
            className="font-[family-name:var(--font-mono)] uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--color-ink)",
            }}
          >
            Consensus Signal:{" "}
            <span style={{ color: "var(--color-accent)" }}>
              {record.agreement_strength_bps}/1000
            </span>
          </span>
          {hasRemedy && (
            <span
              className="font-[family-name:var(--font-mono)] uppercase"
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "var(--color-ink)",
              }}
            >
              Remedy follows:{" "}
              <span
                style={{
                  color: record.remedy_follows
                    ? "var(--color-verdict-yes)"
                    : "var(--color-ink-muted)",
                }}
              >
                {record.remedy_follows ? "Yes" : "No"}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Evidence */}
      <div
        className="px-8 py-6 border-t"
        style={{ borderColor: "var(--color-rule)", background: "#080808" }}
      >
        <span className="overline block mb-4">
          Evidence — fetched and hashed by validators
        </span>
        <div className="flex flex-col gap-3">
          {record.evidence_urls.map((url, i) => {
            const hash = record.evidence_hashes[i] ?? "";
            return (
              <div key={url} className="flex flex-col gap-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-[family-name:var(--font-mono)] break-all"
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-muted)",
                    textDecoration: "none",
                  }}
                >
                  {url}
                </a>
                <span
                  className="font-[family-name:var(--font-mono)]"
                  style={{
                    fontSize: 11,
                    color: hash
                      ? "var(--color-ink-faint)"
                      : "var(--color-verdict-und)",
                  }}
                >
                  {hash
                    ? `sha256: ${hash.slice(0, 16)}…`
                    : "fetch failed — source not used"}
                </span>
              </div>
            );
          })}
        </div>
        {record.evidence_summary && (
          <p
            className="m-0 mt-4 font-[family-name:var(--font-mono)]"
            style={{
              fontSize: 11,
              lineHeight: 1.6,
              color: "var(--color-ink-faint)",
              letterSpacing: "0.02em",
            }}
          >
            {record.evidence_summary}
          </p>
        )}
      </div>

      {/* Why consensus was needed */}
      <div
        className="px-8 py-6 border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <span className="overline block mb-3">
          Why a deterministic blockchain couldn&apos;t answer this
        </span>
        <p
          className="m-0"
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: "var(--color-ink-muted)",
          }}
        >
          {record.why_consensus}
        </p>
      </div>

      {/* Proof */}
      {txHash && (
        <div
          className="px-8 py-4 border-t flex items-center gap-4 flex-wrap"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <span
            className="font-[family-name:var(--font-mono)] uppercase"
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "var(--color-ink-faint)",
            }}
          >
            Proof
          </span>
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-mono)]"
            style={{
              fontSize: 12,
              color: "var(--color-accent)",
              textDecoration: "none",
            }}
            title={txHash}
          >
            {truncateHex(txHash)} · View on GenLayer Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
