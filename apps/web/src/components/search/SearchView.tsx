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
import { AMENITY_LABEL, lbl, money, num, tx } from "@/lib/i18n";
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

const FILTER_AMENITIES: Amenity[] = ["pool", "generator", "waterTank", "security", "gym", "terrace", "view", "garden", "elevator", "ac"];

export function SearchView({ locale, initial, zones }: { locale: Locale; initial: { items: Listing[]; total: number }; zones: string[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const { requireLogin } = useApp();
  const [savingAlert, setSavingAlert] = useState(false);
  const [shape, setShape] = useState<Shape>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileList, setMobileList] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);
  const [nl, setNl] = useState(sp.get("q") ?? "");
  const [sort, setSort] = useState<"new" | "price-asc" | "price-desc" | "ppm">("new");

  const type = sp.get("type") ?? "SALE";
  const zone = sp.get("zone");
  const max = sp.get("max") ? Number(sp.get("max")) : undefined;
  const beds = sp.get("beds") ? Number(sp.get("beds")) : undefined;
  const pub = sp.get("pub");
  const lux = sp.get("lux") === "1";
  const kind = sp.get("kind");
  const furnished = sp.get("furnished") === "1";
  const pets = sp.get("pets") === "1";
  const verified = sp.get("verified") === "1";
  const amen = (sp.get("am") ?? "").split(",").filter(Boolean) as Amenity[];

  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) v === null ? p.delete(k) : p.set(k, v);
    router.replace(`/${locale}/search?${p.toString()}`, { scroll: false });
    setAlertSaved(false);
  };

  const shapeParam = shape?.type === "poly" ? `&poly=${shape.pts.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";")}` : shape?.type === "radius" ? `&radius=${shape.center.lat.toFixed(5)},${shape.center.lng.toFixed(5)},${shape.km}` : "";
  const qs = `${sp.toString()}&sort=${sort}${shapeParam}`;
  const query = useQuery({
    queryKey: ["search", qs],
    queryFn: () => api<{ items: Listing[]; total: number }>(`/api/v1/listings?${qs}`),
    placeholderData: keepPreviousData,
    initialData: qs === `${sp.toString()}&sort=new` ? initial : undefined,
  });
  const results = query.data?.items ?? [];
  const createAlert = async () => {
    if (!requireLogin()) return;
    setSavingAlert(true);
    try {
      const name = [tx(locale, TYPES.find((t) => t[0] === type)?.[1] ?? "", TYPES.find((t) => t[0] === type)?.[2] ?? ""), zone, beds ? `${beds}+ ${tx(locale, "hab", "bd")}` : "", max ? `< ${max.toLocaleString("es-VE")}` : "", shape ? tx(locale, "zona dibujada", "drawn area") : ""].filter(Boolean).join(" · ");
      await api("me/searches", { method: "POST", json: { name, query: sp.toString(), frequency: "INSTANT", ...(shape?.type === "poly" ? { polygon: shape.pts } : {}) } });
      setAlertSaved(true);
    } finally {
      setSavingAlert(false);
    }
  };

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
  }, [region, sp.toString()]);
  const activeChips: [string, string, Record<string, string | null>][] = [];
  if (zone) activeChips.push(["zone", zone, { zone: null }]);
  if (max) activeChips.push(["max", `≤ ${money(max, locale)}`, { max: null }]);
  if (beds) activeChips.push(["beds", `${beds}+ ${tx(locale, "hab", "bd")}`, { beds: null }]);
  if (kind) activeChips.push(["kind", kind === "penthouse" ? tx(locale, "Ático / PH", "Penthouse") : kind, { kind: null }]);
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
              className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
          </form>
          <div className="flex shrink-0 rounded-full border border-line bg-white p-0.5">
            {TYPES.map(([k, es, en]) => (
              <button
                key={k}
                onClick={() => set({ type: k, max: null })}
                className={cn("rounded-full px-3 py-1 font-display text-sm", type === k ? "bg-navy text-ivory" : "text-ink/70 hover:text-ink")}
              >
                {tx(locale, es, en)}
              </button>
            ))}
          </div>
          <select
            value={max ?? ""}
            onChange={(e) => set({ max: e.target.value || null })}
            className={cn(pill, "appearance-none border-line bg-white pr-8", max && "border-navy")}
            aria-label={tx(locale, "Precio máximo", "Max price")}
          >
            <option value="">{tx(locale, "Precio máx.", "Max price")}</option>
            {PRICE_STEPS[type]?.map((v) => (
              <option key={v} value={v}>≤ {money(v, locale)}</option>
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
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <button onClick={() => setMoreOpen((o) => !o)} className={cn(pill, "border-line bg-white", moreOpen && "border-navy")}>
            <SlidersHorizontal size={15} /> {tx(locale, "Más filtros", "More filters")} <ChevronDown size={14} />
          </button>
          <button
            onClick={() => set({ lux: lux ? null : "1" })}
            className={cn(pill, lux ? "border-gold bg-gold text-navy" : "border-gold/60 bg-white text-[#8A6A3C]")}
          >
            Luxury
          </button>
          <button
            onClick={createAlert}
            className={cn(pill, "ml-auto", alertSaved ? "border-ok bg-ok text-white" : "border-coral bg-coral text-white hover:bg-coral-hover")}
          >
            {alertSaved ? <Check size={15} /> : savingAlert ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />} {alertSaved ? tx(locale, "Alerta creada", "Alert saved") : tx(locale, "Guardar búsqueda", "Save search")}
          </button>
        </div>
        {moreOpen && (
          <div className="np-in absolute inset-x-0 top-full border-b border-line bg-white px-5 py-4 shadow-np">
            <div className="grid gap-6 md:grid-cols-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{tx(locale, "Publicado", "Published")}</div>
                <div className="flex gap-2">
                  {[["24h", "24 h"], ["7d", tx(locale, "7 días", "7 days")]].map(([k, v]) => (
                    <button key={k} onClick={() => set({ pub: pub === k ? null : k })} className={cn(pill, pub === k ? "border-navy bg-navy text-ivory" : "border-line")}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{tx(locale, "Condiciones", "Conditions")}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => set({ furnished: furnished ? null : "1" })} className={cn(pill, furnished ? "border-navy bg-navy text-ivory" : "border-line")}>{tx(locale, "Amoblado", "Furnished")}</button>
                  <button onClick={() => set({ pets: pets ? null : "1" })} className={cn(pill, pets ? "border-navy bg-navy text-ivory" : "border-line")}>{tx(locale, "Mascotas", "Pets")}</button>
                  <button onClick={() => set({ verified: verified ? null : "1" })} className={cn(pill, verified ? "border-navy bg-navy text-ivory" : "border-line")}>{tx(locale, "Agencia verificada", "Verified agency")}</button>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{tx(locale, "Amenidades", "Amenities")}</div>
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
            key={region + sp.toString()}
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
                  {num(query.data?.total ?? results.length, locale)} {tx(locale, "resultados", "results")}{query.isFetching && <Loader2 size={15} className="ml-2 inline animate-spin text-ink/40" />}
                  {shape && <span className="ml-2 rounded-full bg-coral/10 bg-[#F26B4D1A] px-2 py-0.5 text-xs text-coral-hover">{tx(locale, "en tu zona dibujada", "in your drawn area")}</span>}
                </div>
                <div className="text-xs text-ink/50">{tx(locale, "Precios en USD · actualizados en tiempo real", "Prices in USD · updated in real time")}</div>
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-8 rounded-lg border border-line bg-white px-2 text-sm">
                <option value="new">{tx(locale, "Más nuevos", "Newest")}</option>
                <option value="price-asc">{tx(locale, "Precio ↑", "Price ↑")}</option>
                <option value="price-desc">{tx(locale, "Precio ↓", "Price ↓")}</option>
                <option value="ppm">{tx(locale, "USD/m² ↑", "USD/m² ↑")}</option>
              </select>
            </div>
            {activeChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeChips.map(([k, label, patch]) => (
                  <button key={k} onClick={() => set(patch)} className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-0.5 text-xs font-semibold text-ivory">
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
                cta={<button onClick={createAlert} className="rounded-np bg-coral px-4 py-2 font-display text-white">{tx(locale, "Crear alerta", "Create alert")}</button>}
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
