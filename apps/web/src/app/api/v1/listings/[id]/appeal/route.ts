import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingForUser } from "@/server/access";
import { audit } from "@/server/data";
import { APPEAL_PREFIX, openAppeals } from "@/server/listing-service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The owner (or the agency) of a listing taken down by moderation asks the platform to review it again.
 * It lands in the moderation queue (/platform/moderation) as a report; one open appeal at a time.
 */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const l = await listingForUser(id, u, "edit");
  if (!l.takedownReason) throw new ApiError("VALIDATION", { listing: "not taken down" });
  const { message } = await body(req, z.object({ message: z.string().trim().min(10).max(1000) }));
  if ((await openAppeals([id])).has(id)) throw new ApiError("CONFLICT", { appeal: "already open" });
  const agency = l.agencyId ? (await prisma.agency.findUnique({ where: { id: l.agencyId }, select: { name: true } }))?.name : null;
  const r = await prisma.moderationReport.create({
    data: {
      listingId: id,
      title: `${APPEAL_PREFIX}${l.titleEs}`.slice(0, 200),
      reasonEs: `Retirado por: ${l.takedownReason}. El anunciante pide revisarlo: ${message}`,
      reasonEn: `Taken down for: ${l.takedownReason}. The lister asks for a review: ${message}`,
      reporter: u.name || u.email || u.id,
      agency: agency ?? "Particular",
      severity: "medium",
    },
  });
  await audit(u.id, "listing.appeal", l.titleEs, { reason: l.takedownReason });
  return ok({ id: r.id, createdAt: r.createdAt.toISOString() }, 201);
});
