"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Role } from "@newplace/config";
import type { Agency } from "@/types/domain";
import { api, ApiClientError } from "./api";
import { SignupPrompt } from "@/components/seeker/SignupPrompt";

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
  /** Empties the comparator (tray "Vaciar"). */
  clearCompare: () => void;
  /**
   * true when signed in. Otherwise: "alert" (and any call on the search page, whose only gated action is
   * "Guardar búsqueda") opens a small "create your account" dialog; other reasons go to /login?next=…&reason=….
   */
  requireLogin: (reason?: LoginReason) => boolean;
}

export type LoginReason = "save" | "alert";

const AppCtx = createContext<Ctx | null>(null);
const CMP = "np-compare-v1";
/** Homes saved by a visitor without an account: kept on the device, moved into the account on sign-in. */
export const SAVED_LOCAL = "np-saved-local";
const MAX_LOCAL_SAVED = 100;

function readIds(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 64) : [];
  } catch {
    return [];
  }
}
function writeIds(key: string, ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(key, JSON.stringify(ids));
    else localStorage.removeItem(key);
  } catch {}
}

let merging: Promise<string[] | null> | null = null;
/**
 * Moves the device's saved homes into the signed-in account (existing save API, one call per id), then clears them.
 * Returns the account's saved ids, or null when there was nothing to move. Shared between providers (one run at a time).
 */
export function mergeLocalSaved(): Promise<string[] | null> {
  if (merging) return merging;
  const ids = typeof window === "undefined" ? [] : readIds(SAVED_LOCAL);
  if (!ids.length) return Promise.resolve(null);
  merging = (async () => {
    let last: string[] | null = null;
    const left: string[] = [];
    // Oldest first, so the account keeps the visitor's order (newest first).
    for (const id of [...ids].reverse()) {
      try {
        last = (await api<{ ids: string[] }>("me/saved", { method: "POST", json: { listingId: id, saved: true } })).ids;
      } catch (e) {
        // Not signed in after all / network: keep it on the device for the next try. Gone listings (404) are dropped.
        if (!(e instanceof ApiClientError) || e.status === 401 || e.status >= 500) left.unshift(id);
      }
    }
    writeIds(SAVED_LOCAL, left);
    return last;
  })().finally(() => {
    merging = null;
  });
  return merging;
}

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
  const [accountSaved, setSaved] = useState(savedIds);
  // Visitor without an account: hearts live on the device until they sign in.
  const [localSaved, setLocalSaved] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<LoginReason | null>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/me/session", { credentials: "same-origin", cache: "no-store" });
      if (r.ok) {
        const s = (await r.json()) as Session;
        // Just signed in (or came back signed in): move the device's hearts into the account before showing it.
        const merged = s.user ? await mergeLocalSaved().catch(() => null) : null;
        if (merged) setLocalSaved([]);
        setUser(s.user);
        setAgency(s.agency);
        setSaved(merged ?? s.saved);
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
    setCompare(readIds(CMP).slice(0, 3));
    setLocalSaved(readIds(SAVED_LOCAL));
    // Other tabs (and the other provider on private pages) change the same keys.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CMP || e.key === null) setCompare(readIds(CMP).slice(0, 3));
      if (e.key === SAVED_LOCAL || e.key === null) setLocalSaved(readIds(SAVED_LOCAL));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // Private pages get the user from the server (e.g. back from Google sign-in): merge the device's hearts there too.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || initialUser === undefined) return;
    let live = true;
    mergeLocalSaved()
      .then((ids) => {
        if (live && ids) {
          setSaved(ids);
          setLocalSaved([]);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, initialUser]);
  const saved = user ? accountSaved : localSaved;

  const requireLogin = useCallback(
    (reason?: LoginReason) => {
      if (user) return true;
      // Session still loading (public pages fetch it after first paint): a signed-in user must not be bounced to the
      // login screen for clicking early. Do nothing; the next click has the session.
      if (!ready) return false;
      const locale = pathname.split("/")[1] || "es";
      // On the search page the only gated action is "Guardar búsqueda": ask kindly instead of leaving the page.
      const why = reason ?? (/^\/(es|en)\/search\/?$/.test(pathname) ? "alert" : undefined);
      if (why === "alert") {
        setPrompt("alert");
        return false;
      }
      // Keep the full query (filters, sort, drawn area) so the user lands back on the same search after login.
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.push(`/${locale}/login?next=${encodeURIComponent(pathname + search)}${why ? `&reason=${why}` : ""}`);
      return false;
    },
    [user, ready, pathname, router],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      if (!user) {
        // No account (or session still loading): keep it on the device; it moves into the account on sign-in.
        const cur = readIds(SAVED_LOCAL);
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, MAX_LOCAL_SAVED);
        writeIds(SAVED_LOCAL, next);
        setLocalSaved(next);
        return;
      }
      const on = !saved.includes(id);
      setSaved((s) => (on ? [id, ...s] : s.filter((x) => x !== id)));
      api<{ ids: string[] }>("me/saved", { method: "POST", json: { listingId: id, saved: on } })
        .then((r) => setSaved(r.ids))
        .catch(() => setSaved((s) => (on ? s.filter((x) => x !== id) : [id, ...s])));
    },
    [saved, user],
  );

  const toggleCompare = useCallback(
    (id: string) => {
      if (!compare.includes(id) && compare.length >= 3) return false;
      const next = compare.includes(id) ? compare.filter((x) => x !== id) : [...compare, id];
      setCompare(next);
      writeIds(CMP, next);
      return true;
    },
    [compare],
  );
  const clearCompare = useCallback(() => {
    setCompare([]);
    writeIds(CMP, []);
  }, []);

  const value = useMemo(
    () => ({ user, ready, refresh, agency, saved, compare, toggleSaved, toggleCompare, clearCompare, requireLogin }),
    [user, ready, refresh, agency, saved, compare, toggleSaved, toggleCompare, clearCompare, requireLogin],
  );
  const locale = pathname.split("/")[1] === "en" ? "en" : "es";
  return (
    <QueryClientProvider client={client}>
      <AppCtx.Provider value={value}>
        {children}
        {prompt && <SignupPrompt locale={locale} reason={prompt} onClose={() => setPrompt(null)} />}
      </AppCtx.Provider>
    </QueryClientProvider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
