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

export function AppStateProvider({ children, user, agency, savedIds }: { children: ReactNode; user: AppUser | null; agency: Agency | null; savedIds: string[] }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } } }));
  const [saved, setSaved] = useState(savedIds);
  const [compare, setCompare] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setSaved(savedIds), [savedIds]);
  useEffect(() => {
    try {
      setCompare(JSON.parse(localStorage.getItem(CMP) ?? "[]"));
    } catch {}
  }, []);

  const requireLogin = useCallback(() => {
    if (user) return true;
    const locale = pathname.split("/")[1] || "es";
    router.push(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
    return false;
  }, [user, pathname, router]);

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

  const value = useMemo(() => ({ user, agency, saved, compare, toggleSaved, toggleCompare, requireLogin }), [user, agency, saved, compare, toggleSaved, toggleCompare, requireLogin]);
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
