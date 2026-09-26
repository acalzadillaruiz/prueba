import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { queueEmail } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };
const Offer = z.object({ amount: z.number().int().positive(), note: z.string().max(500).optional() });

/** Offer log (no digital signature in v1). */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const b = await body(req, Offer);
  const l = await prisma.listing.findUnique({ where: { id }, include: { owner: true, agent: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  const o = await prisma.offer.create({ data: { listingId: id, bidderName: u.name ?? "Comprador", bidderUserId: u.id, amount: b.amount, note: b.note } });
  const to = l.owner?.email ?? l.agent?.email;
  if (to) await queueEmail(to, `Nueva oferta: USD ${b.amount.toLocaleString("es-VE")} · ${l.titleEs}`, "LEAD");
  return ok(o, 201);
});
