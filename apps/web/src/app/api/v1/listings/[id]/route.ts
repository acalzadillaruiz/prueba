import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingById, publicWhere } from "@/server/listings";
import { listingForUser } from "@/server/access";
import { notifySavedSearches, qualityOf, snapshotEstimate } from "@/server/listing-service";
import { audit } from "@/server/data";

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
    return ok(l);
  }
  return ok({ ...l, takedownReason: null });
});

const Patch = z.object({
  title_es: z.string().min(3).max(120).optional(),
  title_en: z.string().max(120).optional(),
  body_es: z.string().max(4000).optional(),
  body_en: z.string().max(4000).optional(),
  priceAmount: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN", "EXPIRED"]).optional(),
  review: z.enum(["APPROVED", "REJECTED"]).optional(),
  agentId: z.string().nullable().optional(),
  beds: z.number().int().min(0).optional(),
  baths: z.number().int().min(0).optional(),
  parking: z.number().int().min(0).optional(),
  areaM2: z.number().int().positive().optional(),
  amenities: z.array(z.string()).optional(),
  privateListing: z.boolean().optional(),
  hasFloorplan: z.boolean().optional(),
  hasVirtualTour: z.boolean().optional(),
  virtualTourUrl: z.string().url().nullable().optional(),
});

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const b = await body(req, Patch);
  const mode = b.review ? "approve" : b.agentId !== undefined ? "assign" : "edit";
  const cur = await listingForUser(id, u, mode);
  // A moderation takedown can only be lifted by the platform, not by the agency changing the status back.
  if (cur.takedownReason && u.role !== "SUPERADMIN" && (b.status !== undefined || b.review !== undefined || b.privateListing === false)) throw new ApiError("FORBIDDEN", { status: "takedown" });
  if (b.status === "SOLD" && cur.listingType.includes("RENT")) throw new ApiError("VALIDATION", { status: "SOLD is for sales" });
  if (b.status === "RENTED" && !cur.listingType.includes("RENT")) throw new ApiError("VALIDATION", { status: "RENTED is for rentals" });
  const data: Record<string, unknown> = {};
  if (b.title_es) data.titleEs = b.title_es;
  if (b.title_en !== undefined) data.titleEn = b.title_en;
  if (b.body_es) data.bodyEs = b.body_es;
  if (b.body_en !== undefined) data.bodyEn = b.body_en;
  for (const k of ["beds", "baths", "parking", "areaM2", "amenities", "privateListing", "hasFloorplan", "hasVirtualTour", "virtualTourUrl"] as const) if (b[k] !== undefined) data[k] = b[k];
  if (b.agentId !== undefined) {
    if (b.agentId) {
      const m = await prisma.agencyMember.findFirst({ where: { userId: b.agentId, agencyId: cur.agencyId ?? "", role: "AGENT" } });
      if (!m) throw new ApiError("VALIDATION", { agentId: "not an agent of this agency" });
    }
    data.agentId = b.agentId;
  }
  if (b.review) data.review = b.review;
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
  const fresh = await prisma.listing.findUniqueOrThrow({ where: { id }, include: { _count: { select: { photos: true } } } });
  await prisma.listing.update({ where: { id }, data: { quality: qualityOf({ photos: fresh._count.photos || fresh.scenes.length, titleEn: fresh.titleEn, bodyEn: fresh.bodyEn, lat: fresh.lat, hasFloorplan: fresh.hasFloorplan, hasVirtualTour: fresh.hasVirtualTour }) } });
  if (b.review === "APPROVED" || (b.status === "ACTIVE" && cur.status !== "ACTIVE")) await notifySavedSearches(id, "new");
  else if (priceChanged && b.priceAmount! < cur.priceAmount) await notifySavedSearches(id, "price");
  await audit(u.id, b.review ? `listing.review.${b.review.toLowerCase()}` : b.agentId !== undefined ? "listing.assign" : "listing.update", fresh.titleEs, b);
  return ok(await listingById(id));
});

export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const l = await listingForUser(id, u, "edit");
  await prisma.listing.update({ where: { id }, data: { status: "WITHDRAWN" } });
  await audit(u.id, "listing.withdraw", l.titleEs);
  return ok({ ok: true });
});
