import { prisma } from "@newplace/db";
import { handler } from "@/server/api";
import { getAppAgency, getAppUser } from "@/server/session";

/**
 * Session snapshot for the client state (header, save buttons, demo bar). Public pages are rendered without the
 * session so they can be cached; the browser asks for this instead. Never cached (private, no-store).
 */
export const GET = handler(async () => {
  const user = await getAppUser();
  const [agency, saved] = await Promise.all([
    getAppAgency(user?.agencyId ?? null),
    user ? prisma.savedListing.findMany({ where: { userId: user.id }, select: { listingId: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  return Response.json({ user, agency, saved: saved.map((s) => s.listingId) }, { headers: { "cache-control": "private, no-store" } });
});
