"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Amenity, Listing, Locale } from "@/types/domain";
import { Button, Field, inputCls } from "@/components/ui";
import { api } from "@/lib/api";
import { AMENITY_LABEL, lbl, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { EssentialsFields, essentialsFrom, validateEssentials } from "./EssentialsFields";

/** Same chips as the wizard; amenities already on the listing (e.g. set by an agency before) stay editable too. */
const AMENITIES: Amenity[] = ["generator", "waterTank", "security", "elevator", "terrace", "pool", "gym", "view", "garden", "bbq", "pets", "furnished", "ac"];
const THIS_YEAR = new Date().getFullYear();

type Draft = { title_es: string; title_en: string; body_es: string; body_en: string; beds: string; baths: string; parking: string; areaM2: string; yearBuilt: string; amenities: string[] };
type Errors = Partial<Record<keyof Draft, string>>;

const intIn = (v: string, min: number, max: number) => {
  const n = Number(v);
  return v.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
};

export function validateOwnerEdit(locale: Locale, d: Draft): Errors {
  const e: Errors = {};
  const t = d.title_es.trim();
  if (t.length < 3 || t.length > 120) e.title_es = tx(locale, "El título necesita entre 3 y 120 caracteres.", "The title needs 3 to 120 characters.");
  if (d.title_en.trim().length > 120) e.title_en = tx(locale, "Máximo 120 caracteres.", "120 characters at most.");
  if (d.body_es.length > 4000) e.body_es = tx(locale, "Máximo 4.000 caracteres.", "4,000 characters at most.");
  if (d.body_en.length > 4000) e.body_en = tx(locale, "Máximo 4.000 caracteres.", "4,000 characters at most.");
  for (const [key, max] of [["beds", 30], ["baths", 30], ["parking", 50]] as const) if (!intIn(d[key], 0, max)) e[key] = tx(locale, `Número entero entre 0 y ${max}.`, `Whole number between 0 and ${max}.`);
  if (!intIn(d.areaM2, 1, 1_000_000)) e.areaM2 = tx(locale, "Escribe los m² como número entero mayor que 0.", "Enter the m² as a whole number above 0.");
  if (!intIn(d.yearBuilt, 1800, THIS_YEAR + 5)) e.yearBuilt = tx(locale, `Año entre 1800 y ${THIS_YEAR + 5}.`, `Year between 1800 and ${THIS_YEAR + 5}.`);
  return e;
}

/** Owner's own edit of an FSBO listing: texts (ES/EN), main figures, amenities and essentials. Saved with PATCH /listings/:id. */
export function OwnerEditForm({ l, locale, onDone }: { l: Listing; locale: Locale; onDone: (saved: boolean) => void }) {
  const [d, setD] = useState<Draft>({
    title_es: l.title_es,
    title_en: l.title_en ?? "",
    body_es: l.body_es ?? "",
    body_en: l.body_en ?? "",
    beds: String(l.beds),
    baths: String(l.baths),
    parking: String(l.parking),
    areaM2: String(l.areaM2),
    yearBuilt: String(l.yearBuilt),
    amenities: [...l.amenities],
  });
  const [ess, setEss] = useState(essentialsFrom(l));
  const [showErr, setShowErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const errors = validateOwnerEdit(locale, d);
  const essV = validateEssentials(locale, ess);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const e = (key: keyof Draft) => (showErr ? errors[key] : undefined);
  const land = l.kind === "land";
  const chips = [...AMENITIES, ...l.amenities.filter((a) => !AMENITIES.includes(a))];
  const numInput = (key: "beds" | "baths" | "parking" | "areaM2" | "yearBuilt", label: string, min: number, max: number) => (
    <Field label={label} error={e(key)}>
      <input className={inputCls} type="number" inputMode="numeric" min={min} max={max} step={1} value={d[key]} aria-invalid={!!e(key)} onChange={(ev) => set({ [key]: ev.target.value })} />
    </Field>
  );

  return (
    <form
      noValidate
      className="mt-4 space-y-4 rounded-[18px] border border-line bg-[#FBF8F3] p-4 dark:bg-white/[.03]"
      aria-label={tx(locale, "Editar anuncio", "Edit listing")}
      onSubmit={async (ev) => {
        ev.preventDefault();
        setShowErr(true);
        setErr(null);
        if (Object.keys(errors).length || !essV.ok) return;
        setBusy(true);
        try {
          await api(`listings/${l.id}`, {
            method: "PATCH",
            json: {
              title_es: d.title_es.trim(),
              title_en: d.title_en.trim(),
              body_es: d.body_es.trim(),
              body_en: d.body_en.trim(),
              beds: Number(d.beds),
              baths: Number(d.baths),
              parking: Number(d.parking),
              areaM2: Number(d.areaM2),
              yearBuilt: Number(d.yearBuilt),
              amenities: d.amenities,
              ...essV.payload,
            },
          });
          onDone(true);
        } catch (x) {
          setErr((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="font-serif text-[22px] font-medium leading-tight">{tx(locale, "Editar tu anuncio", "Edit your listing")}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tx(locale, "Título (español)", "Title (Spanish)")} error={e("title_es")}>
          <input className={inputCls} maxLength={120} value={d.title_es} aria-invalid={!!e("title_es")} onChange={(ev) => set({ title_es: ev.target.value })} />
        </Field>
        <Field label={tx(locale, "Título (inglés) · opcional", "Title (English) · optional")} error={e("title_en")}>
          <input className={inputCls} maxLength={120} value={d.title_en} aria-invalid={!!e("title_en")} onChange={(ev) => set({ title_en: ev.target.value })} />
        </Field>
        <Field label={tx(locale, "Descripción (español)", "Description (Spanish)")} error={e("body_es")}>
          <textarea className={cn(inputCls, "h-32 py-2.5")} maxLength={4000} value={d.body_es} aria-invalid={!!e("body_es")} onChange={(ev) => set({ body_es: ev.target.value })} />
        </Field>
        <Field label={tx(locale, "Descripción (inglés) · opcional", "Description (English) · optional")} error={e("body_en")} hint={tx(locale, "Con la versión en inglés te encuentran más compradores de fuera.", "An English version reaches more buyers from abroad.")}>
          <textarea className={cn(inputCls, "h-32 py-2.5")} maxLength={4000} value={d.body_en} aria-invalid={!!e("body_en")} onChange={(ev) => set({ body_en: ev.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {!land && numInput("beds", tx(locale, "Habitaciones", "Bedrooms"), 0, 30)}
        {!land && numInput("baths", tx(locale, "Baños", "Bathrooms"), 0, 30)}
        {!land && numInput("parking", tx(locale, "Puestos", "Parking"), 0, 50)}
        {numInput("areaM2", land ? tx(locale, "Terreno (m²)", "Plot (m²)") : tx(locale, "Superficie (m²)", "Area (m²)"), 1, 1_000_000)}
        {numInput("yearBuilt", tx(locale, "Año de construcción", "Year built"), 1800, THIS_YEAR + 5)}
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold">{tx(locale, "Servicios", "Amenities")}</div>
        <div className="flex flex-wrap gap-2">
          {chips.map((a) => {
            const on = d.amenities.includes(a);
            return (
              <button key={a} type="button" aria-pressed={on} onClick={() => set({ amenities: on ? d.amenities.filter((x) => x !== a) : [...d.amenities, a] })} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold", on ? "border-navy bg-navy text-ivory" : "border-line bg-white")}>
                {on && <Check size={14} />} {AMENITY_LABEL[a] ? lbl(AMENITY_LABEL[a], locale) : a}
              </button>
            );
          })}
        </div>
      </div>
      <EssentialsFields locale={locale} value={ess} onChange={setEss} showErrors={showErr} />
      {err && <div role="alert" className="rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{err}</div>}
      {showErr && (Object.keys(errors).length > 0 || !essV.ok) && <p role="alert" className="text-sm font-semibold text-danger">{tx(locale, "Revisa los campos marcados.", "Check the highlighted fields.")}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {tx(locale, "Guardar cambios", "Save changes")}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone(false)}>{tx(locale, "Cancelar", "Cancel")}</Button>
      </div>
    </form>
  );
}
