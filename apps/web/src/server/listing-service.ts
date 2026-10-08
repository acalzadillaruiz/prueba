import "server-only";
import { estimateFor } from "./estimate";
import { prisma, type Prisma } from "@newplace/db";
import { heuristicWriteListing } from "@newplace/ai";
import { listingQuality } from "@newplace/config";
import type { Scene } from "@/types/domain";
import { queueEmail } from "./data";
import { filtersFromParams, whereFromFilters } from "./listings";
import { inShape } from "@/lib/geo";

export const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function fingerprintOf(lat: number, lng: number, areaM2: number, address: string) {
  let h = 2166136261;
  const a = address.toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a.charCodeAt(i), 16777619);
  return `${lat.toFixed(4)}|${lng.toFixed(4)}|${areaM2}|${(h >>> 0).toString(16)}`;
}

/** Duplicate if same address hash, or within ~40 m with m² ±5 % (one listing = one physical unit). */
export async function findDuplicate(lat: number, lng: number, areaM2: number, address: string, excludeId?: string) {
  const fp = fingerprintOf(lat, lng, areaM2, address);
  const exact = await prisma.duplicateFingerprint.findUnique({ where: { fingerprint: fp } });
  if (exact && exact.listingId !== excludeId) return prisma.listing.findUnique({ where: { id: exact.listingId } });
  const d = 0.0004;
  const near = await prisma.listing.findFirst({
    where: { id: excludeId ? { not: excludeId } : undefined, lat: { gte: lat - d, lte: lat + d }, lng: { gte: lng - d, lte: lng + d }, areaM2: { gte: Math.floor(areaM2 * 0.95), lte: Math.ceil(areaM2 * 1.05) } },
  });
  if (near) return near;
  const addr = address.toLowerCase().replace(/\s+/g, " ").trim();
  if (addr.length > 12) {
    const same = await prisma.listing.findFirst({ where: { id: excludeId ? { not: excludeId } : undefined, address: { equals: address, mode: "insensitive" }, areaM2: { gte: Math.floor(areaM2 * 0.95), lte: Math.ceil(areaM2 * 1.05) } } });
    if (same) return same;
  }
  return null;
}

export function qualityOf(l: { photos: number; titleEn?: string | null; bodyEn?: string | null; lat?: number | null; hasFloorplan: boolean; hasVirtualTour: boolean }) {
  return listingQuality({ photos: l.photos, titleEn: l.titleEn, bodyEn: l.bodyEn, located: !!l.lat, hasFloorplan: l.hasFloorplan, hasVirtualTour: l.hasVirtualTour });
}

/** Recomputes and stores the quality score from the listing as persisted (real uploaded photos only: brand illustrations don't count). */
export async function refreshQuality(listingId: string) {
  const l = await prisma.listing.findUniqueOrThrow({ where: { id: listingId }, include: { _count: { select: { photos: true } } } });
  const quality = qualityOf({ photos: l._count.photos, titleEn: l.titleEn, bodyEn: l.bodyEn, lat: l.lat, hasFloorplan: l.hasFloorplan, hasVirtualTour: l.hasVirtualTour });
  return prisma.listing.update({ where: { id: listingId }, data: { quality } });
}

/** A new private owner is "established" once the email is verified or the account is a week old (docs/DECISIONS.md). */
const ESTABLISHED_AFTER_MS = 7 * 864e5;

/**
 * Trust gate for immediate publication: listings of an agency the platform hasn't verified, and FSBO listings of a
 * brand-new owner whose email isn't verified, go to moderation (review PENDING → invisible until approved).
 */
export async function needsModeration(mode: "FSBO" | "AGENCY" | "MANDATE", userId: string, agencyId: string | null) {
  if (mode === "AGENCY" && agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { verified: true } });
    return !agency?.verified;
  }
  if (mode === "FSBO") {
    const owner = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, createdAt: true } });
    return !owner?.emailVerified && Date.now() - (owner?.createdAt.getTime() ?? Date.now()) < ESTABLISHED_AFTER_MS;
  }
  return false;
}

export function scenesFor(kind: string, luxury: boolean): Scene[] {
  if (kind === "land") return ["land", "chalet", "land"];
  if (kind === "warehouse") return ["warehouse", "office", "lobby"];
  if (kind === "office") return ["office", "lobby", "office", "tower-day"];
  if (kind === "retail") return ["retail", "tower-day", "office"];
  if (["house", "townhouse", "villa"].includes(kind)) return luxury ? ["villa-pool", "house-dusk", "living", "kitchen", "bedroom", "terrace", "bath"] : ["house-dusk", "living", "kitchen", "bedroom", "terrace", "bath"];
  if (kind === "penthouse") return ["terrace", "tower-dusk", "living", "kitchen", "bedroom", "bath"];
  return ["tower-day", "living", "kitchen", "bedroom", "bath", "lobby"];
}

/** Computes and stores a PlaceEstimate snapshot (brief: "Guardar snapshot al publicar"). */
export async function snapshotEstimate(listingId: string) {
  const l = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!l) return null;
  const { provider: providerId, estimate: est, poolSize } = await estimateFor({ ...l, excludeId: l.id });
  const group = l.listingType === "SALE" || l.listingType === "COMMERCIAL_SALE" ? "sale" : "rent";
  const provider = { id: providerId };
  const pool = { length: poolSize };
  if (group !== "sale" && pool.length < 3) {
    // Rentals with few comparables: anchor on the asking price (±10 %).
    est.mid = Math.round(l.priceAmount / 5) * 5;
    est.low = Math.round((est.mid * 0.9) / 5) * 5;
    est.high = Math.round((est.mid * 1.1) / 5) * 5;
  }
  return prisma.placeEstimateSnapshot.create({
    data: { listingId: l.id, mid: est.mid, low: est.low, high: est.high, confidence: est.confidence, comparables: est.comparables as unknown as Prisma.InputJsonValue, method: est.method, provider: provider.id },
  });
}

/** Saved-search alerts: queue an email for every search the new/updated listing matches (INSTANT) or bump newCount. */
export async function notifySavedSearches(listingId: string, reason: "new" | "price") {
  const l = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!l || l.review !== "APPROVED" || l.privateListing) return 0;
  const searches = await prisma.savedSearch.findMany({ include: { user: { select: { email: true } } } });
  let n = 0;
  for (const s of searches) {
    const f = filtersFromParams(new URLSearchParams(s.query));
    const hit = await prisma.listing.count({ where: { AND: [whereFromFilters(f), { id: l.id }] } });
    const poly = s.polygon as { lat: number; lng: number }[] | null;
    // Shape: the polygon column, or a polygon/radius stored inside the query string.
    const shape = poly && poly.length >= 3 ? ({ type: "poly", pts: poly } as const) : f.shape;
    if (!hit || (shape && !inShape(l, shape))) continue;
    n++;
    await prisma.savedSearch.update({ where: { id: s.id }, data: { newCount: { increment: 1 }, ...(s.frequency === "INSTANT" ? { lastSentAt: new Date() } : {}) } });
    if (s.frequency === "INSTANT")
      await queueEmail(s.user.email, reason === "new" ? `Algo nuevo en «${s.name}»: ${l.titleEs}` : `Ahora a mejor precio: ${l.titleEs}`, "ALERT", `https://newplace.app/es/listing/${l.slug}`);
  }
  return n;
}

export async function uniqueSlug(base: string) {
  let slug = base;
  for (let i = 0; await prisma.listing.findUnique({ where: { slug } }); i++) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  return slug;
}

export function draftCopy(input: { kind: string; zone: string; city: string; areaM2: number; beds: number; baths: number; parking: number; amenities: string[] }) {
  return heuristicWriteListing({ ...input, highlights: undefined });
}
