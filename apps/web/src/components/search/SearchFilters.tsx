"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import type { Amenity, Locale } from "@/types/domain";
import { AMENITY_LABEL, lbl, money, shortMoney, num, plural, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { TANK_STEPS, type EssentialsFilters } from "@/lib/essentials";

export const TYPES = [
  ["SALE", "Comprar", "Buy"],
  ["LONG_RENT", "Alquilar", "Rent"],
  ["SHORT_RENT", "Vacacional", "Holiday rentals"],
  ["COMMERCIAL", "Comercial", "Commercial"],
] as const;

// Tiers per operation, up to the top of the luxury market: sale (total), long rent (per month), vacation (per night), commercial (rent or sale).
export const PRICE_STEPS: Record<string, number[]> = {
  SALE: [100000, 150000, 250000, 400000, 600000, 1000000, 1500000, 2000000, 3000000, 5000000],
  LONG_RENT: [500, 800, 1200, 1800, 2500, 4000, 6000, 10000],
  SHORT_RENT: [60, 100, 150, 250, 400, 600, 1000],
  COMMERCIAL: [1000, 2500, 5000, 10000, 150000, 300000, 600000, 1000000, 2000000, 5000000],
};

/** One-tap price bands per operation: [min, max] (null = open end). */
const PRICE_PRESETS: Record<string, [number | null, number | null][]> = {
  SALE: [[null, 150000], [150000, 400000], [400000, 1000000], [1000000, 3000000], [3000000, null]],
  LONG_RENT: [[null, 800], [800, 1800], [1800, 4000], [4000, null]],
  SHORT_RENT: [[null, 100], [100, 250], [250, 600], [600, null]],
  COMMERCIAL: [[null, 2500], [2500, 10000], [150000, 600000], [600000, null]],
};

/** The tiers, plus a value from the URL or the NL parser that isn't one of them (so the select still shows it). */
const withValue = (steps: number[], v?: number) => (v && !steps.includes(v) ? [...steps, v].sort((a, b) => a - b) : steps);

export const KIND_OPTIONS = [
  ["house", "Casa o villa", "House or villa"],
  ["apartment", "Apartamento", "Apartment"],
  ["penthouse", "Ático", "Penthouse"],
  ["land", "Terreno", "Land"],
] as const;

export const KIND_CHIP: Record<string, [string, string]> = {
  penthouse: ["Ático", "Penthouse"],
  house: ["Casa", "House"],
  apartment: ["Apartamento", "Apartment"],
  land: ["Terreno", "Land"],
};

const MIN_M2_STEPS = [50, 80, 100, 150, 200, 300];

// Power, water tank and views live in "Servicios esenciales" (with finer options), so they aren't repeated here.
const FILTER_AMENITIES: Amenity[] = ["pool", "security", "gym", "terrace", "garden", "elevator", "ac"];

/** Zones grouped by city (the city itself is a valid `zone` value: the API matches it on listing.city). */
export type ZoneGroup = { city: string; zones: string[] };

export interface FilterValues {
  type: string;
  zone: string | null;
  min?: number;
  max?: number;
  beds?: number;
  baths?: number;
  minM2?: number;
  kind: string | null;
  lux: boolean;
  pub: string | null;
  furnished: boolean;
  pets: boolean;
  verified: boolean;
  amen: Amenity[];
  ess: EssentialsFilters;
}
export type SetFilters = (patch: Record<string, string | null>) => void;

export const pill = "flex h-11 md:h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 font-display text-sm transition-colors duration-np";
// Selected filter = navy tint + 2 px navy border (brand v4).
export const on = "np-sel border-2 px-[15px]";
const sectionTitle = "mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted";

/** "Precio" / "Hasta USD 400k" / "USD 150k – USD 400k" / "Desde USD 1M" (en: "Up to $400k"…): what the price button says. Same currency style as the cards. */
export function priceLabel(locale: Locale, min?: number, max?: number) {
  if (min && max) return `${shortMoney(min, locale)} – ${shortMoney(max, locale).replace("USD ", "")}`; // "USD 150k – 400k"
  if (max) return tx(locale, `Hasta ${shortMoney(max, locale)}`, `Up to ${shortMoney(max, locale)}`);
  if (min) return tx(locale, `Desde ${shortMoney(min, locale)}`, `From ${shortMoney(min, locale)}`);
  return tx(locale, "Precio", "Price");
}

/**
 * Closes a floating panel on Escape (focus goes back to its button) and on a press outside it and its button.
 * Moves focus into the panel when it opens.
 */
export function useDismiss(open: boolean, close: () => void, panel: RefObject<HTMLElement | null>, opener: RefObject<HTMLElement | null>, opts: { outside?: boolean } = {}) {
  const closeRef = useRef(close);
  closeRef.current = close;
  const outside = opts.outside ?? true;
  useEffect(() => {
    if (!open) return;
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus], button, select, input, a[href]");
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeRef.current();
      opener.current?.focus({ preventScroll: true });
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || opener.current?.contains(t)) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    if (outside) document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, panel, opener, outside]);
}

/** Desktop filter popover: a pill that opens a small panel under it. One open at a time (state lives in the parent). */
export function FilterPopover({ label, title, active, open, onOpenChange, children, width = "w-[340px]" }: { label: ReactNode; title: string; active?: boolean; open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode; width?: string }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(open, () => onOpenChange(false), panel, btn);
  return (
    <div className="relative shrink-0">
      <button ref={btn} type="button" aria-expanded={open} aria-controls={`${id}-pop`} aria-haspopup="dialog" onClick={() => onOpenChange(!open)} className={cn(pill, "border-line bg-white", (active || open) && on)}>
        {label}
        <ChevronDown size={14} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div ref={panel} id={`${id}-pop`} role="dialog" aria-label={title} className={cn("np-in absolute left-0 top-[calc(100%+8px)] z-40 rounded-2xl border border-line bg-white p-4 text-ink shadow-np", width)}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Price: preset bands (one tap) plus exact min / max tiers. */
export function PriceFields({ locale, f, set }: { locale: Locale; f: FilterValues; set: SetFilters }) {
  const steps = PRICE_STEPS[f.type] ?? PRICE_STEPS.SALE;
  const presets = PRICE_PRESETS[f.type] ?? PRICE_PRESETS.SALE;
  const per = f.type === "LONG_RENT" ? tx(locale, " / mes", " / mo") : f.type === "SHORT_RENT" ? tx(locale, " / noche", " / night") : "";
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={tx(locale, "Rangos de precio", "Price ranges")}>
        {presets.map(([a, b]) => {
          const sel = (f.min ?? null) === a && (f.max ?? null) === b;
          return (
            <button key={`${a}-${b}`} type="button" aria-pressed={sel} onClick={() => set(sel ? { min: null, max: null } : { min: a === null ? null : String(a), max: b === null ? null : String(b) })} className={cn(pill, "md:h-9", sel ? on : "border-line bg-white")}>
              {priceLabel(locale, a ?? undefined, b ?? undefined)}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">{tx(locale, "Mínimo", "Minimum")}</span>
          <select value={f.min ?? ""} onChange={(e) => set({ min: e.target.value || null })} className={cn(pill, "w-full appearance-none border-line bg-white", f.min && on)} aria-label={tx(locale, "Precio mínimo", "Min price")}>
            <option value="">{tx(locale, "Sin mínimo", "No min")}</option>
            {withValue(steps.slice(0, -1), f.min).map((v) => (
              <option key={v} value={v} disabled={!!f.max && v >= f.max}>{money(v, locale)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">{tx(locale, "Máximo", "Maximum")}</span>
          <select value={f.max ?? ""} onChange={(e) => set({ max: e.target.value || null })} className={cn(pill, "w-full appearance-none border-line bg-white", f.max && on)} aria-label={tx(locale, "Precio máximo", "Max price")}>
            <option value="">{tx(locale, "Sin máximo", "No max")}</option>
            {withValue(steps, f.max).map((v) => (
              <option key={v} value={v} disabled={!!f.min && v <= f.min}>{money(v, locale)}</option>
            ))}
          </select>
        </label>
      </div>
      {per && <p className="mt-2 text-xs text-muted">{tx(locale, `Precios en dólares${per}.`, `Prices in US dollars${per}.`)}</p>}
    </div>
  );
}

export function KindFields({ locale, f, set }: { locale: Locale; f: FilterValues; set: SetFilters }) {
  const opts: [string | null, string][] = [[null, tx(locale, "Cualquier tipo", "Any type")], ...KIND_OPTIONS.map(([k, es, en]) => [k, tx(locale, es, en)] as [string, string])];
  if (f.kind && !KIND_OPTIONS.some(([k]) => k === f.kind)) opts.push([f.kind, KIND_CHIP[f.kind] ? tx(locale, ...KIND_CHIP[f.kind]) : f.kind]);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={tx(locale, "Tipo de inmueble", "Property type")}>
      {opts.map(([k, label]) => (
        <button key={k ?? "any"} type="button" aria-pressed={f.kind === k} onClick={() => set({ kind: k })} className={cn(pill, "md:h-9", f.kind === k ? on : "border-line bg-white")}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function BedsFields({ locale, f, set }: { locale: Locale; f: FilterValues; set: SetFilters }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={tx(locale, "Habitaciones", "Bedrooms")}>
      {([null, 1, 2, 3, 4] as const).map((b) => (
        <button key={b ?? "any"} type="button" aria-pressed={(f.beds ?? null) === b} onClick={() => set({ beds: b === null ? null : String(b) })} className={cn(pill, "min-w-[3.25rem] justify-center md:h-9", (f.beds ?? null) === b ? on : "border-line bg-white")}>
          {b === null ? tx(locale, "Cualquiera", "Any") : `${b}+`}
        </button>
      ))}
    </div>
  );
}

export function ZoneSelect({ locale, f, set, zones, className }: { locale: Locale; f: FilterValues; set: SetFilters; zones: ZoneGroup[]; className?: string }) {
  const known = !f.zone || zones.some((g) => g.city === f.zone || g.zones.includes(f.zone!));
  return (
    <select value={f.zone ?? ""} onChange={(e) => set({ zone: e.target.value || null })} className={cn(pill, "appearance-none border-line bg-white pr-8", f.zone && on, className)} aria-label={tx(locale, "Zona", "Area")}>
      <option value="">{tx(locale, "Todas las zonas", "All areas")}</option>
      {/* A zone that came from the URL or the NL parser (e.g. a city) stays selectable and visible. */}
      {!known && f.zone && <option value={f.zone}>{f.zone}</option>}
      {zones.map((g) => (
        <optgroup key={g.city} label={g.city}>
          <option value={g.city}>{tx(locale, `${/^(El|Los|Puerto)\s/.test(g.city) ? "Todo" : "Toda"} ${g.city}`, `All of ${g.city}`)}</option>
          {g.zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Everything behind "Más filtros": rooms and size, publication, conditions, amenities and Venezuelan essentials.
 * `withLux`: also the "Colección Privada" toggle (desktop: it no longer gets a pill of its own in the filter bar).
 */
export function MoreFields({ locale, f, set, withLux = false }: { locale: Locale; f: FilterValues; set: SetFilters; withLux?: boolean }) {
  const { ess } = f;
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <label className="block">
          <span className={sectionTitle}>{tx(locale, "Baños", "Bathrooms")}</span>
          <select value={f.baths ?? ""} onChange={(e) => set({ baths: e.target.value || null })} className={cn(pill, "w-full appearance-none border-line bg-white", f.baths && on)}>
            <option value="">{tx(locale, "Cualquiera", "Any")}</option>
            {[1, 2, 3, 4].map((b) => (
              <option key={b} value={b}>{b}+ {tx(locale, b === 1 ? "baño" : "baños", b === 1 ? "bath" : "baths")}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={sectionTitle}>{tx(locale, "Superficie mínima", "Min. area")}</span>
          <select value={f.minM2 ?? ""} onChange={(e) => set({ m2: e.target.value || null })} className={cn(pill, "w-full appearance-none border-line bg-white", f.minM2 && on)}>
            <option value="">{tx(locale, "Cualquiera", "Any")}</option>
            {MIN_M2_STEPS.map((v) => (
              <option key={v} value={v}>≥ {num(v, locale)} m²</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        <div>
          <div className={sectionTitle}>{tx(locale, "Publicado", "Published")}</div>
          <div className="flex gap-2">
            {[["24h", "24 h"], ["7d", tx(locale, "7 días", "7 days")]].map(([k, v]) => (
              <button key={k} type="button" aria-pressed={f.pub === k} onClick={() => set({ pub: f.pub === k ? null : k })} className={cn(pill, f.pub === k ? on : "border-line")}>{v}</button>
            ))}
          </div>
        </div>
        <div>
          <div className={sectionTitle}>{tx(locale, "Condiciones", "Conditions")}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={f.furnished} onClick={() => set({ furnished: f.furnished ? null : "1" })} className={cn(pill, f.furnished ? on : "border-line")}>{tx(locale, "Amoblado", "Furnished")}</button>
            <button type="button" aria-pressed={f.pets} onClick={() => set({ pets: f.pets ? null : "1" })} className={cn(pill, f.pets ? on : "border-line")}>{tx(locale, "Mascotas", "Pets")}</button>
            <button type="button" aria-pressed={f.verified} onClick={() => set({ verified: f.verified ? null : "1" })} className={cn(pill, f.verified ? on : "border-line")}>{tx(locale, "Agencia verificada", "Verified agency")}</button>
            {withLux && (
              <button type="button" aria-pressed={f.lux} onClick={() => set({ lux: f.lux ? null : "1" })} className={cn(pill, f.lux ? on : "border-line")}>{tx(locale, "Colección Privada", "Private Collection")}</button>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className={sectionTitle}>{tx(locale, "Servicios", "Amenities")}</div>
          <div className="flex flex-wrap gap-2">
            {FILTER_AMENITIES.map((a) => {
              const sel = f.amen.includes(a);
              return (
                <button key={a} type="button" aria-pressed={sel} onClick={() => set({ am: (sel ? f.amen.filter((x) => x !== a) : [...f.amen, a]).join(",") || null })} className={cn(pill, "md:h-9", sel ? on : "border-line")}>
                  {lbl(AMENITY_LABEL[a], locale)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-5" role="group" aria-labelledby="search-essentials-title">
        <div id="search-essentials-title" className={sectionTitle}>{tx(locale, "Servicios esenciales", "Essential services")}</div>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <div className="mb-2 text-sm font-semibold">{tx(locale, "Planta eléctrica", "Backup power")}</div>
            <div className="flex flex-wrap gap-2">
              {([["full", "100 %", "100%"], ["partial", "Al menos parcial", "At least partial"]] as const).map(([k, es, en]) => (
                <button key={k} type="button" aria-pressed={ess.power === k} onClick={() => set({ power: ess.power === k ? null : k })} className={cn(pill, "md:h-9", ess.power === k ? on : "border-line")}>{tx(locale, es, en)}</button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">{tx(locale, "Tanque de agua", "Water tank")}</span>
            <select value={ess.tank ?? ""} onChange={(e) => set({ tank: e.target.value || null })} className={cn(pill, "w-full appearance-none border-line bg-white md:h-9", ess.tank && on)}>
              <option value="">{tx(locale, "Cualquiera", "Any")}</option>
              {(ess.tank && !TANK_STEPS.includes(ess.tank) ? [...TANK_STEPS, ess.tank].sort((a, b) => a - b) : TANK_STEPS).map((v) => (
                <option key={v} value={v}>≥ {num(v, locale)} L</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <div className="mb-2 text-sm font-semibold">{tx(locale, "Agua, muelle y vistas", "Water, dock and views")}</div>
            <div className="flex flex-wrap gap-2">
              {([["well", "Pozo propio", "Own well"], ["dock", "Con muelle", "With dock"], ["avila", "Vista al Ávila", "Ávila view"], ["sea", "Vista al mar", "Sea view"]] as const).map(([k, es, en]) => (
                <button key={k} type="button" aria-pressed={!!ess[k]} onClick={() => set({ [k]: ess[k] ? null : "1" })} className={cn(pill, "md:h-9", ess[k] ? on : "border-line")}>{tx(locale, es, en)}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** "Ver 12 casas" with a spinner while the count refreshes. */
export function SeeHomes({ locale, total, fetching, onClick, className }: { locale: Locale; total: number; fetching: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("np-btn-navy inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-navy px-6 font-display text-[15px] font-semibold text-ivory", className)}>
      {fetching && <Loader2 size={15} aria-hidden className="animate-spin" />}
      {tx(locale, `Ver ${plural(total, locale, ["casa", "casas"], ["home", "homes"])}`, `Show ${plural(total, locale, ["casa", "casas"], ["home", "homes"])}`)}
    </button>
  );
}

/**
 * Phones: every filter on one full-screen sheet. Filters apply as they're tapped (the count in "Ver N casas" is
 * live); the button just closes the sheet onto the list.
 */
export function FilterSheet({
  locale,
  f,
  set,
  zones,
  total,
  fetching,
  activeCount,
  onClear,
  onClose,
  opener,
}: {
  locale: Locale;
  f: FilterValues;
  set: SetFilters;
  zones: ZoneGroup[];
  total: number;
  fetching: boolean;
  activeCount: number;
  onClear: () => void;
  onClose: () => void;
  opener: RefObject<HTMLElement | null>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(true, onClose, panel, opener, { outside: false });
  const titleId = useId();
  const section = "border-b border-line px-4 py-5";
  return (
    <div ref={panel} id="search-filters-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} className="np-in fixed inset-0 z-[70] flex flex-col bg-ivory text-ink lg:hidden">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-2 pl-4">
        <h2 id={titleId} className="font-serif text-[22px]">{tx(locale, "Filtros", "Filters")}</h2>
        <button type="button" data-autofocus onClick={onClose} aria-label={tx(locale, "Cerrar filtros", "Close filters")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5">
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={section}>
          <span className={sectionTitle}>{tx(locale, "Qué buscas", "What you're after")}</span>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(([k, es, en]) => (
              <button key={k} type="button" aria-pressed={f.type === k} onClick={() => set({ type: k, max: null, min: null })} className={cn(pill, "justify-center", f.type === k ? on : "border-line bg-white")}>
                {tx(locale, es, en)}
              </button>
            ))}
          </div>
        </div>
        <div className={section}>
          <span className={sectionTitle}>{tx(locale, "Precio", "Price")}</span>
          <PriceFields locale={locale} f={f} set={set} />
        </div>
        <div className={section}>
          <span className={sectionTitle}>{tx(locale, "Tipo de casa", "Type of home")}</span>
          <KindFields locale={locale} f={f} set={set} />
        </div>
        <div className={section}>
          <span className={sectionTitle}>{tx(locale, "Habitaciones", "Bedrooms")}</span>
          <BedsFields locale={locale} f={f} set={set} />
        </div>
        <div className={section}>
          <span className={sectionTitle}>{tx(locale, "Zona", "Area")}</span>
          <ZoneSelect locale={locale} f={f} set={set} zones={zones} className="w-full" />
        </div>
        <div className={section}>
          <button type="button" aria-pressed={f.lux} onClick={() => set({ lux: f.lux ? null : "1" })} className={cn(pill, f.lux ? on : "border-line bg-white")}>
            {tx(locale, "Colección Privada", "Private Collection")}
          </button>
        </div>
        <div className="px-4 py-5">
          <MoreFields locale={locale} f={f} set={set} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-ivory px-4 pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={onClear} disabled={!activeCount} className="min-h-12 rounded-full px-3 font-display text-[15px] font-semibold underline underline-offset-4 disabled:cursor-default disabled:bg-[#E3DDD3] disabled:text-[#5E5650] disabled:no-underline dark:disabled:bg-white/10 dark:disabled:text-[#CFC4B8]">
          {tx(locale, "Borrar todo", "Clear all")}
        </button>
        <SeeHomes locale={locale} total={total} fetching={fetching} onClick={onClose} className="ml-auto flex-1" />
      </div>
    </div>
  );
}
