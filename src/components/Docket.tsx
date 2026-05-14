"use client";

import { useJuryContext } from "@/lib/JuryContext";
import { useMode } from "@/lib/ModeContext";

const pillBase: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  padding: "4px 10px",
  borderRadius: 2,
  border: "1px solid",
  background: "transparent",
  textTransform: "uppercase",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  transition:
    "background 0.15s var(--ease-tribunal), border-color 0.15s var(--ease-tribunal), color 0.15s var(--ease-tribunal)",
};

const activePill: React.CSSProperties = {
  ...pillBase,
  background: "rgba(197,255,60,0.08)",
  borderColor: "var(--color-accent)",
  color: "var(--color-accent)",
  cursor: "default",
};

const inactivePill: React.CSSProperties = {
  ...pillBase,
  borderColor: "var(--color-rule-strong)",
  color: "var(--color-ink-muted)",
  cursor: "pointer",
};

const disabledPill: React.CSSProperties = {
  ...pillBase,
  borderColor: "var(--color-rule-strong)",
  color: "var(--color-ink-muted)",
  cursor: "not-allowed",
  opacity: 0.4,
};

export function Docket({ subtitle }: { subtitle?: string }) {
  const { tier } = useJuryContext();
  const { mode, setMode, canSwitch } = useMode();

  const getMockedStyle = () => {
    if (!canSwitch) return disabledPill;
    return mode === "mocked" ? activePill : inactivePill;
  };

  const getLiveStyle = () => {
    if (!canSwitch) return disabledPill;
    return mode === "live" ? activePill : inactivePill;
  };

  const tooltip = !canSwitch ? "Reset jury to switch modes" : undefined;

  return (
    <header
      className="flex justify-between items-center px-8 py-5 border-b sticky top-0 z-50 backdrop-blur-md"
      style={{
        borderColor: "var(--color-rule)",
        background: "rgba(5, 5, 5, 0.85)",
      }}
    >
      <div className="overline">GenLayer · Court of the Internet</div>
      <div className="flex max-sm:flex-col max-sm:items-end items-center gap-3">
        <div className="overline overline-faint whitespace-nowrap">
          {subtitle ?? `Case №24·001 — ${tier === 2 ? "On Appeal" : "In Session"}`}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            style={getMockedStyle()}
            onClick={() => canSwitch && mode !== "mocked" && setMode("mocked")}
            disabled={!canSwitch}
            title={tooltip}
            aria-pressed={mode === "mocked"}
          >
            ⚙ Mocked
          </button>
          <button
            style={getLiveStyle()}
            onClick={() => canSwitch && mode !== "live" && setMode("live")}
            disabled={!canSwitch}
            title={tooltip}
            aria-pressed={mode === "live"}
          >
            {mode === "live" && (
              <span
                aria-hidden
                className="pulse-tribunal"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  flexShrink: 0,
                }}
              />
            )}
            Live
          </button>
        </div>
      </div>
    </header>
  );
}

export function DocketFoot() {
  return (
    <footer
      className="flex justify-between items-center px-8 py-6 border-t mt-32 flex-wrap gap-4"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="overline overline-faint">
        Filed: GenLayer Builder Program · Educational Content
      </div>
      <div className="overline overline-faint">v0.1.0 — Canonical Reference</div>
    </footer>
  );
}
