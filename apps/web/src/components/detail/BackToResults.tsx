"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Locale } from "@/types/domain";
import { num, tx } from "@/lib/i18n";

/** Same-origin search path only (never an open redirect): "/es/search?…" or "/en/search…". */
const searchPath = (v: string | null) => (v && /^\/(?:es|en)\/search(?:[?#]|$)/.test(v) ? v : null);

/** Listing views mounted in this document: only the first one can trust `document.referrer` as "the page before". */
let mounts = 0;

/**
 * "← Resultados (22)": back to the last search when the visitor arrived from it. The search page stores its URL and
 * result count in sessionStorage (`np-last-search`, `np-last-search-count`), which lives only in this tab. When the
 * previous history entry is that search, it goes back (scroll and filters restored); otherwise it opens the stored URL.
 */
export function BackToResults({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [target, setTarget] = useState<{ href: string; count: number | null; back: boolean } | null>(null);
  useEffect(() => {
    const first = mounts++ === 0;
    let stored: string | null = null;
    let count: number | null = null;
    try {
      stored = searchPath(sessionStorage.getItem("np-last-search"));
      const c = Number(sessionStorage.getItem("np-last-search-count"));
      count = Number.isFinite(c) && c > 0 ? c : null;
    } catch {
      /* storage blocked */
    }
    let fromSearch = false;
    let refPath: string | null = null;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin) {
        refPath = searchPath(ref.pathname + ref.search);
        fromSearch = !!refPath;
      }
    } catch {
      /* bad referrer */
    }
    const href = stored ?? refPath;
    if (!href) return;
    // History back (keeps the list's scroll) only when the search is really the previous entry: a full page load
    // whose referrer is the search. After client-side hops the referrer is stale, so the stored URL is opened instead.
    setTarget({ href, count, back: first && fromSearch && window.history.length > 1 });
  }, []);
  if (!target) return null;
  const label = tx(locale, "Resultados", "Results");
  return (
    <a
      href={target.href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (target.back) router.back();
        else router.push(target.href);
      }}
      data-back-to-results
      className="np-glass np-in inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-display text-[14px] font-semibold text-ink shadow-[0_8px_24px_-14px_rgba(28,29,29,.35)] transition-colors duration-np hover:text-navy"
    >
      <ArrowLeft size={16} aria-hidden />
      {label}
      {target.count != null && <span className="text-muted [font-feature-settings:'lnum']">({num(target.count, locale)})</span>}
    </a>
  );
}
