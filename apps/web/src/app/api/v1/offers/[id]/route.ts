import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingForUser } from "@/server/access";
import { revalidateListing } from "@/server/revalidate";

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
    const listing = await prisma.listing.findUnique({ where: { id: o.listingId }, select: { status: true } });
    if (!listing || !["ACTIVE", "COMING_SOON", "UNDER_OFFER"].includes(listing.status)) throw new ApiError("CONFLICT", { listing: "not open for offers" });
    const other = await prisma.offer.findFirst({ where: { listingId: o.listingId, status: "ACCEPTED", id: { not: id } } });
    if (other) throw new ApiError("CONFLICT", { offer: "another offer is already accepted" });
  }
  const r = await prisma.offer.update({ where: { id }, data: { status: b.status } });
  if (b.status === "ACCEPTED") {
    const l = await prisma.listing.update({ where: { id: o.listingId }, data: { status: "UNDER_OFFER" } });
    revalidateListing(l.slug);
  }
  return ok(r);
});
