"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { heuristicSearchParse } from "@newplace/ai";
import type { Locale } from "@/types/domain";
import { money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { usePlaceSuggest } from "./PlaceSuggest";

export { queryToParams } from "./queryParams";
import { queryToParams } from "./queryParams";

const TABS = [
  ["SALE", "Comprar", "Buy"],
  ["LONG_RENT", "Alquilar", "Rent"],
  ["SHORT_RENT", "Vacacional", "Holiday rentals"],
] as const;
type Tab = (typeof TABS)[number][0];

const BUDGETS: Record<Tab, number[]> = {
  SALE: [150_000, 250_000, 500_000, 1_000_000, 1_500_000],
  LONG_RENT: [800, 1500, 3000],
  SHORT_RENT: [100, 250, 500],
};

const KINDS: [string, string, string][] = [
  ["house", "Casa o villa", "House or villa"],
  ["apartment", "Apartamento", "Apartment"],
  ["penthouse", "Penthouse", "Penthouse"],
  ["land", "Terreno", "Land"],
];

/**
 * Home search box (brand v4): tabs + location (accepts natural language) + type + budget, and the screen's only
 * terracotta action, "Buscar". Selected tab = navy tint with a 2 px navy border.
 */
export function HeroSearch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("SALE");
  const [text, setText] = useState("");
  const [kind, setKind] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const suffix = tab === "LONG_RENT" ? tx(locale, " / mes", " / mo") : tab === "SHORT_RENT" ? tx(locale, " / noche", " / night") : "";
  const suggest = usePlaceSuggest({ locale, text, setText });
  const go = async () => {
    setBusy(true);
    let q = heuristicSearchParse(text);
    if (text.trim()) {
      try {
        const r = await fetch("/api/v1/ai/search-parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: text, locale }) });
        if (r.ok) q = (await r.json()).query;
      } catch {}
    }
    if (!q.listingType) q.listingType = tab as never;
    if (kind && !q.propertyKind) q.propertyKind = kind as never;
    if (budget && !q.maxPrice) q.maxPrice = Number(budget);
    router.push(`/${locale}/search?${queryToParams(q, text).toString()}`);
  };
  const label = "np-eyebrow block text-[10.5px] tracking-[0.18em] text-[#6B4F2C]";
  const field = "w-full bg-transparent font-display text-[15px] text-[#1E1A18] placeholder:text-[#1E1A18]/50 focus:outline-none";
  return (
    <form
      data-hide-fab-mobile
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      role="search"
      aria-label={tx(locale, "Busca tu casa", "Find your home")}
      className="w-full max-w-[980px] rounded-[22px] bg-[#F1EBE3] p-3 text-[#1E1A18] shadow-[0_24px_60px_rgba(21,18,15,.35)] lg:rounded-full lg:p-2"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-0">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-[#EDE4D5] p-1 lg:flex lg:shrink-0" role="group" aria-label={tx(locale, "¿Qué quieres hacer?", "What are you looking to do?")}>
          {TABS.map(([k, es, en]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(k);
                setBudget("");
              }}
              aria-pressed={tab === k}
              className={cn(
                "min-h-11 rounded-full border-2 px-4 font-display text-[15px] transition-colors duration-np",
                tab === k ? "border-[#1E1A18] bg-[#E6DDD2] font-semibold text-[#1E1A18]" : "border-transparent text-[#1E1A18]/70 hover:text-[#1E1A18]",
              )}
            >
              {tx(locale, es, en)}
            </button>
          ))}
        </div>
        <label className="relative flex min-h-[52px] min-w-0 flex-1 flex-col justify-center rounded-2xl border border-[#8F8370]/50 bg-[#ffffff99] px-4 focus-within:border-[#1E1A18] lg:rounded-none lg:border-0 lg:border-r lg:border-[#D8CBB7] lg:bg-transparent lg:px-5">
          <span className={cn(label, "hidden lg:block")}>{tx(locale, "Ubicación", "Location")}</span>
          <input
            {...suggest.inputProps}
            value={text}
            className={field}
            placeholder={tx(locale, "El Morro, Lechería…", "El Morro, Lechería…")}
            aria-label={tx(locale, "Dónde, o qué buscas", "Where, or what you’re after")}
          />
          {suggest.listbox}
        </label>
        <div className="hidden lg:contents">
          <label className="flex min-h-[52px] w-[170px] shrink-0 flex-col justify-center border-r border-[#D8CBB7] px-5">
            <span className={label}>{tx(locale, "Tipo", "Type")}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={cn(field, "-ml-1 cursor-pointer appearance-none")} aria-label={tx(locale, "Tipo de casa o inmueble", "Type of home")}>
              <option value="">{tx(locale, "Cualquier tipo", "Any type")}</option>
              {KINDS.map(([v, es, en]) => (
                <option key={v} value={v}>{tx(locale, es, en)}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[52px] w-[190px] shrink-0 flex-col justify-center px-5">
            <span className={label}>{tx(locale, "Presupuesto", "Budget")}</span>
            <select value={budget} onChange={(e) => setBudget(e.target.value)} className={cn(field, "-ml-1 cursor-pointer appearance-none")} aria-label={tx(locale, "Presupuesto máximo", "Maximum budget")}>
              <option value="">{tx(locale, "Sin límite", "No limit")}</option>
              {BUDGETS[tab].map((v) => (
                <option key={v} value={v}>{tx(locale, "Hasta", "Up to")} {money(v, locale)}{suffix}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          aria-busy={busy}
          className="flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-full bg-coral-cta px-8 font-display text-[15px] font-semibold text-white transition-colors duration-np hover:bg-coral-cta-hover lg:min-h-12"
        >
          <Search size={17} aria-hidden className="lg:hidden" />
          <span className="lg:hidden">{tx(locale, "Buscar casas", "Find homes")}</span>
          <span className="hidden lg:inline">{tx(locale, "Buscar", "Search")}</span>
        </button>
      </div>
    </form>
  );
}
