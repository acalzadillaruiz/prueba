"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, BellRing, Check, Loader2, ChevronDown, List, Map as MapIcon, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { heuristicSearchParse } from "@newplace/ai";
import type { Amenity, Listing, Locale } from "@/types/domain";
import { MapView as NightMap } from "@/components/map/MapView";
import { ListingCard, MapPreviewCard } from "@/components/listing/ListingCard";
import { EmptyState } from "@/components/ui";
import type { Shape } from "@/lib/geo";
import { AMENITY_LABEL, lbl, money, num, tx, plural } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryToParams } from "./HeroSearch";

const TYPES = [
  ["SALE", "Comprar", "Buy"],
  ["LONG_RENT", "Alquilar", "Rent"],
  ["SHORT_RENT", "Vacacional", "Vacation"],
  ["COMMERCIAL", "Comercial", "Commercial"],
] as const;

const PRICE_STEPS: Record<string, number[]> = {
  SALE: [80000, 120000, 150000, 200000, 250000, 400000, 1000000],
  LONG_RENT: [500, 800, 1200, 1800, 2500],
  SHORT_RENT: [60, 90, 150, 250],
  COMMERCIAL: [2000, 5000, 200000, 500000, 1000000],
};

const MIN_M2_STEPS = [50, 80, 100, 150, 200, 300];
const SORTS = ["new", "price-asc", "price-desc", "ppm"] as const;
type Sort = (typeof SORTS)[number];

/** URL ⇄ drawn shape, in the exact format the API parses (`poly=lat,lng;lat,lng;…`, `radius=lat,lng,km`). */
export function shapeToParams(shape: Shape): { poly: string | null; radius: string | null } {
  if (shape?.type === "poly") return { poly: shape.pts.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";"), radius: null };
  if (shape?.type === "radius") return { poly: null, radius: `${shape.center.lat.toFixed(5)},${shape.center.lng.toFixed(5)},${+shape.km.toFixed(3)}` };
  return { poly: null, radius: null };
}

export function shapeFromParams(poly: string | null, radius: string | null): Shape {
  if (poly) {
    const pts = poly.split(";").map((p) => p.split(",").map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite)).map(([lat, lng]) => ({ lat, lng }));
    return pts.length >= 3 ? { type: "poly", pts } : null;
  }
  if (radius) {
    const [lat, lng, km] = radius.split(",").map(Number);
    return [lat, lng, km].every(Number.isFinite) && km > 0 ? { type: "radius", center: { lat, lng }, km } : null;
  }
  return null;
}

const KIND_CHIP: Record<string, [string, string]> = {
  penthouse: ["Ático / PH", "Penthouse"],
  house: ["Casa", "House"],
  apartment: ["Apartamento", "Apartment"],
  land: ["Terreno", "Land"],
};

const FILTER_AMENITIES: Amenity[] = ["pool", "generator", "waterTank", "security", "gym", "terrace", "view", "garden", "elevator", "ac"];

export function SearchView({ locale, initial, zones }: { locale: Locale; initial: { items: Listing[]; total: number }; zones: string[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const { requireLogin } = useApp();
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileList, setMobileList] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);
  const [nl, setNl] = useState(sp.get("q") ?? "");

  const type = sp.get("type") ?? "SALE";
  const zone = sp.get("zone");
  const numParam = (k: string) => {
    const v = Number(sp.get(k));
    return sp.get(k) && Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const max = numParam("max");
  const min = numParam("min");
  const beds = numParam("beds");
  const baths = numParam("baths");
  const minM2 = numParam("m2");
  const sortParam = sp.get("sort");
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "new";
  const polyParam = sp.get("poly");
  const radiusParam = sp.get("radius");
  // Sort and the drawn area live in the URL, so reload / share restores them (and the map redraws the shape).
  const shape = useMemo(() => shapeFromParams(polyParam, radiusParam), [polyParam, radiusParam]);
  const pub = sp.get("pub");
  const lux = sp.get("lux") === "1";
  const kind = sp.get("kind");
  const furnished = sp.get("furnished") === "1";
  const pets = sp.get("pets") === "1";
  const verified = sp.get("verified") === "1";
  const amen = (sp.get("am") ?? "").split(",").filter(Boolean) as Amenity[];

  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); }
    router.replace(`/${locale}/search?${p.toString()}`, { scroll: false });
    setAlertSaved(false);
    setAlertError(null);
  };
  const setShape = (s: Shape) => set(shapeToParams(s));

  // The page defaults to "Comprar"; the API must get the same default or other types leak into the results.
  const base = new URLSearchParams(sp.toString());
  if (!base.get("type")) base.set("type", "SALE");
  const qs = base.toString();
  // The server rendered `initial` for the URL we landed on (sort and shape included).
  const [initialQs] = useState(qs);
  const query = useQuery({
    queryKey: ["search", qs],
    queryFn: () => api<{ items: Listing[]; total: number }>(`/api/v1/listings?${qs}`),
    placeholderData: keepPreviousData,
    initialData: qs === initialQs ? initial : undefined,
  });
  const results = query.data?.items ?? [];
  const createAlert = async () => {
    if (alertSaved || savingAlert) return;
    if (!requireLogin()) return;
    setSavingAlert(true);
    setAlertError(null);
    try {
      const name = [
        tx(locale, TYPES.find((t) => t[0] === type)?.[1] ?? "", TYPES.find((t) => t[0] === type)?.[2] ?? ""),
        zone,
        beds ? `${beds}+ ${tx(locale, "hab", "bd")}` : "",
        baths ? `${baths}+ ${tx(locale, "baños", "ba")}` : "",
        minM2 ? `≥ ${minM2} m²` : "",
        min ? `≥ ${num(min, locale)}` : "",
        max ? `≤ ${num(max, locale)}` : "",
        shape ? (shape.type === "radius" ? tx(locale, `radio ${shape.km} km`, `${shape.km} km radius`) : tx(locale, "zona dibujada", "drawn area")) : "",
      ]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 120);
      // The query keeps every filter (poly/radius included: a radius has no column of its own); the polygon also goes to its column for alert matching.
      const alertQuery = new URLSearchParams(base);
      alertQuery.delete("sort");
      await api("me/searches", { method: "POST", json: { name, query: alertQuery.toString(), frequency: "INSTANT", ...(shape?.type === "poly" ? { polygon: shape.pts } : {}) } });
      setAlertSaved(true);
    } catch (e) {
      setAlertError((e as Error).message);
    } finally {
      setSavingAlert(false);
    }
  };

  // Map remounts when filters change, but not when only the drawn shape or the sort change (keeps zoom/pan).
  const filtersKey = (() => {
    const p = new URLSearchParams(sp.toString());
    ["poly", "radius", "sort"].forEach((k) => p.delete(k));
    return p.toString();
  })();
  const [regionPick, setRegionPick] = useState<"caracas" | "venezuela" | null>(null);
  const autoRegion = results.length > 0 && results.every((l) => l.city !== "Caracas") ? "venezuela" : "caracas";
  const region = regionPick ?? autoRegion;
  const mapListings = region === "caracas" ? results.filter((l) => l.city === "Caracas") : results;
  const fit = useMemo(() => {
    if (region !== "caracas" || mapListings.length === 0) return { focus: undefined, scale: region === "caracas" ? 1.7 : 1 };
    const lats = mapListings.map((l) => l.lat);
    const lngs = mapListings.map((l) => l.lng);
    const dLat = Math.max(...lats) - Math.min(...lats);
    const dLng = Math.max(...lngs) - Math.min(...lngs);
    const scale = Math.max(1.7, Math.min(5, Math.min(0.185 / (dLng * 1.8 || 0.01), 0.14 / (dLat * 2.2 || 0.01))));
    return { focus: { lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lngs) + Math.min(...lngs)) / 2 }, scale };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, filtersKey]);
  const activeChips: [string, string, Record<string, string | null>][] = [];
  if (zone) activeChips.push(["zone", zone, { zone: null }]);
  if (min) activeChips.push(["min", `≥ ${money(min, locale)}`, { min: null }]);
  if (max) activeChips.push(["max", `≤ ${money(max, locale)}`, { max: null }]);
  if (beds) activeChips.push(["beds", `${beds}+ ${tx(locale, "hab", "bd")}`, { beds: null }]);
  if (baths) activeChips.push(["baths", `${baths}+ ${tx(locale, "baños", "ba")}`, { baths: null }]);
  if (minM2) activeChips.push(["m2", `≥ ${num(minM2, locale)} m²`, { m2: null }]);
  if (shape) activeChips.push(["shape", shape.type === "radius" ? tx(locale, `Radio ${shape.km} km`, `${shape.km} km radius`) : tx(locale, "Zona dibujada", "Drawn area"), { poly: null, radius: null }]);
  if (kind) activeChips.push(["kind", KIND_CHIP[kind] ? tx(locale, ...KIND_CHIP[kind]) : kind, { kind: null }]);
  if (lux) activeChips.push(["lux", "Luxury", { lux: null }]);
  if (pub) activeChips.push(["pub", pub === "24h" ? tx(locale, "Últimas 24 h", "Last 24 h") : tx(locale, "Últimos 7 días", "Last 7 days"), { pub: null }]);
  if (furnished) activeChips.push(["furnished", tx(locale, "Amoblado", "Furnished"), { furnished: null }]);
  if (pets) activeChips.push(["pets", tx(locale, "Mascotas", "Pets"), { pets: null }]);
  if (verified) activeChips.push(["verified", tx(locale, "Agencia verificada", "Verified agency"), { verified: null }]);
  amen.forEach((a) => activeChips.push([a, lbl(AMENITY_LABEL[a], locale), { am: amen.filter((x) => x !== a).join(",") || null }]));

  const pill = "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-display text-sm transition-colors duration-np";

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* filter bar */}
      <div className="relative z-30 border-b border-line bg-ivory">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-2.5 md:flex-wrap md:overflow-visible md:px-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = heuristicSearchParse(nl);
              const p = queryToParams(q, nl);
              if (q.minPrice && (!q.maxPrice || q.minPrice < q.maxPrice)) p.set("min", String(q.minPrice));
              if (!q.listingType) p.set("type", type);
              router.replace(`/${locale}/search?${p.toString()}`);
            }}
            className="flex h-9 min-w-[220px] shrink-0 items-center gap-2 rounded-full border border-line bg-white px-3 md:flex-1 xl:max-w-[300px]"
          >
            <Sparkles size={15} className="shrink-0 text-coral" />
            <input
              value={nl}
              onChange={(e) => setNl(e.target.value)}
              placeholder={tx(locale, "Escribe lo que buscas…", "Describe what you want…")}
              aria-label={tx(locale, "Búsqueda en lenguaje natural", "Natural-language search")}
              className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
          </form>
          <div className="flex shrink-0 rounded-full border border-line bg-white p-0.5">
            {TYPES.map(([k, es, en]) => (
              <button
                key={k}
                onClick={() => set({ type: k, max: null, min: null })}
                aria-pressed={type === k}
                className={cn("rounded-full px-3 py-1 font-display text-sm", type === k ? "bg-navy text-ivory" : "text-ink/70 hover:text-ink")}
              >
                {tx(locale, es, en)}
              </button>
            ))}
          </div>
          <select
            value={min ?? ""}
            onChange={(e) => set({ min: e.target.value || null })}
            className={cn(pill, "appearance-none border-line bg-white pr-8", min && "border-navy")}
            aria-label={tx(locale, "Precio mínimo", "Min price")}
          >
            <option value="">{tx(locale, "Precio mín.", "Min price")}</option>
            {[...(PRICE_STEPS[type] ?? [])].slice(0, -1).map((v) => (
              <option key={v} value={v} disabled={!!max && v >= max}>≥ {money(v, locale)}</option>
            ))}
          </select>
          <select
            value={max ?? ""}
            onChange={(e) => set({ max: e.target.value || null })}
            className={cn(pill, "appearance-none border-line bg-white pr-8", max && "border-navy")}
            aria-label={tx(locale, "Precio máximo", "Max price")}
          >
            <option value="">{tx(locale, "Precio máx.", "Max price")}</option>
            {PRICE_STEPS[type]?.map((v) => (
              <option key={v} value={v} disabled={!!min && v <= min}>≤ {money(v, locale)}</option>
            ))}
          </select>
          <select value={beds ?? ""} onChange={(e) => set({ beds: e.target.value || null })} className={cn(pill, "appearance-none border-line bg-white", beds && "border-navy")} aria-label={tx(locale, "Habitaciones", "Bedrooms")}>
            <option value="">{tx(locale, "Habitaciones", "Beds")}</option>
            {[1, 2, 3, 4].map((b) => (
              <option key={b} value={b}>{b}+ {tx(locale, "hab", "bd")}</option>
            ))}
          </select>
          <select value={zone ?? ""} onChange={(e) => set({ zone: e.target.value || null })} className={cn(pill, "appearance-none border-line bg-white", zone && "border-navy")} aria-label={tx(locale, "Zona", "Area")}>
            <option value="">{tx(locale, "Todas las zonas", "All areas")}</option>
            {/* A zone that came from the URL or the NL parser (e.g. a city) stays selectable and visible. */}
            {(zone && !zones.includes(zone) ? [zone, ...zones] : zones).map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} aria-controls="search-more-filters" className={cn(pill, "border-line bg-white", (moreOpen || baths || minM2) && "border-navy")}>
            <SlidersHorizontal size={15} /> {tx(locale, "Más filtros", "More filters")} <ChevronDown size={14} />
          </button>
          <button
            onClick={() => set({ lux: lux ? null : "1" })}
            aria-pressed={lux}
            className={cn(pill, lux ? "border-gold bg-gold text-navy" : "border-gold/60 bg-white text-[#8A6A3C]")}
          >
            Luxury
          </button>
          <button
            onClick={createAlert}
            disabled={alertSaved || savingAlert}
            aria-live="polite"
            className={cn(pill, "ml-auto disabled:cursor-default", alertSaved ? "border-ok bg-ok text-white" : "border-coral bg-coral-cta text-white hover:bg-coral-cta-hover")}
          >
            {alertSaved ? <Check size={15} /> : savingAlert ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />} {alertSaved ? tx(locale, "Alerta creada", "Alert saved") : tx(locale, "Guardar búsqueda", "Save search")}
          </button>
        </div>
        {alertError && (
          <div role="alert" className="border-t border-line bg-[#B423181A] px-4 py-2 text-sm text-danger md:px-5">{alertError}</div>
        )}
        {moreOpen && (
          <div id="search-more-filters" className="np-in absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-b border-line bg-white px-4 py-4 shadow-np md:px-5">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink/65">{tx(locale, "Baños", "Bathrooms")}</span>
                <select value={baths ?? ""} onChange={(e) => set({ baths: e.target.value || null })} className={cn(pill, "w-full appearance-none border-line bg-white", baths && "border-navy")}>
                  <option value="">{tx(locale, "Cualquiera", "Any")}</option>
                  {[1, 2, 3, 4].map((b) => (
                    <option key={b} value={b}>{b}+ {tx(locale, b === 1 ? "baño" : "baños", b === 1 ? "bath" : "baths")}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink/65">{tx(locale, "Superficie mínima", "Min. area")}</span>
                <select value={minM2 ?? ""} onChange={(e) => set({ m2: e.target.value || null })} className={cn(pill, "w-full appearance-none border-line bg-white", minM2 && "border-navy")}>
                  <option value="">{tx(locale, "Cualquiera", "Any")}</option>
                  {MIN_M2_STEPS.map((v) => (
                    <option key={v} value={v}>≥ {num(v, locale)} m²</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/65">{tx(locale, "Publicado", "Published")}</div>
                <div className="flex gap-2">
                  {[["24h", "24 h"], ["7d", tx(locale, "7 días", "7 days")]].map(([k, v]) => (
                    <button key={k} onClick={() => set({ pub: pub === k ? null : k })} className={cn(pill, pub === k ? "border-navy bg-navy text-ivory" : "border-line")}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/65">{tx(locale, "Condiciones", "Conditions")}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => set({ furnished: furnished ? null : "1" })} className={cn(pill, furnished ? "border-navy bg-navy text-ivory" : "border-line")}>{tx(locale, "Amoblado", "Furnished")}</button>
                  <button onClick={() => set({ pets: pets ? null : "1" })} className={cn(pill, pets ? "border-navy bg-navy text-ivory" : "border-line")}>{tx(locale, "Mascotas", "Pets")}</button>
                  <button onClick={() => set({ verified: verified ? null : "1" })} className={cn(pill, verified ? "border-navy bg-navy text-ivory" : "border-line")}>{tx(locale, "Agencia verificada", "Verified agency")}</button>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/65">{tx(locale, "Amenidades", "Amenities")}</div>
                <div className="flex flex-wrap gap-2">
                  {FILTER_AMENITIES.map((a) => {
                    const on = amen.includes(a);
                    return (
                      <button key={a} onClick={() => set({ am: (on ? amen.filter((x) => x !== a) : [...amen, a]).join(",") || null })} className={cn(pill, "h-8 text-[13px]", on ? "border-navy bg-navy text-ivory" : "border-line")}>
                        {lbl(AMENITY_LABEL[a], locale)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* map 60% */}
        <div className={cn("relative min-h-0 flex-1 lg:basis-[60%]", mobileList && "hidden lg:block")}>
          <NightMap
            key={region + filtersKey}
            region={region}
            listings={mapListings}
            focus={fit.focus}
            locale={locale}
            selectedId={sel}
            hoverId={hover}
            onSelect={setSel}
            shape={shape}
            onShape={setShape}
            className="h-full w-full"
            renderPreview={(l) => <MapPreviewCard l={l} locale={locale} />}
            initialScale={fit.scale}
          />
          <div className="absolute bottom-8 right-3 z-10 flex overflow-hidden rounded-full border border-white/10 bg-navy/90 p-0.5 font-display text-xs text-ivory shadow-np">
            {(["caracas", "venezuela"] as const).map((r) => (
              <button key={r} onClick={() => setRegionPick(r)} className={cn("rounded-full px-3 py-1.5", region === r ? "bg-ivory text-navy" : "text-ivory/80")}>
                {r === "caracas" ? "Caracas" : "Venezuela"}
              </button>
            ))}
          </div>
        </div>
        {/* list 40% */}
        <div className={cn("min-h-0 overflow-y-auto border-l border-line bg-ivory scrollbar-thin lg:block lg:basis-[40%]", mobileList ? "block flex-1" : "hidden")}>
          <div className="sticky top-0 z-10 border-b border-line bg-ivory/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-display text-lg font-semibold">
                  {plural(query.data?.total ?? results.length, locale, ["resultado", "resultados"], ["result", "results"])}{query.isFetching && <Loader2 size={15} className="ml-2 inline animate-spin text-ink/65" />}
                  {shape && <span className="ml-2 rounded-full bg-coral/10 bg-[#F26B4D1A] px-2 py-0.5 text-xs text-coral-hover">{tx(locale, "en tu zona dibujada", "in your drawn area")}</span>}
                </div>
                <div className="text-xs text-ink/65">{tx(locale, "Precios en USD · actualizados en tiempo real", "Prices in USD · updated in real time")}</div>
              </div>
              <select value={sort} onChange={(e) => set({ sort: e.target.value === "new" ? null : e.target.value })} aria-label={tx(locale, "Ordenar por", "Sort by")} className="h-8 rounded-lg border border-line bg-white px-2 text-sm">
                <option value="new">{tx(locale, "Más nuevos", "Newest")}</option>
                <option value="price-asc">{tx(locale, "Precio ↑", "Price ↑")}</option>
                <option value="price-desc">{tx(locale, "Precio ↓", "Price ↓")}</option>
                <option value="ppm">{tx(locale, "USD/m² ↑", "USD/m² ↑")}</option>
              </select>
            </div>
            {activeChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeChips.map(([k, label, patch]) => (
                  <button key={k} onClick={() => set(patch)} aria-label={`${tx(locale, "Quitar filtro", "Remove filter")}: ${label}`} className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-0.5 text-xs font-semibold text-ivory">
                    {label} <X size={12} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {results.map((l) => (
              <div key={l.id} onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)}>
                <ListingCard l={l} locale={locale} compact />
              </div>
            ))}
          </div>
          {results.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={<BellRing size={20} />}
                title={tx(locale, "Nada por aquí… todavía", "Nothing here… yet")}
                body={tx(locale, "Guarda la búsqueda y te avisamos en cuanto aparezca algo que encaje.", "Save this search and we’ll tell you as soon as something matches.")}
                cta={
                  <button onClick={createAlert} disabled={alertSaved || savingAlert} className="rounded-np bg-coral-cta px-4 py-2 font-display text-white disabled:opacity-60">
                    {alertSaved ? tx(locale, "Alerta creada", "Alert saved") : tx(locale, "Crear alerta", "Create alert")}
                  </button>
                }
              />
            </div>
          )}
        </div>
        <button
          onClick={() => setMobileList((m) => !m)}
          className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-navy px-5 py-2.5 font-display text-sm text-ivory shadow-np lg:hidden"
        >
          {mobileList ? <MapIcon size={16} /> : <List size={16} />}
          {mobileList ? tx(locale, "Ver mapa", "Map") : `${tx(locale, "Ver lista", "List")} · ${results.length}`}
        </button>
      </div>
    </div>
  );
}
