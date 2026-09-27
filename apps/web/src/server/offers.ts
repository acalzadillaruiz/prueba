import "server-only";
import { prisma } from "@newplace/db";
import { ApiError } from "@/server/api";

const OPEN = ["ACTIVE", "COMING_SOON", "UNDER_OFFER"];

/**
 * Accepts an offer atomically: the listing row is locked (SELECT … FOR UPDATE) so two sellers' tabs accepting two
 * different offers at once serialize, and the "no other ACCEPTED offer" check runs inside the same transaction.
 * Returns the listing slug (for revalidation).
 */
export async function acceptOffer(offerId: string, listingId: string): Promise<{ slug: string }> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ status: string; slug: string }[]>`SELECT "status"::text AS "status", "slug" FROM "Listing" WHERE "id" = ${listingId} FOR UPDATE`;
    const listing = rows[0];
    if (!listing || !OPEN.includes(listing.status)) throw new ApiError("CONFLICT", { listing: "not open for offers" });
    const other = await tx.offer.findFirst({ where: { listingId, status: "ACCEPTED", id: { not: offerId } }, select: { id: true } });
    if (other) throw new ApiError("CONFLICT", { offer: "another offer is already accepted" });
    await tx.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
    await tx.listing.update({ where: { id: listingId }, data: { status: "UNDER_OFFER" } });
    return { slug: listing.slug };
  });
}
