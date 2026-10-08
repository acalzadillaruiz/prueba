import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser, type SessionUser } from "@/server/api";
import { ownsFsboTour } from "@/server/access";
import { audit } from "@/server/data";
import { limit } from "@/server/rate-limit";
import { parseVisitHours, visitHoursSchema } from "@/lib/visit-hours";

type Ctx = { params: Promise<{ id: string }> };

/** Only the private owner of an FSBO listing (no agency, no agent) sets its visit hours: they attend the visits. */
async function ownedFsbo(id: string, u: SessionUser) {
  const l = await prisma.listing.findUnique({ where: { id }, select: { id: true, titleEs: true, ownerUserId: true, agencyId: true, agentId: true, visitHours: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  if (!ownsFsboTour(l, u)) throw new ApiError("FORBIDDEN");
  return l;
}

export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const l = await ownedFsbo(id, requireUser(await currentUser()));
  return ok({ visitHours: parseVisitHours(l.visitHours) });
});

/** `{ visitHours: null }` clears the calendar (the page then offers "request a visit"). */
const Put = z.object({ visitHours: visitHoursSchema.nullable() }).strict();

export const PUT = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  await limit(req, "visit-hours", 30, 10 * 60);
  const l = await ownedFsbo(id, u);
  const { visitHours } = await body(req, Put);
  // Sorted for a stable, readable value; raw UPDATE so the listing's "updated" freshness badge doesn't move.
  const value = visitHours ? { slotMin: visitHours.slotMin, ranges: [...visitHours.ranges].sort((a, b) => a.day - b.day || a.from.localeCompare(b.from)) } : null;
  if (value) await prisma.$executeRaw`UPDATE "Listing" SET "visitHours" = ${JSON.stringify(value)}::jsonb WHERE "id" = ${l.id}`;
  else await prisma.$executeRaw`UPDATE "Listing" SET "visitHours" = NULL WHERE "id" = ${l.id}`;
  await audit(u.id, "listing.visit_hours", l.titleEs, { listingId: l.id, slotMin: value?.slotMin ?? null, ranges: value?.ranges.length ?? 0 });
  return ok({ visitHours: value });
});
