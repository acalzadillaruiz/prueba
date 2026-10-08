import "server-only";
import { prisma, type Prisma } from "@newplace/db";
import type { EstimateResult } from "@newplace/ai";
import type { Amenity, Kind, Listing, ListingStatus, ListingType, PowerBackup, Scene } from "@/types/domain";
import { inShape, shapeBounds, type Shape } from "@/lib/geo";
import { POWER_BACKUPS, essentialsFromParams, type EssentialsFilters } from "@/lib/essentials";

export const listingInclude = {
  photos: { orderBy: [{ isCover: "desc" }, { order: "asc" }] },
  priceHistory: { orderBy: { date: "asc" } },
  estimates: { orderBy: { createdAt: "desc" }, take: 1 },
  agency: { select: { id: true, name: true, verified: true, color: true, initials: true, phone: true, whatsapp: true } },
  agent: { select: { id: true, name: true, hue: true, phone: true, memberships: { select: { verified: true }, take: 1 } } },
  owner: { select: { id: true, name: true, hue: true, phone: true } },
} satisfies Prisma.ListingInclude;

export type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

/** Same shape as listingInclude, trimmed in the database to what toCard keeps (5 photos, last price drop). */
const cardInclude = {
  ...listingInclude,
  photos: { orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 5 },
  priceHistory: { where: { kind: "DROP" }, orderBy: { date: "desc" }, take: 1 },
} satisfies Prisma.ListingInclude;

export const PUBLIC_STATUSES: ListingStatus[] = ["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"];

/**
 * What anonymous visitors may see. `byLink` also admits private (off-market) listings, which stay out of search
 * and lists but are served to whoever has the link (brief §8: "no sale en search público salvo link").
 */
export function publicWhere(opts: { byLink?: boolean } = {}): Prisma.ListingWhereInput {
  // Listings of a suspended agency disappear from every public surface.
  return {
    status: { in: PUBLIC_STATUSES },
    review: "APPROVED",
    ...(opts.byLink ? {} : { privateListing: false }),
    OR: [{ agencyId: null }, { agency: { status: { not: "SUSPENDED" } } }],
  };
}

/**
 * Single rule for the public detail page, its metadata and its share image: published + approved and not owned by
 * a suspended agency (same rule as `publicWhere({ byLink: true })`). Hidden listings are only seen via /preview.
 */
export async function servedPublicly(l: Pick<Listing, "status" | "review" | "agencyId">): Promise<boolean> {
  if (!PUBLIC_STATUSES.includes(l.status) || l.review !== "APPROVED") return false;
  if (!l.agencyId) return true;
  const agency = await prisma.agency.findUnique({ where: { id: l.agencyId }, select: { status: true } });
  return agency?.status !== "SUSPENDED";
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
    powerBackup: POWER_BACKUPS.includes(r.powerBackup as PowerBackup) ? (r.powerBackup as PowerBackup) : null,
    ownWell: r.ownWell,
    waterTankLiters: r.waterTankLiters,
    dockFeet: r.dockFeet,
    viewAvila: r.viewAvila,
    viewSea: r.viewSea,
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
    virtualTourUrl: r.virtualTourUrl,
    estimate,
    priceHistory: r.priceHistory.map((p) => ({ date: p.date.toISOString(), amount: p.amount, kind: p.kind as Listing["priceHistory"][number]["kind"] })),
    daysOnMarket: Math.max(0, Math.round((Date.now() - Date.parse(publishedAt)) / 864e5)),
    stats: { impressions: r.impressions, saves: r.saves, leads: r.leadsCount, avgTimeSec: r.dwellCount > 0 ? r.avgTimeSec : null, interactions: r.interactions },
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

export interface SearchFilters extends EssentialsFilters {
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
  sort?: "rec" | "new" | "price-asc" | "price-desc" | "ppm";
  cursor?: string;
  take?: number;
}

const TYPES = ["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT", "COMMERCIAL"];
/** "rec" (Recomendados) is the default; "new" (Lo más reciente) is plain newest first. */
const SORTS = ["rec", "new", "price-asc", "price-desc", "ppm"];
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
    // Venezuelan essentials: power=full|partial, well=1, tank=<min litres>, dock=1, avila=1, sea=1
    ...essentialsFromParams(sp),
    bbox: bbox?.length === 4 && bbox.every(Number.isFinite) ? (bbox as SearchFilters["bbox"]) : undefined,
    shape,
    sort: oneOf<NonNullable<SearchFilters["sort"]>>("sort", SORTS) ?? "rec",
    cursor: sp.get("cursor") ?? undefined,
    take: num("take"),
  };
}

export function whereFromFilters(f: SearchFilters): Prisma.ListingWhereInput {
  // Search shows what can still be bought or rented; sold/rented stay reachable by link and as "sold nearby".
  const and: Prisma.ListingWhereInput[] = [publicWhere(), { status: { in: ["COMING_SOON", "ACTIVE", "UNDER_OFFER"] } }];
  if (f.type === "COMMERCIAL") and.push({ listingType: { in: ["COMMERCIAL_SALE", "COMMERCIAL_RENT"] } });
  else if (f.type) and.push({ listingType: f.type as ListingType });
  // "El Morro" covers "Cerro El Morro" and "Canales de El Morro"; a city name covers all its zones.
  if (f.zone) and.push({ OR: [{ zone: { contains: f.zone, mode: "insensitive" } }, { city: { equals: f.zone, mode: "insensitive" } }] });
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
  // Structured essentials are the source of truth (not the legacy generator / waterTank / view tags).
  if (f.power === "full") and.push({ powerBackup: "FULL" });
  if (f.power === "partial") and.push({ powerBackup: { in: ["FULL", "PARTIAL"] } });
  if (f.well) and.push({ ownWell: true });
  if (f.tank) and.push({ waterTankLiters: { gte: f.tank } });
  if (f.dock) and.push({ dockFeet: { gt: 0 } });
  if (f.avila) and.push({ viewAvila: true });
  if (f.sea) and.push({ viewSea: true });
  if (f.bbox) {
    const [s, w, n, e] = f.bbox;
    and.push({ lat: { gte: s, lte: n }, lng: { gte: w, lte: e } });
  }
  // Polygon / radius: their bounding box goes to the database; the exact inShape test runs on that subset.
  const sb = shapeBounds(f.shape ?? null);
  if (sb) {
    const [s, w, n, e] = sb;
    and.push({ lat: { gte: s, lte: n }, lng: { gte: w, lte: e } });
  }
  return { AND: and };
}

/**
 * Availability tier of the default order: 0 = has photos and can be visited, 1 = coming soon, 2 = no photos. A grey
 * placeholder or a home you can't visit yet shouldn't open the list (still listed, never hidden).
 */
export function listingRank(l: { status: string; photoCount: number }): number {
  if (l.photoCount === 0) return 2;
  return l.status === "COMING_SOON" ? 1 : 0;
}

/** Photos beyond this many don't rank a home higher (the card shows 5). */
export const RANK_PHOTO_CAP = 5;

export interface RankFacts {
  status: string;
  photoCount: number;
  bodyLength: number;
  beds: number;
  baths: number;
  amenityCount: number;
  media: boolean;
  essentials: boolean;
}

/** How complete a listing is, 0–6: a real description, rooms, bathrooms, amenities, a plan/video/tour, essentials. */
export function completeness(l: RankFacts): number {
  return [l.bodyLength >= 120, l.beds > 0, l.baths > 0, l.amenityCount >= 3, l.media, l.essentials].filter(Boolean).length;
}

/**
 * "Recomendados" (default order): homes with photos first (available before coming soon), then more photos (capped),
 * then more complete listings, then the newest — `items` must come newest first; the sort is stable, so recency
 * breaks every tie.
 */
export function recommendedOrder<T extends RankFacts>(items: T[]): T[] {
  const key = (l: T) => [listingRank(l), -Math.min(l.photoCount, RANK_PHOTO_CAP), -completeness(l)];
  const keys = new Map(items.map((l) => [l, key(l)]));
  return [...items].sort((a, b) => {
    const ka = keys.get(a)!;
    const kb = keys.get(b)!;
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });
}

export async function searchListings(f: SearchFilters): Promise<{ items: Listing[]; nextCursor: string | null; total: number }> {
  const where = whereFromFilters(f);
  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    f.sort === "price-asc" ? [{ priceAmount: "asc" }] : f.sort === "price-desc" ? [{ priceAmount: "desc" }] : [{ publishedAt: "desc" }];
  const take = Math.max(1, Math.min(Math.floor(f.take ?? 500), 500));
  const ranked = !f.sort || f.sort === "rec";
  if (f.shape || ranked) {
    const res = await searchByIds(f, where, [...orderBy, { id: "asc" }], take, ranked);
    if (res) return res;
  }
  const [rows, total] = await Promise.all([
    prisma.listing.findMany({ where, include: cardInclude, orderBy: [...orderBy, { id: "asc" }], take: take + 1, ...(f.cursor ? { cursor: { id: f.cursor }, skip: 1 } : {}) }),
    prisma.listing.count({ where }),
  ]);
  const items = rows.slice(0, take).map((r) => toCard(toDomain(r)));
  if (f.sort === "ppm") items.sort((a, b) => a.priceAmount / a.areaM2 - b.priceAmount / b.areaM2);
  return { items, nextCursor: rows.length > take ? rows[take - 1].id : null, total };
}

/** Upper bound of candidates ordered in memory (public inventory is far below this). */
const SHAPE_CANDIDATES = 5000;

/**
 * Search over the ordered candidate ids: the database returns the matching ids (polygon / radius already limited to
 * the shape's bounding box by whereFromFilters); the exact point-in-shape test and the default "Recomendados" ranking
 * (recommendedOrder, stable: recency breaks ties) run on them, and only then is the result paginated — so every page
 * is full, the cursor walks the exact set and `total` is the exact count. Returns null (caller uses the plain query)
 * when a non-shape search has more candidates than can be ranked in memory.
 */
async function searchByIds(f: SearchFilters, where: Prisma.ListingWhereInput, orderBy: Prisma.ListingOrderByWithRelationInput[], take: number, ranked: boolean) {
  const candidates = await prisma.listing.findMany({
    where,
    select: {
      id: true,
      lat: true,
      lng: true,
      status: true,
      _count: { select: { photos: true } },
      // What the "Recomendados" order weighs (the body only for its length).
      bodyEs: ranked,
      beds: true,
      baths: true,
      amenities: true,
      hasFloorplan: true,
      hasVideo: true,
      hasVirtualTour: true,
      powerBackup: true,
    },
    orderBy,
    take: SHAPE_CANDIDATES,
  });
  if (!f.shape && candidates.length >= SHAPE_CANDIDATES) return null;
  let list = f.shape ? candidates.filter((c) => inShape(c, f.shape!)) : candidates;
  if (ranked) {
    const facts = list.map((c) => ({
      id: c.id,
      status: c.status,
      photoCount: c._count.photos,
      bodyLength: c.bodyEs?.trim().length ?? 0,
      beds: c.beds,
      baths: c.baths,
      amenityCount: c.amenities.length,
      media: !!(c.hasFloorplan || c.hasVideo || c.hasVirtualTour),
      essentials: !!c.powerBackup,
    }));
    const order = new Map(recommendedOrder(facts).map((x, i) => [x.id, i]));
    list = [...list].sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
  const ids = list.map((c) => c.id);
  const start = f.cursor ? ids.indexOf(f.cursor) + 1 : 0;
  const pageIds = ids.slice(start, start + take);
  const rows = pageIds.length ? await prisma.listing.findMany({ where: { id: { in: pageIds } }, include: cardInclude }) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = pageIds.map((id) => byId.get(id)).filter((r): r is ListingRow => !!r).map((r) => toCard(toDomain(r)));
  if (f.sort === "ppm") items.sort((a, b) => a.priceAmount / a.areaM2 - b.priceAmount / b.areaM2);
  return { items, nextCursor: start + take < ids.length ? pageIds[pageIds.length - 1] : null, total: ids.length };
}

export async function publicListings(): Promise<Listing[]> {
  const rows = await prisma.listing.findMany({ where: publicWhere(), include: cardInclude, orderBy: { publishedAt: "desc" } });
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

/**
 * Listings by id, in the given order. Public surfaces (saved, buyer hub) only get what `publicWhere()` allows —
 * a saved/contacted id of a pending, private or suspended listing must never render. Staff pages that already
 * scoped the ids to their own agency pass `{ publicOnly: false }`.
 */
export async function listingsByIds(ids: string[], opts: { publicOnly?: boolean } = {}): Promise<Listing[]> {
  if (!ids.length) return [];
  const where: Prisma.ListingWhereInput = opts.publicOnly === false ? { id: { in: ids } } : { AND: [{ id: { in: ids } }, publicWhere({ byLink: true })] };
  const rows = await prisma.listing.findMany({ where, include: listingInclude });
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
