"use client";

import { useJuryContext } from "@/lib/JuryContext";

export function Docket({ subtitle }: { subtitle?: string }) {
  const { tier } = useJuryContext();
  return (
    <header
      className="flex justify-between items-center px-8 py-5 border-b sticky top-0 z-50 backdrop-blur-md"
      style={{
        borderColor: "var(--color-rule)",
        background: "rgba(5, 5, 5, 0.85)",
      }}
    >
      <div className="overline">GenLayer · Court of the Internet</div>
      <div className="overline overline-faint">
        {subtitle ?? `Case №24·001 — ${tier === 2 ? "On Appeal" : "In Session"}`}
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
