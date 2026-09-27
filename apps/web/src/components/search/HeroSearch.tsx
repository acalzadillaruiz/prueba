"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { heuristicSearchParse } from "@newplace/ai";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function queryToParams(q: ReturnType<typeof heuristicSearchParse>, raw: string) {
  const p = new URLSearchParams();
  if (q.listingType) p.set("type", q.listingType);
  if (q.zone) p.set("zone", q.zone);
  if (q.maxPrice) p.set("max", String(q.maxPrice));
  if (q.minBeds) p.set("beds", String(q.minBeds));
  if (q.luxury) p.set("lux", "1");
  if (q.propertyKind) p.set("kind", q.propertyKind);
  // "con piscina / terraza / vista" → amenity filters; "acepta mascotas" → pets
  const am = q.keywords.filter((k) => ["pool", "terrace", "view"].includes(k));
  if (am.length) p.set("am", am.join(","));
  if (q.keywords.includes("pets")) p.set("pets", "1");
  if (raw) p.set("q", raw);
  return p;
}

export function HeroSearch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [tab, setTab] = useState("SALE");
  const [text, setText] = useState("");
  const tabs = [
    ["SALE", tx(locale, "Comprar", "Buy")],
    ["LONG_RENT", tx(locale, "Alquilar", "Rent")],
    ["SHORT_RENT", tx(locale, "Vacacional", "Vacation")],
    ["COMMERCIAL", tx(locale, "Comercial", "Commercial")],
    ["LUX", "Luxury"],
  ];
  const go = async () => {
    if (tab === "LUX" && !text) return router.push(`/${locale}/luxury`);
    let q = heuristicSearchParse(text);
    if (text.trim()) {
      try {
        const r = await fetch("/api/v1/ai/search-parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: text, locale }) });
        if (r.ok) q = (await r.json()).query;
      } catch {}
    }
    if (!q.listingType && tab !== "LUX") q.listingType = tab as never;
    if (tab === "LUX") q.luxury = true;
    router.push(`/${locale}/search?${queryToParams(q, text).toString()}`);
  };
  return (
    <div className="w-full max-w-2xl">
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={cn(
              "min-h-11 rounded-full px-4 font-display text-sm transition-colors duration-np",
              tab === k ? (k === "LUX" ? "bg-gold text-navy" : "bg-ivory text-navy") : k === "LUX" ? "border border-gold/50 text-gold hover:bg-gold/10" : "border border-white/20 text-ivory/85 hover:bg-white/10",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-np"
      >
        <Sparkles size={18} className="ml-2 shrink-0 text-coral" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink/65 focus:outline-none"
          placeholder={tx(locale, "Zona, dirección o escribe: «ático con luz en Los Palos Grandes por menos de 180 mil»", "Area, address or type: “3-bed in Chacao under 250k”")}
          aria-label={tx(locale, "Buscar", "Search")}
        />
        <button aria-label={tx(locale, "Buscar", "Search")} className="flex h-11 items-center gap-2 rounded-xl bg-coral-cta px-5 font-display font-medium text-white transition-colors duration-np hover:bg-coral-cta-hover">
          <Search size={17} /> <span className="hidden sm:inline">{tx(locale, "Buscar", "Search")}</span>
        </button>
      </form>
      <p className="mt-2.5 text-sm text-mist">
        {tx(locale, "Búsqueda en lenguaje natural con IA. Funciona sin API key (modelo local).", "Natural-language search. Works without an API key (local model).")}
      </p>
    </div>
  );
}
