// No state or handlers: rendered on the server in the listing page (no hydration cost); client parents can use it too.
import { Info } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { money, shortMoney, num, plural, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function EstimateCard({ l, locale, dark, showComparables = true }: { l: Listing; locale: Locale; dark?: boolean; showComparables?: boolean }) {
  const aiProvider = l.estimate.method.startsWith("llm") ? "openai-compatible" : "heuristic";
  const e = l.estimate;
  const lo = Math.min(e.low, l.priceAmount) * 0.97;
  const hi = Math.max(e.high, l.priceAmount) * 1.03;
  const at = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const pos = at(l.priceAmount);
  const aLow = at(e.low);
  const aHigh = at(e.high);
  const clampPct = (v: number) => Math.min(100, Math.max(0, v));
  // Ends closer than ~a third of the bar: the inward-leaning labels (each ~20 % of a phone-width bar) would overlap.
  // Hanging them outward needs room on both sides; when there isn't any, fall back to leaning inward (they can't meet then).
  const close = aHigh - aLow < 36 && aLow > 22 && aHigh < 78;
  const usdShort = (v: number) => shortMoney(v, locale);
  const diff = ((l.priceAmount - e.mid) / e.mid) * 100;
  const verdict = Math.abs(diff) <= 4 ? tx(locale, "En línea con el mercado", "In line with the market") : diff > 0 ? tx(locale, `${diff.toFixed(0)} % sobre la estimación`, `${diff.toFixed(0)}% above estimate`) : tx(locale, `${Math.abs(diff).toFixed(0)} % bajo la estimación`, `${Math.abs(diff).toFixed(0)}% below estimate`);
  const muted = dark ? "text-mist" : "text-muted";
  const conf = e.confidence >= 0.75 ? tx(locale, "Confianza alta", "High confidence") : e.confidence >= 0.5 ? tx(locale, "Confianza media", "Medium confidence") : tx(locale, "Confianza baja", "Low confidence");
  const inRange = l.priceAmount >= e.low && l.priceAmount <= e.high;
  // With fewer than two comparable homes a range would look more precise than it is: one indicative figure instead.
  const nComp = e.comparables.length;
  const rough = nComp < 2;
  const source = nComp > 0 ? plural(nComp, locale, ["comparable", "comparables"], ["comparable", "comparables"]) : aiProvider === "heuristic" ? tx(locale, "modelo local", "local model") : tx(locale, "IA externa", "external AI");
  return (
    <div className={cn("overflow-hidden rounded-[4px]", dark ? "border border-navy-line bg-navy-card" : "border border-line bg-white")}>
      {/* Navy valuation panel (brand): range in Cormorant, gold fillet scale, the asking price as a dot. */}
      <div className="np-navy-panel bg-navy px-6 py-7 text-ivory md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="np-eyebrow text-[#B79D83]">{tx(locale, "Valor estimado New Place", "PlaceEstimate · Estimated value")}</div>
          <div className="text-sm text-ivory/70">
            {rough ? tx(locale, "Estimación orientativa", "Indicative estimate") : conf} · {source}
          </div>
        </div>
        {rough ? (
          <>
            <div className="mt-4 font-serif text-[36px] font-light leading-tight md:text-[46px]">
              ≈ {money(e.mid, locale)}
              <span className="font-display text-base font-normal text-ivory/60">{priceSuffix(l, locale)}</span>
            </div>
            <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-ivory/70">
              {nComp === 1
                ? tx(locale, "Estimación orientativa: por ahora solo hay una casa comparable cerca, así que no te damos un rango.", "Indicative estimate: there’s only one comparable home nearby for now, so we don’t show a range.")
                : tx(locale, "Estimación orientativa: aún no hay casas comparables cerca, así que no te damos un rango.", "Indicative estimate: there are no comparable homes nearby yet, so we don’t show a range.")}
            </p>
            <div className="mt-4 text-sm font-semibold text-ivory/85">
              {tx(locale, "Precio pedido", "Asking")} · {money(l.priceAmount, locale)} · <span className={cn(Math.abs(diff) > 4 && diff > 0 ? "text-[#E9C98F]" : "text-[#9ED7B8]")}>{verdict}</span>
            </div>
          </>
        ) : (
          <>
        <div className="mt-4 font-serif text-[36px] font-light leading-tight md:text-[46px]">
          {money(e.low, locale)} – {money(e.high, locale)}
          <span className="font-display text-base font-normal text-ivory/60">{priceSuffix(l, locale)}</span>
        </div>
        <div className="mt-1 text-sm text-ivory/70">
          {tx(locale, "Valor central", "Mid value")} {money(e.mid, locale)}
        </div>
        <div className="relative mt-9 h-[3px] rounded-full bg-white/15">
          <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#B79D83]/60 via-[#B79D83] to-[#B79D83]/60" style={{ left: `${aLow}%`, right: `${100 - aHigh}%` }} />
          <div className="absolute -top-8 whitespace-nowrap text-[13px] font-semibold text-ivory/85" style={{ left: `${pos}%`, transform: `translateX(-${clampPct(pos)}%)` }}>
            {tx(locale, "Precio pedido", "Asking")} · {usdShort(l.priceAmount)}
          </div>
          <div className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#B79D83] bg-ivory" style={{ left: `${pos}%` }} />
        </div>
        {/* The range ends are labelled where they sit on the bar (not at the bar's edges). Each label leans inward by its
            own position (0 % → left-aligned, 100 % → right-aligned), so it never overflows the panel; when the two ends are
            too close for that, each label hangs outward from its end instead, so they never collide. */}
        <div className="relative mt-3 h-5 text-sm text-ivory/70" data-testid="estimate-range-labels">
          <span className="absolute whitespace-nowrap" style={{ left: `${aLow}%`, transform: `translateX(-${close ? 100 : clampPct(aLow)}%)` }}>{usdShort(e.low)}</span>
          <span className="absolute whitespace-nowrap" style={{ left: `${aHigh}%`, transform: `translateX(-${close ? 0 : clampPct(aHigh)}%)` }}>{usdShort(e.high)}</span>
        </div>
        <div className={cn("mt-3 text-center text-sm font-semibold", Math.abs(diff) > 4 && diff > 0 ? "text-[#E9C98F]" : "text-[#9ED7B8]")}>
          {inRange ? tx(locale, "El precio pedido está dentro de lo esperado", "The asking price sits within the range") : verdict}
        </div>
        {inRange && <div className="mt-1 text-center text-[13px] text-ivory/55">{verdict}</div>}
          </>
        )}
      </div>
      <div className={cn("px-6 pb-6 md:px-8", !(showComparables && e.comparables.length > 0) && "hidden")}>
      {showComparables && e.comparables.length > 0 && (
        <div className="mt-6 [container-type:inline-size]">
          <div className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold">
            {nComp === 1 ? tx(locale, "Comparable usado", "Comparable used") : tx(locale, "Comparables usados", "Comparables used")} <Info size={14} className={muted} />
          </div>
          {/* Columns drop by the card's own width (a container query), not the viewport: at 1024 px the card sits in a
              ~476 px column. Whatever still overflows scrolls inside a focusable region with a soft edge fade on the side
              that has more (background-attachment: local covers the fade once you reach that edge). */}
          <div
            tabIndex={0}
            role="region"
            aria-label={tx(locale, "Casas comparables", "Comparable homes")}
            className="overflow-x-auto rounded-lg border border-inherit [--np-fade:255_255_255] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [html.dark_.np-public_&]:[--np-fade:42_36_32]"
            style={{
              ...(dark ? { ["--np-fade" as string]: "42 36 32" } : {}),
              background:
                "linear-gradient(to right, rgb(var(--np-fade)) 30%, rgb(var(--np-fade) / 0)) left / 32px 100% no-repeat local, linear-gradient(to left, rgb(var(--np-fade)) 30%, rgb(var(--np-fade) / 0)) right / 32px 100% no-repeat local, linear-gradient(to right, rgb(0 0 0 / .14), rgb(0 0 0 / 0)) left / 14px 100% no-repeat scroll, linear-gradient(to left, rgb(0 0 0 / .14), rgb(0 0 0 / 0)) right / 14px 100% no-repeat scroll",
            }}
          >
            <table className="w-full text-sm">
              <thead className={cn("text-left text-xs", dark ? "bg-white/5 text-mist" : "bg-ivory text-muted")}>
                <tr>
                  <th className="w-[45%] min-w-[150px] px-3 py-2 font-semibold">{tx(locale, "Inmueble", "Property")}</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">m²</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">{tx(locale, "Precio", "Price")}</th>
                  <th className="hidden whitespace-nowrap px-3 py-2 text-right font-semibold [@container(min-width:480px)]:table-cell">USD/m²</th>
                  {!dark && <th className="hidden whitespace-nowrap px-3 py-2 text-right font-semibold [@container(min-width:560px)]:table-cell">{tx(locale, "Dist.", "Dist.")}</th>}
                </tr>
              </thead>
              <tbody>
                {e.comparables.map((c) => {
                  return (
                    <tr key={c.id} className={cn("border-t", dark ? "border-navy-line" : "border-line")}>
                      <td className="px-3 py-2">
                        <div className="line-clamp-2 break-words font-semibold leading-snug">{(locale === "en" && (c as { title_en?: string }).title_en) || c.title}</div>
                        <div className={cn("text-xs", muted)}>{c.zone}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{num(c.areaM2, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{dark ? shortMoney(c.priceAmount, locale) : money(c.priceAmount, locale)}</td>
                      <td className="hidden whitespace-nowrap px-3 py-2 text-right [@container(min-width:480px)]:table-cell">{num(c.pricePerM2, locale)}</td>
                      {!dark && <td className="hidden whitespace-nowrap px-3 py-2 text-right [@container(min-width:560px)]:table-cell">{c.distanceKm} km</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={cn("mt-3 text-sm", muted)}>{tx(locale, "Cómo lo calculamos: m² × precio de la zona, ajustado por antigüedad, servicios y casas parecidas cerca.", "How we work it out: m² × area price, adjusted for age, amenities and similar homes nearby.")}</p>
        </div>
      )}
      </div>
    </div>
  );
}
