// No state or handlers: rendered on the server in the listing page (no hydration cost); client parents can use it too.
import { Info } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { compactMoney, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function EstimateCard({ l, locale, dark, showComparables = true }: { l: Listing; locale: Locale; dark?: boolean; showComparables?: boolean }) {
  const aiProvider = l.estimate.method.startsWith("llm") ? "openai-compatible" : "heuristic";
  const e = l.estimate;
  const lo = Math.min(e.low, l.priceAmount) * 0.97;
  const hi = Math.max(e.high, l.priceAmount) * 1.03;
  const at = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const pos = at(l.priceAmount);
  const diff = ((l.priceAmount - e.mid) / e.mid) * 100;
  const verdict = Math.abs(diff) <= 4 ? tx(locale, "En línea con el mercado", "In line with the market") : diff > 0 ? tx(locale, `${diff.toFixed(0)} % sobre la estimación`, `${diff.toFixed(0)}% above estimate`) : tx(locale, `${Math.abs(diff).toFixed(0)} % bajo la estimación`, `${Math.abs(diff).toFixed(0)}% below estimate`);
  const muted = dark ? "text-mist" : "text-muted";
  const conf = e.confidence >= 0.75 ? tx(locale, "Confianza alta", "High confidence") : e.confidence >= 0.5 ? tx(locale, "Confianza media", "Medium confidence") : tx(locale, "Confianza baja", "Low confidence");
  const inRange = l.priceAmount >= e.low && l.priceAmount <= e.high;
  return (
    <div className={cn("overflow-hidden rounded-[20px]", dark ? "border border-navy-line bg-navy-card" : "border border-line bg-white")}>
      {/* Navy valuation panel (brand): range in Cormorant, gold fillet scale, the asking price as a dot. */}
      <div className="np-navy-panel bg-navy px-6 py-7 text-ivory md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="np-eyebrow text-[#D4B98C]">PlaceEstimate · {tx(locale, "Valor estimado", "Estimated value")}</div>
          <div className="text-sm text-ivory/70">
            {conf} · {e.comparables.length > 0 ? `${e.comparables.length} ${tx(locale, "comparables", "comparables")}` : aiProvider === "heuristic" ? tx(locale, "modelo local", "local model") : tx(locale, "IA externa", "external AI")}
          </div>
        </div>
        <div className="mt-4 font-serif text-[36px] font-semibold leading-tight md:text-[46px]">
          {money(e.low, locale)} – {money(e.high, locale)}
          <span className="font-display text-base font-normal text-ivory/60">{priceSuffix(l, locale)}</span>
        </div>
        <div className="mt-1 text-sm text-ivory/70">
          {tx(locale, "Valor central", "Mid value")} {money(e.mid, locale)} · {tx(locale, "confianza", "confidence")} {Math.round(e.confidence * 100)} %
        </div>
        <div className="relative mt-9 h-[3px] rounded-full bg-white/15">
          <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#B08A55]/60 via-[#D4B98C] to-[#B08A55]/60" style={{ left: `${at(e.low)}%`, right: `${100 - at(e.high)}%` }} />
          <div className="absolute -top-8 whitespace-nowrap text-[13px] font-semibold text-ivory/85" style={{ left: `${pos}%`, transform: `translateX(-${Math.min(100, Math.max(0, pos))}%)` }}>
            {tx(locale, "Precio pedido", "Asking")} · {compactMoney(l.priceAmount, locale)}
          </div>
          <div className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#D4B98C] bg-ivory" style={{ left: `${pos}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 text-sm text-ivory/70">
          <span>{compactMoney(e.low, locale).replace("$", "USD ")}</span>
          <span className={cn("text-center font-semibold", Math.abs(diff) > 4 && diff > 0 ? "text-[#E9C98F]" : "text-[#9ED7B8]")}>
            {inRange ? tx(locale, "El precio pedido está dentro de lo esperado", "The asking price sits within the range") : verdict}
          </span>
          <span>{compactMoney(e.high, locale).replace("$", "USD ")}</span>
        </div>
        {inRange && <div className="mt-1 text-center text-[13px] text-ivory/55">{verdict}</div>}
      </div>
      <div className={cn("px-6 pb-6 md:px-8", !(showComparables && e.comparables.length > 0) && "hidden")}>
      {showComparables && e.comparables.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold">
            {tx(locale, "Comparables usados", "Comparables used")} <Info size={14} className={muted} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-inherit">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className={cn("text-left text-xs", dark ? "bg-white/5 text-mist" : "bg-ivory text-muted")}>
                <tr>
                  <th className="px-3 py-2 font-semibold">{tx(locale, "Inmueble", "Property")}</th>
                  <th className="px-3 py-2 text-right font-semibold">m²</th>
                  <th className="px-3 py-2 text-right font-semibold">{tx(locale, "Precio", "Price")}</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">USD/m²</th>
                  {!dark && <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">{tx(locale, "Dist.", "Dist.")}</th>}
                </tr>
              </thead>
              <tbody>
                {e.comparables.map((c) => {
                  return (
                    <tr key={c.id} className={cn("border-t", dark ? "border-navy-line" : "border-line")}>
                      <td className="px-3 py-2">
                        <div className="max-w-[180px] truncate font-semibold">{(locale === "en" && (c as { title_en?: string }).title_en) || c.title}</div>
                        <div className={cn("text-xs", muted)}>{c.zone}</div>
                      </td>
                      <td className="px-3 py-2 text-right">{num(c.areaM2, locale)}</td>
                      <td className="px-3 py-2 text-right">{dark ? compactMoney(c.priceAmount, locale) : money(c.priceAmount, locale)}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">{num(c.pricePerM2, locale)}</td>
                      {!dark && <td className="hidden px-3 py-2 text-right sm:table-cell">{c.distanceKm} km</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={cn("mt-3 text-sm", muted)}>{tx(locale, "Cómo lo calculamos: m² × precio de la zona, ajustado por antigüedad, amenidades y casas parecidas cerca.", "How we work it out: m² × area price, adjusted for age, amenities and similar homes nearby.")}</p>
        </div>
      )}
      </div>
    </div>
  );
}
