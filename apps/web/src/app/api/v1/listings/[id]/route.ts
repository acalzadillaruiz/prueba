import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingById, publicWhere } from "@/server/listings";
import { listingForUser } from "@/server/access";
import { brochurePdfSchema, commercialSchema, shortRentSchema } from "@newplace/config";
import { notifySavedSearches, refreshQuality, snapshotEstimate } from "@/server/listing-service";
import { audit } from "@/server/data";
import { essentialsSchema } from "@/lib/essentials-schema";
import { revalidateListing } from "@/server/revalidate";

type Ctx = { params: Promise<{ id: string }> };

/** Public for published listings; drafts, reviews and taken-down listings only for users who can see them. */
export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const l = await listingById(id);
  if (!l) throw new ApiError("NOT_FOUND");
  const published = await prisma.listing.count({ where: { AND: [{ id }, publicWhere()] } });
  if (!published) {
    const u = await currentUser();
    if (!u) throw new ApiError("NOT_FOUND");
    await listingForUser(id, u, "view").catch(() => {
      throw new ApiError("NOT_FOUND");
    });
    return ok({ ...l, brochurePdf: await brochureOf(id) });
  }
  return ok({ ...l, takedownReason: null, brochurePdf: (await brochureOf(id)) ?? null });
});

/** The luxury brochure isn't part of the domain Listing yet: read it alongside (editor + public API). */
async function brochureOf(id: string) {
  return (await prisma.listing.findUnique({ where: { id }, select: { brochurePdf: true } }))?.brochurePdf ?? null;
}

const OWNER_STATUSES: string[] = ["DRAFT", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN"];

const Patch = z.object({
  title_es: z.string().min(3).max(120).optional(),
  title_en: z.string().max(120).optional(),
  body_es: z.string().max(4000).optional(),
  body_en: z.string().max(4000).optional(),
  priceAmount: z.number().int().positive().max(1_000_000_000).optional(),
  status: z.enum(["DRAFT", "COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN", "EXPIRED"]).optional(),
  review: z.enum(["APPROVED", "REJECTED"]).optional(),
  agentId: z.string().nullable().optional(),
  beds: z.number().int().min(0).max(30).optional(),
  baths: z.number().int().min(0).max(30).optional(),
  parking: z.number().int().min(0).max(50).optional(),
  areaM2: z.number().int().positive().max(1_000_000).optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
  amenities: z.array(z.string().max(60)).max(50).optional(),
  /** Venezuelan essentials; null clears powerBackup / waterTankLiters / dockFeet */
  ...essentialsSchema.shape,
  privateListing: z.boolean().optional(),
  hasFloorplan: z.boolean().optional(),
  hasVirtualTour: z.boolean().optional(),
  virtualTourUrl: z.string().url().max(500).refine((v) => v.startsWith("https://"), "https only").nullable().optional(),
  /** SHORT_RENT only; null clears */
  shortRent: shortRentSchema.nullable().optional(),
  /** COMMERCIAL_* only; null clears */
  commercial: commercialSchema.nullable().optional(),
  /** luxury only; null clears */
  brochurePdf: brochurePdfSchema.nullable().optional(),
});

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const b = await body(req, Patch);
  const mode = b.review ? "approve" : b.agentId !== undefined ? "assign" : "edit";
  const cur = await listingForUser(id, u, mode);
  // A moderation takedown can only be lifted by the platform, not by the agency changing the status back.
  if (cur.takedownReason && u.role !== "SUPERADMIN" && (b.status !== undefined || b.review !== undefined || b.privateListing === false)) throw new ApiError("FORBIDDEN", { status: "takedown" });
  // Owner with a mandate still pending (REQUESTED/ASSIGNED): only the agency publishes it, through the mandate flow.
  if (u.role !== "SUPERADMIN" && cur.ownerUserId === u.id && (b.status !== undefined || b.review !== undefined || b.privateListing !== undefined)) {
    const pending = await prisma.mandate.count({ where: { listingId: id, ownerUserId: u.id, status: { in: ["REQUESTED", "ASSIGNED"] } } });
    if (pending) throw new ApiError("FORBIDDEN", { status: "mandate pending" });
  }
  // A private owner pauses (WITHDRAWN), resumes (ACTIVE) or closes (SOLD/RENTED) their own listing; EXPIRED and COMING_SOON stay with the platform/agencies.
  if (u.role === "OWNER_PRIVATE" && b.status && !OWNER_STATUSES.includes(b.status)) throw new ApiError("FORBIDDEN", { status: "not for owners" });
  if (b.shortRent && cur.listingType !== "SHORT_RENT") throw new ApiError("VALIDATION", { shortRent: "only for SHORT_RENT" });
  if (b.commercial && !cur.listingType.startsWith("COMMERCIAL")) throw new ApiError("VALIDATION", { commercial: "only for commercial listings" });
  if (b.brochurePdf && !cur.luxury) throw new ApiError("VALIDATION", { brochurePdf: "only for luxury listings" });
  if (b.status === "SOLD" && cur.listingType.includes("RENT")) throw new ApiError("VALIDATION", { status: "SOLD is for sales" });
  if (b.status === "RENTED" && !cur.listingType.includes("RENT")) throw new ApiError("VALIDATION", { status: "RENTED is for rentals" });
  const data: Record<string, unknown> = {};
  if (b.title_es) data.titleEs = b.title_es;
  if (b.title_en !== undefined) data.titleEn = b.title_en;
  if (b.body_es) data.bodyEs = b.body_es;
  if (b.body_en !== undefined) data.bodyEn = b.body_en;
  for (const k of ["beds", "baths", "parking", "areaM2", "yearBuilt", "amenities", "powerBackup", "ownWell", "waterTankLiters", "dockFeet", "viewAvila", "viewSea", "privateListing", "hasFloorplan", "hasVirtualTour", "virtualTourUrl", "brochurePdf"] as const) if (b[k] !== undefined) data[k] = b[k];
  // Json columns: null clears (Prisma.DbNull), an object replaces.
  for (const k of ["shortRent", "commercial"] as const) if (b[k] !== undefined) data[k] = b[k] === null ? Prisma.DbNull : b[k];
  if (b.agentId !== undefined) {
    if (b.agentId) {
      const m = await prisma.agencyMember.findFirst({ where: { userId: b.agentId, agencyId: cur.agencyId ?? "", role: "AGENT" } });
      if (!m) throw new ApiError("VALIDATION", { agentId: "not an agent of this agency" });
    }
    data.agentId = b.agentId;
  }
  if (b.review) data.review = b.review;
  // An agent editing a listing the backoffice rejected sends it back to review (resubmission).
  else if (u.role === "AGENT" && cur.review === "REJECTED") data.review = "PENDING";
  const statusChanged = !!b.status && b.status !== cur.status;
  if (b.status) {
    data.status = b.status;
    if (b.status === "ACTIVE" && !cur.publishedAt) data.publishedAt = new Date();
  }
  const priceChanged = b.priceAmount && b.priceAmount !== cur.priceAmount;
  if (priceChanged) data.priceAmount = b.priceAmount;
  await prisma.listing.update({ where: { id }, data });
  if (priceChanged) await prisma.listingPriceHistory.create({ data: { listingId: id, amount: b.priceAmount!, kind: b.priceAmount! < cur.priceAmount ? "DROP" : "RAISE" } });
  if (statusChanged && (b.status === "UNDER_OFFER" || b.status === "SOLD" || b.status === "RENTED")) await prisma.listingPriceHistory.create({ data: { listingId: id, amount: b.priceAmount ?? cur.priceAmount, kind: b.status } });
  if (priceChanged || b.areaM2 || b.amenities) await snapshotEstimate(id);
  const fresh = await refreshQuality(id);
  if (b.review === "APPROVED" || (b.status === "ACTIVE" && cur.status !== "ACTIVE")) await notifySavedSearches(id, "new");
  else if (priceChanged && b.priceAmount! < cur.priceAmount) await notifySavedSearches(id, "price");
  await audit(u.id, b.review ? `listing.review.${b.review.toLowerCase()}` : data.review === "PENDING" ? "listing.review.pending" : b.agentId !== undefined ? "listing.assign" : "listing.update", fresh.titleEs, b);
  revalidateListing(fresh.slug);
  return ok({ ...(await listingById(id)), brochurePdf: fresh.brochurePdf });
});

export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const l = await listingForUser(id, u, "edit");
  // A private owner deleting their own FSBO listing (never handed to an agency) really deletes it: it leaves their list
  // for good. A taken-down listing stays (the moderation record must survive; the owner can appeal instead).
  const fsbo = u.role === "OWNER_PRIVATE" && l.ownerUserId === u.id && !l.agencyId && !l.agentId;
  if (fsbo) {
    if (l.takedownReason) throw new ApiError("FORBIDDEN", { status: "takedown" });
    const mandates = await prisma.mandate.count({ where: { listingId: id, status: { not: "CANCELLED" } } });
    if (!mandates) {
      await prisma.listing.delete({ where: { id } });
      await audit(u.id, "listing.delete", l.titleEs);
      revalidateListing(l.slug);
      return ok({ ok: true, deleted: true });
    }
  }
  await prisma.listing.update({ where: { id }, data: { status: "WITHDRAWN" } });
  await audit(u.id, "listing.withdraw", l.titleEs);
  revalidateListing(l.slug);
  return ok({ ok: true });
});
