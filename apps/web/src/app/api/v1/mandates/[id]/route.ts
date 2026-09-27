import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, type Prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager } from "@/server/access";
import { audit, queueEmail } from "@/server/data";
import { notifySavedSearches } from "@/server/listing-service";
import { revalidateListing } from "@/server/revalidate";

type Ctx = { params: Promise<{ id: string }> };

/** Owner mandate lifecycle: REQUESTED → ASSIGNED (agency picks agent) → ACTIVE (listing published). */
export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const m = await prisma.mandate.findUnique({ where: { id }, include: { owner: true } });
  if (!m) throw new ApiError("NOT_FOUND");
  const b = await body(req, z.object({ agentId: z.string().min(1).max(64).optional(), status: z.enum(["ACTIVE", "CANCELLED"]).optional() }));
  // Only the agency's managers (or the platform) assign; the assigned agent of that same agency may publish.
  const manager = u.role === "SUPERADMIN" || (isManager(u) && m.agencyId === u.agencyId);
  const assignedAgent = u.role === "AGENT" && m.agentId === u.id && m.agencyId === u.agencyId;
  if (b.status === "CANCELLED" && m.ownerUserId !== u.id && !manager) throw new ApiError("FORBIDDEN");
  if ((b.agentId || b.status === "ACTIVE") && !manager && !(b.status === "ACTIVE" && !b.agentId && assignedAgent)) throw new ApiError("FORBIDDEN");
  if (b.agentId) {
    // Same check as listings/[id] assign: the agent must be an AGENT member of the mandate's agency.
    const member = await prisma.agencyMember.findFirst({ where: { userId: b.agentId, agencyId: m.agencyId, role: "AGENT" } });
    if (!member) throw new ApiError("VALIDATION", { agentId: "not an agent of this agency" });
  }
  const data: Prisma.MandateUncheckedUpdateInput = {};
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
      // Mandate listings are created private and unlinked; publishing makes them public under the agency.
      const pub = await prisma.listing.update({ where: { id: m.listingId }, data: { status: "ACTIVE", review: "APPROVED", privateListing: false, agencyId: m.agencyId, publishedAt: new Date() } });
      await notifySavedSearches(m.listingId, "new");
      revalidateListing(pub.slug);
    }
  }
  if (b.status === "CANCELLED") data.status = "CANCELLED";
  const r = await prisma.mandate.update({ where: { id }, data });
  await audit(u.id, "mandate.update", id, b);
  return ok(r);
});
