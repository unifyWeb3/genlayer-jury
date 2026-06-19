const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL?.replace(/\/$/, "") ??
  "https://studio.genlayer.com";

const flightAddress = process.env.NEXT_PUBLIC_FLIGHT_CONTRACT_ADDRESS ?? "";
const disputeAddress = process.env.NEXT_PUBLIC_DISPUTE_COURT_ADDRESS ?? "";

function explorerAddressUrl(address: string) {
  return `${EXPLORER_BASE}/address/${address}`;
}

function truncateAddress(address: string) {
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

export function DeployedContracts() {
  return (
    <section
      className="max-w-[1280px] mx-auto px-8 py-16 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex justify-between items-baseline gap-4 max-lg:flex-col">
        <div>
          <span className="overline overline-accent">Verified on-chain registry</span>
          <p
            className="mt-4"
            style={{ fontSize: 15, lineHeight: 1.75, color: "var(--color-ink-muted)" }}
          >
            Every verdict on The Jury is reached by GenLayer validators on these deployed
            intelligent contracts. Click any address to inspect the contract on-chain.
          </p>
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.15em]" style={{ color: "var(--color-ink-faint)" }}>
          Live · Studionet
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-10 max-lg:grid-cols-1">
        <a
          href={flightAddress ? explorerAddressUrl(flightAddress) : EXPLORER_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="border p-6 no-underline"
          style={{ borderColor: "var(--color-rule-strong)", background: "var(--color-surface)" }}
        >
          <div className="font-[family-name:var(--font-mono)] uppercase" style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--color-ink-faint)" }}>
            FlightDelayDispute · Strict mode
          </div>
          <div className="mt-4 font-[family-name:var(--font-mono)]" style={{ fontSize: 14, color: "var(--color-ink)" }}>
            {truncateAddress(flightAddress)}
          </div>
          <div className="mt-3 font-[family-name:var(--font-mono)]" style={{ fontSize: 11, color: "var(--color-accent)" }}>
            View on GenLayer Explorer ↗
          </div>
        </a>

        <a
          href={disputeAddress ? explorerAddressUrl(disputeAddress) : EXPLORER_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="border p-6 no-underline"
          style={{ borderColor: "var(--color-rule-strong)", background: "var(--color-surface)" }}
        >
          <div className="font-[family-name:var(--font-mono)] uppercase" style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--color-ink-faint)" }}>
            DisputeCourt · Generic adjudication
          </div>
          <div className="mt-4 font-[family-name:var(--font-mono)]" style={{ fontSize: 14, color: "var(--color-ink)" }}>
            {truncateAddress(disputeAddress)}
          </div>
          <div className="mt-3 font-[family-name:var(--font-mono)]" style={{ fontSize: 11, color: "var(--color-accent)" }}>
            View on GenLayer Explorer ↗
          </div>
        </a>
      </div>
    </section>
  );
}
