"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lead } from "@/types/domain";
import { LEADS } from "@/mock/ops";
import { minutesAgo } from "@/mock/people";

/**
 * Prototype-only client state (demo session, saved, compare, created leads, takedowns).
 * Production replaces this with Auth.js sessions + REST API (/api/v1) + Postgres.
 */
interface DemoState {
  userId: string | null;
  saved: string[];
  compare: string[];
  extraLeads: Lead[];
  takedowns: string[];
  aiProvider: "heuristic" | "openai-compatible";
}

const DEFAULT: DemoState = {
  userId: "u-seeker",
  saved: [],
  compare: [],
  extraLeads: [],
  takedowns: [],
  aiProvider: "heuristic",
};

interface Ctx extends DemoState {
  ready: boolean;
  login: (id: string | null) => void;
  toggleSaved: (id: string) => void;
  toggleCompare: (id: string) => void;
  addLead: (l: Omit<Lead, "id" | "createdAt" | "stage" | "messages">) => Lead;
  toggleTakedown: (id: string) => void;
  setAi: (p: DemoState["aiProvider"]) => void;
  leads: Lead[];
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);
const KEY = "np-demo-v1";

export function DemoStoreProvider({ children, initialSaved }: { children: ReactNode; initialSaved: string[] }) {
  const [state, setState] = useState<DemoState>({ ...DEFAULT, saved: initialSaved });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const login = useCallback((id: string | null) => setState((s) => ({ ...s, userId: id })), []);
  const toggleSaved = useCallback(
    (id: string) => setState((s) => ({ ...s, saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [id, ...s.saved] })),
    [],
  );
  const toggleCompare = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        compare: s.compare.includes(id) ? s.compare.filter((x) => x !== id) : [...s.compare, id].slice(-3),
      })),
    [],
  );
  const addLead = useCallback((l: Omit<Lead, "id" | "createdAt" | "stage" | "messages">) => {
    const lead: Lead = { ...l, id: `ld-new-${Date.now().toString(36)}`, createdAt: minutesAgo(0), stage: "NEW", messages: 1 };
    setState((s) => ({ ...s, extraLeads: [lead, ...s.extraLeads] }));
    return lead;
  }, []);
  const toggleTakedown = useCallback(
    (id: string) => setState((s) => ({ ...s, takedowns: s.takedowns.includes(id) ? s.takedowns.filter((x) => x !== id) : [...s.takedowns, id] })),
    [],
  );
  const setAi = useCallback((p: DemoState["aiProvider"]) => setState((s) => ({ ...s, aiProvider: p })), []);
  const reset = useCallback(() => setState({ ...DEFAULT, saved: initialSaved }), [initialSaved]);

  const value = useMemo<Ctx>(
    () => ({ ...state, ready, login, toggleSaved, toggleCompare, addLead, toggleTakedown, setAi, reset, leads: [...state.extraLeads, ...LEADS] }),
    [state, ready, login, toggleSaved, toggleCompare, addLead, toggleTakedown, setAi, reset],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useDemo() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useDemo outside provider");
  return c;
}
