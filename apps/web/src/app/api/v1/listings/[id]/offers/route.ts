import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { queueEmail } from "@/server/data";
import { publicWhere } from "@/server/listings";
import { limit } from "@/server/rate-limit";

type Ctx = { params: Promise<{ id: string }> };
const Offer = z.object({ amount: z.number().int().positive(), note: z.string().max(500).optional() });

/** Offer log (no digital signature in v1). */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const b = await body(req, Offer);
  await limit(req, "offer", 10, 60 * 60);
  const l = await prisma.listing.findFirst({ where: { AND: [{ id }, publicWhere()] }, include: { owner: true, agent: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  if (!["ACTIVE", "COMING_SOON", "UNDER_OFFER"].includes(l.status)) throw new ApiError("VALIDATION", { listing: "not available" });
  const o = await prisma.offer.create({ data: { listingId: id, bidderName: u.name ?? "Comprador", bidderUserId: u.id, amount: b.amount, note: b.note } });
  const to = l.owner?.email ?? l.agent?.email;
  if (to) await queueEmail(to, `Nueva oferta: USD ${b.amount.toLocaleString("es-VE")} · ${l.titleEs}`, "LEAD");
  return ok(o, 201);
});
