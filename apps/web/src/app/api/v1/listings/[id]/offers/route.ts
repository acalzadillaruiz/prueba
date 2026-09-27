import type { NextRequest } from "next/server";
import { offerSchema } from "@newplace/config";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { queueEmail } from "@/server/data";
import { publicWhere } from "@/server/listings";
import { limit } from "@/server/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** The current user's own offers on this listing (Homebuyer Hub). */
export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const items = await prisma.offer.findMany({ where: { listingId: id, bidderUserId: u.id }, orderBy: { createdAt: "desc" } });
  return ok({ items });
});

/** Offer log (no digital signature in v1). Only buyers already in contact (lead or tour) can bid. */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const b = await body(req, offerSchema);
  await limit(req, "offer", 10, 60 * 60);
  const l = await prisma.listing.findFirst({ where: { AND: [{ id }, publicWhere()] }, include: { owner: true, agent: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  if (!["ACTIVE", "COMING_SOON", "UNDER_OFFER"].includes(l.status)) throw new ApiError("VALIDATION", { listing: "not available" });
  const [lead, tour] = await Promise.all([
    prisma.lead.findFirst({ where: { listingId: id, seekerUserId: u.id }, select: { id: true } }),
    prisma.tour.findFirst({ where: { listingId: id, seekerUserId: u.id }, select: { id: true } }),
  ]);
  if (!lead && !tour) throw new ApiError("FORBIDDEN", { offer: "contact the agent or book a tour first" });
  const o = await prisma.offer.create({ data: { listingId: id, bidderName: u.name ?? "Comprador", bidderUserId: u.id, amount: b.amount, note: b.note || undefined } });
  const to = l.owner?.email ?? l.agent?.email;
  if (to) await queueEmail(to, `Nueva oferta: USD ${b.amount.toLocaleString("es-VE")} · ${l.titleEs}`, "LEAD");
  return ok(o, 201);
});
