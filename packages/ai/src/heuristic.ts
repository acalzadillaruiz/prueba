import type {
  AIProvider,
  Comparable,
  EstimateInput,
  EstimateResult,
  LeadContext,
  ListingBrief,
  NextAction,
  SearchQuery,
} from "./types";

const AMENITY_WEIGHT: Record<string, number> = {
  pool: 0.02,
  gym: 0.01,
  security: 0.015,
  generator: 0.02,
  waterTank: 0.015,
  view: 0.025,
  terrace: 0.015,
  elevator: 0.01,
  garden: 0.015,
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Deterministic estimate — no API key needed. Base = m² × zone price, adjusted by age, amenities and comparables. */
export function heuristicEstimate(input: EstimateInput): EstimateResult {
  const age = Math.max(0, 2026 - input.yearBuilt);
  const ageAdj = age > 40 ? -0.12 : age > 25 ? -0.07 : age > 10 ? -0.02 : 0.04;
  const amenAdj = input.amenities.reduce((s, a) => s + (AMENITY_WEIGHT[a] ?? 0), 0);
  const parkAdj = Math.min(input.parking, 3) * 0.015;
  const luxAdj = input.luxury ? 0.12 : 0;
  const base = input.areaM2 * input.zonePricePerM2 * (1 + ageAdj + amenAdj + parkAdj + luxAdj);

  const comparables: Comparable[] = input.pool
    .map((p) => ({
      id: p.id,
      title: p.title,
      ...(p.title_en ? { title_en: p.title_en } : {}),
      zone: p.zone,
      areaM2: p.areaM2,
      priceAmount: p.priceAmount,
      pricePerM2: Math.round(p.priceAmount / p.areaM2),
      distanceKm: Math.round(haversineKm(input, p) * 10) / 10,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm || Math.abs(a.areaM2 - input.areaM2) - Math.abs(b.areaM2 - input.areaM2))
    .slice(0, 5);

  let mid = base;
  if (comparables.length >= 3) {
    const compPpm = comparables.reduce((s, c) => s + c.pricePerM2, 0) / comparables.length;
    mid = base * 0.6 + input.areaM2 * compPpm * 0.4;
  }
  const confidence = Math.min(0.92, 0.45 + comparables.length * 0.08);
  const spread = 0.16 - confidence * 0.1;
  // Round to a sensible step for the magnitude (a USD 950/month rent must not become "1.000 – 1.000").
  const step = mid >= 100_000 ? 1000 : mid >= 10_000 ? 100 : mid >= 1000 ? 10 : 5;
  const round = (n: number) => Math.round(n / step) * step;
  return {
    mid: round(mid),
    low: round(mid * (1 - spread)),
    high: round(mid * (1 + spread)),
    confidence: Math.round(confidence * 100) / 100,
    comparables,
    method: "heuristic:m2×zona+ajustes+comparables",
  };
}

// Later entries win, so the city ("Caracas") goes first and neighbourhoods inside it override it.
const ZONE_ALIASES = [
  "Caracas",
  "Los Palos Grandes",
  "Altamira",
  "La Castellana",
  "Las Mercedes",
  "El Hatillo",
  "Chacao",
  "Sabana Grande",
  "La Boyera",
  "Country Club",
  "La Trinidad",
  "Lomas de San Román",
  "Lechería",
  "Margarita",
  "Mérida",
  "Valencia",
  "Maracaibo",
  "Barquisimeto",
  "Pampatar",
  "Playa El Agua",
  "Choroní",
  "Los Roques",
  "El Viñedo",
  "Tierra Negra",
];

/** Short names people type → the city/zone name used in listings. */
const ZONE_CANONICAL: Record<string, string> = { Margarita: "Isla de Margarita" };

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** "180 mil" / "250k" / "1,2 millones" / "250.000" → number. */
function amount(raw: string, unit: string | undefined): number {
  let n = parseFloat(raw.replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  const u = unit ?? "";
  if (u === "mil" || u === "k") n *= 1000;
  else if (u === "m" || u.startsWith("millon")) n *= 1_000_000;
  return Math.round(n);
}

const NUM_WORDS: Record<string, number> = { un: 1, una: 1, uno: 1, one: 1, dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5 };

export function heuristicSearchParse(nl: string): SearchQuery {
  const t = norm(nl);
  const q: SearchQuery = { keywords: [] };
  // Word boundaries: "parent"/"current" are not "rent", "Petare" is not "pet", "Island" is not "land".
  if (/alquil|\brent(al|s|ing)?\b|\bfor rent\b|arriendo/.test(t)) q.listingType = "LONG_RENT";
  if (/vacacion|\bnoches?\b|\bnights?\b|airbnb|temporada/.test(t)) q.listingType = "SHORT_RENT";
  if (/\blocal(es)?\b|oficina|\boffices?\b|galpon|warehouse|comercial|commercial/.test(t)) q.listingType = "COMMERCIAL";
  if (/compr|\bventa\b|\bbuy\b|\bfor sale\b|\bsale\b/.test(t) && !q.listingType) q.listingType = "SALE";
  if (/lujo|luxury|exclusiv/.test(t)) q.luxury = true;
  for (const z of ZONE_ALIASES) if (t.includes(norm(z))) q.zone = ZONE_CANONICAL[z] ?? z;

  // An amount is never an area ("100 m²") nor a room count ("2 habitaciones").
  const num = "([\\d.,]+)(?![\\d.,]*\\s*(?:m2|m²|mts?\\b|metros|sq|hab|cuarto|dormitorio|bed|br\\b|bd\\b|bano|bath|noche|night|huesped|guest))";
  const unit = "\\s*(mil|k|m|millon(?:es)?)?\\b";
  const cur = "\\s*(?:usd|us\\$|\\$)?\\s*";
  const max = t.match(new RegExp(`(menos de|por debajo de|under|below|less than|max(?:imo)?|hasta|up to)${cur}${num}${unit}`));
  if (max) q.maxPrice = amount(max[2], max[3]);
  const min = t.match(new RegExp(`(mas de|desde|minimo|over|above|more than|at least|from)${cur}${num}${unit}`));
  if (min) q.minPrice = amount(min[2], min[3]);
  const range = t.match(new RegExp(`entre${cur}${num}${unit}\\s*y${cur}${num}${unit}|between${cur}${num}${unit}\\s*and${cur}${num}${unit}`));
  if (range) {
    const [a, au, b, bu] = range[1] ? [range[1], range[2], range[3], range[4]] : [range[5], range[6], range[7], range[8]];
    // "entre 100 y 200 mil": the unit written once applies to both ends.
    q.minPrice = amount(a, au ?? bu);
    q.maxPrice = amount(b, bu);
  }
  const beds = t.match(/\b(\d{1,2}|un|una|uno|one|dos|two|tres|three|cuatro|four|cinco|five)\s*\+?\s*-?\s*(o mas\s*|or more\s*)?(hab|habitaciones|habitacion|cuartos|cuarto|dormitorios|dormitorio|beds?|bedrooms?|bd|br)\b/);
  if (beds) q.minBeds = NUM_WORDS[beds[1]] ?? parseInt(beds[1], 10);

  const kinds: [RegExp, string][] = [
    [/atico|penthouse|\bph\b/, "penthouse"],
    [/\bcasas?\b|\bhouses?\b|townhouse|quinta/, "house"],
    [/apartamento|\bapto\b|apartment|\bflat\b/, "apartment"],
    [/terreno|\bland\b|\blotes?\b|\bplots?\b/, "land"],
  ];
  for (const [re, k] of kinds) if (re.test(t)) { q.propertyKind = k; break; }
  for (const [re, k] of [[/\bluz\b|\blight\b|luminos|\bbright\b/, "light"], [/\bvistas?\b|\bviews?\b/, "view"], [/piscina|\bpool\b/, "pool"], [/terraza|terrace/, "terrace"], [/mascota|\bpets?\b|pet[- ]friendly/, "pets"]] as [RegExp, string][])
    if (re.test(t)) q.keywords.push(k);
  return q;
}

const KIND_LABEL: Record<string, { es: string; en: string }> = {
  apartment: { es: "Apartamento", en: "Apartment" },
  penthouse: { es: "Penthouse", en: "Penthouse" },
  house: { es: "Casa", en: "House" },
  office: { es: "Oficina", en: "Office" },
  land: { es: "Terreno", en: "Plot" },
  townhouse: { es: "Townhouse", en: "Townhouse" },
  studio: { es: "Estudio", en: "Studio" },
  retail: { es: "Local comercial", en: "Retail unit" },
  warehouse: { es: "Galpón", en: "Warehouse" },
  villa: { es: "Villa", en: "Villa" },
  chalet: { es: "Chalet", en: "Chalet" },
};

const AMENITY_COPY: Record<string, { es: string; en: string }> = {
  pool: { es: "piscina", en: "a pool" },
  gym: { es: "gimnasio", en: "a gym" },
  security: { es: "vigilancia 24 h", en: "24h security" },
  generator: { es: "planta eléctrica", en: "a backup generator" },
  waterTank: { es: "tanque de agua", en: "a water tank" },
  view: { es: "vista abierta", en: "open views" },
  terrace: { es: "terraza", en: "a terrace" },
  elevator: { es: "ascensor", en: "an elevator" },
  garden: { es: "jardín", en: "a garden" },
  bbq: { es: "parrillera", en: "a BBQ area" },
  furnished: { es: "mobiliario incluido", en: "furniture included" },
  pets: { es: "admisión de mascotas", en: "a pet-friendly policy" },
  ac: { es: "aire acondicionado", en: "air conditioning" },
  wifi: { es: "Wi-Fi", en: "Wi-Fi" },
  loadingDock: { es: "andén de carga", en: "a loading dock" },
};

/** Kinds where bedrooms (and for land, bathrooms and parking) don't describe the property. */
const NO_ROOMS = new Set(["land", "office", "retail", "warehouse"]);

export function heuristicWriteListing(brief: ListingBrief) {
  // A plot is never "Terreno 3 hab." and an office has no bedrooms, whatever the form sent.
  const b = NO_ROOMS.has(brief.kind) ? { ...brief, beds: 0, ...(brief.kind === "land" ? { baths: 0, parking: 0 } : {}) } : brief;
  const k = KIND_LABEL[b.kind] ?? KIND_LABEL.apartment;
  const bedsEs = b.beds ? `${b.beds} hab. · ` : "";
  const bedsEn = b.beds ? `${b.beds} bd · ` : "";
  const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;
  const list = (xs: string[], and: string) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
  const factsEs = list([b.beds ? n(b.beds, "habitación", "habitaciones") : "", b.baths ? n(b.baths, "baño", "baños") : "", b.parking ? n(b.parking, "puesto de estacionamiento", "puestos de estacionamiento") : ""].filter(Boolean), "y");
  const factsEn = list([b.beds ? n(b.beds, "bedroom", "bedrooms") : "", b.baths ? n(b.baths, "bathroom", "bathrooms") : "", b.parking ? n(b.parking, "parking space", "parking spaces") : ""].filter(Boolean), "and");
  const amen = b.amenities.map((a) => AMENITY_COPY[a]).filter(Boolean).slice(0, 6);
  const amenEs = list(amen.map((a) => a!.es), "y");
  const amenEn = list(amen.map((a) => a!.en), "and");
  return {
    title_es: `${k.es} ${bedsEs}${b.areaM2} m² en ${b.zone}`,
    title_en: `${k.en} ${bedsEn}${b.areaM2} m² in ${b.zone}`,
    body_es: `${k.es} de ${b.areaM2} m² en ${b.zone}, ${b.city}.${factsEs ? ` ${factsEs}.` : ""}${amenEs ? ` Cuenta con ${amenEs}.` : ""} ${b.highlights ?? "Distribución eficiente y buena iluminación natural."} Cerca de servicios, transporte y comercios. Documentos al día.`,
    body_en: `${b.areaM2} m² ${k.en.toLowerCase()} in ${b.zone}, ${b.city}.${factsEn ? ` ${factsEn}.` : ""}${amenEn ? ` Features ${amenEn}.` : ""} ${b.highlights ? "Highlights: " + b.highlights : "Efficient layout with great natural light."} Walk to shops, services and transit. Paperwork in order.`,
  };
}

export function heuristicLeadScore(l: LeadContext): { score: number; nextAction: NextAction; reason: string } {
  const recency = l.createdMinutesAgo < 15 ? 35 : l.createdMinutesAgo < 60 ? 28 : l.createdMinutesAgo < 1440 ? 15 : 5;
  const fit = !l.budget ? 10 : l.budget >= l.listingPrice ? 30 : l.budget >= l.listingPrice * 0.85 ? 20 : 6;
  const sourcePts = { TOUR_REQUEST: 20, REFERRAL: 18, LISTING_FORM: 12, WHATSAPP_NOTE: 12, ALERT: 6 }[l.source];
  const engagement = Math.min(15, l.messages * 3 + l.toursRequested * 5) + (l.hasPhone ? 0 : -5);
  const score = Math.max(0, Math.min(100, recency + fit + sourcePts + engagement));
  let nextAction: NextAction = "NURSE";
  let reason = "Interés bajo: nutrir con contenido";
  if (l.source === "TOUR_REQUEST" || l.toursRequested > 0) { nextAction = "PROPOSE_TOUR"; reason = "Pidió visita: confirmar slot"; }
  else if (score >= 70 && l.hasPhone) { nextAction = "CALL"; reason = "Lead caliente y reciente con teléfono"; }
  else if (score >= 55) { nextAction = l.hasPhone ? "WHATSAPP_NOTE" : "SEND_SIMILARS"; reason = "Buen encaje de presupuesto"; }
  else if (fit <= 6) { nextAction = "SEND_SIMILARS"; reason = "Presupuesto por debajo: ofrecer similares"; }
  return { score, nextAction, reason };
}

export class HeuristicProvider implements AIProvider {
  id = "heuristic";
  async estimate(input: EstimateInput): Promise<EstimateResult> { return heuristicEstimate(input); }
  async searchParse(nl: string): Promise<SearchQuery> { return heuristicSearchParse(nl); }
  async writeListing(brief: ListingBrief) { return heuristicWriteListing(brief); }
  async leadScore(lead: LeadContext) { return heuristicLeadScore(lead); }
}
