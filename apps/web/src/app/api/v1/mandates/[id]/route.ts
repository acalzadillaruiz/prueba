import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager } from "@/server/access";
import { audit, queueEmail } from "@/server/data";
import { notifySavedSearches } from "@/server/listing-service";

type Ctx = { params: Promise<{ id: string }> };

/** Owner mandate lifecycle: REQUESTED → ASSIGNED (agency picks agent) → ACTIVE (listing published). */
export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const m = await prisma.mandate.findUnique({ where: { id }, include: { owner: true } });
  if (!m) throw new ApiError("NOT_FOUND");
  const b = await body(req, z.object({ agentId: z.string().optional(), status: z.enum(["ACTIVE", "CANCELLED"]).optional() }));
  const manager = u.role === "SUPERADMIN" || (isManager(u) && m.agencyId === u.agencyId);
  if (b.status === "CANCELLED" && m.ownerUserId !== u.id && !manager) throw new ApiError("FORBIDDEN");
  if ((b.agentId || b.status === "ACTIVE") && !manager && !(b.status === "ACTIVE" && m.agentId === u.id)) throw new ApiError("FORBIDDEN");
  const data: Record<string, unknown> = {};
  if (b.agentId) {
    data.agentId = b.agentId;
    data.status = "ASSIGNED";
    if (m.listingId) await prisma.listing.update({ where: { id: m.listingId }, data: { agentId: b.agentId, agencyId: m.agencyId } });
    let thread = await prisma.messageThread.findFirst({ where: { listingId: m.listingId ?? undefined, participants: { some: { userId: m.ownerUserId } } } });
    if (!thread) thread = await prisma.messageThread.create({ data: { listingId: m.listingId, subject: "Encargo", participants: { create: [{ userId: m.ownerUserId }, { userId: b.agentId }] } } });
    await queueEmail(m.owner.email, "Tu inmueble ya tiene agente asignado", "LEAD");
  }
  if (b.status === "ACTIVE") {
    data.status = "ACTIVE";
    if (m.listingId) {
      await prisma.listing.update({ where: { id: m.listingId }, data: { status: "ACTIVE", review: "APPROVED", publishedAt: new Date() } });
      await notifySavedSearches(m.listingId, "new");
    }
  }
  if (b.status === "CANCELLED") data.status = "CANCELLED";
  const r = await prisma.mandate.update({ where: { id }, data });
  await audit(u.id, "mandate.update", id, b);
  return ok(r);
});
