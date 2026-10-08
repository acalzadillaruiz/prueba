"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";
import { heuristicSearchParse } from "@newplace/ai";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { queryToParams } from "./HeroSearch";

const MODES = [
  ["SALE", "Comprar", "Buy"],
  ["LONG_RENT", "Alquilar", "Rent"],
  ["SHORT_RENT", "Vacaciones", "Holidays"],
] as const;

// Every example returns real homes today (checked against the inventory): the first search is never empty.
const EXAMPLES: [string, string][] = [
  ["Un ático con vista al mar en Lechería", "A penthouse with sea views in Lechería"],
  ["Casa con piscina en El Morro", "A house with a pool in El Morro"],
  ["Apartamento de 2 habitaciones en Chacao", "A 2-bedroom apartment in Chacao"],
  ["Una villa en Margarita para las vacaciones", "A holiday villa in Margarita"],
];

/** Chips: one tap runs exactly what the label says, nothing hidden. [label es, label en, query es, query en] */
const CHIPS: [string, string, string, string][] = [
  ["Frente al mar", "By the sea", "frente al mar", "by the sea"],
  ["Con piscina", "With a pool", "con piscina", "with a pool"],
  ["Áticos", "Penthouses", "ático", "penthouse"],
  ["Exclusivas", "Exclusive", "exclusivas de lujo", "exclusive luxury"],
];

/**
 * Conversational search (2035 home): the visitor writes what they want the way they'd tell a friend; the parser
 * (AI when configured, local heuristics otherwise) turns it into filters. The placeholder types real examples.
 */
export function AskBar({ locale, className }: { locale: Locale; className?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("SALE");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Typewriter placeholder: writes an example, pauses, erases, next. Static under reduced motion.
  useEffect(() => {
    const list = EXAMPLES.map((e) => tx(locale, e[0], e[1]));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHint(list[0]);
      return;
    }
    let i = 0, n = 0, dir = 1, t: number;
    const step = () => {
      const s = list[i];
      n += dir;
      setHint(s.slice(0, n));
      let wait = dir > 0 ? 38 : 18;
      if (dir > 0 && n >= s.length) { dir = -1; wait = 2200; }
      else if (dir < 0 && n <= 0) { dir = 1; i = (i + 1) % list.length; wait = 400; }
      t = window.setTimeout(step, wait);
    };
    t = window.setTimeout(step, 900);
    return () => window.clearTimeout(t);
  }, [locale]);

  const go = async (raw: string) => {
    setBusy(true);
    let q = heuristicSearchParse(raw);
    if (raw.trim()) {
      try {
        const r = await fetch("/api/v1/ai/search-parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: raw, locale }) });
        if (r.ok) q = (await r.json()).query;
      } catch {}
    }
    if (!q.listingType) q.listingType = mode as never;
    router.push(`/${locale}/search?${queryToParams(q, raw).toString()}`);
  };

  return (
    <form
      data-hide-fab-mobile
      role="search"
      aria-label={tx(locale, "Buscar propiedades", "Search properties")}
      onSubmit={(e) => {
        e.preventDefault();
        void go(text);
      }}
      className={cn("np-glass w-full max-w-[760px] rounded-[28px] p-2.5 text-ink", className)}
    >
      <div className="flex items-center gap-1 px-1.5 pb-2 pt-1" role="group" aria-label={tx(locale, "Qué buscas", "What you're after")}>
        {MODES.map(([k, es, en]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => setMode(k)}
            className={cn(
              "min-h-11 rounded-full px-4 font-display text-[14px] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              mode === k ? "bg-ink text-ivory shadow-[0_6px_16px_-6px_rgba(30,26,24,.6)]" : "text-ink/65 hover:bg-white/70 hover:text-ink",
            )}
          >
            {tx(locale, es, en)}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 pr-2 font-display text-[12px] text-ink/70 sm:flex">
          <Sparkles size={13} aria-hidden /> {tx(locale, "Escríbelo como se lo dirías a un amigo", "Say it like you'd tell a friend")}
        </span>
      </div>
      <div className="relative flex items-center gap-2 rounded-[22px] bg-white/85 py-1.5 pl-5 pr-1.5 ring-1 ring-black/[.04] focus-within:ring-2 focus-within:ring-ink/70">
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={tx(locale, "Describe la casa que buscas", "Describe the home you're looking for")}
          className="peer min-h-12 w-full bg-transparent font-display text-[16px] text-ink placeholder:text-transparent focus:outline-none sm:text-[17px]"
          placeholder={tx(locale, "Describe la casa que buscas", "Describe the home you're looking for")}
        />
        {!text && (
          <span aria-hidden className="pointer-events-none absolute left-5 right-16 truncate font-display text-[16px] text-ink/60 sm:text-[17px]">
            {hint}
            <span className="np-caret" />
          </span>
        )}
        <button
          type="submit"
          aria-busy={busy}
          aria-label={tx(locale, "Buscar", "Search")}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-[18px] bg-coral-cta px-4 font-display text-[15px] font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-coral-cta-hover active:scale-95 sm:px-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="hidden sm:inline">{tx(locale, "Buscar", "Search")}</span>
          <ArrowUp size={18} aria-hidden className="rotate-45 sm:hidden" />
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-1.5 pb-1 pt-2.5">
        {CHIPS.map(([es, en, qEs, qEn]) => (
          <button
            key={es}
            type="button"
            onClick={() => {
              const v = tx(locale, qEs, qEn);
              setText(v);
              void go(v);
            }}
            className="min-h-11 shrink-0 rounded-full border border-ink/10 bg-white/50 px-3.5 font-display text-[13px] text-ink/75 transition-colors hover:border-ink/30 hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {tx(locale, es, en)}
          </button>
        ))}
      </div>
    </form>
  );
}
