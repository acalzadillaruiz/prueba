import type { SearchQuery } from "./types";

/** A place people search by: a neighbourhood (with its city) or a city on its own. */
export interface ZoneEntry {
  name: string;
  city?: string;
}

/**
 * Places the marketplace knows, for typeahead where the live inventory isn't at hand (the home search bar).
 * The search page passes the zones that actually have homes instead.
 */
export const ZONE_DIRECTORY: ZoneEntry[] = [
  { name: "Caracas" },
  { name: "Los Palos Grandes", city: "Caracas" },
  { name: "Altamira", city: "Caracas" },
  { name: "La Castellana", city: "Caracas" },
  { name: "Las Mercedes", city: "Caracas" },
  { name: "El Hatillo", city: "Caracas" },
  { name: "Chacao", city: "Caracas" },
  { name: "Sabana Grande", city: "Caracas" },
  { name: "La Boyera", city: "Caracas" },
  { name: "Country Club", city: "Caracas" },
  { name: "La Trinidad", city: "Caracas" },
  { name: "Lomas de San Román", city: "Caracas" },
  { name: "Lechería" },
  { name: "El Morro", city: "Lechería" },
  { name: "Cerro El Morro", city: "Lechería" },
  { name: "Canales de El Morro", city: "Lechería" },
  { name: "Puerto La Cruz" },
  { name: "Barcelona" },
  { name: "Isla de Margarita" },
  { name: "Costa Azul", city: "Isla de Margarita" },
  { name: "Pampatar", city: "Isla de Margarita" },
  { name: "Playa El Agua", city: "Isla de Margarita" },
  { name: "Valencia" },
  { name: "El Viñedo", city: "Valencia" },
  { name: "El Trigaleño", city: "Valencia" },
  { name: "Maracaibo" },
  { name: "Tierra Negra", city: "Maracaibo" },
  { name: "Mérida" },
  { name: "Barquisimeto" },
  { name: "Choroní" },
  { name: "Los Roques" },
];

/** Lower-case, accents stripped: "Lechería" and "lecheria" are the same place. */
export function normText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Articles and connectors that never identify a place on their own. */
const PLACE_FILLER = new Set(["el", "la", "los", "las", "de", "del", "y"]);

/**
 * Words people type that are not places, even when a place name starts with them ("playa" ≠ Playa El Agua,
 * "casa" ≠ La Castellana, "costa" alone is the coast, not Costa Azul).
 */
const NOT_A_PLACE = new Set([
  "casa", "casas", "playa", "playas", "vista", "vistas", "costa", "cerca", "centro", "zona", "zonas", "isla", "puerto",
  "lujo", "luxury", "piso", "pisos", "tierra", "club", "grande", "grandes", "agua", "negra", "town", "house", "with", "para", "como", "pool", "beach", "near", "city", "ciudad",
  "terraza", "piscina", "local", "oficina", "apartamento", "atico", "penthouse", "terreno", "villa", "quinta",
  "alquiler", "alquilar", "comprar", "venta", "vacaciones", "vacacional", "holiday", "rent", "sale", "barato", "barata",
  "mascotas", "habitaciones", "banos", "mil", "millones", "dolares", "hasta", "desde", "menos", "entre", "mas", "vale", "bien", "buena", "bueno",
]);

/** The words of a place that can start a match: "Lomas de San Román" → lomas, san, roman. */
function placeWords(name: string): string[] {
  return normText(name).split(/[^a-z0-9ñ]+/).filter((w) => w && !PLACE_FILLER.has(w));
}

/**
 * A word that is the beginning of a known place ("lech" → Lechería, "marg" → Margarita, "hati" → El Hatillo).
 * Only the first meaningful word of a place counts, the word needs 4+ letters and ordinary words are ignored, so a
 * sentence like "casa en la playa" never turns into a zone. Returns the place as written in `places`.
 */
export function partialPlace(text: string, places: string[]): string | undefined {
  const words = normText(text).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 4 && !NOT_A_PLACE.has(w));
  for (const w of words) {
    const hit = places.find((p) => placeWords(p)[0]?.startsWith(w));
    if (hit) return hit;
  }
  return undefined;
}

/** True when the parser understood at least one thing it can filter by (a zone, a type, a price, rooms…). */
export function queryUnderstood(q: SearchQuery): boolean {
  return !!(q.listingType || q.zone || q.maxPrice || q.minPrice || q.minBeds || q.propertyKind || q.luxury || q.keywords.length);
}

/** Edit distance with an early exit (enough to forgive one or two typos in a place name). */
function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

export interface PlaceSuggestion extends ZoneEntry {
  /** The tail of the typed text the suggestion replaces (so "casa en Lech" becomes "casa en Lechería"). */
  replace: string;
}

/**
 * Typeahead for the search boxes: the places whose name starts with what is being typed at the end of the text
 * ("casa en Lech" → Lechería; "morro" → El Morro, Cerro El Morro…). Accent- and case-insensitive. Up to `limit`.
 * Places already written in full are not offered again.
 */
export function suggestPlaces(text: string, places: ZoneEntry[] = ZONE_DIRECTORY, limit = 6): PlaceSuggestion[] {
  const raw = text.replace(/\s+$/, "");
  if (!raw) return [];
  const tokens = raw.split(/\s+/);
  const out: (PlaceSuggestion & { rank: number })[] = [];
  const seen = new Set<string>();
  const full = normText(raw);
  // Try the last 3, 2 and 1 words as the fragment: "san rom" → Lomas de San Román, "lech" → Lechería.
  for (let n = Math.min(3, tokens.length); n >= 1; n--) {
    const tail = tokens.slice(-n).join(" ");
    const frag = normText(tail);
    if (frag.replace(/[^a-z0-9ñ]/g, "").length < 2) continue;
    if (n === 1 && PLACE_FILLER.has(frag)) continue;
    for (const p of places) {
      const name = normText(p.name);
      if (seen.has(p.name) || full.includes(name)) continue;
      const words = name.split(/[^a-z0-9ñ]+/).filter(Boolean);
      const starts = name.startsWith(frag);
      // A fragment can also start any later word ("morro" → Cerro El Morro), when it's at least 3 letters.
      const wordStart = !starts && frag.length >= 3 && words.some((_, i) => words.slice(i).join(" ").startsWith(frag));
      if (!starts && !wordStart) continue;
      seen.add(p.name);
      out.push({ ...p, replace: tail, rank: (starts ? 0 : 10) + (p.city ? 1 : 0) + (3 - n) * 0.1 });
    }
  }
  return out
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "es"))
    .slice(0, limit)
    .map(({ rank: _rank, ...s }) => s);
}

/**
 * When nothing was understood: places that look like what was typed (typos included: "Lecheira" → Lechería,
 * "Chaco" → Chacao). Empty when nothing is close.
 */
export function closestPlaces(text: string, places: ZoneEntry[] = ZONE_DIRECTORY, limit = 3): ZoneEntry[] {
  const words = normText(text).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !NOT_A_PLACE.has(w) && !PLACE_FILLER.has(w));
  if (!words.length) return [];
  const scored = places
    .map((p) => {
      const pw = placeWords(p.name);
      let d = 9;
      for (const w of words)
        for (const x of pw) {
          if (x.startsWith(w) || w.startsWith(x)) d = Math.min(d, 0);
          // Typos keep the first letter: "castillo" is not a misspelt "hatillo".
          else if (w[0] === x[0]) d = Math.min(d, editDistance(w, x, 2) + (w.length < 5 ? 1 : 0));
        }
      return { p, d };
    })
    .filter((s) => s.d <= 2)
    .sort((a, b) => a.d - b.d || (a.p.city ? 1 : 0) - (b.p.city ? 1 : 0));
  return scored.slice(0, limit).map((s) => s.p);
}
