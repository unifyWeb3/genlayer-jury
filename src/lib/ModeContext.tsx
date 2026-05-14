"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type JuryMode = "mocked" | "live";

type ModeCtx = {
  mode: JuryMode;
  setMode: (m: JuryMode) => void;
  canSwitch: boolean;
  setJuryBusy: (busy: boolean) => void;
};

const ModeContext = createContext<ModeCtx>({
  mode: "mocked",
  setMode: () => {},
  canSwitch: true,
  setJuryBusy: () => {},
});

const SESSION_KEY = "the-jury-mode";

export function ModeProvider({ children }: { children: ReactNode }) {
  const envDefault: JuryMode =
    process.env.NEXT_PUBLIC_LIVE_JURY === "true" ? "live" : "mocked";

  const [mode, setModeState] = useState<JuryMode>(envDefault);
  const [juryBusy, setJuryBusy] = useState(false);

  // Hydrate from sessionStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === "live" || stored === "mocked") {
      setModeState(stored);
    }
  }, []);

  const setMode = useCallback((m: JuryMode) => {
    setModeState(m);
    sessionStorage.setItem(SESSION_KEY, m);
  }, []);

  return (
    <ModeContext.Provider
      value={{ mode, setMode, canSwitch: !juryBusy, setJuryBusy }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeCtx {
  return useContext(ModeContext);
}
