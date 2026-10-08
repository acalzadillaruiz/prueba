import { heuristicSearchParse } from "@newplace/ai";

/**
 * Parsed natural-language query → the search page's URL params (type, zone, price, beds, kind, amenities…), with the
 * typed words kept in `q` for the "we searched for…" note. Shared by the client search boxes and the server page (a
 * plain module: no "use client", so the server can call it to canonicalise `?q=` links).
 */
export function queryToParams(q: ReturnType<typeof heuristicSearchParse>, raw: string) {
  const p = new URLSearchParams();
  if (q.listingType) p.set("type", q.listingType);
  if (q.zone) p.set("zone", q.zone);
  if (q.minPrice) p.set("min", String(q.minPrice));
  if (q.maxPrice) p.set("max", String(q.maxPrice));
  if (q.minBeds) p.set("beds", String(q.minBeds));
  if (q.luxury) p.set("lux", "1");
  if (q.propertyKind) p.set("kind", q.propertyKind);
  // "con piscina / terraza / vista" → amenity filters; "acepta mascotas" → pets; "amoblado" → furnished
  const am = q.keywords.filter((k) => ["pool", "terrace", "view"].includes(k));
  if (am.length) p.set("am", am.join(","));
  if (q.keywords.includes("pets")) p.set("pets", "1");
  if (q.keywords.includes("furnished")) p.set("furnished", "1");
  if (q.keywords.includes("sea")) p.set("sea", "1");
  if (raw.trim()) p.set("q", raw.trim());
  return p;
}

/** Every URL key that narrows the results (type, q, sort and view don't). */
export const FILTER_KEYS = ["zone", "city", "min", "max", "beds", "baths", "m2", "kind", "lux", "pub", "furnished", "pets", "verified", "am", "power", "well", "tank", "dock", "avila", "sea", "poly", "radius", "bbox"];

/**
 * A `?q=` link with no structured filter (shared links, the site-search JSON-LD action, old bookmarks): the URL the
 * search box would have produced for those words — filters from the parser, the typed words kept in `q`, the
 * current type when the words name none, and sort / view carried over. null when nothing changes (no words, filters
 * already present, or nothing understood), so a canonical URL never redirects again.
 */
export function canonicalQueryUrl(sp: URLSearchParams): URLSearchParams | null {
  const raw = (sp.get("q") ?? "").trim();
  if (!raw || FILTER_KEYS.some((k) => sp.get(k))) return null;
  const q = heuristicSearchParse(raw);
  const p = queryToParams(q, raw);
  if (!FILTER_KEYS.some((k) => p.get(k)) && !(q.listingType && q.listingType !== (sp.get("type") ?? "SALE"))) return null;
  if (!p.get("type")) p.set("type", sp.get("type") ?? "SALE");
  for (const k of ["sort", "view"]) {
    const v = sp.get(k);
    if (v) p.set(k, v);
  }
  return p;
}
