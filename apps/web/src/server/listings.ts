import "server-only";
import { prisma, type Prisma } from "@newplace/db";
import type { EstimateResult } from "@newplace/ai";
import type { Amenity, Kind, Listing, ListingStatus, ListingType, Scene } from "@/types/domain";
import { inShape, type Shape } from "@/lib/geo";

export const listingInclude = {
  photos: { orderBy: [{ isCover: "desc" }, { order: "asc" }] },
  priceHistory: { orderBy: { date: "asc" } },
  estimates: { orderBy: { createdAt: "desc" }, take: 1 },
  agency: { select: { id: true, name: true, verified: true, color: true, initials: true, phone: true, whatsapp: true } },
  agent: { select: { id: true, name: true, hue: true, phone: true, memberships: { select: { verified: true }, take: 1 } } },
  owner: { select: { id: true, name: true, hue: true, phone: true } },
} satisfies Prisma.ListingInclude;

export type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

export const PUBLIC_STATUSES: ListingStatus[] = ["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"];

export function publicWhere(): Prisma.ListingWhereInput {
  // Listings of a suspended agency disappear from every public surface.
  return { status: { in: PUBLIC_STATUSES }, review: "APPROVED", privateListing: false, OR: [{ agencyId: null }, { agency: { status: { not: "SUSPENDED" } } }] };
}

/**
 * Card projection for lists, maps and grids: same Listing shape, without the heavy fields cards never render
 * (descriptions, full price history, estimate comparables, internal stats). Cuts the HTML/RSC payload of
 * home, search and luxury by ~3–4×.
 */
export function toCard(l: Listing): Listing {
  const drop = l.priceHistory.filter((p) => p.kind === "DROP").slice(-1);
  return {
    ...l,
    body_es: "",
    body_en: "",
    priceHistory: drop,
    estimate: { ...l.estimate, comparables: [] },
    photos: l.photos?.slice(0, 5),
    agent: l.agent ? { ...l.agent, phone: undefined } : undefined,
    agency: l.agency ? { ...l.agency, phone: "", whatsapp: "" } : undefined,
  };
}

export function toDomain(r: ListingRow): Listing {
  const est = r.estimates[0];
  const estimate: EstimateResult = est
    ? { mid: est.mid, low: est.low, high: est.high, confidence: est.confidence, comparables: est.comparables as unknown as EstimateResult["comparables"], method: est.method }
    : { mid: r.priceAmount, low: Math.round(r.priceAmount * 0.9), high: Math.round(r.priceAmount * 1.1), confidence: 0.4, comparables: [], method: "pending" };
  const photos = r.photos.map((p) => p.url);
  const baseScenes = (r.scenes.length ? r.scenes : ["living"]) as Scene[];
  const scenes = photos.length ? photos.map((_, i) => baseScenes[i % baseScenes.length]) : baseScenes;
  const publishedAt = (r.publishedAt ?? r.createdAt).toISOString();
  return {
    id: r.id,
    slug: r.slug,
    title_es: r.titleEs,
    title_en: r.titleEn,
    body_es: r.bodyEs,
    body_en: r.bodyEn,
    address: r.address,
    zone: r.zone,
    city: r.city,
    state: r.state,
    countryCode: "VE",
    lat: r.lat,
    lng: r.lng,
    kind: r.kind as Kind,
    listingType: r.listingType as ListingType,
    category: r.category,
    luxury: r.luxury,
    furnished: r.furnished,
    pets: r.pets,
    priceAmount: r.priceAmount,
    priceCurrency: r.priceCurrency as Listing["priceCurrency"],
    pricePeriod: (r.pricePeriod ?? undefined) as Listing["pricePeriod"],
    areaM2: r.areaM2,
    plotM2: r.plotM2 ?? undefined,
    beds: r.beds,
    baths: r.baths,
    parking: r.parking,
    yearBuilt: r.yearBuilt,
    amenities: r.amenities as Amenity[],
    status: r.status as ListingStatus,
    review: r.review,
    takedownReason: r.takedownReason,
    publishedAt,
    updatedAt: r.updatedAt.toISOString(),
    agencyId: r.agencyId ?? undefined,
    agentId: r.agentId ?? undefined,
    ownerUserId: r.ownerUserId ?? undefined,
    scenes,
    photos,
    hasFloorplan: r.hasFloorplan,
    hasVideo: r.hasVideo,
    hasVirtualTour: r.hasVirtualTour,
    estimate,
    priceHistory: r.priceHistory.map((p) => ({ date: p.date.toISOString(), amount: p.amount, kind: p.kind as Listing["priceHistory"][number]["kind"] })),
    daysOnMarket: Math.max(0, Math.round((Date.now() - Date.parse(publishedAt)) / 864e5)),
    stats: { impressions: r.impressions, saves: r.saves, leads: r.leadsCount, avgTimeSec: r.avgTimeSec, interactions: r.interactions },
    quality: r.quality,
    privateListing: r.privateListing,
    shortRent: (r.shortRent ?? undefined) as Listing["shortRent"],
    commercial: (r.commercial ?? undefined) as Listing["commercial"],
    brochurePdf: r.brochurePdf ?? null,
    fingerprint: "", // internal duplicate key: never sent to browsers
    agency: r.agency ? { ...r.agency, phone: r.agency.phone ?? "", whatsapp: r.agency.whatsapp ?? "" } : undefined,
    agent: r.agent
      ? { id: r.agent.id, name: r.agent.name ?? "", hue: r.agent.hue, verified: !!r.agent.memberships[0]?.verified, phone: r.agent.phone ?? undefined }
      : r.owner
        ? { id: r.owner.id, name: r.owner.name ?? "", hue: r.owner.hue, verified: false, phone: r.owner.phone ?? undefined }
        : undefined,
  };
}

export interface SearchFilters {
  type?: string;
  zone?: string;
  city?: string;
  max?: number;
  min?: number;
  beds?: number;
  baths?: number;
  minM2?: number;
  lux?: boolean;
  kind?: string;
  furnished?: boolean;
  pets?: boolean;
  verified?: boolean;
  pub?: "24h" | "7d";
  amenities?: string[];
  bbox?: [number, number, number, number]; // south, west, north, east
  shape?: Shape;
  sort?: "new" | "price-asc" | "price-desc" | "ppm";
  cursor?: string;
  take?: number;
}

const TYPES = ["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT", "COMMERCIAL"];
const SORTS = ["new", "price-asc", "price-desc", "ppm"];
const PUBS = ["24h", "7d"];
/** Friendly aliases people type or share: ?type=rent, ?type=venta… */
const TYPE_ALIASES: Record<string, string> = { BUY: "SALE", VENTA: "SALE", RENT: "LONG_RENT", ALQUILER: "LONG_RENT", VACATION: "SHORT_RENT", VACACIONAL: "SHORT_RENT", COMERCIAL: "COMMERCIAL" };

/** Parses URL filters defensively: unknown enums are dropped, numbers must be finite and ≥ 0 (malformed URLs never reach Prisma). */
export function filtersFromParams(sp: URLSearchParams): SearchFilters {
  const num = (k: string) => {
    const v = Number(sp.get(k));
    return sp.get(k) && Number.isFinite(v) && v >= 0 ? v : undefined;
  };
  const oneOf = <T extends string>(k: string, allowed: string[]) => {
    const v = sp.get(k);
    return v && allowed.includes(v) ? (v as T) : undefined;
  };
  const rawType = sp.get("type")?.toUpperCase();
  const poly = sp.get("poly");
  const radius = sp.get("radius");
  let shape: Shape = null;
  if (poly) {
    const pts = poly.split(";").map((p) => p.split(",").map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite)).map(([lat, lng]) => ({ lat, lng }));
    if (pts.length >= 3) shape = { type: "poly", pts };
  } else if (radius) {
    const [lat, lng, km] = radius.split(",").map(Number);
    if ([lat, lng, km].every(Number.isFinite)) shape = { type: "radius", center: { lat, lng }, km };
  }
  const bbox = sp.get("bbox")?.split(",").map(Number);
  return {
    type: rawType && TYPES.includes(TYPE_ALIASES[rawType] ?? rawType) ? (TYPE_ALIASES[rawType] ?? rawType) : undefined,
    zone: sp.get("zone") ?? undefined,
    city: sp.get("city") ?? undefined,
    max: num("max"),
    min: num("min"),
    beds: num("beds"),
    baths: num("baths"),
    minM2: num("m2"),
    lux: sp.get("lux") === "1",
    kind: sp.get("kind") ?? undefined,
    furnished: sp.get("furnished") === "1",
    pets: sp.get("pets") === "1",
    verified: sp.get("verified") === "1",
    pub: oneOf<NonNullable<SearchFilters["pub"]>>("pub", PUBS),
    amenities: (sp.get("am") ?? "").split(",").filter(Boolean),
    bbox: bbox?.length === 4 && bbox.every(Number.isFinite) ? (bbox as SearchFilters["bbox"]) : undefined,
    shape,
    sort: oneOf<NonNullable<SearchFilters["sort"]>>("sort", SORTS) ?? "new",
    cursor: sp.get("cursor") ?? undefined,
    take: num("take"),
  };
}

export function whereFromFilters(f: SearchFilters): Prisma.ListingWhereInput {
  // Search shows what can still be bought or rented; sold/rented stay reachable by link and as "sold nearby".
  const and: Prisma.ListingWhereInput[] = [publicWhere(), { status: { in: ["COMING_SOON", "ACTIVE", "UNDER_OFFER"] } }];
  if (f.type === "COMMERCIAL") and.push({ listingType: { in: ["COMMERCIAL_SALE", "COMMERCIAL_RENT"] } });
  else if (f.type) and.push({ listingType: f.type as ListingType });
  if (f.zone) and.push({ OR: [{ zone: f.zone }, { city: f.zone }] });
  if (f.city) and.push({ city: f.city });
  if (f.max) and.push({ priceAmount: { lte: f.max } });
  if (f.min) and.push({ priceAmount: { gte: f.min } });
  if (f.beds) and.push({ beds: { gte: f.beds } });
  if (f.baths) and.push({ baths: { gte: f.baths } });
  if (f.minM2) and.push({ areaM2: { gte: f.minM2 } });
  if (f.lux) and.push({ luxury: true });
  if (f.kind === "penthouse") and.push({ kind: "penthouse" });
  if (f.kind === "house") and.push({ kind: { in: ["house", "townhouse", "villa", "chalet"] } });
  if (f.kind === "apartment") and.push({ kind: { in: ["apartment", "studio", "penthouse"] } });
  if (f.kind === "land") and.push({ kind: "land" });
  if (f.furnished) and.push({ furnished: true });
  if (f.pets) and.push({ pets: true });
  if (f.verified) and.push({ agency: { verified: true } });
  if (f.pub) and.push({ publishedAt: { gte: new Date(Date.now() - (f.pub === "24h" ? 1 : 7) * 864e5) } });
  if (f.amenities?.length) and.push({ amenities: { hasEvery: f.amenities } });
  if (f.bbox) {
    const [s, w, n, e] = f.bbox;
    and.push({ lat: { gte: s, lte: n }, lng: { gte: w, lte: e } });
  }
  return { AND: and };
}

export async function searchListings(f: SearchFilters): Promise<{ items: Listing[]; nextCursor: string | null; total: number }> {
  const where = whereFromFilters(f);
  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    f.sort === "price-asc" ? [{ priceAmount: "asc" }] : f.sort === "price-desc" ? [{ priceAmount: "desc" }] : [{ publishedAt: "desc" }];
  const take = Math.max(1, Math.min(Math.floor(f.take ?? 500), 500));
  const rows = await prisma.listing.findMany({ where, include: listingInclude, orderBy: [...orderBy, { id: "asc" }], take: take + 1, ...(f.cursor ? { cursor: { id: f.cursor }, skip: 1 } : {}) });
  let items = rows.slice(0, take).map((r) => toCard(toDomain(r)));
  if (f.shape) items = items.filter((l) => inShape(l, f.shape!));
  if (f.sort === "ppm") items.sort((a, b) => a.priceAmount / a.areaM2 - b.priceAmount / b.areaM2);
  const total = f.shape ? items.length : await prisma.listing.count({ where });
  return { items, nextCursor: rows.length > take ? rows[take - 1].id : null, total };
}

export async function publicListings(): Promise<Listing[]> {
  const rows = await prisma.listing.findMany({ where: publicWhere(), include: listingInclude, orderBy: { publishedAt: "desc" } });
  return rows.map((r) => toCard(toDomain(r)));
}

export async function listingBySlug(slug: string): Promise<Listing | null> {
  const r = await prisma.listing.findUnique({ where: { slug }, include: listingInclude });
  return r ? toDomain(r) : null;
}

export async function listingById(id: string): Promise<Listing | null> {
  const r = await prisma.listing.findUnique({ where: { id }, include: listingInclude });
  return r ? toDomain(r) : null;
}

export async function listingsByIds(ids: string[]): Promise<Listing[]> {
  if (!ids.length) return [];
  const rows = await prisma.listing.findMany({ where: { id: { in: ids } }, include: listingInclude });
  const map = new Map(rows.map((r) => [r.id, toDomain(r)]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Listing[];
}

export async function agencyListings(agencyId: string | null, opts: { agentId?: string } = {}): Promise<Listing[]> {
  const rows = await prisma.listing.findMany({
    where: { ...(agencyId ? { agencyId } : {}), ...(opts.agentId ? { agentId: opts.agentId } : {}) },
    include: listingInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDomain);
}
