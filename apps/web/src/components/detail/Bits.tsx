"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import type { Listing, Locale, PriceEvent } from "@/types/domain";
import { dateTime, money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function BilingualBody({ l, locale, dark }: { l: Listing; locale: Locale; dark?: boolean }) {
  const [lang, setLang] = useState<Locale>(locale);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Languages size={16} className={dark ? "text-mist" : "text-muted"} />
        {(["es", "en"] as Locale[]).map((x) => (
          // 44 px tap area around the small pill
          <button key={x} onClick={() => setLang(x)} aria-pressed={lang === x} className="-my-2.5 flex min-h-11 min-w-11 items-center justify-center">
            <span className={cn("rounded-full border-2 px-2.5 py-0.5 text-[13px] font-semibold tracking-[0.1em]", lang === x ? "np-sel" : cn("border-transparent", dark ? "text-mist" : "text-muted"))}>{x.toUpperCase()}</span>
          </button>
        ))}
        <span className={cn("text-sm", dark ? "text-mist" : "text-muted")}>{tx(locale, "En español e inglés", "In Spanish and English")}</span>
      </div>
      {/* The title is already the page's H1: this section is the description. */}
      <h2 className="font-serif text-[26px] leading-tight">{tx(locale, "Descripción", "Description")}</h2>
      {lang !== locale && (
        <p lang={lang} className="mt-2 text-[17px] font-semibold">
          {lang === "es" ? l.title_es : l.title_en}
        </p>
      )}
      <p lang={lang} className={cn("mt-3 max-w-[680px] text-[16px] leading-[1.75]", dark ? "text-ivory/80" : "text-ink/80")}>{lang === "es" ? l.body_es : l.body_en}</p>
    </div>
  );
}

export function PriceHistory({ events, locale, dark }: { events: PriceEvent[]; locale: Locale; dark?: boolean }) {
  const label: Record<PriceEvent["kind"], [string, string]> = {
    LISTED: ["Publicado", "Listed"],
    DROP: ["Bajó de precio", "Price cut"],
    RAISE: ["Subió de precio", "Price raised"],
    UNDER_OFFER: ["En oferta", "Under offer"],
    SOLD: ["Vendido", "Sold"],
  };
  return (
    // The scroller can take keyboard focus (to scroll on narrow screens), so it is a named region, not a bare div.
    <div role="region" aria-label={tx(locale, "Historial de precio", "Price history")} tabIndex={0} className={cn("overflow-x-auto rounded-xl border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink", dark ? "border-navy-line" : "border-line bg-white")}>
      <table className="w-full whitespace-nowrap text-sm">
        <tbody>
          {[...events].reverse().map((e, i, arr) => {
            const prev = arr[i + 1];
            const d = prev ? ((e.amount - prev.amount) / prev.amount) * 100 : 0;
            return (
              <tr key={i} className={cn(i && "border-t", dark ? "border-navy-line" : "border-line")}>
                <td className={cn("px-4 py-2.5", dark ? "text-mist" : "text-muted")}>{dateTime(e.date, locale, { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-2.5 font-semibold">{tx(locale, label[e.kind][0], label[e.kind][1])}</td>
                <td className="px-4 py-2.5 text-right font-serif text-[17px] font-light">{money(e.amount, locale)}</td>
                <td className={cn("w-20 px-4 py-2.5 text-right text-xs font-bold", d < 0 ? "text-ok" : d > 0 ? "text-danger" : "text-transparent")}>{d ? `${d.toFixed(1)} %` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
