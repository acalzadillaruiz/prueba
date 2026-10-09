"use client";

import type { ZodTypeAny } from "zod";
import { brochurePdfSchema, commercialSchema, shortRentSchema, type CommercialInput, type ShortRentInput } from "@newplace/config";
import { Field, inputCls } from "@/components/ui";
import { k } from "@/components/agency/kit";
import { tx } from "@/lib/i18n";
import type { Locale } from "@/types/domain";

/** Form state (strings so a field can be empty while typing). */
export type ExtrasDraft = { minNights: string; maxGuests: string; cleaningFee: string; ceilingHeight: string; loadingDock: boolean; zoning: string; capRate: string; brochurePdf: string };
export type ExtrasPayload = { shortRent?: ShortRentInput; commercial?: CommercialInput; brochurePdf?: string };
type Errors = Partial<Record<keyof ExtrasDraft, string>>;

export const EMPTY_EXTRAS: ExtrasDraft = { minNights: "2", maxGuests: "4", cleaningFee: "0", ceilingHeight: "3", loadingDock: false, zoning: "", capRate: "", brochurePdf: "" };

/** Prefill from a stored listing (editor). */
export function extrasFrom(l: { shortRent?: ShortRentInput | null; commercial?: CommercialInput | null; brochurePdf?: string | null }): ExtrasDraft {
  const s = (n: number | undefined | null, d: string) => (n === undefined || n === null ? d : String(n));
  return {
    minNights: s(l.shortRent?.minNights, EMPTY_EXTRAS.minNights),
    maxGuests: s(l.shortRent?.maxGuests, EMPTY_EXTRAS.maxGuests),
    cleaningFee: s(l.shortRent?.cleaningFee, EMPTY_EXTRAS.cleaningFee),
    ceilingHeight: s(l.commercial?.ceilingHeight, EMPTY_EXTRAS.ceilingHeight),
    loadingDock: !!l.commercial?.loadingDock,
    zoning: l.commercial?.zoning ?? "",
    capRate: s(l.commercial?.capRate, ""),
    brochurePdf: l.brochurePdf ?? "",
  };
}

const isShort = (listingType: string) => listingType === "SHORT_RENT";
const isCommercial = (listingType: string) => listingType.startsWith("COMMERCIAL");
const toNum = (v: string) => (v.trim() === "" ? NaN : Number(v));
const bad = (schema: ZodTypeAny, v: unknown) => !schema.safeParse(v).success;

/** Validates only the fields that apply to this operation / luxury flag. Bounds come from the shared Zod schemas the API uses. */
export function validateExtras(locale: Locale, listingType: string, luxury: boolean, x: ExtrasDraft): { payload: ExtrasPayload; errors: Errors; ok: boolean } {
  const errors: Errors = {};
  const payload: ExtrasPayload = {};
  if (isShort(listingType)) {
    const sr = { minNights: toNum(x.minNights), maxGuests: toNum(x.maxGuests), cleaningFee: toNum(x.cleaningFee) };
    const S = shortRentSchema.shape;
    if (bad(S.minNights, sr.minNights)) errors.minNights = tx(locale, "Entre 1 y 365 noches (número entero).", "Between 1 and 365 nights (whole number).");
    if (bad(S.maxGuests, sr.maxGuests)) errors.maxGuests = tx(locale, "Entre 1 y 50 huéspedes (número entero).", "Between 1 and 50 guests (whole number).");
    if (bad(S.cleaningFee, sr.cleaningFee)) errors.cleaningFee = tx(locale, "Entre 0 y 10.000 USD, sin decimales.", "Between 0 and 10,000 USD, no decimals.");
    if (shortRentSchema.safeParse(sr).success) payload.shortRent = sr;
  }
  if (isCommercial(listingType)) {
    const capRate = x.capRate.trim() === "" ? undefined : toNum(x.capRate);
    const com = { ceilingHeight: toNum(x.ceilingHeight), loadingDock: x.loadingDock, zoning: x.zoning.trim(), ...(capRate === undefined ? {} : { capRate }) };
    const C = commercialSchema.shape;
    if (bad(C.ceilingHeight, com.ceilingHeight)) errors.ceilingHeight = tx(locale, "Altura libre entre 2 y 40 m.", "Clear height between 2 and 40 m.");
    if (bad(C.zoning, com.zoning)) errors.zoning = tx(locale, "Indica la zonificación (máx. 60 caracteres).", "Enter the zoning (max 60 characters).");
    if (capRate !== undefined && bad(C.capRate, capRate)) errors.capRate = tx(locale, "Cap rate entre 0 y 30 %.", "Cap rate between 0 and 30 %.");
    if (commercialSchema.safeParse(com).success) payload.commercial = com;
  }
  if (luxury && x.brochurePdf.trim()) {
    if (bad(brochurePdfSchema, x.brochurePdf)) errors.brochurePdf = tx(locale, "Ese enlace no funciona. Usa la dirección https://… del PDF.", "That link doesn’t work. Use the PDF’s https://… address.");
    else payload.brochurePdf = x.brochurePdf.trim();
  }
  return { payload, errors, ok: Object.keys(errors).length === 0 };
}

/** Vacation (SHORT_RENT), commercial and luxury fields — rendered only for the operation / flag they belong to. */
export function ListingTypeFields({
  locale,
  listingType,
  luxury,
  value,
  onChange,
  showErrors = true,
  admin = false,
  disabled = false,
}: {
  locale: Locale;
  listingType: string;
  luxury: boolean;
  value: ExtrasDraft;
  onChange: (x: ExtrasDraft) => void;
  showErrors?: boolean;
  /** Private cockpit skin (light by default, follows the dark theme). */
  admin?: boolean;
  disabled?: boolean;
}) {
  const { errors } = validateExtras(locale, listingType, luxury, value);
  const err = (k: keyof ExtrasDraft) => (showErrors ? errors[k] : undefined);
  const cls = admin ? k.input : inputCls;
  const set = (p: Partial<ExtrasDraft>) => onChange({ ...value, ...p });
  const title = (t: string) => <div className={admin ? k.title + " mb-3" : "mb-2 font-semibold"}>{t}</div>;
  const input = (k: keyof ExtrasDraft, label: string, opts: { min: number; max: number; step?: number; hint?: string }) => (
    <Field label={label} hint={opts.hint} error={err(k)}>
      <input
        className={cls}
        type="number"
        inputMode="decimal"
        min={opts.min}
        max={opts.max}
        step={opts.step ?? 1}
        disabled={disabled}
        aria-invalid={!!err(k)}
        value={value[k] as string}
        onChange={(e) => set({ [k]: e.target.value })}
      />
    </Field>
  );

  if (!isShort(listingType) && !isCommercial(listingType) && !luxury) return null;
  return (
    <div className="space-y-5" data-testid="listing-type-fields">
      {isShort(listingType) && (
        <div>
          {title(tx(locale, "Alquiler vacacional", "Vacation rental"))}
          <div className="grid gap-3 sm:grid-cols-3">
            {input("minNights", tx(locale, "Noches mínimas", "Minimum nights"), { min: 1, max: 365 })}
            {input("maxGuests", tx(locale, "Huéspedes máximos", "Maximum guests"), { min: 1, max: 50 })}
            {input("cleaningFee", tx(locale, "Tarifa de limpieza (USD)", "Cleaning fee (USD)"), { min: 0, max: 10_000, hint: tx(locale, "Solo informativa: no se cobra a través de New Place.", "Just for reference; it isn’t charged through New Place.") })}
          </div>
        </div>
      )}
      {isCommercial(listingType) && (
        <div>
          {title(tx(locale, "Datos comerciales", "Commercial details"))}
          <div className="grid gap-3 sm:grid-cols-3">
            {input("ceilingHeight", tx(locale, "Altura libre (m)", "Clear height (m)"), { min: 2, max: 40, step: 0.1 })}
            <Field label={tx(locale, "Zonificación", "Zoning")} error={err("zoning")}>
              <input className={cls} maxLength={60} disabled={disabled} aria-invalid={!!err("zoning")} value={value.zoning} onChange={(e) => set({ zoning: e.target.value })} placeholder="C-3 Comercial" />
            </Field>
            {input("capRate", tx(locale, "Cap rate (%) · opcional", "Cap rate (%) · optional"), { min: 0, max: 30, step: 0.1 })}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={disabled} checked={value.loadingDock} onChange={(e) => set({ loadingDock: e.target.checked })} className="h-4 w-4 accent-navy dark:accent-[#C3C8CD]" />
            {tx(locale, "Tiene andén de carga", "Has a loading dock")}
          </label>
        </div>
      )}
      {luxury && (
        <div>
          {title(tx(locale, "Lujo", "Luxury"))}
          <Field label={tx(locale, "Folleto PDF (URL) · opcional", "Brochure PDF (URL) · optional")} error={err("brochurePdf")}>
            <input className={cls} type="url" inputMode="url" maxLength={500} disabled={disabled} aria-invalid={!!err("brochurePdf")} value={value.brochurePdf} onChange={(e) => set({ brochurePdf: e.target.value })} placeholder="https://…/folleto.pdf" />
          </Field>
        </div>
      )}
    </div>
  );
}
