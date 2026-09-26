import { prisma } from "@newplace/db";
import { ApiError, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";
import { snapshotEstimate } from "@/server/listing-service";

/** Seed tool: recompute PlaceEstimate for every listing with the active AI provider. */
export const POST = handler(async () => {
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const ids = await prisma.listing.findMany({ select: { id: true } });
  for (const { id } of ids) await snapshotEstimate(id);
  await audit(u.id, "seed.recompute_estimates", `${ids.length} listings`);
  return ok({ recomputed: ids.length });
});
