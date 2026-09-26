"use client";

import { Info, Sparkles } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { useDemo } from "@/lib/store";
import { money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { listingById } from "@/mock/listings";

export function EstimateCard({ l, locale, dark, showComparables = true }: { l: Listing; locale: Locale; dark?: boolean; showComparables?: boolean }) {
  const { aiProvider } = useDemo();
  const e = l.estimate;
  const lo = Math.min(e.low, l.priceAmount) * 0.97;
  const hi = Math.max(e.high, l.priceAmount) * 1.03;
  const at = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const pos = at(l.priceAmount);
  const diff = ((l.priceAmount - e.mid) / e.mid) * 100;
  const verdict = Math.abs(diff) <= 4 ? tx(locale, "En línea con el mercado", "In line with the market") : diff > 0 ? tx(locale, `${diff.toFixed(0)} % sobre la estimación`, `${diff.toFixed(0)}% above estimate`) : tx(locale, `${Math.abs(diff).toFixed(0)} % bajo la estimación`, `${Math.abs(diff).toFixed(0)}% below estimate`);
  const muted = dark ? "text-mist" : "text-ink/55";
  return (
    <div className={cn("rounded-np border p-5", dark ? "border-navy-line bg-navy-card" : "border-line bg-white")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <Sparkles size={18} className="text-coral" /> PlaceEstimate
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", dark ? "bg-white/10 text-mist" : "bg-[#8AA4B52E] text-[#3E5A6B]")}>
          {aiProvider === "heuristic" ? tx(locale, "Estimación New Place (modelo local)", "New Place estimate (local model)") : tx(locale, "Estimación New Place (IA externa)", "New Place estimate (external AI)")}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className={cn("text-xs font-semibold uppercase tracking-wide", muted)}>{tx(locale, "Valor estimado", "Estimated value")}</div>
          <div className="font-display text-3xl font-semibold">{money(e.mid, locale)}<span className={cn("text-sm font-normal", muted)}>{priceSuffix(l, locale)}</span></div>
        </div>
        <div className={cn("pb-1 text-sm", muted)}>
          {tx(locale, "Rango", "Range")} {money(e.low, locale)} – {money(e.high, locale)} · {tx(locale, "confianza", "confidence")} {Math.round(e.confidence * 100)} %
        </div>
      </div>
      <div className={cn("relative mt-8 h-2.5 rounded-full", dark ? "bg-white/10" : "bg-black/5")}>
        <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#8AA4B5] via-[#D4AF77] to-[#F26B4D]" style={{ left: `${at(e.low)}%`, right: `${100 - at(e.high)}%` }} />
        <div className="absolute -top-7 whitespace-nowrap text-xs font-semibold" style={{ left: `${pos}%`, transform: `translateX(-${Math.min(100, Math.max(0, pos))}%)` }}>
          {tx(locale, "Precio pedido", "Asking")}
        </div>
        <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-navy shadow" style={{ left: `${pos}%` }} />
      </div>
      <div className={cn("mt-2 flex justify-between text-xs", muted)}>
        <span>{money(e.low, locale)}</span>
        <span className={cn("font-semibold", Math.abs(diff) <= 4 ? "text-ok" : diff > 0 ? "text-warn" : "text-ok")}>{verdict}</span>
        <span>{money(e.high, locale)}</span>
      </div>
      {showComparables && e.comparables.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            {tx(locale, "Comparables usados", "Comparables used")} <Info size={14} className={muted} />
          </div>
          <div className="overflow-hidden rounded-lg border border-inherit">
            <table className="w-full text-sm">
              <thead className={cn("text-left text-xs", dark ? "bg-white/5 text-mist" : "bg-ivory text-ink/55")}>
                <tr>
                  <th className="px-3 py-2 font-semibold">{tx(locale, "Inmueble", "Property")}</th>
                  <th className="px-3 py-2 text-right font-semibold">m²</th>
                  <th className="px-3 py-2 text-right font-semibold">{tx(locale, "Precio", "Price")}</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">USD/m²</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">{tx(locale, "Dist.", "Dist.")}</th>
                </tr>
              </thead>
              <tbody>
                {e.comparables.map((c) => {
                  const cl = listingById(c.id);
                  return (
                    <tr key={c.id} className={cn("border-t", dark ? "border-navy-line" : "border-line")}>
                      <td className="px-3 py-2">
                        <div className="line-clamp-1 font-semibold">{cl ? tx(locale, cl.title_es, cl.title_en) : c.title}</div>
                        <div className={cn("text-xs", muted)}>{c.zone}</div>
                      </td>
                      <td className="px-3 py-2 text-right">{num(c.areaM2, locale)}</td>
                      <td className="px-3 py-2 text-right">{money(c.priceAmount, locale)}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">{num(c.pricePerM2, locale)}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">{c.distanceKm} km</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={cn("mt-2 text-xs", muted)}>{tx(locale, "Método: m² × precio de zona, ajustado por antigüedad, amenidades y comparables cercanos.", "Method: m² × area price, adjusted for age, amenities and nearby comparables.")}</p>
        </div>
      )}
    </div>
  );
}
