"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Incognito mode.
 *
 * Shared, because two places need to know: the toggle in the chat header and
 * the empty-state greeting. It lived in the header's own useState, which made
 * the greeting unable to see it — so the control looked live and changed
 * nothing.
 *
 * Persisted because it is a standing preference rather than a per-message flag,
 * and read in an effect for the same reason as the theme: there is no storage
 * during a server render, and a first render that disagreed with the client's
 * would be a hydration mismatch.
 */
const STORAGE_KEY = "pawzz.incognito";

type IncognitoState = {
  on: boolean;
  toggle: () => void;
  set: (on: boolean) => void;
};

const IncognitoContext = createContext<IncognitoState | null>(null);

function read(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function write(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Blocked storage: the toggle still works for this session.
  }
}

export function IncognitoProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(read());
  }, []);

  const value = useMemo<IncognitoState>(
    () => ({
      on,
      toggle: () => setOn((current) => !current),
      set: (next) => setOn(next),
    }),
    [on],
  );

  useEffect(() => {
    // Only persist once the stored value has been read, or mounting would
    // immediately clear a preference the user had set.
    if (read() !== on) write(on);
  }, [on]);

  return <IncognitoContext.Provider value={value}>{children}</IncognitoContext.Provider>;
}

export function useIncognito(): IncognitoState {
  const context = useContext(IncognitoContext);
  if (!context) {
    throw new Error("useIncognito must be used inside <IncognitoProvider>");
  }
  return context;
}
