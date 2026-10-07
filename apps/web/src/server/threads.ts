import "server-only";
import { prisma } from "@newplace/db";
import { ApiError, type SessionUser } from "./api";
import { visibleListingId } from "./access";

/**
 * "Contactar" from a listing: the seeker's conversation with that listing's assigned advisor. The advisor always
 * comes from the listing (never from the client); listings the user may not see are 404. An existing thread about
 * the listing with exactly these two people (a lead thread included) is reused, so repeated clicks never duplicate.
 */
export async function findOrCreateListingThread(u: SessionUser, listingId: string): Promise<{ id: string; created: boolean }> {
  const id = await visibleListingId(listingId, u);
  const l = await prisma.listing.findUnique({ where: { id }, select: { id: true, titleEs: true, agentId: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  if (!l.agentId) throw new ApiError("VALIDATION", { listingId: "listing has no assigned advisor" });
  if (l.agentId === u.id) throw new ApiError("VALIDATION", { listingId: "you are this listing's advisor" });
  const agentId = l.agentId;
  const pair = [u.id, agentId];
  return prisma.$transaction(async (tx) => {
    // Serialises concurrent clicks for the same seeker + listing (two tabs, double tap) so only one thread is created.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`thread:${l.id}:${u.id}`}))`;
    const existing = await tx.messageThread.findFirst({
      where: { listingId: l.id, AND: pair.map((userId) => ({ participants: { some: { userId } } })), participants: { every: { userId: { in: pair } } } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };
    const t = await tx.messageThread.create({ data: { listingId: l.id, subject: l.titleEs, participants: { create: pair.map((userId) => ({ userId })) } }, select: { id: true } });
    return { id: t.id, created: true };
  });
}
