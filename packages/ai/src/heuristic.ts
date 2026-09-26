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
  pool: 0.04,
  gym: 0.02,
  security: 0.03,
  generator: 0.04,
  waterTank: 0.03,
  view: 0.05,
  terrace: 0.03,
  elevator: 0.02,
  garden: 0.03,
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
  const round = (n: number) => Math.round(n / 1000) * 1000;
  return {
    mid: round(mid),
    low: round(mid * (1 - spread)),
    high: round(mid * (1 + spread)),
    confidence: Math.round(confidence * 100) / 100,
    comparables,
    method: "heuristic:m2×zona+ajustes+comparables",
  };
}

const ZONE_ALIASES = [
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
];

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function heuristicSearchParse(nl: string): SearchQuery {
  const t = norm(nl);
  const q: SearchQuery = { keywords: [] };
  if (/alquil|rent|arriendo/.test(t)) q.listingType = "LONG_RENT";
  if (/vacacion|noche|night|airbnb|temporada/.test(t)) q.listingType = "SHORT_RENT";
  if (/local|oficina|office|galpon|warehouse|comercial|commercial/.test(t)) q.listingType = "COMMERCIAL";
  if (/compr|venta|buy|sale/.test(t) && !q.listingType) q.listingType = "SALE";
  if (/lujo|luxury|exclusiv/.test(t)) q.luxury = true;
  for (const z of ZONE_ALIASES) if (t.includes(norm(z))) q.zone = z;

  const money = t.match(/(menos de|under|max(?:imo)?|hasta|below)\s*\$?\s*([\d.,]+)\s*(mil|k|m|millon(?:es)?)?/);
  if (money) {
    let n = parseFloat(money[2].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
    const unit = money[3] ?? "";
    if (unit === "mil" || unit === "k") n *= 1000;
    else if (unit === "m" || unit.startsWith("millon")) n *= 1_000_000;
    q.maxPrice = Math.round(n);
  }
  const beds = t.match(/(\d)\s*(hab|habitaciones|cuartos|dormitorios|beds?|bedrooms?|br)\b/);
  if (beds) q.minBeds = parseInt(beds[1], 10);

  const kinds: [RegExp, string][] = [
    [/atico|penthouse|ph\b/, "penthouse"],
    [/casa|house|quinta/, "house"],
    [/apartamento|apto|apartment|flat/, "apartment"],
    [/terreno|land|lote/, "land"],
  ];
  for (const [re, k] of kinds) if (re.test(t)) { q.propertyKind = k; break; }
  for (const [re, k] of [[/luz|light|luminos/, "light"], [/vista|view/, "view"], [/piscina|pool/, "pool"], [/terraza|terrace/, "terrace"], [/mascota|pet/, "pets"]] as [RegExp, string][])
    if (re.test(t)) q.keywords.push(k);
  return q;
}

const KIND_LABEL: Record<string, { es: string; en: string }> = {
  apartment: { es: "Apartamento", en: "Apartment" },
  penthouse: { es: "Penthouse", en: "Penthouse" },
  house: { es: "Casa", en: "House" },
  office: { es: "Oficina", en: "Office" },
  land: { es: "Terreno", en: "Plot" },
};

export function heuristicWriteListing(b: ListingBrief) {
  const k = KIND_LABEL[b.kind] ?? KIND_LABEL.apartment;
  const bedsEs = b.beds ? `${b.beds} hab. · ` : "";
  const bedsEn = b.beds ? `${b.beds} bd · ` : "";
  return {
    title_es: `${k.es} ${bedsEs}${b.areaM2} m² en ${b.zone}`,
    title_en: `${k.en} ${bedsEn}${b.areaM2} m² in ${b.zone}`,
    body_es: `${k.es} de ${b.areaM2} m² en ${b.zone}, ${b.city}. ${b.beds} habitaciones, ${b.baths} baños y ${b.parking} puesto(s) de estacionamiento. ${b.highlights ?? "Distribución eficiente y buena iluminación natural."} Cerca de servicios, transporte y comercios. Documentos al día.`,
    body_en: `${b.areaM2} m² ${k.en.toLowerCase()} in ${b.zone}, ${b.city}. ${b.beds} bedrooms, ${b.baths} bathrooms and ${b.parking} parking space(s). ${b.highlights ? "Highlights: " + b.highlights : "Efficient layout with great natural light."} Walk to shops, services and transit. Paperwork in order.`,
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
