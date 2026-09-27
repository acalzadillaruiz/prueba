"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Role } from "@newplace/config";
import type { Agency } from "@/types/domain";
import { api } from "./api";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  agencyId: string | null;
  hue: number;
  initials: string;
  phone?: string;
}

interface Ctx {
  user: AppUser | null;
  /** false until the session is known (public pages load it in the browser). */
  ready: boolean;
  /** Re-read the session (after sign-in / demo switch on a public page). */
  refresh: () => Promise<void>;
  agency: Agency | null;
  saved: string[];
  compare: string[];
  toggleSaved: (id: string) => void;
  /** Returns false when the comparator is already full (3). */
  toggleCompare: (id: string) => boolean;
  requireLogin: () => boolean;
}

const AppCtx = createContext<Ctx | null>(null);
const CMP = "np-compare-v1";

type Session = { user: AppUser | null; agency: Agency | null; saved: string[] };

/**
 * Client state. Private areas pass the server-read session (`user` defined); public pages pass nothing and the
 * session is fetched from /api/v1/me/session, so their HTML carries no personal data and can be cached.
 */
export function AppStateProvider({ children, user: initialUser, agency: initialAgency = null, savedIds = [] }: { children: ReactNode; user?: AppUser | null; agency?: Agency | null; savedIds?: string[] }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } } }));
  const [user, setUser] = useState<AppUser | null>(initialUser ?? null);
  const [agency, setAgency] = useState<Agency | null>(initialAgency);
  const [ready, setReady] = useState(initialUser !== undefined);
  const [saved, setSaved] = useState(savedIds);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/me/session", { credentials: "same-origin", cache: "no-store" });
      if (r.ok) {
        const s = (await r.json()) as Session;
        setUser(s.user);
        setAgency(s.agency);
        setSaved(s.saved);
      }
    } catch {
      // offline: keep what we have
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    if (initialUser === undefined) void refresh();
  }, [initialUser, refresh]);
  const [compare, setCompare] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      setAgency(initialAgency);
      setSaved(savedIds);
    }
  }, [initialUser, initialAgency, savedIds]);
  useEffect(() => {
    try {
      setCompare(JSON.parse(localStorage.getItem(CMP) ?? "[]"));
    } catch {}
  }, []);

  const requireLogin = useCallback(() => {
    if (user) return true;
    // Session still loading (public pages fetch it after first paint): a signed-in user must not be bounced to the
    // login screen for clicking early. Do nothing; the next click has the session.
    if (!ready) return false;
    const locale = pathname.split("/")[1] || "es";
    // Keep the full query (filters, sort, drawn area) so the user lands back on the same search after login.
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.push(`/${locale}/login?next=${encodeURIComponent(pathname + search)}`);
    return false;
  }, [user, ready, pathname, router]);

  const toggleSaved = useCallback(
    (id: string) => {
      if (!requireLogin()) return;
      const on = !saved.includes(id);
      setSaved((s) => (on ? [id, ...s] : s.filter((x) => x !== id)));
      api<{ ids: string[] }>("me/saved", { method: "POST", json: { listingId: id, saved: on } })
        .then((r) => setSaved(r.ids))
        .catch(() => setSaved((s) => (on ? s.filter((x) => x !== id) : [id, ...s])));
    },
    [saved, requireLogin],
  );

  const toggleCompare = useCallback(
    (id: string) => {
      if (!compare.includes(id) && compare.length >= 3) return false;
      const next = compare.includes(id) ? compare.filter((x) => x !== id) : [...compare, id];
      setCompare(next);
      try {
        localStorage.setItem(CMP, JSON.stringify(next));
      } catch {}
      return true;
    },
    [compare],
  );

  const value = useMemo(() => ({ user, ready, refresh, agency, saved, compare, toggleSaved, toggleCompare, requireLogin }), [user, ready, refresh, agency, saved, compare, toggleSaved, toggleCompare, requireLogin]);
  return (
    <QueryClientProvider client={client}>
      <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
    </QueryClientProvider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
