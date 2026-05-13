"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type JuryCtx = { tier: 1 | 2; setTier: (t: 1 | 2) => void };

const JuryContext = createContext<JuryCtx>({ tier: 1, setTier: () => {} });

export function JuryProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<1 | 2>(1);
  return (
    <JuryContext.Provider value={{ tier, setTier }}>
      {children}
    </JuryContext.Provider>
  );
}

export function useJuryContext(): JuryCtx {
  return useContext(JuryContext);
}
