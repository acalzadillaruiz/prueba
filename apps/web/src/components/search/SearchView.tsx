"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bell, Check, ChevronDown, List, Loader2, Map as MapIcon, Scale, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { closestPlaces, heuristicSearchParse, queryUnderstood } from "@newplace/ai";
import type { Amenity, Listing, Locale } from "@/types/domain";
import { MapView as NightMap } from "@/components/map/MapView";
import { FIT_PADDING } from "@/components/map/NightMap";
import { compareHref } from "@/components/compare/CompareTray";
import { ListingCard, MapPreviewCard } from "@/components/listing/ListingCard";
import { EmptyState } from "@/components/ui";
import type { Shape } from "@/lib/geo";
import { AMENITY_LABEL, lbl, money, num, tx, plural } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { autoMapRegion, onRegionMap, type MapRegion } from "./mapRegion";
import { FILTER_KEYS, leftoverWords, queryToParams } from "./queryParams";
import { URL_CHANGE_EVENT } from "@/components/layout/PublicHeader";
import { essentialChips, essentialsFromParams } from "@/lib/essentials";
import { placesFromGroups, usePlaceSuggest } from "./PlaceSuggest";
import {
  BedsFields,
  FilterPopover,
  FilterSheet,
  KIND_CHIP,
  KindFields,
  MoreFields,
  PriceFields,
  SeeHomes,
  TYPES,
  ZoneSelect,
  on,
  pill,
  priceLabel,
  useDismiss,
  type FilterValues,
  type ZoneGroup,
} from "./SearchFilters";

export type { ZoneGroup } from "./SearchFilters";

/** "rec" (Recomendados: photos, completeness, then recency) is the default and stays out of the URL. */
const SORTS = ["rec", "new", "price-asc", "price-desc", "ppm"] as const;
type Sort = (typeof SORTS)[number];
/** Sort labels: [es short, en short, es full, en full]. Phones and tablets show the short one (the select stays narrow). */
const SORT_LABEL: Record<Sort, [string, string, string, string]> = {
  rec: ["Recomendados", "Recommended", "Recomendados", "Recommended"],
  new: ["Recientes", "Newest", "Lo más reciente", "Newest first"],
  "price-asc": ["Precio ↑", "Price ↑", "Menor precio", "Lowest price"],
  "price-desc": ["Precio ↓", "Price ↓", "Mayor precio", "Highest price"],
  ppm: ["Precio/m²", "Price/m²", "Mejor precio por m²", "Best value per m²"],
};

/** sessionStorage: the phone view (list / map) the visitor last chose, kept across listing → Back. */
const VIEW_KEY = "np-search-view";
/** sessionStorage: the last search (path + query) and its result count, for the listing page's "← Resultados" pill. */
export const LAST_SEARCH_KEY = "np-last-search";
export const LAST_SEARCH_COUNT_KEY = "np-last-search-count";

/** Keys that change neither the results nor the map's fit: what the list fetch and the map remount ignore. */
const VIEW_ONLY_KEYS = ["view"];

/** Ideas offered when the typed text meant nothing to the parser: each one runs as a search. */
const TRY_INSTEAD: [string, string][] = [
  ["Casa con piscina", "A house with a pool"],
  ["Apartamento de 2 habitaciones", "A 2-bedroom apartment"],
  ["Con terraza", "With a terrace"],
];

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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

/** Span of each illustrated map (degrees) and the zoom range used to fit the results in it. */
const MAP_FIT = {
  caracas: { lng: 0.185, lat: 0.14, min: 1.7, max: 5 },
  venezuela: { lng: 13.9, lat: 11.9, min: 1, max: 8 },
} as const;

export function SearchView({ locale, initial, zones }: { locale: Locale; initial: { items: Listing[]; total: number }; zones: ZoneGroup[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const { requireLogin, compare } = useApp();
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // Desktop: one filter popover (or the "Más filtros" panel) open at a time. Phones: one full-screen filter sheet.
  const [pop, setPop] = useState<"price" | "kind" | "beds" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpener = useRef<HTMLElement | null>(null);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const morePanel = useRef<HTMLDivElement>(null);
  // Phones: the list first (with a docked "Mapa" toggle). The map is a history entry (`view=map`): the phone's Back
  // gesture closes it instead of leaving the search, and reload / share / listing → Back keep it. sessionStorage
  // still remembers the last choice for a fresh visit to /search (the Buscar tab).
  const view: "list" | "map" = sp.get("view") === "map" ? "map" : "list";
  const [desktop, setDesktop] = useState(false);
  /** The `?…` of the map entry this page pushed: closing the map from it goes Back (no stale entry left behind). */
  const mapEntry = useRef<string | null>(null);
  const changeView = (v: "list" | "map") => {
    try {
      sessionStorage.setItem(VIEW_KEY, v);
    } catch {}
    const p = new URLSearchParams(window.location.search);
    if ((p.get("view") === "map") === (v === "map")) return;
    if (v === "map") {
      p.set("view", "map");
      window.history.pushState(null, "", `?${p.toString()}`);
      mapEntry.current = `?${p.toString()}`;
    } else if (mapEntry.current === window.location.search) {
      mapEntry.current = null;
      window.history.back();
    } else {
      // Landed on the map (reload, shared link) or filtered since: swap the entry for the list.
      p.delete("view");
      window.history.replaceState(null, "", `?${p.toString()}`);
    }
  };
  useIsoLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    try {
      if (!mq.matches && sessionStorage.getItem(VIEW_KEY) === "map" && new URLSearchParams(window.location.search).get("view") !== "map") changeView("map");
    } catch {}
    const onMq = () => setDesktop(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Back / forward between list and map keeps the remembered choice in step.
  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_KEY, view);
    } catch {}
  }, [view]);
  const [alertSaved, setAlertSaved] = useState(false);
  const qText = sp.get("q") ?? "";
  // Words the parser turned into filters live on as chips; the box keeps only the words it did not understand (older
  // links may still carry the whole sentence in `q`).
  const leftover = useMemo(() => leftoverWords(qText), [qText]);
  const [nl, setNl] = useState(leftover);
  // Back / forward to another search: the box shows that search's leftover words.
  useEffect(() => setNl(leftover), [leftover]);

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
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "rec";
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
  // Venezuelan essentials (same parser as the API): power=full|partial, well, tank, dock, avila, sea
  const ess = essentialsFromParams(sp);
  const essCount = [ess.power, ess.well, ess.tank, ess.dock, ess.avila, ess.sea].filter(Boolean).length;
  const f: FilterValues = { type, zone, min, max, beds, baths, minM2, kind, lux, pub, furnished, pets, verified, amen, ess };

  // Quick successive changes must stack: start from the last URL we asked for, not the (not yet updated) search params.
  const pending = useRef<string | null>(null);
  useEffect(() => {
    pending.current = null;
    // The header marks Comprar / Alquilar from the query: tell it the URL changed (replaceState fires no event).
    window.dispatchEvent(new Event(URL_CHANGE_EVENT));
  }, [sp]);
  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(pending.current ?? sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); }
    pending.current = p.toString();
    // push, not replace: every filter change is a step the Back button can undo (and Back never leaves the site).
    router.push(`/${locale}/search?${p.toString()}`, { scroll: false });
    setAlertSaved(false);
    setAlertError(null);
  };
  // A drawn shape and "Buscar en esta zona" replace each other (one area at a time).
  const setShape = (s: Shape) => set({ ...shapeToParams(s), bbox: null });
  const searchArea = (b: [number, number, number, number]) => set({ bbox: b.map((v) => v.toFixed(5)).join(","), poly: null, radius: null });
  const clearAll = () => set(Object.fromEntries([...FILTER_KEYS, "q"].map((k) => [k, null])));

  /**
   * Natural-language search (filter bar, "try instead" ideas): the parser turns the words into filters, added to the
   * ones already on (the box holds no chip's words, so typing "con piscina" refines the search instead of wiping it).
   * A new operation drops the price (rent and sale prices differ). `q` keeps only the words not understood.
   */
  const runNl = (text: string) => {
    const raw = text.trim();
    const q = heuristicSearchParse(raw);
    const parsed = queryToParams(q, raw);
    const p = new URLSearchParams(sp.toString());
    p.delete("q");
    if (q.listingType && q.listingType !== type) ["min", "max"].forEach((k) => p.delete(k));
    for (const [k, v] of parsed.entries()) {
      if (k === "am") p.set("am", [...new Set([...(p.get("am") ?? "").split(","), ...v.split(",")])].filter(Boolean).join(","));
      else p.set(k, v);
    }
    if (parsed.get("zone")) p.delete("city");
    if (!p.get("type")) p.set("type", type);
    // The understood words leave the box at once (the effect below only fires when the leftovers change).
    setNl(parsed.get("q") ?? "");
    router.push(`/${locale}/search?${p.toString()}`);
  };

  const places = useMemo(() => placesFromGroups(zones), [zones]);
  // Picking a place searches at once (same path as submitting the box), so the box, chips and results never disagree.
  const suggest = usePlaceSuggest({ locale, text: nl, setText: setNl, places, onPick: (next) => runNl(next) });

  // The page defaults to "Comprar"; the API must get the same default or other types leak into the results.
  const base = new URLSearchParams(sp.toString());
  VIEW_ONLY_KEYS.forEach((k) => base.delete(k));
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
  const results = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? results.length;
  const hasResults = results.length > 0;

  // Words the parser didn't understand (and no filter came out of them): say so instead of passing the whole
  // catalogue off as matches.
  const notUnderstood = !!qText.trim() && !FILTER_KEYS.some((k) => sp.get(k)) && !queryUnderstood(heuristicSearchParse(qText));
  const didYouMean = useMemo(() => (notUnderstood ? closestPlaces(qText, places, 3) : []), [notUnderstood, qText, places]);
  const placeIdeas = didYouMean.length ? didYouMean : zones.slice(0, 3).map((g) => ({ name: g.city }));
  // Partly understood ("casa en lechería con helipuerto"): the understood words are chips; the note names only the
  // words left out (still true when a chip is removed).
  const partly = !notUnderstood && leftover ? leftover : null;

  // The listing page offers "← Resultados" back to this exact search.
  useEffect(() => {
    if (query.isPlaceholderData) return;
    try {
      sessionStorage.setItem(LAST_SEARCH_KEY, window.location.pathname + window.location.search);
      sessionStorage.setItem(LAST_SEARCH_COUNT_KEY, String(total));
    } catch {}
  }, [qs, total, query.isPlaceholderData]);

  // Coming back from a listing lands where you left the list (per search), like any good shop. Desktop: the list
  // scrolls in its own panel (scrollTop). Phones: the document scrolls (window.scrollY), so the header can step away.
  const listRef = useRef<HTMLDivElement>(null);
  const scrollKey = `np-search-scroll:${qs}`;
  const restoring = useRef(false);
  const listVisible = desktop || view === "list";
  const readScroll = () => (desktop ? (listRef.current?.scrollTop ?? 0) : window.scrollY);
  const saveListScroll = () => {
    if (restoring.current || !listVisible) return;
    try {
      sessionStorage.setItem(scrollKey, String(Math.round(readScroll())));
    } catch {}
  };
  const saveRef = useRef(saveListScroll);
  saveRef.current = saveListScroll;
  // Phones: follow the window. A layout effect, so the listener is gone before the map view's (shorter) page clamps
  // the scroll to 0 — that clamp must not overwrite the saved position.
  useIsoLayoutEffect(() => {
    if (desktop || !listVisible) return;
    const onScroll = () => saveRef.current();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [desktop, listVisible]);
  // Restore before paint, then keep re-applying for a moment while the cards lay out (images, fonts) — the list may
  // not be tall enough on the first frame, which used to clamp 1500 px to ~600. Any wheel/touch by the visitor wins.
  useIsoLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !hasResults || !listVisible) return;
    let target = 0;
    try {
      target = Number(sessionStorage.getItem(scrollKey) ?? 0) || 0;
    } catch {}
    if (target <= 0) return;
    const scroller: HTMLElement | Window = desktop ? el : window;
    const get = () => (desktop ? el.scrollTop : window.scrollY);
    const put = (y: number) => (desktop ? (el.scrollTop = y) : window.scrollTo({ top: y, behavior: "instant" }));
    const room = () => (desktop ? el.scrollHeight - el.clientHeight : document.documentElement.scrollHeight - window.innerHeight);
    restoring.current = true;
    let tries = 0;
    let settled = 0;
    let raf = 0;
    const stop = () => {
      restoring.current = false;
      cancelAnimationFrame(raf);
      scroller.removeEventListener("wheel", stop);
      scroller.removeEventListener("touchstart", stop);
    };
    const step = () => {
      put(target);
      // A few frames in place (the router may still move the window once) before letting go.
      settled = Math.abs(get() - target) <= 2 ? settled + 1 : 0;
      if (settled >= 4 || ++tries > 90) return stop();
      raf = requestAnimationFrame(step);
    };
    scroller.addEventListener("wheel", stop, { passive: true });
    scroller.addEventListener("touchstart", stop, { passive: true });
    step();
    // A last check once everything settled (late images): only if the visitor hasn't scrolled since.
    const late = window.setTimeout(() => {
      try {
        if (Math.abs(get() - target) > 2 && room() >= target && Number(sessionStorage.getItem(scrollKey)) === target) put(target);
      } catch {}
    }, 1600);
    return () => {
      stop();
      window.clearTimeout(late);
    };
  }, [scrollKey, hasResults, listVisible, desktop]);

  const createAlert = async () => {
    if (alertSaved || savingAlert) return;
    if (!requireLogin("alert")) return;
    setSavingAlert(true);
    setAlertError(null);
    try {
      // Named after every active filter (same labels as the chips), so two different alerts never look identical.
      const name = [tx(locale, TYPES.find((t) => t[0] === type)?.[1] ?? "", TYPES.find((t) => t[0] === type)?.[2] ?? ""), ...activeChips.map(([, label]) => label)]
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
    ["poly", "radius", "bbox", "sort", ...VIEW_ONLY_KEYS].forEach((k) => p.delete(k));
    return p.toString();
  })();
  // While new results load, the previous ones stay on screen: the map remounts (and fits) only once the fresh set for
  // the new filters is in.
  const [mapFilters, setMapFilters] = useState(filtersKey);
  if (!query.isPlaceholderData && mapFilters !== filtersKey) setMapFilters(filtersKey);
  // The visitor's own pick (Caracas / Venezuela) always wins; otherwise the map follows where most results are.
  const [regionPick, setRegionPick] = useState<MapRegion | null>(null);
  const region = regionPick ?? autoMapRegion(results);
  const mapListings = useMemo(() => onRegionMap(results, region), [region, results]);
  // Some results fall outside the Caracas map: say so ("1 de 8 en el mapa") with one tap to the whole country.
  const offMap = results.length - mapListings.length;
  // Fit the view to the result pins (Lechería zooms on Lechería, not on the whole country).
  const fit = useMemo(() => {
    if (mapListings.length === 0) return { focus: undefined, scale: region === "caracas" ? 1.7 : 1 };
    const span = MAP_FIT[region];
    const lats = mapListings.map((l) => l.lat);
    const lngs = mapListings.map((l) => l.lng);
    const dLat = Math.max(...lats) - Math.min(...lats);
    const dLng = Math.max(...lngs) - Math.min(...lngs);
    const scale = Math.max(span.min, Math.min(span.max, Math.min(span.lng / (dLng * 1.8 || span.lng / span.max), span.lat / (dLat * 2.2 || span.lat / span.max))));
    return { focus: { lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lngs) + Math.min(...lngs)) / 2 }, scale };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, mapFilters]);
  const activeChips: [string, string, Record<string, string | null>][] = [];
  if (zone) activeChips.push(["zone", zone, { zone: null }]);
  if (min) activeChips.push(["min", `≥ ${money(min, locale)}`, { min: null }]);
  if (max) activeChips.push(["max", `≤ ${money(max, locale)}`, { max: null }]);
  if (beds) activeChips.push(["beds", `${beds}+ ${tx(locale, "hab", "bd")}`, { beds: null }]);
  if (baths) activeChips.push(["baths", `${baths}+ ${tx(locale, "baños", "ba")}`, { baths: null }]);
  if (minM2) activeChips.push(["m2", `≥ ${num(minM2, locale)} m²`, { m2: null }]);
  const kmLabel = shape?.type === "radius" ? shape.km.toLocaleString(locale === "es" ? "es-VE" : "en-US", { maximumFractionDigits: 1 }) : "";
  if (sp.get("bbox")) activeChips.push(["bbox", tx(locale, "Zona del mapa", "Map area"), { bbox: null }]);
  if (shape) activeChips.push(["shape", shape.type === "radius" ? tx(locale, `Radio ${kmLabel} km`, `${kmLabel} km radius`) : tx(locale, "Zona dibujada", "Drawn area"), { poly: null, radius: null }]);
  if (kind) activeChips.push(["kind", KIND_CHIP[kind] ? tx(locale, ...KIND_CHIP[kind]) : kind, { kind: null }]);
  if (lux) activeChips.push(["lux", tx(locale, "Colección Privada", "Private Collection"), { lux: null }]);
  if (pub) activeChips.push(["pub", pub === "24h" ? tx(locale, "Últimas 24 h", "Last 24 h") : tx(locale, "Últimos 7 días", "Last 7 days"), { pub: null }]);
  if (furnished) activeChips.push(["furnished", tx(locale, "Amoblado", "Furnished"), { furnished: null }]);
  if (pets) activeChips.push(["pets", tx(locale, "Mascotas", "Pets"), { pets: null }]);
  if (verified) activeChips.push(["verified", tx(locale, "Agencia verificada", "Verified agency"), { verified: null }]);
  amen.forEach((a) => activeChips.push([a, lbl(AMENITY_LABEL[a], locale), { am: amen.filter((x) => x !== a).join(",") || null }]));
  activeChips.push(...essentialChips(ess, locale));
  // Nothing found: for each active filter, how many homes there would be without it (one tap to loosen it).
  const relaxable = activeChips.slice(0, 6);
  const relax = useQuery({
    queryKey: ["relax", qs],
    enabled: !query.isFetching && results.length === 0 && relaxable.length > 0,
    queryFn: () =>
      Promise.all(
        relaxable.map(async ([key, label, patch]) => {
          const p = new URLSearchParams(qs);
          for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); }
          p.set("take", "1");
          const r = await api<{ total: number }>(`/api/v1/listings?${p.toString()}`).catch(() => ({ total: 0 }));
          return { key, label, patch, total: r.total };
        }),
      ).then((xs) => xs.filter((x) => x.total > 0).sort((a, b) => b.total - a.total)),
  });

  useDismiss(moreOpen, () => setMoreOpen(false), morePanel, moreBtn);
  const openSheet = (e: React.MouseEvent<HTMLElement>) => {
    sheetOpener.current = e.currentTarget;
    setSheetOpen(true);
  };
  const filterCount = activeChips.length;
  const filtersLabel = tx(locale, "Filtros", "Filters");
  const filtersAria = filterCount ? tx(locale, `Filtros, ${filterCount} activos`, `Filters, ${filterCount} on`) : filtersLabel;
  const countBadge = filterCount > 0 && <span aria-hidden className="rounded-full bg-navy px-1.5 text-xs font-semibold text-ivory [font-feature-settings:'lnum']">{filterCount}</span>;
  const mapHidden = !desktop && view === "list";
  const listHidden = !desktop && view === "map";
  // Phones in map view: the page is exactly one screen (the map fills it). Phones in list view: the document scrolls.
  const phoneMap = listHidden;
  const fitPoints = useMemo(() => mapListings.map((l) => ({ lat: l.lat, lng: l.lng })), [mapListings]);
  // Phones: the docked Lista/Filtros bar sits over the map's bottom edge.
  const fitPadding = useMemo(() => (desktop ? FIT_PADDING : { ...FIT_PADDING, bottom: 96 }), [desktop]);
  const compareLabel = tx(locale, `Comparar (${compare.length})`, `Compare (${compare.length})`);
  const compareSeg = compare.length > 0 && (
    <>
      {(hasResults || phoneMap) && <span aria-hidden className="my-3 w-px bg-current opacity-30" />}
      <Link href={compareHref(locale, compare)} aria-label={phoneMap ? compareLabel : undefined} className={cn("flex h-12 items-center gap-1.5 pr-5", hasResults || phoneMap ? "pl-4" : "pl-5")}>
        <Scale size={16} aria-hidden className="shrink-0 text-[#9CC3CC] [html.dark_&]:text-[#1F4E5A]" />
        {phoneMap ? <span className="[font-feature-settings:'lnum']">{compare.length}</span> : <>{compareLabel} <ArrowRight size={15} aria-hidden /></>}
      </Link>
    </>
  );

  return (
    <div className={cn("lg:flex lg:h-[calc(100dvh-72px)] lg:flex-col", phoneMap && "flex h-[calc(100dvh-72px)] flex-col")}>
      {/* search + filter bar */}
      <div className="relative z-30 border-b border-ink/[.06] bg-ivory/80 backdrop-blur-xl">
        {/* Below 1440 (lg): row 1 = the words box (≥ 240 px, takes the room left) + operation; row 2 = the filters. From
            1440 it's one row. The box is never squeezed to "Cuéntanos qué b". */}
        <div className="flex items-center gap-2 px-4 py-2.5 lg:flex-wrap lg:gap-y-1 lg:px-5 min-[1440px]:flex-nowrap min-[1440px]:gap-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runNl(nl);
            }}
            className="relative flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-ink/10 bg-white/75 px-4 backdrop-blur focus-within:border-navy lg:h-10 lg:min-w-[240px]"
          >
            <Sparkles size={15} className="shrink-0 text-gold-text" aria-hidden />
            <input
              {...suggest.inputProps}
              value={nl}
              enterKeyHint="search"
              placeholder={tx(locale, "¿Dónde quieres vivir?", "Where do you want to live?")}
              aria-label={tx(locale, "Escribe zona, tipo de casa o presupuesto", "Type an area, a kind of home or a budget")}
              className="min-w-0 flex-1 bg-transparent text-[16px] focus:outline-none lg:text-sm"
            />
            {suggest.listbox}
          </form>
          {/* Phones: the operation as one compact select (the rest lives in "Filtros"). */}
          <span className="relative shrink-0 lg:hidden">
            <select value={type} onChange={(e) => set({ type: e.target.value, max: null, min: null })} aria-label={tx(locale, "Qué buscas", "What you're after")} className={cn(pill, "min-w-[8.5rem] appearance-none pr-9 font-semibold", on)}>
              {TYPES.map(([k, es, en]) => (
                <option key={k} value={k}>{tx(locale, es, en)}</option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </span>
          <div className="hidden lg:contents">
            <div className="flex shrink-0 gap-0.5 rounded-full border border-ink/10 bg-white/75 p-1 backdrop-blur" role="group" aria-label={tx(locale, "Qué buscas", "What you're after")}>
              {TYPES.map(([k, es, en]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set({ type: k, max: null, min: null })}
                  aria-pressed={type === k}
                  className={cn("min-h-8 rounded-full border-2 px-3.5 font-display text-sm", type === k ? "np-sel font-semibold" : "border-transparent text-ink/70 hover:text-ink")}
                >
                  {tx(locale, es, en)}
                </button>
              ))}
            </div>
            {/* line break before the filters (lg up to 1440) */}
            <div aria-hidden className="hidden h-0 basis-full lg:block min-[1440px]:hidden" />
            <FilterPopover label={priceLabel(locale, min, max)} title={tx(locale, "Precio", "Price")} active={!!(min || max)} open={pop === "price"} onOpenChange={(o) => { setPop(o ? "price" : null); if (o) setMoreOpen(false); }} width="w-[360px]">
              <PriceFields locale={locale} f={f} set={set} />
            </FilterPopover>
            <FilterPopover label={kind ? (KIND_CHIP[kind] ? tx(locale, ...KIND_CHIP[kind]) : kind) : tx(locale, "Tipo", "Type")} title={tx(locale, "Tipo de inmueble", "Property type")} active={!!kind} open={pop === "kind"} onOpenChange={(o) => { setPop(o ? "kind" : null); if (o) setMoreOpen(false); }}>
              <KindFields locale={locale} f={f} set={set} />
            </FilterPopover>
            <FilterPopover label={beds ? `${beds}+ ${tx(locale, "hab.", "beds")}` : tx(locale, "Habitaciones", "Bedrooms")} title={tx(locale, "Habitaciones", "Bedrooms")} active={!!beds} open={pop === "beds"} onOpenChange={(o) => { setPop(o ? "beds" : null); if (o) setMoreOpen(false); }} width="w-auto">
              <BedsFields locale={locale} f={f} set={set} />
            </FilterPopover>
            <ZoneSelect locale={locale} f={f} set={set} zones={zones} className="w-[168px] shrink-0 truncate 2xl:w-[200px]" />
            <button
              ref={moreBtn}
              type="button"
              onClick={() => {
                setPop(null);
                setMoreOpen((o) => !o);
              }}
              aria-expanded={moreOpen}
              aria-controls="search-more-filters"
              className={cn(pill, "border-line bg-white", (moreOpen || baths || minM2 || essCount || pub || furnished || pets || verified || lux || amen.length) && on)}
            >
              <SlidersHorizontal size={15} aria-hidden /> {tx(locale, "Más filtros", "More filters")}
              {essCount > 0 && <span className="rounded-full bg-navy px-1.5 text-xs font-semibold text-ivory [font-feature-settings:'lnum']" aria-label={tx(locale, `${essCount} filtros de servicios esenciales activos`, `${essCount} essential-service filters on`)}>{essCount}</span>}
              <ChevronDown size={14} aria-hidden />
            </button>
            {/* Secondary (outline): the filters are the bar's main job. Below 1536 only the bell shows (the words box keeps
                ≥ 240 px on one row at 1440); the name stays. */}
            <button
              type="button"
              onClick={createAlert}
              disabled={alertSaved || savingAlert}
              aria-live="polite"
              aria-label={alertSaved ? tx(locale, "Búsqueda guardada", "Search saved") : tx(locale, "Guardar búsqueda", "Save search")}
              title={alertSaved ? undefined : tx(locale, "Te avisamos cuando aparezca algo nuevo", "We’ll tell you when something new turns up")}
              className={cn(pill, "ml-auto px-3 disabled:cursor-default xl:px-4", alertSaved ? "border-ok text-ok" : "np-btn-outline border-navy bg-transparent font-semibold text-navy hover:bg-navy/5")}
            >
              {alertSaved ? <Check size={15} aria-hidden /> : savingAlert ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Bell size={15} aria-hidden />}
              <span aria-hidden className="hidden min-[1536px]:inline">{alertSaved ? tx(locale, "Búsqueda guardada", "Search saved") : tx(locale, "Guardar búsqueda", "Save search")}</span>
            </button>
          </div>
        </div>
        {alertError && (
          <div role="alert" className="border-t border-line bg-[#B3261E1A] px-4 py-2 text-sm text-danger md:px-5">{alertError}</div>
        )}
        {moreOpen && desktop && (
          <div ref={morePanel} id="search-more-filters" role="dialog" aria-label={tx(locale, "Más filtros", "More filters")} className="np-in absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-b border-line bg-white px-5 py-5 shadow-np">
            <MoreFields locale={locale} f={f} set={set} withLux />
            <div className="mt-5 flex items-center justify-end gap-4 border-t border-line pt-4">
              <button type="button" onClick={() => setMoreOpen(false)} className="min-h-11 px-2 font-display text-sm font-semibold underline underline-offset-4">
                {tx(locale, "Cerrar", "Close")}
              </button>
              <SeeHomes locale={locale} total={total} fetching={query.isFetching} onClick={() => { setMoreOpen(false); moreBtn.current?.focus(); }} className="min-h-11 text-sm" />
            </div>
          </div>
        )}
      </div>
      {/* "Más filtros" backdrop: dims the page; a click on it closes the panel (useDismiss). */}
      {moreOpen && desktop && <div aria-hidden className="np-in fixed inset-0 z-20 bg-[#1C1D1D]/35" />}

      {/* Phones: room for the bottom tab bar. */}
      <div className={cn("relative mb-[calc(4rem+env(safe-area-inset-bottom))] md:mb-0 lg:flex lg:min-h-0 lg:flex-1", phoneMap && "flex min-h-0 flex-1")}>
        {/* list 60% (phones: covers the map). First in the DOM, so the keyboard reaches the results before the map's
            controls; on desktop it still sits on the right (order). */}
        {/* Phones: in the page flow (the document scrolls, the header steps away). Desktop: its own scrolling panel. */}
        <div
          data-search-sheet={view}
          inert={listHidden || undefined}
          className={cn("bg-ivory lg:order-2 lg:flex lg:min-w-0 lg:flex-1 lg:basis-[60%] lg:flex-col lg:border-l lg:border-line", listHidden && "hidden")}
        >
          <div
            ref={listRef}
            id="search-results"
            onScroll={desktop ? saveListScroll : undefined}
            onClickCapture={saveListScroll}
            className="scrollbar-thin lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
          >
            {/* one row: count · sort · filters — phones: pinned under the header (follows it as it hides) */}
            <div className="sticky top-[calc(env(safe-area-inset-top)+var(--np-header-offset,80px)_-_8px)] z-20 flex min-h-[52px] items-center gap-2 border-b border-line bg-ivory/95 px-4 py-1 backdrop-blur transition-[top] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] lg:top-0 lg:z-10 lg:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className="shrink-0 whitespace-nowrap font-serif text-[16px] leading-tight min-[390px]:text-[18px] sm:text-[20px] lg:text-[22px]" aria-live="polite">
                  {notUnderstood ? tx(locale, `${total} casas en total`, `${total} homes in all`) : plural(total, locale, ["resultado", "resultados"], ["result", "results"])}
                </p>
                {query.isFetching && <Loader2 size={15} aria-hidden className="shrink-0 animate-spin text-muted" />}
                {shape && <span className="hidden shrink-0 rounded-full bg-[#C9B49C] px-2.5 py-0.5 font-display text-xs font-semibold text-[#3E4650] sm:inline-block">{tx(locale, "en la zona que dibujaste", "in the area you drew")}</span>}
              </div>
              {/* As wide as its longest label (short ones below lg: "Precio ↑"); the full wording on desktop. */}
              <span className="relative flex-none">
                <select
                  value={sort}
                  onChange={(e) => set({ sort: e.target.value === "rec" ? null : e.target.value })}
                  aria-label={tx(locale, "Ordenar por", "Sort by")}
                  className="h-11 max-w-[11rem] appearance-none rounded-full border border-ink/10 bg-white/75 pl-3 pr-7 text-[13px] backdrop-blur lg:h-9 lg:max-w-[14rem] lg:pl-3.5 lg:pr-8 lg:text-sm"
                >
                  {SORTS.map((k) => {
                    const [es, en, esFull, enFull] = SORT_LABEL[k];
                    return (
                      <option key={k} value={k} aria-label={tx(locale, esFull, enFull)} title={tx(locale, esFull, enFull)}>
                        {desktop ? tx(locale, esFull, enFull) : tx(locale, es, en)}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted lg:right-3" />
              </span>
              {/* Small phones (and phones with filters on): icon + count — the chips below name them, the button keeps its
                  aria-label — so the sort keeps its room. */}
              <button type="button" onClick={openSheet} aria-haspopup="dialog" aria-label={filtersAria} className={cn("flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 font-display text-sm max-[389px]:px-2.5 lg:hidden", filterCount ? on : "border-ink/10 bg-white/75")}>
                <SlidersHorizontal size={15} aria-hidden /> <span className={cn("max-[389px]:hidden", filterCount > 0 && "max-sm:hidden")}>{filtersLabel}</span> {countBadge}
              </button>
            </div>
            {activeChips.length > 0 && (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-3 lg:flex-wrap lg:px-5">
                {activeChips.map(([k, label, patch]) => (
                  <button key={k} type="button" onClick={() => set(qText.trim() !== leftover ? { ...patch, q: leftover || null } : patch)} aria-label={`${tx(locale, "Quitar filtro", "Remove filter")}: ${label}`} className="np-sel inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold">
                    {label} <X size={12} aria-hidden />
                  </button>
                ))}
              </div>
            )}
            {partly && (
              <p role="status" data-testid="partly-understood" className="px-4 pt-3 text-[13px] leading-snug text-muted lg:px-5">
                {tx(locale, `No entendimos «${partly}»; buscamos con el resto.`, `We didn’t catch «${partly}»; we searched with the rest.`)}
              </p>
            )}
            {notUnderstood && (
              <div className="px-4 pt-4 lg:px-5" data-testid="not-understood">
                <div role="status" className="np-glass rounded-[4px] p-4">
                  <p className="font-display text-[15px] leading-snug text-ink">
                    {tx(locale, `No entendimos «${qText.trim()}». Prueba con una zona, un tipo de casa o un precio.`, `We didn’t catch «${qText.trim()}». Try an area, a type of home or a price.`)}
                  </p>
                  <p className="mt-3 text-[13px] text-muted">{didYouMean.length ? tx(locale, "¿Quizá quisiste decir…?", "Did you mean…?") : tx(locale, "Por ejemplo:", "For example:")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {placeIdeas.map((p) => (
                      <button key={p.name} type="button" onClick={() => set({ zone: p.name, q: null })} className={cn(pill, "border-line bg-white md:h-10")}>
                        {p.name}
                      </button>
                    ))}
                    {TRY_INSTEAD.map(([es, en]) => (
                      <button key={es} type="button" onClick={() => runNl(tx(locale, es, en))} className={cn(pill, "border-line bg-white md:h-10")}>
                        {tx(locale, es, en)}
                      </button>
                    ))}
                  </div>
                </div>
                {hasResults && <h2 className="mt-6 font-serif text-[20px]">{tx(locale, "Mientras tanto, todas las casas", "Meanwhile, every home")}</h2>}
              </div>
            )}
            {/* Phones in map view: the cards are hidden, keep them out of the tab order (the wrapper is inert). */}
            <div id="search-results-grid" tabIndex={-1} aria-label={tx(locale, "Resultados", "Results")} role="region" className="grid scroll-mt-[calc(var(--np-header-offset,80px)+60px)] gap-5 p-4 focus:outline-none sm:grid-cols-2 lg:scroll-mt-14 lg:px-5 xl:grid-cols-3">
              {results.map((l) => (
                <div key={l.id} onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(l.id)} onBlur={() => setHover(null)}>
                  <ListingCard l={l} locale={locale} compact compareToggle />
                </div>
              ))}
            </div>
            {results.length === 0 && !!relax.data?.length && (
              <div className="px-4 pt-4" data-testid="relax">
                <p className="font-display text-[15px] text-ink">{tx(locale, "Si aflojas un filtro, sí hay casas:", "Loosen one filter and there are homes:")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {relax.data.map((r) => (
                    <button key={r.key} type="button" onClick={() => set(r.patch)} className="np-glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-display text-[14px] text-ink transition-transform hover:-translate-y-0.5">
                      {tx(locale, "Sin", "Without")} «{r.label}» · <b>{plural(r.total, locale, ["casa", "casas"], ["home", "homes"])}</b>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {results.length === 0 && (
              <div className="p-4">
                <EmptyState
                  monogram
                  title={tx(locale, "Aún no hay casas con todo eso", "No homes match all of that yet")}
                  body={tx(locale, "Prueba a ampliar la zona o quitar algún filtro. O guarda la búsqueda y te avisamos en cuanto aparezca algo para ti.", "Try widening the area or removing a filter. Or save this search and we’ll let you know the moment something turns up.")}
                  cta={
                    <button type="button" onClick={createAlert} disabled={alertSaved || savingAlert} className="np-btn-navy min-h-11 rounded-full bg-navy px-5 font-display font-semibold text-ivory disabled:opacity-60">
                      {alertSaved ? tx(locale, "Búsqueda guardada", "Search saved") : tx(locale, "Avísame", "Let me know")}
                    </button>
                  }
                />
              </div>
            )}
            {/* Phones: room so the last card clears the docked Mapa / Comparar bar. */}
            <div aria-hidden className="h-[5.5rem] lg:hidden" />
          </div>
        </div>

        {/* map 40% (phones: full screen, shown with the "Mapa" toggle; in list view it stays mounted, sized and invisible) */}
        <div
          className={cn("lg:relative lg:order-1 lg:min-h-0 lg:min-w-0 lg:flex-1 lg:basis-[40%]", phoneMap ? "relative min-h-0 flex-1" : "max-lg:pointer-events-none max-lg:invisible max-lg:fixed max-lg:inset-0")}
          inert={mapHidden || undefined}
          aria-hidden={mapHidden || undefined}
        >
          <NightMap
            key={region + mapFilters}
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
            renderPreview={(l, variant) => <MapPreviewCard l={l} locale={locale} variant={variant} />}
            previewInset={desktop ? 12 : 80}
            onArea={searchArea}
            initialScale={fit.scale}
            fitPoints={fitPoints}
            fitPadding={fitPadding}
            fitMaxScale={MAP_FIT[region].max}
            toolbar={
              // Which map: in the tool row (top-left), out of the way of the pins and the docked bar.
              <>
              <div role="group" aria-label={tx(locale, "Mapa de", "Map of")} className="flex gap-0.5 rounded-full border border-[#ECE5DA] bg-[#ffffff] p-1 font-display text-[13px] text-[#1C1D1D] shadow-np sm:text-sm">
                {(["caracas", "venezuela"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRegionPick(r)} aria-pressed={region === r} className={cn("min-h-9 rounded-full border-2 px-3 sm:px-3.5", region === r ? "np-sel font-semibold" : "border-transparent text-[#1C1D1D]/70")}>
                    {r === "caracas" ? "Caracas" : "Venezuela"}
                  </button>
                ))}
              </div>
              {offMap > 0 && (
                <button
                  type="button"
                  data-map-offregion
                  onClick={() => setRegionPick("venezuela")}
                  className="flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full border border-[#ECE5DA] bg-[#ffffff] px-3.5 font-display text-[13px] text-[#1C1D1D] shadow-np sm:text-sm"
                >
                  <span className="[font-feature-settings:'lnum']">{tx(locale, `${mapListings.length} de ${results.length} en el mapa`, `${mapListings.length} of ${results.length} on the map`)}</span>
                  <span aria-hidden>·</span>
                  <span className="font-semibold underline underline-offset-2">{tx(locale, "Ver Venezuela", "Show Venezuela")}</span>
                </button>
              )}
              </>
            }
          />
        </div>

      </div>

      {/* Phones and tablets: ONE docked bar — list/map toggle (+ filters on the map) and the comparator, which does
          not float a second layer here (CompareTray stays out below lg on /search). Tablets (md, two card columns) in
          list view: the pill sits in a solid bottom bar, so it never covers a card's title in the middle of the grid
          (the list's bottom spacer clears the bar). `data-search-toggle` lets other floating pieces (the save toast)
          sit above it. */}
      {(hasResults || view === "map" || compare.length > 0) && (
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-[35] flex justify-center px-4 lg:hidden print:hidden",
          view === "list"
            ? "bottom-[calc(4rem+env(safe-area-inset-bottom)+12px)] md:pointer-events-auto md:bottom-0 md:border-t md:border-line md:bg-[#F6F2EC]/90 md:pb-[calc(env(safe-area-inset-bottom)+10px)] md:pt-2.5 md:backdrop-blur-md md:dark:bg-[#141617]/90"
            : "bottom-[calc(4rem+env(safe-area-inset-bottom)+12px)] md:bottom-[calc(env(safe-area-inset-bottom)+16px)]",
        )}
        data-search-toggle
      >
        <div className="pointer-events-auto flex max-w-full overflow-hidden whitespace-nowrap rounded-full bg-[#1C1D1D] font-display text-[15px] font-semibold text-[#F6F2EC] shadow-[0_12px_30px_-8px_rgba(28,29,29,.55)] [html.dark_&]:bg-[#F6F2EC] [html.dark_&]:text-[#1C1D1D]">
          {view === "list" ? (
            // Nothing found: no map to open (the empty state keeps the whole screen; the comparator stays).
            hasResults && (
              <button type="button" onClick={() => changeView("map")} className={cn("flex h-12 items-center gap-2", compare.length ? "pl-5 pr-4" : "px-5")}>
                <MapIcon size={17} aria-hidden /> {tx(locale, "Mapa", "Map")}
              </button>
            )
          ) : (
            <>
              <button type="button" onClick={() => changeView("list")} className="flex h-12 items-center gap-2 pl-5 pr-4">
                <List size={17} aria-hidden /> {tx(locale, `Lista · ${total}`, `List · ${total}`)}
              </button>
              <span aria-hidden className="my-3 w-px bg-current opacity-30" />
              <button type="button" onClick={openSheet} aria-haspopup="dialog" aria-label={filtersAria} className={cn("flex h-12 items-center gap-1.5 pl-4", compare.length ? "pr-4" : "pr-5")}>
                <SlidersHorizontal size={16} aria-hidden /> {filtersLabel}
                {filterCount > 0 && <span aria-hidden className="rounded-full bg-[#C9B49C] px-1.5 text-xs text-[#1C1D1D]">{filterCount}</span>}
              </button>
            </>
          )}
          {compareSeg}
        </div>
      </div>
      )}

      {sheetOpen && !desktop && (
        <FilterSheet
          locale={locale}
          f={f}
          set={set}
          zones={zones}
          total={total}
          fetching={query.isFetching}
          activeCount={filterCount}
          onClear={clearAll}
          onClose={() => {
            setSheetOpen(false);
            changeView("list");
            sheetOpener.current?.focus({ preventScroll: true });
          }}
          opener={sheetOpener}
        />
      )}
    </div>
  );
}
