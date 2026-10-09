"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Button, Field, inputCls } from "@/components/ui";
import { api } from "@/lib/api";
import { money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Op = "SALE" | "LONG_RENT";

/**
 * Sell landing: zone + m² → an indicative PlaceEstimate in one tap, then "Empezar con estos datos" opens the wizard
 * with the operation and the area already filled in (/owner/new?op=…&m2=…).
 */
export function SellQuickEstimate({ locale, zones }: { locale: Locale; zones: { name: string; city: string }[] }) {
  const [zone, setZone] = useState(zones[0]?.name ?? "");
  const [m2, setM2] = useState("");
  const [op, setOp] = useState<Op>("SALE");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ low: number; mid: number; high: number; n: number } | null>(null);
  const area = Math.round(Number(m2));
  const areaOk = Number.isFinite(area) && area > 0 && area <= 1_000_000;
  const start = `/${locale}/owner/new?op=${op}${areaOk ? `&m2=${area}` : ""}`;
  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaOk || !zone) return setErr(tx(locale, "Escribe los m² de tu casa (un número mayor que 0).", "Enter your home’s m² (a number above 0)."));
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ estimate: { low: number; mid: number; high: number; comparables: unknown[] } }>("ai/estimate", { method: "POST", json: { zone, areaM2: area, listingType: op } });
      setRes({ low: r.estimate.low, mid: r.estimate.mid, high: r.estimate.high, n: r.estimate.comparables.length });
    } catch {
      setErr(tx(locale, "Ahora no pudimos calcularlo. Inténtalo de nuevo en un momento o empieza igualmente.", "We couldn’t work it out right now. Try again in a moment, or start anyway."));
    } finally {
      setBusy(false);
    }
  };
  const suffix = op === "LONG_RENT" ? tx(locale, " / mes", " / month") : "";
  return (
    <form onSubmit={run} className="np-glass rounded-[28px] p-5 shadow-[0_24px_60px_-30px_rgba(31,35,40,.35)] md:p-7" aria-labelledby="quick-estimate-title" noValidate>
      <div className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
        <Sparkles size={16} strokeWidth={1.7} className="text-[#9A9DA1]" aria-hidden />
        <h2 id="quick-estimate-title">{tx(locale, "¿Cuánto vale tu casa?", "What’s your home worth?")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">{tx(locale, "Gratis y sin registrarte. Una primera cifra en segundos.", "Free, no sign-up. A first figure in seconds.")}</p>
      <div role="radiogroup" aria-label={tx(locale, "Operación", "Operation")} className="mt-5 inline-flex rounded-full bg-black/[.04] p-1">
        {(
          [
            ["SALE", tx(locale, "Vender", "Sell")],
            ["LONG_RENT", tx(locale, "Alquilar", "Rent out")],
          ] as [Op, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={op === k}
            onClick={() => {
              setOp(k);
              setRes(null);
            }}
            className={cn("min-h-10 rounded-full px-4 font-display text-sm font-semibold transition-colors duration-np", op === k ? "bg-white text-ink shadow-[0_2px_8px_rgba(31,35,40,.1)]" : "text-muted hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label={tx(locale, "Zona", "Area")}>
          <select
            className={inputCls}
            value={zone}
            onChange={(e) => {
              setZone(e.target.value);
              setRes(null);
            }}
          >
            {zones.map((z) => (
              <option key={`${z.name}-${z.city}`} value={z.name}>
                {z.name === z.city ? z.name : `${z.name} · ${z.city}`}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tx(locale, "Superficie (m²)", "Area (m²)")} error={err && !areaOk ? err : undefined}>
          <input
            // The hint must never read as a typed value: "p. ej." prefix, lighter and italic.
            className={cn(inputCls, "placeholder:font-normal placeholder:italic placeholder:text-muted/60")}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={m2}
            aria-invalid={!!err && !areaOk}
            onChange={(e) => {
              setM2(e.target.value);
              setRes(null);
            }}
            placeholder={tx(locale, "p. ej. 110", "e.g. 110")}
          />
        </Field>
      </div>
      <Button type="submit" variant="navy" className="mt-4 w-full" disabled={busy}>
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
        {tx(locale, "Ver la estimación", "See the estimate")}
      </Button>
      {err && areaOk && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {err}
        </p>
      )}
      <div aria-live="polite">
        {res && (
          <div className="np-in mt-5 rounded-[20px] bg-white/70 p-4 ring-1 ring-black/[.04]" data-testid="quick-estimate">
            <div className="np-kicker text-gold-text">{tx(locale, "Valor estimado New Place", "PlaceEstimate")}</div>
            <div className="mt-2 font-serif text-[34px] font-semibold leading-none text-ink">
              {res.n < 2 ? `≈ ${money(res.mid, locale)}` : `${money(res.low, locale)} – ${money(res.high, locale)}`}
              <span className="font-display text-base font-normal text-muted">{suffix}</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {res.n < 2
                ? tx(locale, "Estimación orientativa: aún hay pocas casas comparables en esta zona. Con tus datos completos lo afinamos.", "Indicative estimate: few comparable homes in this area yet. With your full details we fine-tune it.")
                : tx(locale, "Con casas reales de la zona. Al añadir habitaciones, año y servicios lo afinamos.", "From real homes in the area. Adding rooms, year and amenities fine-tunes it.")}
            </p>
            <Button href={start} className="mt-4 w-full">
              {tx(locale, "Empezar con estos datos", "Start with these details")} <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
