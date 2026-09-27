import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingForUser } from "@/server/access";
import { revalidateListing } from "@/server/revalidate";
import { acceptOffer } from "@/server/offers";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const o = await prisma.offer.findUnique({ where: { id } });
  if (!o) throw new ApiError("NOT_FOUND");
  await listingForUser(o.listingId, u, "edit");
  // `note` is the bidder's message: the seller only changes the status and never overwrites it.
  const b = await body(req, z.object({ status: z.enum(["COUNTERED", "ACCEPTED", "REJECTED"]) }));
  if (b.status === "ACCEPTED") {
    // Check-then-accept in one transaction with the listing row locked: no two offers can end up ACCEPTED.
    const { slug } = await acceptOffer(id, o.listingId);
    revalidateListing(slug);
    return ok(await prisma.offer.findUniqueOrThrow({ where: { id } }));
  }
  const r = await prisma.offer.update({ where: { id }, data: { status: b.status } });
  return ok(r);
});
